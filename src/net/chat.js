// Chat theo kênh lưu trên máy chủ (kênh "the-gioi", sau này kênh bang): gửi và đọc qua hàm p2d_gui_chat, p2d_doc_chat.
import { supabase } from './client.js';

export async function sendChat(kenh, text) {
  const { error } = await supabase.rpc('p2d_gui_chat', { p_kenh: kenh, p_noi_dung: text });
  if (error) throw error;
}

export async function readChat(kenh, after = 0) {
  const { data, error } = await supabase.rpc('p2d_doc_chat', { p_kenh: kenh, p_sau: after });
  if (error) throw error;
  return data || [];
}
