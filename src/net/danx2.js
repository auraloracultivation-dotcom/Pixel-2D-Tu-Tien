// Thăng Linh Đan (đề xuất #39, supabase/migrations/20261101010000_p2d_dan_x2.sql): máy chủ ghi giờ đan hết tác dụng (mỗi ngày 2 viên)
// để hạn mức linh khí lúc lưu tính gấp đôi trong thời gian đó.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';

export async function drinkX2() {
  const { data, error } = await supabase.rpc('p2d_uong_dan_x2');
  if (error) throw new Error(code(error));
  return data;   // { het_luc, con }
}
