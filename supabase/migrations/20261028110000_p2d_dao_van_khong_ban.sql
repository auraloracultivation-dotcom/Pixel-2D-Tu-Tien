-- Bộ Đạo Vận không bán (chủ dự án chốt 28/10/2026): chợ từ chối món Đạo Vận (base dao-van-*) và Đạo Vận Thạch.
-- Thân hàm chép nguyên từ 20261027140000_p2d_chong_gian_lan.sql, chỉ thêm hai dòng kiểm tra 'khong_ban'. Quyền giữ nguyên (create or replace).

create or replace function public.p2d_rao_ban(p_loai text, p_mon jsonb, p_gia integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_mon  jsonb;
  v_co   numeric;
  v_n    integer;
  v_id   bigint;
  v_pb   integer;
begin
  if p_gia is null or p_gia not between 1 and 10000000 then raise exception 'gia_sai' using errcode = '22023'; end if;
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' then raise exception 'mon_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  if (select count(*) from public.p2d_cho where nguoi_ban = v_uid and trang_thai = 'mo') >= 10 then
    raise exception 'qua_nhieu' using errcode = '54000';
  end if;

  if p_loai = 'mon' then
    if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then raise exception 'mon_sai' using errcode = '22023'; end if;
    select it into v_mon from jsonb_array_elements(coalesce(v_nv.data -> 'bag', '[]'::jsonb)) it where it -> 'uid' = p_mon -> 'uid' limit 1;
    if v_mon is null or exists (select 1 from jsonb_each(coalesce(v_nv.data -> 'equip', '{}'::jsonb)) e where e.value = p_mon -> 'uid') then
      raise exception 'khong_co' using errcode = '22023';
    end if;
    if not public.p2d_mon_hop_le(v_mon) then raise exception 'mon_sai' using errcode = '22023'; end if;
    if coalesce(v_mon ->> 'base', '') like 'dao-van-%' then raise exception 'khong_ban' using errcode = '22023'; end if;   -- món Đạo Vận không bán
    v_nv.data := jsonb_set(v_nv.data, '{bag}', (
      select coalesce(jsonb_agg(it), '[]'::jsonb) from jsonb_array_elements(v_nv.data -> 'bag') it where it -> 'uid' <> p_mon -> 'uid'));
  elsif p_loai = 'nl' then
    if coalesce(p_mon ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(p_mon -> 'n') is distinct from 'number'
       or (p_mon ->> 'n')::numeric not between 1 and 999 or (p_mon ->> 'n')::numeric <> floor((p_mon ->> 'n')::numeric) then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    if p_mon ->> 'id' = 'dao-van-thach' then raise exception 'khong_ban' using errcode = '22023'; end if;   -- Đạo Vận Thạch không bán
    v_n := (p_mon ->> 'n')::integer;
    v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (p_mon ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (p_mon ->> 'id'))::numeric end, 0);
    if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
    v_mon := jsonb_build_object('id', p_mon ->> 'id', 'n', v_n);
    v_nv.data := jsonb_set(v_nv.data, array['mats', p_mon ->> 'id'], to_jsonb(v_co - v_n));
  else
    raise exception 'loai_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  insert into public.p2d_cho (nguoi_ban, ten_ban, loai, mon, gia)
  values (v_uid, coalesce(nullif(v_nv.ten, ''), public.p2d_ten_mac_dinh(v_uid)), p_loai, v_mon, p_gia)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'phien_ban', v_pb);
end;
$$;


-- Tự kiểm tra (hoàn tác dữ liệu thử): món Đạo Vận và Đạo Vận Thạch bị từ chối, nguyên liệu thường vẫn rao được.
do $kt$
declare
  v_hong text := ''; x jsonb;
  a uuid := '00000000-0000-4000-8000-0000000000d7';
begin
  begin
    insert into auth.users (id, email, aud, role) values (a, 'kt_dv_a@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data) values (a, jsonb_build_object(
      'bag', jsonb_build_array(jsonb_build_object('uid', 7, 'base', 'dao-van-binh', 'rarity', 'dia', 'lvl', 20, 'main', jsonb_build_object('atk', 10), 'lines', '[]'::jsonb, 'el', 'hoa')),
      'equip', '{}'::jsonb, 'mats', jsonb_build_object('dao-van-thach', 3, 'tinh-thiet', 5)));
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    begin perform public.p2d_rao_ban('mon', '{"uid":7}', 100); v_hong := v_hong || ' | món Đạo Vận lọt';
    exception when others then if sqlerrm <> 'khong_ban' then v_hong := v_hong || ' | món Đạo Vận: ' || sqlerrm; end if; end;
    begin perform public.p2d_rao_ban('nl', '{"id":"dao-van-thach","n":1}', 100); v_hong := v_hong || ' | Đạo Vận Thạch lọt';
    exception when others then if sqlerrm <> 'khong_ban' then v_hong := v_hong || ' | Đạo Vận Thạch: ' || sqlerrm; end if; end;
    x := public.p2d_rao_ban('nl', '{"id":"tinh-thiet","n":2}', 40);
    if (x ->> 'id') is null then v_hong := v_hong || ' | nguyên liệu thường không rao được'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra Đạo Vận không bán TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra Đạo Vận không bán: đạt hết';
end
$kt$;
