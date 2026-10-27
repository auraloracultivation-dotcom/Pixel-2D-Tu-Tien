// Bang người chơi: chỉ gọi các hàm p2d_* có kiểm tra (supabase/migrations/20261027120000_p2d_bang.sql).
import { supabase } from './client.js';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const myGuild = () => call('p2d_bang_cua_toi');
export const findGuilds = q => call('p2d_tim_bang', { p_tim: q || '' });
export const createGuild = name => call('p2d_lap_bang', { p_ten: name });
export const joinGuild = id => call('p2d_vao_bang', { p_id: id });
export const leaveGuild = () => call('p2d_roi_bang');
export const setRank = (uid, rank) => call('p2d_doi_chuc', { p_uid: uid, p_chuc: rank });
export const kick = uid => call('p2d_duoi', { p_uid: uid });
export const setNotice = text => call('p2d_bang_thong_bao', { p_chu: text });
export const contribute = (task, n) => call('p2d_bang_gop', { p_viec: task, p_n: n });
export const claimTask = task => call('p2d_bang_nhan_thuong', { p_viec: task });
