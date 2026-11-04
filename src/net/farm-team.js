// Tổ đội farm ngoài thế giới mở (supabase/migrations/20261104090000_p2d_doi_farm.sql). Chỉ gọi hàm máy chủ, không ghi bảng.
// Thành viên, người xin vào gọi bằng mã công khai k. Lỗi trả Error(mã lỗi máy chủ) như 'trung_ten', 'day'; mất mạng là 'net'.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(code(error));
  return data;
}
export const teamBeat = map => rpc('p2d_doi_nhip', { p_ban_do: map });   // nhịp + danh sách
export const teamList = map => rpc('p2d_doi_ds', { p_ban_do: map });
export const teamCreate = (name, map) => rpc('p2d_doi_lap', { p_ten: name, p_ban_do: map });
export const teamJoin = (id, map) => rpc('p2d_doi_vao', { p_doi: id, p_ban_do: map });
export const teamDecide = (k, yes) => rpc('p2d_doi_duyet', { p_k: k, p_nhan: !!yes });
export const teamKick = k => rpc('p2d_doi_moi_ra', { p_k: k });
export const teamLeave = () => rpc('p2d_doi_roi');
export const teamMode = mode => rpc('p2d_doi_che_do', { p_che_do: mode });
