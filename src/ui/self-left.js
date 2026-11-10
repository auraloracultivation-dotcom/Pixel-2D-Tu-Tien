// Thẻ nhân vật bên trái bảng Nhân vật (src/ui/self-panel.js; chủ dự án 11/11/2026 01:47: khuôn bảng ngang thấp như mẫu gửi).
// Tên · cảnh giới; nhân vật đứng trên vòng pháp trận, mỗi bên 4 ô đồ (thanh ngọc khảm dính dưới ô, src/ui/self-gear.js);
// hàng linh thú / khôi lỗi / thú cưỡi / ô chừa; dòng Lực Chiến (chạm: xem đủ chỉ số ở khung phải); 8 chỉ số chính.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { realmLabel, rootOf } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { el } from './bag-detail.js';
import { gearCell, buffCell, uiIco } from './self-gear.js';

export const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
export const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
const LEFT = ['vu-khi', 'mu', 'giap', 'giay'], RIGHT = ['ngoc-boi', 'nhan', 'phap-bao', null];   // null: ô chừa (chủ dự án 11/11 01:07)
const BUFFS = ['pet', 'comp', 'comp2', 'mount', 'spare'];
const HAN = { kim: '金', moc: '木', thuy: '水', hoa: '火', tho: '土' };

function column(game, side, slots, h) {
  const c = el('div', 'sv-col ' + side);
  for (const k of slots) {
    if (k) { c.append(gearCell(game, k, side, h.pick)); continue; }
    const w = el('div', 'sv-cell'), b = el('button', 'sv-slot spare'); b.disabled = true; b.title = 'Sắp mở';
    b.append(uiIco(game.data, 'ui.ic-khoa')); w.append(b); c.append(w);
  }
  return c;
}

// h: { pick(slot, it), openExtra(kind), rename(), stats() }; stt: chỉ số (playerStats)
export function leftCard(game, stt, h) {
  const s = game.save, d = game.data, card = el('div', 'sv-card');
  const top = el('div', 'sv-top'), nm = el('button', 'sv-nm', game.cloud?.name || 'Đạo hữu');
  nm.onclick = h.rename;
  top.append(nm, el('span', 'sv-realm', realmLabel(s, d.realms)));
  const area = el('div', 'sv-hero-area'), mid = el('div', 'sv-center');
  mid.append(el('i', 'sv-circle'), spriteIcon(game, heroLook(game).sprite, 0, 78, 'sv-hero', true));
  if (s.element) {
    const e = d.elements[s.element], seal = el('span', 'sv-seal', HAN[s.element] || '?');
    seal.style.setProperty('--e', e.color); seal.title = `Linh căn ${e.name} · ${rootOf(s, d).name}`; mid.append(seal);
  }
  area.append(column(game, 'l', LEFT, h), mid, column(game, 'r', RIGHT, h));
  const buffs = el('div', 'sv-buffs');
  for (const k of BUFFS) buffs.append(buffCell(game, k, h.openExtra));
  const cp = el('button', 'sv-cpbar');   // chạm: đủ chỉ số ở khung phải
  cp.append(el('i', null, '⚔'), el('span', null, 'Lực Chiến'), el('b', null, vn(power(game))), el('small', null, '›'));
  cp.onclick = h.stats;
  const grid = el('div', 'sv-grid');
  const row = (ic, k, v, cls) => { const r = el('div', 'sv-row ' + cls); r.append(el('i', null, ic), el('span', null, k), el('b', null, v)); grid.append(r); };
  row('❤', 'HP', vn(stt.maxHp), 'c-hp'); row('★', 'Bạo kích', pct(stt.crit), 'c-cr');
  row('⚔', 'Công', vn(stt.atk), 'c-atk'); row('✸', 'ST bạo', pct(stt.critMult), 'c-cr');
  row('⛨', 'Thủ', vn(stt.def), 'c-def'); row('⟳', 'Hồi chiêu', pct(stt.cdr), 'c-mp');
  row('➤', 'Tốc độ', pct(stt.speedMul), 'c-spd'); row('✚', 'Hút máu', pct(stt.lifesteal), 'c-hp');
  card.append(top, area, buffs, cp, grid);
  return card;
}

// Đủ chỉ số (chạm Lực Chiến), vẽ ở khung phải
export function statsSheet(game, stt, box, close) {
  const p = game.player, head = el('div', 'sv-shead'), x = el('button', 'd-close', '✕');
  x.onclick = close;
  head.append(el('div', 'd-name', 'Tổng quan chỉ số'), x);
  const list = el('div', 'sv-allstats'), row = (k, v) => { const r = el('div', 'sv-row'); r.append(el('span', null, k), el('b', null, v)); list.append(r); };
  row('Lực chiến', vn(power(game))); row('Sinh lực', `${vn(p?.hp)}/${vn(stt.maxHp)}`); row('Linh lực', `${vn(p?.mp)}/${vn(p?.mpMax)}`);
  row('Công', vn(stt.atk)); row('Phòng ngự', vn(stt.def)); row('Bạo kích', pct(stt.crit)); row('Sát thương bạo', pct(stt.critMult));
  row('Giảm hồi chiêu', pct(stt.cdr)); row('Tốc chạy', pct(stt.speedMul)); row('Tốc tu', `×${stt.qiMul.toFixed(2)}`);
  row('Hút máu', pct(stt.lifesteal)); row('Phản đòn', pct(stt.thorns)); row('Hồi máu', `${vn(stt.regen)}/giây`);
  row('Giảm sát thương', pct(stt.dr)); row('Hồi linh lực', `${Math.round((game.data.config.mana.regen_pct + stt.mpRegen) * 1000) / 10}%/giây`);
  box.replaceChildren(head, list);
  return true;
}
