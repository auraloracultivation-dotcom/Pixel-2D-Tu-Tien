// Gửi lỗi JavaScript về máy chủ (p2d_ghi_loi, supabase/migrations/20261028040000_p2d_nhat_ky_loi.sql).
// Chỉ gửi khi đã đăng nhập; máy chủ tự chặn tràn và gộp lỗi trùng.
import { supabase } from './client.js';

export async function sendError(tin, chong, ban) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const { error } = await supabase.rpc('p2d_ghi_loi', { p_tin: tin, p_chong: chong, p_ban: ban, p_may: navigator.userAgent.slice(0, 200) });
  return !error;
}
