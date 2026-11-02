-- Tặng đạo lữ bản 2 (chủ dự án 02/11/2026 16:49: "cho phép tặng trang bị"): như p2d_dl_tang nhưng tặng được cả trang bị Đạo Vận
-- (bản 1 chặn món dao-van-*, giống chợ). Hàm mới thay vì sửa hàm cũ; máy khách gọi p2d_dl_tang2.
create or replace function public.p2d_dl_tang2(p_loai text, p_mon jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_d uuid := public.p2d_dl_cua(v_uid);
  v_nv public.p2d_nhan_vat%rowtype; v_mon jsonb; v_co numeric; v_n integer; v_k text; v_pb integer; v_nd jsonb;
begin
  if v_d is null then raise exception 'chua_co_dao_lu' using errcode = '22023'; end if;
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' then raise exception 'mon_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;

  if p_loai = 'mon' then
    if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then raise exception 'mon_sai' using errcode = '22023'; end if;
    select it into v_mon from jsonb_array_elements(coalesce(v_nv.data -> 'bag', '[]'::jsonb)) it where it -> 'uid' = p_mon -> 'uid' limit 1;
    if v_mon is null or exists (select 1 from jsonb_each(coalesce(v_nv.data -> 'equip', '{}'::jsonb)) e where e.value = p_mon -> 'uid') then
      raise exception 'khong_co' using errcode = '22023';
    end if;
    if not public.p2d_mon_hop_le(v_mon) then raise exception 'mon_sai' using errcode = '22023'; end if;
    if jsonb_typeof(v_mon -> 'sockets') = 'array' then   -- ngọc khảm trả về túi người tặng
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      for v_k in select s from jsonb_array_elements_text(v_mon -> 'sockets') s where s ~ '^(hong|lam|hoang|luc)-ngoc:([1-9]|1[0-9]|20)$' loop
        v_nv.data := jsonb_set(v_nv.data, array['gems', v_k], to_jsonb(coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_k) = 'number' then (v_nv.data -> 'gems' ->> v_k)::numeric end, 0) + 1));
      end loop;
      v_mon := jsonb_set(v_mon, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_mon -> 'sockets')));
    end if;
    v_mon := v_mon - 'uid';
    v_nv.data := jsonb_set(v_nv.data, '{bag}', (select coalesce(jsonb_agg(it), '[]'::jsonb) from jsonb_array_elements(v_nv.data -> 'bag') it where it -> 'uid' <> p_mon -> 'uid'));
    v_nd := jsonb_build_object('item', v_mon);
  elsif p_loai in ('nl', 'lt') then
    if jsonb_typeof(p_mon -> 'n') is distinct from 'number' or (p_mon ->> 'n')::numeric <> floor((p_mon ->> 'n')::numeric)
       or (p_mon ->> 'n')::numeric not between 1 and (array[9999, 10000000])[(p_loai = 'lt')::int + 1] then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    v_n := (p_mon ->> 'n')::integer;
    if p_loai = 'lt' then
      v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_co - v_n));
      v_nd := jsonb_build_object('coins', v_n);
    else
      if coalesce(p_mon ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' or p_mon ->> 'id' = 'dao-van-thach' then raise exception 'mon_sai' using errcode = '22023'; end if;
      v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (p_mon ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (p_mon ->> 'id'))::numeric end, 0);
      if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', p_mon ->> 'id'], to_jsonb(v_co - v_n));
      v_nd := jsonb_build_object('mat', jsonb_build_object('id', p_mon ->> 'id', 'n', v_n));
    end if;
  else
    raise exception 'loai_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
    values (v_d, v_nd || jsonb_build_object('tu', coalesce(nullif(v_nv.ten, ''), public.p2d_ten_mac_dinh(v_uid))), 'dao_lu');
  return jsonb_build_object('phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_dl_tang2(text, jsonb) from public, anon;
grant execute on function public.p2d_dl_tang2(text, jsonb) to authenticated;
