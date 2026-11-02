// Bảng xếp hạng: chỉ đọc qua hàm p2d_bxh (supabase/migrations). Máy chủ tự lấy lực chiến, cảnh giới, tháp từ bản lưu.
import { supabase } from './client.js';

// Bảng mới (góp ý, đánh Ma Thần, bí cảnh) ở hàm p2d_bxh2 (supabase/migrations/20261102031000_p2d_bxh_moi.sql)
export async function fetchRank(kind) {
  if (kind === 'qtv') {   // bảng quản trị viên, bản 2 có điểm mời bạn (supabase/migrations/20261102190000_p2d_bxh_qtv2.sql)
    const { data, error } = await supabase.rpc('p2d_bxh_qtv2');
    if (error) throw error;
    return data;
  }
  const fn = kind === 'gop_y' || kind === 'dmt' || kind.startsWith('bc:') ? 'p2d_bxh2' : 'p2d_bxh';
  const { data, error } = await supabase.rpc(fn, { p_loai: kind });
  if (error) throw error;
  return data;
}

// Hồ sơ một người trên bảng (chạm tên): chỉ đọc qua p2d_xem_nguoi, k là mã công khai của người đó (không phải id thật)
export async function fetchPlayer(k) {
  const { data, error } = await supabase.rpc('p2d_xem_nguoi', { p_k: k });
  if (error) throw error;
  return data;
}
