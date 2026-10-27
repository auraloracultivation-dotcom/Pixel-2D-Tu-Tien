// Khởi tạo Supabase (dự án riêng Pixel2DTuTien). Khoá publishable được phép công khai;
// quyền thật do RLS + RPC ở máy chủ quyết định.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://idiiyxcfzugrehifhhjx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FD5ghLVsNfp3-d69NXlz3w_bvOotHYk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } },   // tổ đội gửi trạng thái quái và vị trí khoảng 7 lần mỗi giây
});
