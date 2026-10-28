-- Giờ máy chủ cho game (28/10/2026): người chơi chỉnh giờ điện thoại thì game tua theo (quà ngày, bế quan, vườn...).
-- Máy khách lấy giờ này làm mốc (src/core/clock.js, src/net/time.js). Chỉ đọc giờ, không đụng dữ liệu nên khách cũng gọi được.
create or replace function public.p2d_gio()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

revoke all on function public.p2d_gio() from public;
grant execute on function public.p2d_gio() to anon, authenticated;
