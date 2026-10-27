// Truyền âm (supabase/migrations/20261028100000_p2d_truyen_am.sql): nhắn riêng cho người có mã chat k.
import { supabase } from './client.js';

export async function sendWhisper(k, text) {
  const { error } = await supabase.rpc('p2d_gui_truyen_am', { p_k: k, p_noi_dung: text });
  if (error) throw error;
}

export async function readWhispers(after = 0) {
  const { data, error } = await supabase.rpc('p2d_doc_truyen_am', { p_sau: after });
  if (error) throw error;
  return data || [];
}

export async function markWhispers(k) {
  const { error } = await supabase.rpc('p2d_da_doc_truyen_am', { p_k: k });
  if (error) throw error;
}
