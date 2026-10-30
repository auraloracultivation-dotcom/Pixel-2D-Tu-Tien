-- Dọn dữ liệu cũ (chủ dự án chốt 30/10/2026: "giống con giun, ăn vào thứ mới, thải ra thứ không cần nữa, chỉ lớn lên
-- chứ không phải ăn xong không nhả. Áp dụng vào mọi thứ").
-- Các bảng đã có luật dọn từ trước, không đổi: p2d_loi 14 ngày (p2d_don_loi), p2d_truyen_am 14 ngày, p2d_chat 7 ngày,
-- p2d_sao_luu giữ 7 bản, p2d_gop_y_anh (p2d_don_gop_y), p2d_dang_ky_ip 2 ngày, p2d_khoi_phuc_thu 1 ngày.
-- Hàm này lo phần còn thiếu, chạy mỗi đêm. KHÔNG đụng đồ người chơi chưa nhận (thư chưa nhận, đơn chợ đang mở),
-- bản lưu nhân vật, bảng góp ý (bảng vinh danh đếm từ đó), sự kiện giới thiệu.
--   p2d_nghi_van  cờ gian lận cũ hơn 30 ngày (điểm nghi vấn cộng dồn nằm ở p2d_nhan_vat.nghi_van, không mất)
--   p2d_hom_thu   thư ĐÃ nhận cũ hơn 30 ngày
--   p2d_cho       đơn đã bán / huỷ / hết hạn (đồ đã trả về hòm thư lúc hết hạn) cũ hơn 30 ngày
--   p2d_bao_cao   báo cáo chat cũ hơn 60 ngày
--   p2d_bxh_tuan  bảng xếp hạng tuần cũ hơn 8 tuần
--   p2d_thiet_bi  máy không dùng hơn 90 ngày (chống nhiều tài khoản chỉ cần máy còn dùng)

create or replace function public.p2d_don_dep()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb := '{}'; n integer;
begin
  with x as (delete from public.p2d_nghi_van where luc < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('nghi_van', n);
  with x as (delete from public.p2d_hom_thu where nhan_luc is not null and nhan_luc < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('hom_thu', n);
  with x as (delete from public.p2d_cho where trang_thai in ('da_ban', 'huy', 'het_han') and coalesce(xong_luc, tao_luc) < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('cho', n);
  with x as (delete from public.p2d_bao_cao where luc < now() - interval '60 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('bao_cao', n);
  with x as (delete from public.p2d_bxh_tuan where tuan < current_date - 56 returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('bxh_tuan', n);
  with x as (delete from public.p2d_thiet_bi where lan_cuoi < now() - interval '90 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('thiet_bi', n);
  return v;
end;
$$;

revoke all on function public.p2d_don_dep() from public, anon, authenticated;

-- Mỗi đêm 04:07 giờ Đài Bắc (20:07 UTC), sau các việc dọn sẵn có
select cron.unschedule('p2d-don-dep') where exists (select 1 from cron.job where jobname = 'p2d-don-dep');
select cron.schedule('p2d-don-dep', '7 20 * * *', 'select public.p2d_don_dep()');

-- Giảm lag: khoá ngoại p2d_bang.chu chưa có chỉ mục (Supabase cảnh báo unindexed_foreign_keys)
create index if not exists p2d_bang_chu_idx on public.p2d_bang (chu);
