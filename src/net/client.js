// Khởi tạo Supabase (dự án riêng Pixel2DTuTien). Khoá publishable được phép công khai;
// quyền thật do RLS + RPC ở máy chủ quyết định.
// Khoá đúng phiên bản (trước đây @2 tự nhảy bản mới, lỡ bản mới lỗi là hỏng đăng nhập mà code không đổi gì)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

export const SUPABASE_URL = 'https://idiiyxcfzugrehifhhjx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FD5ghLVsNfp3-d69NXlz3w_bvOotHYk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } },   // tổ đội gửi trạng thái quái và vị trí khoảng 7 lần mỗi giây
});

// Kênh Realtime riêng tư cần mã đăng nhập: gắn mã hiện tại trước khi vào kênh
export async function realtimeAuth() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
}
