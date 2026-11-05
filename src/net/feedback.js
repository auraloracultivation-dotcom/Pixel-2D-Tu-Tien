// Báo lỗi, đề xuất của người chơi (supabase/migrations/20261029030000_p2d_gop_y.sql, ảnh ở kho Storage từ 20261105100000). Chỉ gửi khi đã đăng nhập;
// máy chủ kiểm tra độ dài, kiểu ảnh và chặn gửi dồn (10 lần liên tiếp mỗi 10 phút, 15 lần mỗi ngày).
import { supabase } from './client.js';

export async function loggedIn() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// f: { loai: 'loi' | 'de_xuat', tieu_de, mo_ta, anh, anh_nho (data URL JPEG), ngu_canh }. Trả { id } hoặc { error: mã lỗi }.
// Gửi qua Edge Function gop-y-anh (05/11/2026): hàm kiểm ảnh, gọi p2d_gui_gop_y_kho (cùng luật như trên) rồi cất ảnh vào kho
// riêng tư gop-y-anh thay cho chuỗi base64 trong cơ sở dữ liệu (supabase/migrations/20261105100000_p2d_anh_storage.sql).
export async function sendFeedback(f) {
  if (!(await loggedIn())) return { error: 'chua_dang_nhap' };
  const { data, error } = await supabase.functions.invoke('gop-y-anh', {
    body: { hanh_dong: 'gui', loai: f.loai, tieu_de: f.tieu_de, mo_ta: f.mo_ta || null, anh: f.anh, anh_nho: f.anh_nho || null, ngu_canh: f.ngu_canh || {} },
  });
  if (error) {
    try { const j = await error.context?.json?.(); if (j?.error) return { error: j.error }; } catch { /* không đọc được thân lỗi */ }
    return { error: 'net' };
  }
  if (data?.error) return { error: data.error };
  return data?.id ? { id: data.id } : { error: 'net' };
}

// 10 báo cáo gần nhất của mình: [{ id, loai, tieu_de, trang_thai, tra_loi, tao_luc }]
export async function myFeedback() {
  if (!(await loggedIn())) return [];
  const { data, error } = await supabase.rpc('p2d_gop_y_cua_toi');
  return error ? [] : data || [];
}
