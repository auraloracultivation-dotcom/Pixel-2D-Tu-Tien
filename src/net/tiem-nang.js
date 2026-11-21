// Lễ gọi tên huyết mạch (Tiềm năng, supabase/migrations/20261122030000_p2d_tiem_ky_nang.sql): máy chủ quay một lượt và giữ kết quả; gọi lại thì trả đúng
// kết quả cũ. src/game/le-toc.js gọi qua game.quayTocMayChu; lỗi (chưa có hàm, mất mạng) thì lễ quay tại máy, lúc lưu máy chủ quyết lại (trigger p2d_kiem_tiem_kn).
import { supabase } from './client.js';

export async function quayToc() {
  const { data, error } = await supabase.rpc('p2d_quay_toc');
  if (error) throw new Error((error.message || '').match(/[a-z_]+/)?.[0] || 'net');
  return data;   // { toc, goc }
}
