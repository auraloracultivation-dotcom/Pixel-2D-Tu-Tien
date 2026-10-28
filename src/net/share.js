// Quà chia sẻ clip: gửi link bài đăng cho hàm chia-se-clip (supabase/functions). Máy chủ xem bài có công khai và có tag
// không, rồi cộng ngọc thẳng vào bản lưu trên máy chủ. Trả về { gem, phien_ban } hoặc { error: mã lỗi }.
import { supabase } from './client.js';

export async function claimShareGift(url, loai) {
  const { data, error } = await supabase.functions.invoke('chia-se-clip', { body: { url, loai } });
  if (error) {
    try { const j = await error.context?.json?.(); if (j?.error) return { error: j.error }; } catch { /* không đọc được thân lỗi */ }
    return { error: 'loi' };
  }
  return data || { error: 'loi' };
}
