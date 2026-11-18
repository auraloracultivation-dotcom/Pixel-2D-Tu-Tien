// Bảng tổng kết Hòm thư khi bấm "Đọc hết" (chủ dự án 18/11/2026 00:07: "hiện một cái bảng giống như lúc giết xong boss bí cảnh,
// tổng kết thư nhận được; không chạm ra ngoài màn hình hoặc dấu X thì không tự đóng"). Gộp quà của các thư chưa đọc (món quà
// có cấu trúc do src/game/market.js claimMail gắn vào tin), cùng kiểu ô với bảng kết quả bí cảnh (src/ui/dun-result.js lootCell).
// Chữ ở data/inbox.json → text (sum_*). Không đóng theo giờ.
import { el } from './bag-detail.js';
import { lootCell } from './dun-result.js';

// Gộp quà: Linh Thạch, Tiên Ngọc cộng dồn; đan, nguyên liệu, ngọc cộng theo mã; trang bị, thú, khôi lỗi, trang phục liệt kê từng món
export function sumGifts(items) {
  const out = [], by = new Map();
  for (const it of items) for (const g of it.gift || []) {
    if (g.kind === 'item' || g.kind === 'name') { out.push(g); continue; }
    const k = g.kind + ':' + (g.id || '');
    if (by.has(k)) by.get(k).n += g.n || 0; else { const x = { ...g, n: g.n || 0 }; by.set(k, x); out.push(x); }
  }
  const order = { coins: 0, tn: 1, item: 2, name: 3, gem: 4, pill: 5, mat: 6 };
  return out.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
}

export function createMailSum(game) {
  const T = game.data.inbox.text;
  const bg = el('div', 'ms-bg'); bg.hidden = true;
  const root = el('div', 'panel dr-panel ms-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), title = el('b'), x = el('button', 'mini', T.close), grid = el('div', 'dr-grid'), note = el('div', 'muted tiny dr-note');
  head.append(title, x);
  root.append(head, grid, note);
  document.body.append(bg, root);
  const close = () => { root.hidden = true; bg.hidden = true; game.uiOpen = !!document.querySelector('.panel:not([hidden])'); };
  x.onclick = close;
  bg.addEventListener('pointerdown', e => { e.stopPropagation(); close(); });   // chạm ra ngoài bảng thì đóng
  root.addEventListener('pointerdown', e => e.stopPropagation());
  game.openMailSum = (n, gifts) => {
    title.textContent = T.sum_title.replace('{n}', n);
    grid.replaceChildren(...gifts.map(g => lootCell(game, g)));
    if (!gifts.length) grid.append(el('div', 'muted', T.sum_empty));
    note.textContent = T.sum_hint;
    bg.hidden = false; root.hidden = false; game.uiOpen = true;
    game.sfx?.(gifts.length ? 'levelup' : 'pickup');
  };
}
