-- Bỏ Đài Ma Thần (chủ dự án 21/11/2026 00:1x: "Bỏ đại ma thần đi", chọn "Chỉ bỏ Đài Ma Thần"; 02:0x chọn "Khoá ngay"). Máy khách đã gỡ phần khiêu chiến
-- (src/game/thienma.js, src/net/thienma.js); migration này thu quyền gọi hai hàm để không ai gọi thẳng được nữa.
-- KHÔNG xoá hàm, KHÔNG đụng bảng: p2d_thien_ma là danh sách tài khoản quản trị (bảng xếp hạng, cờ đỏ, ảnh góp ý… đều đọc),
-- p2d_thien_ma_tran là nhật ký 28 trận cũ (trận cuối 04/11/2026). Muốn mở lại chỉ cần grant lại.
revoke execute on function public.p2d_thien_ma_khieu_chien(uuid) from public, anon, authenticated;
revoke execute on function public.p2d_thien_ma_xem() from public, anon, authenticated;
