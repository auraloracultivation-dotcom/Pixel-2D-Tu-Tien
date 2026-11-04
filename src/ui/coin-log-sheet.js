// Túi đồ → nút "Lịch sử" cạnh số Linh Thạch: tấm trượt lên từ đáy túi (#bag-sheet, như chi tiết đồ) liệt kê thay đổi
// Linh Thạch mới nhất trước: giờ, số +xanh / −đỏ, lý do, số dư sau. Dữ liệu ở src/game/coin-log.js, chữ ở data/shop.json → coin_log.
import { el } from './bag-detail.js';
import { coinLog } from '../game/coin-log.js';

const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function renderCoinLog(game, box, close) {
  const L = game.data.shop.coin_log, list = coinLog();
  box.innerHTML = '';
  const head = el('div', 'd-head'), txt = el('div', 'd-name'), x = el('button', 'd-close', '✕');
  x.setAttribute('aria-label', 'Đóng lịch sử'); x.onclick = close;
  txt.append(el('div', 'd-title', L.title), el('div', 'd-sub', L.sub.replace('{n}', list.length)));
  head.append(txt, x);
  box.append(head);
  if (!list.length) { box.append(el('p', 'muted', L.empty)); return true; }
  const rows = el('div', 'coinlog');
  let day = '';
  for (const e of list) {
    const d = new Date(e.t).toLocaleDateString('vi-VN');
    if (d !== day) { day = d; rows.append(el('div', 'coinlog-day', d)); }   // mỗi ngày một dòng ngày, đỡ nhầm giờ hôm qua
    const r = el('div', 'coinlog-row');
    r.append(el('span', 'coinlog-t', hhmm(e.t)),
      el('span', 'coinlog-why', (L.why[e.k] || L.why.khac) + (e.c > 1 ? ` ×${e.c}` : '')),
      el('b', 'coinlog-n ' + (e.n > 0 ? 'up' : 'down'), (e.n > 0 ? '+' : '−') + vn(Math.abs(e.n))),
      el('small', 'coinlog-b', L.after.replace('{b}', vn(e.b))));
    rows.append(r);
  }
  box.append(rows);
  return true;
}
