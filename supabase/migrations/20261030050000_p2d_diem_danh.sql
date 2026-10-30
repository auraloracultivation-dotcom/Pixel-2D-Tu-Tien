-- Điểm danh ngày, tuần, tháng, quý (chủ dự án chốt 30/10/2026 13:45):
-- - Mỗi tài khoản (đã có bản lưu) điểm danh 1 lần mỗi ngày theo giờ Việt Nam; nhận quà ngày ngay.
-- - Đếm số ngày đã điểm danh trong kỳ: đủ mốc tuần (thứ Hai → Chủ nhật), tháng, quý theo lịch thì nhận quà mốc, mỗi kỳ một lần.
-- - Quà cố định cho mọi người (không theo cảnh giới), gửi qua Hòm thư (p2d_hom_thu, ly_do 'diem_danh_*'), máy khách tự nhận
--   bằng p2d_nhan_thu_moi như thư chợ. Ngọc theo loại người chơi đã chọn ở sự kiện giới thiệu (p2d_gt_ngoc), mặc định Hồng Ngọc.
-- Số quà ở p2d_dd_luat(); tools/check.mjs so với data/checkin.json.

create table if not exists public.p2d_diem_danh (
  user_id uuid not null references auth.users (id) on delete cascade,
  ngay date not null,
  luc timestamptz not null default now(),
  primary key (user_id, ngay)
);
alter table public.p2d_diem_danh enable row level security;
revoke all on public.p2d_diem_danh from anon, authenticated;

create table if not exists public.p2d_diem_danh_moc (
  user_id uuid not null references auth.users (id) on delete cascade,
  ky text not null,   -- 'tuan:2026-10-26', 'thang:2026-10-01', 'quy:2026-10-01'
  luc timestamptz not null default now(),
  primary key (user_id, ky)
);
alter table public.p2d_diem_danh_moc enable row level security;
revoke all on public.p2d_diem_danh_moc from anon, authenticated;

create or replace function public.p2d_dd_luat()
returns jsonb language sql immutable set search_path = ''
as $$
  select '{"ngay": {"coins": 500}, "tuan": {"can": 5, "coins": 3000, "khoa": 1, "ngoc": 4}, "thang": {"can": 20, "coins": 10000, "khoa": 3, "ngoc": 5}, "quy": {"can": 60, "coins": 30000, "khoa": 6, "ngoc": 6}}'::jsonb
$$;
revoke all on function public.p2d_dd_luat() from public, anon, authenticated;

-- Trạng thái của một người (dùng chung cho xem và điểm danh)
create or replace function public.p2d_dd_trang_thai(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hom date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_out jsonb := jsonb_build_object('hom_nay', exists (select 1 from public.p2d_diem_danh where user_id = p_uid and ngay = v_hom), 'ngay', v_hom);
  k text; v_dau date; v_cuoi date;
begin
  foreach k in array array['tuan', 'thang', 'quy'] loop
    v_dau := date_trunc(case k when 'tuan' then 'week' when 'thang' then 'month' else 'quarter' end, v_hom::timestamp)::date;
    v_cuoi := (v_dau + case k when 'tuan' then interval '1 week' when 'thang' then interval '1 month' else interval '3 months' end)::date - 1;
    v_out := v_out || jsonb_build_object(k, jsonb_build_object(
      'co', (select count(*) from public.p2d_diem_danh where user_id = p_uid and ngay between v_dau and v_cuoi),
      'can', (public.p2d_dd_luat() -> k ->> 'can')::int,
      'con', v_cuoi - v_hom,
      'da_nhan', exists (select 1 from public.p2d_diem_danh_moc where user_id = p_uid and ky = k || ':' || v_dau)));
  end loop;
  return v_out;
end;
$$;
revoke all on function public.p2d_dd_trang_thai(uuid) from public, anon, authenticated;

create or replace function public.p2d_diem_danh_xem()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return public.p2d_dd_trang_thai(v_uid) || jsonb_build_object('luat', public.p2d_dd_luat());
end;
$$;
revoke all on function public.p2d_diem_danh_xem() from public, anon;
grant execute on function public.p2d_diem_danh_xem() to authenticated;

create or replace function public.p2d_diem_danh()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_hom date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  L jsonb := public.p2d_dd_luat();
  v_ngoc text; v_n int; k text; v_dau date; v_cuoi date; v_moc text[] := '{}';
begin
  if not exists (select 1 from public.p2d_nhan_vat where user_id = v_uid) then raise exception 'chua_luu' using errcode = '22023'; end if;
  insert into public.p2d_diem_danh (user_id, ngay) values (v_uid, v_hom) on conflict do nothing;
  if not found then
    return jsonb_build_object('loi', 'da_diem_danh') || public.p2d_dd_trang_thai(v_uid);
  end if;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  values (v_uid, jsonb_build_object('coins', (L -> 'ngay' ->> 'coins')::int), 'diem_danh_ngay');
  select loai into v_ngoc from public.p2d_gt_ngoc where user_id = v_uid;
  v_ngoc := coalesce(v_ngoc, 'hong-ngoc');
  foreach k in array array['tuan', 'thang', 'quy'] loop
    v_dau := date_trunc(case k when 'tuan' then 'week' when 'thang' then 'month' else 'quarter' end, v_hom::timestamp)::date;
    v_cuoi := (v_dau + case k when 'tuan' then interval '1 week' when 'thang' then interval '1 month' else interval '3 months' end)::date - 1;
    select count(*) into v_n from public.p2d_diem_danh where user_id = v_uid and ngay between v_dau and v_cuoi;
    if v_n >= (L -> k ->> 'can')::int then
      insert into public.p2d_diem_danh_moc (user_id, ky) values (v_uid, k || ':' || v_dau) on conflict do nothing;
      if found then
        insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
        values (v_uid, jsonb_build_object('coins', (L -> k ->> 'coins')::int,
                                          'mat', jsonb_build_object('id', 'khoa-linh-thach', 'n', (L -> k ->> 'khoa')::int),
                                          'gem', jsonb_build_object('key', v_ngoc || ':' || (L -> k ->> 'ngoc'), 'n', 1)), 'diem_danh_' || k);
        v_moc := v_moc || k;
      end if;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'moc', to_jsonb(v_moc)) || public.p2d_dd_trang_thai(v_uid);
end;
$$;
revoke all on function public.p2d_diem_danh() from public, anon;
grant execute on function public.p2d_diem_danh() to authenticated;
