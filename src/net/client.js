// Khởi tạo Supabase (dự án riêng Pixel2DTuTien). Khoá publishable được phép công khai;
// quyền thật do RLS + RPC ở máy chủ quyết định.
// Khoá đúng phiên bản (trước đây @2 tự nhảy bản mới, lỡ bản mới lỗi là hỏng đăng nhập mà code không đổi gì)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

export const SUPABASE_URL = 'https://idiiyxcfzugrehifhhjx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FD5ghLVsNfp3-d69NXlz3w_bvOotHYk';

// Mã đăng nhập hết hạn mà máy chưa tự làm mới (đồng hồ máy chạy chậm, máy ngủ dậy): máy chủ trả 401 cho mọi lời gọi,
// game mất lưu cả chục phút (log 31/10/2026: một máy Android 88 lần 401 trong 14 phút, 17 lần lưu hỏng).
// Gặp 401 ở /rest/v1 thì làm mới mã một lần (gộp chung cho các lời gọi cùng lúc) rồi gọi lại đúng một lần.
let lamMoi = null;
async function fetchTuLamMoi(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status !== 401 || !String(url).includes('/rest/v1/') || opts.__lai) return res;
  try {
    lamMoi ??= supabase.auth.refreshSession().finally(() => { setTimeout(() => { lamMoi = null; }, 5000); });
    const { data } = await lamMoi;
    const ma = data?.session?.access_token;
    if (!ma) return res;
    const headers = new Headers(opts.headers);
    headers.set('Authorization', `Bearer ${ma}`);
    return await fetch(url, { ...opts, headers, __lai: true });
  } catch { return res; }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { fetch: fetchTuLamMoi },
  realtime: { params: { eventsPerSecond: 20 } },   // tổ đội gửi trạng thái quái và vị trí khoảng 7 lần mỗi giây
});

// Kênh Realtime riêng tư cần mã đăng nhập: gắn mã hiện tại trước khi vào kênh
export async function realtimeAuth() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
}
