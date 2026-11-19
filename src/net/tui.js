// Mở thêm ô túi đồ (chủ dự án 20/11/2026 00:43): máy chủ p2d_mo_tui trừ Linh Thạch trong bản lưu trên máy chủ, tăng tui_mo,
// trả { tui_mo, gia, phien_ban } (supabase/migrations/20261120010000_p2d_mo_tui.sql). Gọi qua game.cloud.run (src/ui/bag-mo.js).
import { supabase } from './client.js';

export async function moTui() {
  const { data, error } = await supabase.rpc('p2d_mo_tui');
  if (error) throw error;
  return data;
}
