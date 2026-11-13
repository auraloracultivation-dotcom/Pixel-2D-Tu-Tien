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

// Điểm hệ thống và triệu hồi quà (supabase/migrations/20261106080000_p2d_he_thong_qua.sql)
async function rpc(fn, args) { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; }
export const htStatus = () => rpc('p2d_ht_trang_thai');
export const htClaim = id => rpc('p2d_ht_nhan', { p_id: id });
export const htSummon = () => rpc('p2d_ht_trieu');
export const htAnswer = (id, chon) => rpc('p2d_ht_tra_loi', { p_id: id, p_chon: chon });
export const htWelcome = () => rpc('p2d_ht_qua_dau');   // quà gặp mặt, mỗi tài khoản một lần
export const htFeed = () => rpc('p2d_ht_vinh_danh');   // 10 lần quay đáng khoe gần nhất cả máy chủ
export const htMine = () => rpc('p2d_ht_ls_cua_toi');   // 50 lần triệu hồi gần nhất của mình (đề xuất #153)
export const htDaily = task => rpc('p2d_ht_ngay', { p_task: task });
