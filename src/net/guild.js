// Tông môn người chơi: gọi các hàm p2d_bang_* (supabase/migrations/20261028010000_p2d_tong_mon.sql).
// Máy chủ kiểm tra hết (cảnh giới, Linh Thạch, chức vụ, số người); máy khách chỉ gửi yêu cầu.
import { supabase } from './client.js';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const guildCalls = {
  mine: () => rpc('p2d_bang_toi'),
  list: tim => rpc('p2d_bang_ds', { p_tim: tim || '' }),
  create: (ten, moTa) => rpc('p2d_bang_lap', { p_ten: ten, p_mo_ta: moTa }),
  join: id => rpc('p2d_bang_xin_vao', { p_bang: id }),
  review: (k, ok) => rpc('p2d_bang_duyet', { p_k: k, p_dong_y: ok }),
  role: (k, chuc) => rpc('p2d_bang_chuc', { p_k: k, p_chuc: chuc }),
  kick: k => rpc('p2d_bang_duoi', { p_k: k }),
  leave: () => rpc('p2d_bang_roi'),
  edit: (moTa, mo) => rpc('p2d_bang_sua', { p_mo_ta: moTa, p_mo: mo }),
  checkin: () => rpc('p2d_bang_diem_danh'),
  donate: lt => rpc('p2d_bang_gop', { p_lt: lt }),
  claim: i => rpc('p2d_bang_nhan', { p_moc: i }),
};
