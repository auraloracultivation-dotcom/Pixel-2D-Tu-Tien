// Nhịp sống gửi máy chủ (supabase/migrations/20261031020000_p2d_nhip_song.sql): máy chủ chỉ cộng hạn mức Linh Thạch,
// nguyên liệu cho thời gian còn liên lạc. Trả true khi máy chủ nhận trong ms mili giây, false khi lỗi hoặc quá chậm.
import { supabase } from './client.js';

export async function beat(ms) {
  try {
    const call = supabase.rpc('p2d_nhip_song').then(({ error }) => !error);
    return await Promise.race([call, new Promise(ok => setTimeout(() => ok(false), ms))]);
  } catch { return false; }
}
