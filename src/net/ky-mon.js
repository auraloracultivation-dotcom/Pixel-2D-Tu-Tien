// Tẩy luyện, cường hoá, đổi hệ (supabase/migrations/20261105010000_p2d_ky_mon.sql), khảm / gỡ / ghép ngọc, luyện pháp bảo
// (20261105020000_p2d_ky_ngoc.sql) do máy chủ quyết: máy chủ tung, trừ tiền trên bản lưu máy chủ, ký lại món, trả
// { mon, tru, doi (ngọc thêm / bớt), phien_ban, ... }. Máy chủ chưa có hàm (chưa chạy migration) thì báo 'chua_co_ham'
// để game tính ở máy như cũ.
import { supabase } from './client.js';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message || '')) throw new Error('chua_co_ham');
    throw error;
  }
  return data;
}

export const kyCalls = {
  reroll: uid => call('p2d_tay_luyen', { p_uid: uid }),
  enhance: uid => call('p2d_cuong_hoa', { p_uid: uid }),
  rerollEl: uid => call('p2d_doi_he', { p_uid: uid }),
  socket: (uid, o, key) => call('p2d_kham_ngoc', { p_uid: uid, p_o: o, p_ngoc: key }),
  unsocket: (uid, o) => call('p2d_go_ngoc', { p_uid: uid, p_o: o }),
  merge: (key, keep, n) => call('p2d_ghep_ngoc', { p_ngoc: key, p_giu: keep, p_lan: n }),
  refine: uid => call('p2d_luyen_phap_bao', { p_uid: uid }),
};
