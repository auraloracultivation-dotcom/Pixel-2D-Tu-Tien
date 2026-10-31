// Đại Ma Thần (supabase/migrations/20261031050000_p2d_thien_ma.sql): xem ai đang xuất thế, khiêu chiến (máy chủ phân xử thắng thua).
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';

export async function tmList() {
  const { data, error } = await supabase.rpc('p2d_thien_ma_xem');
  if (error) throw error;
  return data || [];
}

export async function tmChallenge(id) {
  const { data, error } = await supabase.rpc('p2d_thien_ma_khieu_chien', { p_tm: id });
  if (error) throw new Error(code(error));
  return data;
}
