-- Quầy Tiên Ngọc thêm Đạo Vận Thạch 50 Tiên Ngọc (2 viên/ngày, giới hạn ở máy khách: src/game/topup.js tnLeft) (chủ dự án 04/11/2026).
-- Ghi lại đủ bảng giá (tools/check.mjs đọc lần chèn mới nhất).
insert into public.p2d_tn_gia (ma, tn) values
  ('da-tay', 60), ('dao-van-thach', 50), ('ngoc-3', 90), ('ruong-dia', 180), ('ao-tien-nhan', 300), ('ao-hoang-kim', 600),
  ('_qua_ra_mat', 100), ('_the_ngay', 100), ('_the_ngay_lt', 300)
on conflict (ma) do update set tn = excluded.tn;
