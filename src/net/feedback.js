// Báo lỗi, đề xuất của người chơi (supabase/migrations/20261029030000_p2d_gop_y.sql). Chỉ gửi khi đã đăng nhập;
// máy chủ kiểm tra độ dài, kiểu ảnh và chặn gửi dồn (3 lần mỗi 10 phút, 15 lần mỗi ngày).
import { supabase } from './client.js';

export async function loggedIn() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// f: { loai: 'loi' | 'de_xuat', tieu_de, mo_ta, anh, anh_nho (data URL JPEG), ngu_canh }. Trả { id } hoặc { error: mã lỗi }
export async function sendFeedback(f) {
  if (!(await loggedIn())) return { error: 'chua_dang_nhap' };
  const { data, error } = await supabase.rpc('p2d_gui_gop_y', {
    p_loai: f.loai, p_tieu_de: f.tieu_de, p_mo_ta: f.mo_ta || null, p_anh: f.anh, p_anh_nho: f.anh_nho || null, p_ngu_canh: f.ngu_canh || {},
  });
  if (error) return { error: (error.message || '').match(/[a-z_]+/)?.[0] || 'net' };
  return { id: data };
}

// 10 báo cáo gần nhất của mình: [{ id, loai, tieu_de, trang_thai, tra_loi, tao_luc }]
export async function myFeedback() {
  if (!(await loggedIn())) return [];
  const { data, error } = await supabase.rpc('p2d_gop_y_cua_toi');
  return error ? [] : data || [];
}
