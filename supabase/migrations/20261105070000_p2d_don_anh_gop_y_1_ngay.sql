-- Ảnh góp ý (chủ dự án 05/11/2026 09:27: "ảnh góp ý nếu đã giải quyết thì sau 1 ngày là xoá"). Ảnh chiếm ~15 / 37 MB cơ sở dữ liệu.
-- Đã giải quyết (da_sua, khong_lam, trung): xoá ảnh 1 ngày sau lúc xử lý. Còn lại như cũ: se_lam 30 ngày, mọi ảnh quá 90 ngày.
-- Chỉ xoá ảnh (p2d_gop_y_anh), không xoá góp ý. Việc đêm p2d-don-gop-y (pg_cron, 19:57 UTC) gọi hàm này.
create or replace function public.p2d_don_gop_y() returns integer language sql security definer set search_path = ''
as $$
  with x as (
    delete from public.p2d_gop_y_anh a using public.p2d_gop_y g
     where g.id = a.gop_y_id
       and ((g.trang_thai in ('da_sua', 'khong_lam', 'trung') and coalesce(g.xu_ly_luc, g.tao_luc) < now() - interval '1 day')
         or (g.trang_thai not in ('moi', 'dang_xem') and coalesce(g.xu_ly_luc, g.tao_luc) < now() - interval '30 days')
         or g.tao_luc < now() - interval '90 days')
    returning 1)
  select count(*)::integer from x
$$;
revoke all on function public.p2d_don_gop_y() from public, anon, authenticated;
