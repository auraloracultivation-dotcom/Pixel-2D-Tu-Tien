// Kết bạn, thăm nhà bạn (supabase/migrations/20261102032000_p2d_ban_be.sql). Chỉ dùng mã công khai k của người chơi.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(code(error));
  return data;
}
export const friendList = () => rpc('p2d_ban_be_ds');
export const addFriend = k => rpc('p2d_ket_ban', { p_k: k });
export const removeFriend = k => rpc('p2d_huy_ban', { p_k: k });
export const visitHouse = k => rpc('p2d_tham_nha', { p_k: k });
