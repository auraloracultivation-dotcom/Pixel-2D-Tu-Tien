-- PvP ở mọi tinh cầu (chủ dự án 19/11/2026 16:18–16:25, data/pvp.json → drop): máy chủ phòng Cloudflare báo thêm nơi gục (n):
-- 'ngoai' = Ngoại Vực Vết Nứt, rơi như cũ (10% Linh Thạch + 1 món trong túi không đang mặc hoặc 10% một loại nguyên liệu);
-- 'thuong' = nơi khác, chỉ mất 5% Linh Thạch, không mất món. Bản Cloudflare cũ không gửi n thì coi là 'ngoai' (đúng luật cũ).
-- Cờ đỏ (bên nào cũng vậy): người gục vẫn mất, đồ rơi bị huỷ (người hạ không nhận thư) như trước.
-- Áp TRƯỚC khi đưa máy chủ phòng mới lên (máy chủ phòng tự đưa lên khi gộp vào main).

alter table public.p2d_pvp_no add column if not exists noi text not null default 'ngoai';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'p2d_pvp_no_noi_chk') then
    alter table public.p2d_pvp_no add constraint p2d_pvp_no_noi_chk check (noi in ('ngoai', 'thuong'));
  end if;
end $$;

create or replace function public.p2d_pvp_ghi(p_ts bigint, p_ds text, p_ky text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang'); v_d jsonb; v_k uuid; v_v uuid; v_noi text;
begin
  if v_khoa is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 500 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;
  v_d := p_ds::jsonb;
  v_k := (v_d ->> 'k')::uuid; v_v := (v_d ->> 'v')::uuid;
  v_noi := case when v_d ->> 'n' = 'thuong' then 'thuong' else 'ngoai' end;
  if v_k = v_v then return false; end if;
  if exists (select 1 from public.p2d_pvp_no n where n.ke = v_k and n.nan = v_v and n.tao_luc > now() - interval '1 hour') then return false; end if;
  insert into public.p2d_pvp_no (ts, ke, nan, noi) values (p_ts, v_k, v_v, v_noi) on conflict do nothing;
  return found;
end;
$function$;

create or replace function public.p2d_pvp_tra()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_n record; v_ra jsonb := '[]'::jsonb;
  v_lt numeric; v_mat bigint; v_bag jsonb; v_eq jsonb; v_cands jsonb; v_c jsonb; v_kq jsonb; v_thu jsonb; v_huy boolean; v_ten_ke text; v_ten text;
  v_ngoai boolean;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then return jsonb_build_object('mat', v_ra); end if;
  v_ten := coalesce(v_nv.ten, 'Đạo hữu');
  for v_n in select * from public.p2d_pvp_no n where n.nan = v_uid and n.tra_luc is null order by n.id for update loop
    select coalesce(k.ten, 'Đạo hữu') into v_ten_ke from public.p2d_nhan_vat k where k.user_id = v_n.ke;
    v_huy := public.p2d_la_co_do(v_n.ke) or public.p2d_la_co_do(v_uid);   -- cờ đỏ thật (p2d_co_do), không phải nghi_van
    v_ngoai := coalesce(v_n.noi, 'ngoai') = 'ngoai';
    v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
    v_mat := greatest(0, floor(v_lt * case when v_ngoai then 0.1 else 0.05 end))::bigint;
    if v_mat > 0 then v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_mat)); end if;
    v_kq := jsonb_build_object('lt', v_mat, 'ke_ten', v_ten_ke, 'noi', coalesce(v_n.noi, 'ngoai'));
    v_thu := jsonb_build_object('coins', v_mat, 'tu', v_ten);
    if v_ngoai then
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
$function$;
