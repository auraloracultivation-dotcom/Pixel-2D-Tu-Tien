// Đạo lữ giữa hai người chơi (supabase/migrations/20261102160000_p2d_dao_lu.sql). Chỉ dùng mã công khai k.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(code(error));
  return data;
}
export const daoLuState = () => rpc('p2d_dao_lu_tt');
export const daoLuInvite = k => rpc('p2d_dao_lu_moi', { p_k: k });
export const daoLuCancel = k => rpc('p2d_dao_lu_huy', { p_k: k });
export const daoLuGift = (loai, mon) => rpc('p2d_dl_tang2', { p_loai: loai, p_mon: mon });   // bản 2: tặng được cả trang bị Đạo Vận (20261102180000_p2d_dl_tang2.sql)
