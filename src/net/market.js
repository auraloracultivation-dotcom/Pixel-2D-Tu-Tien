// Chợ trao đổi và hòm thư: chỉ gọi các hàm p2d_* có kiểm tra (supabase/migrations/20261027110000_p2d_cho.sql).
import { supabase } from './client.js';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const listMarket = loai => call('p2d_xem_cho', { p_loai: loai || null });
export const postListing = (loai, mon, gia) => call('p2d_dang_ban', { p_loai: loai, p_mon: mon, p_gia: gia });
export const cancelListing = id => call('p2d_huy_ban', { p_id: id });
export const buyListing = id => call('p2d_mua', { p_id: id });
export const peekMail = () => call('p2d_xem_thu');
export const takeMail = ids => call('p2d_nhan_thu', { p_ids: ids });
