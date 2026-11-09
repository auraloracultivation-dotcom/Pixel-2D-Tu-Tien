-- Chuyển nhà Supabase (08/11/2026): tài khoản Supabase cũ đăng nhập bằng GitHub, GitHub khoá tài khoản 07/11 → chủ dự án
-- mất đường vào bảng điều khiển. Dựng lại toàn bộ (bảng, hàm, trigger, quyền, cron, dữ liệu, tài khoản giữ mật khẩu cũ) ở
-- dự án mới idlzqbpszxexcxhhamzm (tài khoản Supabase mới đăng nhập bằng email). Khoá bí mật (p2d_bi_mat) chuyển thẳng máy chủ sang
-- máy chủ, không qua tay người. Migration này chỉ sửa chỗ còn ghi cứng địa chỉ dự án cũ: dọn ảnh góp ý gọi Edge Function.
do $$
declare d text := pg_get_functiondef('public.p2d_don_gop_y()'::regprocedure);
begin
  if position('idiiyxcfzugrehifhhjx' in d) > 0 then
    execute replace(d, 'idiiyxcfzugrehifhhjx', 'idlzqbpszxexcxhhamzm');
  end if;
end $$;
