-- Edge Function gop-y-anh (xem_kh) đọc hàng chờ ảnh công trình bằng khoá máy chủ: cấp quyền đọc bảng p2d_kh_anh cho service_role
-- (bảng tạo ở 20261112140000_p2d_khai_hoang_2.sql không có quyền mặc định). Người chơi vẫn không đọc thẳng được (RLS, không cấp anon/authenticated).
grant select on public.p2d_kh_anh to service_role;
