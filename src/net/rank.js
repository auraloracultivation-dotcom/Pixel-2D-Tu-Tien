// Bảng xếp hạng: chỉ đọc qua hàm p2d_bxh (supabase/migrations). Máy chủ tự lấy lực chiến, cảnh giới, tháp từ bản lưu.
import { supabase } from './client.js';

// Bảng mới (góp ý, đánh Ma Thần, bí cảnh) ở hàm p2d_bxh2 (supabase/migrations/20261102031000_p2d_bxh_moi.sql)
export async function fetchRank(kind) {
  if (kind === 'qtv') {   // bảng quản trị viên, bản 2 có điểm mời bạn (supabase/migrations/20261102190000_p2d_bxh_qtv2.sql)
    const { data, error } = await supabase.rpc('p2d_bxh_qtv3');   // bản 3 đọc sổ cái điểm (20261103020000_p2d_qtv_so_cai.sql)
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

// Sổ cái điểm QTV của mình và đổi điểm lấy Tiên Ngọc 1 = 1, tối đa 500 mỗi tuần (20261103020000_p2d_qtv_so_cai.sql)
export async function qtvLedger() {
  const { data, error } = await supabase.rpc('p2d_qtv_lich_su');
  if (error) throw error;
  return data;
}
export async function qtvExchange(n) {
  const { data, error } = await supabase.rpc('p2d_qtv_doi', { p_n: n });
  if (error) throw new Error((error.message || '').match(/[a-z_]+/)?.[0] || 'net');
  return data;
}
