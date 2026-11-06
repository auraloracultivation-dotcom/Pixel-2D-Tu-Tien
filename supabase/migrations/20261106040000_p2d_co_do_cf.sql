-- Cờ đỏ cho boss và PvP lấy đúng bảng cờ đỏ p2d_co_do (migration 20261105140000), không lấy nghi_van ≥ 10 nữa
-- (chủ dự án 06/11/2026 11:07: tài khoản Đại Ma Thần bị máy chủ phòng coi là cờ đỏ vì nghi_van 105 tích từ cảnh báo lực chiến,
-- nên chém boss không được Linh Thạch). 4 tài khoản nghi_van ≥ 10 nhưng không có cờ đỏ thật cũng được trả lại như vậy.
-- Tài khoản trong p2d_mien_khoa không bao giờ bị coi là cờ đỏ ở đây.

create or replace function public.p2d_la_co_do(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.p2d_co_do c where c.user_id = p_uid) and not exists (select 1 from public.p2d_mien_khoa m where m.user_id = p_uid) $$;
revoke all on function public.p2d_la_co_do(uuid) from public, anon, authenticated;

-- Máy chủ phòng Cloudflare hỏi bằng vé của chính người chơi: mình có đang cờ đỏ không
create or replace function public.p2d_co_toi()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.p2d_la_co_do(public.p2d_uid()) $$;
revoke all on function public.p2d_co_toi() from public, anon;
grant execute on function public.p2d_co_toi() to authenticated;

create or replace function public.p2d_pvp_tra()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_n record; v_ra jsonb := '[]'::jsonb;
  v_lt numeric; v_mat bigint; v_bag jsonb; v_eq jsonb; v_cands jsonb; v_c jsonb; v_kq jsonb; v_thu jsonb; v_huy boolean; v_ten_ke text; v_ten text;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then return jsonb_build_object('mat', v_ra); end if;
  v_ten := coalesce(v_nv.ten, 'Đạo hữu');
  for v_n in select * from public.p2d_pvp_no n where n.nan = v_uid and n.tra_luc is null order by n.id for update loop
    select coalesce(k.ten, 'Đạo hữu') into v_ten_ke from public.p2d_nhan_vat k where k.user_id = v_n.ke;
    v_huy := public.p2d_la_co_do(v_n.ke) or public.p2d_la_co_do(v_uid);   -- cờ đỏ thật (p2d_co_do), không phải nghi_van
    -- 10% Linh Thạch
    v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
    v_mat := greatest(0, floor(v_lt * 0.1))::bigint;
    if v_mat > 0 then v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_mat)); end if;
    v_kq := jsonb_build_object('lt', v_mat, 'ke_ten', v_ten_ke);
    v_thu := jsonb_build_object('coins', v_mat, 'tu', v_ten);
    -- 1 món: trang bị trong túi không đang mặc, hoặc một phần (10%, ít nhất 1) của một loại nguyên liệu
    v_bag := case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' else '[]'::jsonb end;
    v_eq := case when jsonb_typeof(v_nv.data -> 'equip') = 'object' then v_nv.data -> 'equip' else '{}'::jsonb end;
    select coalesce(jsonb_agg(c), '[]'::jsonb) into v_cands from (
      select jsonb_build_object('i', b) c from jsonb_array_elements(v_bag) b
        where jsonb_typeof(b -> 'uid') = 'number' and not exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')
      union all
      select jsonb_build_object('m', e.key, 'n', greatest(1, floor((e.value #>> '{}')::numeric * 0.1))::bigint) from jsonb_each(
          case when jsonb_typeof(v_nv.data -> 'mats') = 'object' then v_nv.data -> 'mats' else '{}'::jsonb end) e
        where jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric >= 1 and e.key ~ '^[a-z0-9-]{1,40}$'
    ) s;
    if jsonb_array_length(v_cands) > 0 then
      v_c := v_cands -> floor(random() * jsonb_array_length(v_cands))::int;
      if v_c ? 'i' then
        v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce((select jsonb_agg(b) from jsonb_array_elements(v_bag) b where b -> 'uid' is distinct from v_c -> 'i' -> 'uid'), '[]'::jsonb));
        v_kq := v_kq || jsonb_build_object('item_uid', v_c -> 'i' -> 'uid', 'item', (v_c -> 'i') - 'sig');
        v_thu := v_thu || jsonb_build_object('item', (v_c -> 'i') - 'sig');
      else
        v_nv.data := jsonb_set(v_nv.data, array['mats', v_c ->> 'm'], to_jsonb((v_nv.data -> 'mats' ->> (v_c ->> 'm'))::numeric - (v_c ->> 'n')::numeric));
        v_kq := v_kq || jsonb_build_object('mat_id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint);
        v_thu := v_thu || jsonb_build_object('mat', jsonb_build_object('id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint));
      end if;
    end if;
    if not v_huy and (v_mat > 0 or v_thu ? 'item' or v_thu ? 'mat') then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_n.ke, v_thu, 'pvp_ha');
    end if;
    v_kq := v_kq || jsonb_build_object('huy', v_huy);
    update public.p2d_pvp_no set tra_luc = now(), ket_qua = v_kq where id = v_n.id;
    v_ra := v_ra || jsonb_build_array(v_kq);
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('mat', v_ra, 'phien_ban', v_nv.phien_ban);
end;
$$;
revoke all on function public.p2d_pvp_tra() from public, anon;
grant execute on function public.p2d_pvp_tra() to authenticated;
