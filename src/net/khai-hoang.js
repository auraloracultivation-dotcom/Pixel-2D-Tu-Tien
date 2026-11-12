// Khai Hoang Tinh Cầu: gọi các hàm p2d_kh_* (supabase/migrations/20261112130000_p2d_khai_hoang.sql). Máy chủ kiểm hết (tông chủ,
// cảnh giới, kho đủ mảnh và Linh Thạch, vé trận, thời gian trận); máy khách chỉ gửi yêu cầu.
import { supabase } from './client.js';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const khCalls = {
  list: () => rpc('p2d_kh_ds'),                                           // tinh cầu đang hiện trên Vành Khai Hoang (ai cũng đọc)
  mine: () => rpc('p2d_kh_toi'),                                          // kho, người góp nhiều, tinh cầu và trận của tông môn mình
  give: (manh, lt) => rpc('p2d_kh_gop', { p_manh: manh, p_lt: lt }),      // góp vào kho: trừ trong bản lưu trên máy chủ
  open: (ten, dat) => rpc('p2d_kh_mo_tran', { p_ten: ten || '', p_dat: dat || '' }),   // tông chủ mở trận Khai Tinh / nâng cấp
  win: ve => rpc('p2d_kh_thang', { p_ve: ve }),                           // tông chủ hạ trùm: máy chủ trừ kho, khai / nâng cấp
  lose: ve => rpc('p2d_kh_thua', { p_ve: ve }),
  visit: id => rpc('p2d_kh_ghe', { p_id: id }),                           // thành viên ghé tinh cầu của mình (giữ khỏi ma khí)
};
