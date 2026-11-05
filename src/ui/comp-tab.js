// Phần Khôi lỗi trong Túi đồ (trước là Đồng hành; chủ dự án đổi 02/11/2026 14:39): khôi lỗi đã mua (save.comps), mang theo
// tối đa 2 con, cấp, chỉ số (cộng lực chiến khi mang), tẩy luyện mở dòng như trang bị, bán lại. Mua ở Ngự Thú Sư.
// Thẻ là nút (chạm để mang / cất), dòng .skill-up sau thẻ là nút trong tấm chi tiết (src/ui/grid-cards.js gom vào).
import { compLevel, compNeed, togglePuppet } from '../game/companion.js';
import { isPuppet, puppetName, puppetPrice, sellPuppet } from '../game/beast-shop.js';
import { beastStats, statLine, linesText, rerollCost, costLine } from '../game/beast.js';
import { kyRerollBeast } from '../game/ky-thu.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let sure = null;
export function renderComps(game, list, { render, sub }) {
  const { data } = game, s = game.save, max = data.pets.shop.max_puppets;
  const ids = Object.keys(s.comps || {}).filter(id => isPuppet(game, id) && data.npcs[id]);
  const on = [s.companion, s.companion2].filter(Boolean);
  sub(`Đang mang ${on.length}/${max}. Chạm để mang theo / cất đi. Mua thêm ở Ngự Thú Sư.`);
  if (!ids.length) { list.append(el('p', 'muted', 'Chưa có khôi lỗi. Mua ở Ngự Thú Sư (Thiên Kiếm Phong).')); return; }
  const row = (text, fn, off) => { const r = el('div', 'card-acts skill-up'), b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); render(); }; r.append(b); return r; };
  for (const id of ids) {
    const d = data.companions.list[id], st = s.comps[id], lv = compLevel(game, id) || 1, using = on.includes(id);
    const c = el('button', 'skill-card' + (using ? ' using' : ''));
    c.style.borderLeftColor = d.color;
    c.dataset.icon = data.art.sprites['comp.' + id] ? 'comp.' + id : 'npc.' + id; c.dataset.iconSize = 46;
    c.dataset.act = on.length >= max ? 'Mang theo (thay con thứ 2)' : 'Mang theo'; c.dataset.used = 'Cất đi';
    c.append(el('b', null, `${puppetName(game, id)} · cấp ${lv}${using ? ' · đang mang' : ''}`),
      el('small', null, d.desc || ''),
      el('small', null, lv >= data.companions.max_level ? 'Đã tối đa cấp.' : `Kinh nghiệm ${Math.floor(st.exp || 0)}/${compNeed(data, lv)} (nhận một phần linh khí bạn thu khi mang theo)`),
      el('small', null, `Chỉ số (cộng lực chiến khi mang): ${statLine(data, beastStats(data, s, 'puppet', id))}`),
      ...linesText(data, st.lines).map(t => el('small', null, t)));
    c.onclick = () => { togglePuppet(game, id); game.sfx('pickup'); render(); };
    list.append(c);
    if (using) list.append(row('Cất đi', () => togglePuppet(game, id)));
    const full = Number.isInteger(st.cap) && (st.lines || []).length >= st.cap;
    list.append(row(full ? 'Đã đủ dòng' : `Tẩy luyện (${costLine(data, rerollCost(data, st))})`, () => kyRerollBeast(game, 'puppet', id).then(m => { game.toast(m, 2.4); render(); }), full));
    if (!using) {
      const price = puppetPrice(game, id).toLocaleString('vi-VN'), key = 'k:' + id;
      list.append(row(sure === key ? `Bấm lần nữa để bán (${price} Linh Thạch)` : `Bán ${price} Linh Thạch`, () => { if (sure !== key) { sure = key; return; } sure = null; game.toast(sellPuppet(game, id), 2.4); }));
    }
  }
}
