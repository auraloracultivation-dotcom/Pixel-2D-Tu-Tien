// Chợ trao đổi và hòm thư: chỉ gọi các hàm p2d_* có kiểm tra (supabase/migrations: p2d_cho, p2d_chong_gian_lan).
// Rao bán chỉ gửi mã số món (máy chủ tự lấy món trong bản lưu trên máy chủ); các lệnh sửa bản lưu trả phien_ban mới.
import { supabase } from './client.js';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const listMarket = loai => call('p2d_xem_cho', { p_loai: loai || null });
export const postListing = (loai, mon, gia) => call('p2d_rao_ban', { p_loai: loai, p_mon: mon, p_gia: gia });
export const cancelListing = id => call('p2d_huy_ban', { p_id: id });
export const buyListing = id => call('p2d_mua_hang', { p_id: id });
export const peekMail = () => call('p2d_xem_thu');
export const takeMail = (ids, uidFrom) => call('p2d_nhan_thu_moi', { p_ids: ids, p_uid_tu: uidFrom ?? null });
