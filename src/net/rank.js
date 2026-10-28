// Bảng xếp hạng: chỉ đọc qua hàm p2d_bxh (supabase/migrations). Máy chủ tự lấy lực chiến, cảnh giới, tháp từ bản lưu.
import { supabase } from './client.js';

export async function fetchRank(kind) {
  const { data, error } = await supabase.rpc('p2d_bxh', { p_loai: kind });
  if (error) throw error;
  return data;
}

// Hồ sơ một người trên bảng (chạm tên): chỉ đọc qua p2d_xem_nguoi, k là mã công khai của người đó (không phải id thật)
export async function fetchPlayer(k) {
  const { data, error } = await supabase.rpc('p2d_xem_nguoi', { p_k: k });
  if (error) throw error;
  return data;
}
