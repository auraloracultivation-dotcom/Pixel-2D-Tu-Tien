// Điểm danh ngày, tuần, tháng, quý (data/checkin.json): máy chủ ghi ngày, đếm mốc, gửi quà qua Hòm thư;
// quà nằm ở Hòm thư tới khi người chơi bấm Nhận (src/game/mail.js, chủ dự án 06/11/2026).
import { refreshMail } from './mail.js';

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
    try { await refreshMail(game); } catch { /* lần đọc sau */ }
    const moc = (r.data.moc || []).map(k => game.data.checkin.names[k]).filter(Boolean);
    return { msg: moc.length ? T.ok_moc.replace('{list}', moc.join(', ')) : T.ok, ok: true };
  } finally { busy = false; }
}
