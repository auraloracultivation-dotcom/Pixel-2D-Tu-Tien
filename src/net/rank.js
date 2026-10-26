// Bảng xếp hạng: chỉ đọc qua hàm p2d_bxh (supabase/migrations). Máy chủ tự lấy lực chiến, cảnh giới, tháp từ bản lưu.
import { supabase } from './client.js';

export async function fetchRank(kind) {
  const { data, error } = await supabase.rpc('p2d_bxh', { p_loai: kind });
  if (error) throw error;
  return data;
}
