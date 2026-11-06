// Hỏi thêm trong Hệ Thống (supabase/migrations/20261106070000_p2d_ht_hoi.sql): gửi câu hỏi, xem câu mình đã hỏi (kèm trả lời nếu có).
import { supabase } from './client.js';

export async function askSystem(q, step) {
  const { error } = await supabase.rpc('p2d_ht_hoi_gui', { p_cau: q, p_buoc: step ?? null });
  if (error) throw error;
}
export async function myQuestions() {
  const { data, error } = await supabase.rpc('p2d_ht_hoi_cua_toi');
  if (error) throw error;
  return data || [];
}
