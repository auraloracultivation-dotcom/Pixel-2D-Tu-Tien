-- Chợ mở cho tài khoản mới sau 1 ngày và 4 tiếng chơi (chủ dự án 06/11/2026 23:12, chặn lập tài khoản phụ nhận quà gặp mặt rồi đẩy
-- đồ qua chợ). Số ở data/market.json → mo_khoa (ngay, gio); hàm p2d_cho_mo dùng cùng số.
-- Giờ chơi: trigger p2d_dem_choi cộng khoảng cách giữa hai lần lưu liên tiếp (máy khách lưu ít nhất mỗi phút khi đang chơi) nếu
-- khoảng đó ≤ 3 phút; nghỉ lâu hơn thì không tính. Máy khách không ghi được choi_giay (trigger luôn tính lại từ bản cũ).
-- Tài khoản đã có trước thay đổi này được tính đủ giờ chơi (chỉ còn điều kiện 1 ngày tuổi).

alter table public.p2d_nhan_vat add column if not exists choi_giay integer not null default 0;
alter table public.p2d_nhan_vat add column if not exists choi_luc timestamptz;
update public.p2d_nhan_vat set choi_giay = greatest(choi_giay, 14400) where choi_luc is null;

create or replace function public.p2d_dem_choi()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_gap numeric := extract(epoch from (now() - old.choi_luc));
begin
  new.choi_giay := old.choi_giay + case when old.choi_luc is not null and v_gap > 0 and v_gap <= 180 then round(v_gap)::int else 0 end;
  new.choi_luc := now();
  return new;
end;
$$;
create or replace trigger p2d_dem_choi before update of data on public.p2d_nhan_vat for each row execute function public.p2d_dem_choi();

-- Lý do chưa mở chợ (null = đã mở)
create or replace function public.p2d_cho_mo(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select created_at from auth.users where id = p_uid) > now() - interval '1 day' then 'cho_ngay'
    when coalesce((select choi_giay from public.p2d_nhan_vat where user_id = p_uid), 0) < 4 * 3600 then 'cho_gio'
  end
$$;
revoke all on function public.p2d_cho_mo(uuid) from public, anon, authenticated;

-- Cho bảng Chợ hiện tiến độ mở khoá
create or replace function public.p2d_cho_mo_trang_thai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('ly_do', public.p2d_cho_mo(public.p2d_uid()),
    'tao', (select created_at from auth.users where id = public.p2d_uid()),
    'giay', coalesce((select choi_giay from public.p2d_nhan_vat where user_id = public.p2d_uid()), 0))
$$;
revoke all on function public.p2d_cho_mo_trang_thai() from public, anon;
grant execute on function public.p2d_cho_mo_trang_thai() to authenticated;

-- Rao bán, mua: thêm điều kiện mở chợ (phần còn lại giữ nguyên bản 20261105020000 / p2d_cho_co_do)
create or replace function public.p2d_rao_ban(p_loai text, p_mon jsonb, p_gia integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_mon  jsonb;
  v_co   numeric;
  v_n    integer;
  v_id   bigint;
  v_pb   integer;
  v_k    text;
  v_mo   text := public.p2d_cho_mo(public.p2d_uid());
begin
  if v_mo is not null then raise exception '%', v_mo using errcode = '42501'; end if;   -- tài khoản mới: 1 ngày, 4 tiếng chơi
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
      for v_k in select s from jsonb_array_elements_text(v_mon -> 'sockets') s where public.p2d_ngoc_dung(s) loop
        v_nv.data := jsonb_set(v_nv.data, array['gems', v_k], to_jsonb(coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_k) = 'number' then (v_nv.data -> 'gems' ->> v_k)::numeric end, 0) + 1));
      end loop;
      v_mon := jsonb_set(v_mon, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_mon -> 'sockets')));
      v_mon := public.p2d_ky_dong(v_mon);   -- ô khảm nằm trong phần được ký (20261105020000_p2d_ky_ngoc)
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
$function$;

create or replace function public.p2d_mua_hang(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_c public.p2d_cho%rowtype; v_lt numeric; v_thue integer; v_pb integer; v_mo text := public.p2d_cho_mo(public.p2d_uid());
begin
  if v_mo is not null then raise exception '%', v_mo using errcode = '42501'; end if;   -- tài khoản mới: 1 ngày, 4 tiếng chơi
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  select * into v_c from public.p2d_cho where id = p_id for update;
  if not found or v_c.trang_thai <> 'mo' or v_c.het_han < now() then raise exception 'da_ban' using errcode = '22023'; end if;
  -- p2d_co_do: người bán bị cờ đỏ thì đơn coi như đã hết
  if exists (select 1 from public.p2d_nhan_vat s where s.user_id = v_c.nguoi_ban and s.nghi_van >= 10) then raise exception 'da_ban' using errcode = '22023'; end if;
  if v_c.nguoi_ban = v_uid then raise exception 'cua_minh' using errcode = '22023'; end if;
  v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  if v_lt < v_c.gia then raise exception 'thieu_tien' using errcode = '22023'; end if;
  v_thue := ceil(v_c.gia * 0.1);   -- data/market.json tax (tools/check.mjs so sánh)
  update public.p2d_nhan_vat set data = jsonb_set(data, '{lingshi}', to_jsonb(v_lt - v_c.gia)), phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  update public.p2d_cho set trang_thai = 'da_ban', nguoi_mua = v_uid, xong_luc = now() where id = p_id;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values
    (v_uid, case v_c.loai when 'mon' then jsonb_build_object('item', v_c.mon) else jsonb_build_object('mat', v_c.mon) end, 'mua'),
    (v_c.nguoi_ban, jsonb_build_object('coins', v_c.gia - v_thue, 'sold', v_c.mon), 'ban');
  return jsonb_build_object('gia', v_c.gia, 'phien_ban', v_pb);
end;
$function$;
