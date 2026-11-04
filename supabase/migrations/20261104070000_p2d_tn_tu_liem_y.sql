-- Mở bán Tử Liềm Y (bộ nữ, chỉ số màu Thiên như đồ Quầy Tiên Ngọc) giá 10 Tiên Ngọc (chủ dự án 04/11/2026 14:28).
-- Bạch Kiếm Bào (bộ nam) bán ở tiệm Linh Thạch 10.000 (data/fashion.json, không qua máy chủ Tiên Ngọc).
-- Ghi lại đủ bảng giá (tools/check.mjs đọc lần chèn mới nhất).
insert into public.p2d_tn_gia (ma, tn) values
  ('da-tay', 60), ('dao-van-thach', 50), ('ngoc-3', 90), ('ruong-dia', 180), ('ao-tien-nhan', 300), ('ao-hoang-kim', 600), ('ao-tu-liem', 10),
  ('_qua_ra_mat', 100), ('_the_ngay', 100), ('_the_ngay_lt', 300)
on conflict (ma) do update set tn = excluded.tn;
