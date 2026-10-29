// Sự kiện giới thiệu và thưởng góp ý (supabase/migrations/20261029070000_p2d_gioi_thieu.sql, 20261029071000_p2d_thuong_gop_y.sql).
// Chỉ đọc trạng thái, nhập mã, chọn loại ngọc, gửi nhịp online; máy chủ tự đếm phút và tự gửi ngọc qua Hòm thư.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';

async function call(fn, args) {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return { error: 'chua_dang_nhap' };
  const { data, error } = await supabase.rpc(fn, args);
  return error ? { error: code(error) } : { data };
}

export const myReferral = () => call('p2d_gt_cua_toi');
export const enterCode = (ma, loai) => call('p2d_gt_nhap', { p_ma: ma, p_loai: loai }).then(r => (r.data?.loi ? { error: r.data.loi } : r));   // trùng máy: máy chủ trả {loi}
export const reportDevice = may => call('p2d_thiet_bi_bao', { p_may: may });
export const pickGem = loai => call('p2d_gt_chon', { p_loai: loai });
export const beat = () => call('p2d_gt_nhip');
export const fameRank = () => call('p2d_bxh_gop_y');
