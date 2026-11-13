-- Sửa lỗi: từ 13/11/2026 00:28 (migration 20261113010000_p2d_gioi_han_1s.sql) không ai tạo được tài khoản mới.
-- Hàm p2d_gioi_han chạy trước MỌI yêu cầu PostgREST (pgrst.db_pre_request), kể cả yêu cầu của máy chủ dùng quyền service_role
-- (Edge Function dang-ky đếm p2d_dang_ky_ip). Migration cũ chỉ cho anon, authenticated chạy hàm nên service_role bị
-- "permission denied for function p2d_gioi_han" → đăng ký trả 500 "Không tạo được tài khoản". Cho service_role chạy hàm
-- (hàm tự bỏ qua khi không có auth.uid(), nên không giới hạn gì thêm với máy chủ).
grant execute on function public.p2d_gioi_han() to service_role;
