// Điểm danh ngày, tuần, tháng, quý (data/checkin.json): máy chủ ghi ngày, đếm mốc, gửi quà qua Hòm thư;
// điểm danh xong thì nhận thư ngay (claimMail) để Linh Thạch, ngọc vào túi liền.
import { claimMail } from './market.js';

const net = () => import('../net/checkin.js');
let state = null, busy = false;   // trạng thái lần đọc gần nhất (một phiên chơi)

export const checkinOn = game => !!(game.online && game.cloud && game.save);
export const checkinCached = () => state;

export async function loadCheckin(game) {
  if (!checkinOn(game)) return { error: 'chua_dang_nhap' };
  const r = await (await net()).checkinState();
  if (r.data) state = r.data;
  return r;
}

// Trả { msg } để bảng hiện chữ
export async function doCheckin(game) {
  const T = game.data.checkin.text;
  if (busy) return { msg: '' };
  if (!checkinOn(game)) return { msg: T.err.chua_dang_nhap };
  busy = true;
  try {
    const r = await (await net()).checkIn();
    if (r.error) return { msg: T.err[r.error] || T.err.net };
    state = r.data;
    if (r.data.loi) return { msg: T.err[r.data.loi] || T.err.net };
    try { await claimMail(game); } catch { /* thư còn đó, lần tự nhận sau sẽ lấy */ }
    const moc = (r.data.moc || []).map(k => game.data.checkin.names[k]).filter(Boolean);
    return { msg: moc.length ? T.ok_moc.replace('{list}', moc.join(', ')) : T.ok, ok: true };
  } finally { busy = false; }
}
