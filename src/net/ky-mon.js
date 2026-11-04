// Tẩy luyện, cường hoá, đổi hệ do máy chủ quyết (supabase/migrations/20261105010000_p2d_ky_mon.sql): máy chủ tung, trừ tiền trên
// bản lưu máy chủ, ký lại món, trả { mon, tru, phien_ban, ... }. Máy chủ chưa có hàm (chưa chạy migration) thì báo 'chua_co_ham'
// để game tính ở máy như cũ.
import { supabase } from './client.js';

async function call(fn, uid) {
  const { data, error } = await supabase.rpc(fn, { p_uid: uid });
  if (error) {
    if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message || '')) throw new Error('chua_co_ham');
    throw error;
  }
  return data;
}

export const kyCalls = {
  reroll: uid => call('p2d_tay_luyen', uid),
  enhance: uid => call('p2d_cuong_hoa', uid),
  rerollEl: uid => call('p2d_doi_he', uid),
};
