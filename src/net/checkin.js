// Điểm danh ngày, tuần, tháng, quý (supabase/migrations/20261030050000_p2d_diem_danh.sql): máy chủ ghi ngày, đếm mốc, gửi quà qua Hòm thư.
import { supabase } from './client.js';

const code = e => (e?.message || '').match(/[a-z_]+/)?.[0] || 'net';

async function call(fn) {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return { error: 'chua_dang_nhap' };
  const { data, error } = await supabase.rpc(fn);
  return error ? { error: code(error) } : { data };
}

export const checkinState = () => call('p2d_diem_danh_xem');
export const checkIn = () => call('p2d_diem_danh');
