-- Rao bán đồ: máy chủ tự tháo ngọc khảm trả về túi người bán (chủ dự án duyệt 30/10/2026 07:03). Trước đây chỉ máy khách
-- (src/game/market.js sellItem) tháo ngọc; ai gọi thẳng p2d_rao_ban vẫn bán được đồ kèm ngọc, chuyển ngọc sang nick khác.
-- Chưa ai làm (đã soát p2d_cho: không món nào còn ngọc). Phần còn lại giữ như 20261028110000_p2d_dao_van_khong_ban.sql.

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
  v_k    text;
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
    -- Ngọc khảm trả về túi người bán, món lên chợ không còn ngọc (trước đây chỉ máy khách tự tháo)
    if jsonb_typeof(v_mon -> 'sockets') = 'array' then
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      for v_k in select s from jsonb_array_elements_text(v_mon -> 'sockets') s where s ~ '^(hong|lam|hoang|luc)-ngoc:([1-9]|10)$' loop
        v_nv.data := jsonb_set(v_nv.data, array['gems', v_k], to_jsonb(coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_k) = 'number' then (v_nv.data -> 'gems' ->> v_k)::numeric end, 0) + 1));
      end loop;
      v_mon := jsonb_set(v_mon, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_mon -> 'sockets')));
    end if;
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
revoke all on function public.p2d_rao_ban(text, jsonb, integer) from public, anon;
grant execute on function public.p2d_rao_ban(text, jsonb, integer) to authenticated;
