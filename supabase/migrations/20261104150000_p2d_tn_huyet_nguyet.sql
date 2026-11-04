-- Mở bán thời trang Huyết Nguyệt giá 60 Tiên Ngọc ở Quầy Tiên Ngọc (chủ dự án 04/11/2026 23:26).
-- Ghi lại đủ bảng giá (tools/check.mjs đọc lần chèn mới nhất).
insert into public.p2d_tn_gia (ma, tn) values
  ('da-tay', 60), ('dao-van-thach', 50), ('ngoc-3', 90), ('ruong-dia', 180), ('ao-tien-nhan', 300), ('ao-hoang-kim', 600), ('ao-tu-liem', 10),
  ('ao-huyet-nguyet', 60),
  ('_qua_ra_mat', 100), ('_the_ngay', 100), ('_the_ngay_lt', 300)
on conflict (ma) do update set tn = excluded.tn;
