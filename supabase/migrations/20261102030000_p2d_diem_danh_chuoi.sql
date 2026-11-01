-- Bảng điểm danh 1→N (chủ dự án chốt 02/11/2026): đếm tổng số ngày đã điểm danh, vòng 112 ngày.
-- - Mỗi ngày: 500 Linh Thạch.
-- - Mỗi 7 ngày trong vòng (ngày 7, 14, …): 3000 Linh Thạch, 1 Khóa Linh Thạch, 1 ngọc cấp 6.
-- - Mỗi 28 ngày (28, 56, 84, 112): 10000 Linh Thạch, 3 Khóa, 1 ngọc cấp 7.
-- - Ngày 112 (hết vòng): 30000 Linh Thạch, 6 Khóa, 1 ngọc cấp 8. Ngày trùng nhiều mốc thì nhận đủ các mốc. Ngày 113 là ngày 1 vòng mới.
-- Bỏ mốc tuần / tháng / quý theo lịch. Dùng lại bảng p2d_diem_danh (ngày đã điểm danh) và p2d_diem_danh_moc (ky 'chuoi:<mốc>:<tổng>').
-- Ngọc theo loại chọn ở sự kiện giới thiệu (p2d_gt_ngoc), mặc định Hồng Ngọc. Quà gửi Hòm thư như cũ.

create or replace function public.p2d_dd_luat()
returns jsonb language sql immutable set search_path = ''
as $$
  select '{"ngay": {"coins": 500}, "vong": 112, "m7": {"moi": 7, "coins": 3000, "khoa": 1, "ngoc": 6}, "m28": {"moi": 28, "coins": 10000, "khoa": 3, "ngoc": 7}, "m112": {"moi": 112, "coins": 30000, "khoa": 6, "ngoc": 8}}'::jsonb
$$;
revoke all on function public.p2d_dd_luat() from public, anon, authenticated;

create or replace function public.p2d_dd_trang_thai(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hom date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_vong int := (public.p2d_dd_luat() ->> 'vong')::int;
  v_tong int := (select count(*) from public.p2d_diem_danh where user_id = p_uid);
begin
  return jsonb_build_object(
    'hom_nay', exists (select 1 from public.p2d_diem_danh where user_id = p_uid and ngay = v_hom),
    'ngay', v_hom, 'tong', v_tong,
    'vi_tri', case when v_tong = 0 then 0 else (v_tong - 1) % v_vong + 1 end,
    'vong_thu', case when v_tong = 0 then 1 else (v_tong - 1) / v_vong + 1 end);
end;
$$;
revoke all on function public.p2d_dd_trang_thai(uuid) from public, anon, authenticated;

create or replace function public.p2d_diem_danh()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_hom date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  L jsonb := public.p2d_dd_luat();
  v_ngoc text; v_tong int; v_pos int; k text; v_moc text[] := '{}';
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
  select count(*) into v_tong from public.p2d_diem_danh where user_id = v_uid;
  v_pos := (v_tong - 1) % (L ->> 'vong')::int + 1;
  foreach k in array array['m7', 'm28', 'm112'] loop
    if v_pos % (L -> k ->> 'moi')::int = 0 then
      insert into public.p2d_diem_danh_moc (user_id, ky) values (v_uid, 'chuoi:' || k || ':' || v_tong) on conflict do nothing;
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
