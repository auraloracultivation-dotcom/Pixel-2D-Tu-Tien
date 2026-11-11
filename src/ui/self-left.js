// Thẻ nhân vật bên trái bảng Nhân vật (src/ui/self-panel.js; chủ dự án 11/11/2026 01:47: khuôn bảng ngang thấp như mẫu gửi).
// Tên chính giữa phía trên; nhân vật đứng trên vòng pháp trận, cảnh giới chính giữa dưới chân (chủ dự án 11/11/2026 02:10), mỗi bên 4 ô đồ (thanh ngọc khảm dính dưới ô, src/ui/self-gear.js);
// cột phải ô 3 linh thú, ô 4 thú cưỡi; hàng 4 ô pháp bảo; dòng Lực Chiến (chạm: xem đủ chỉ số ở khung phải); 8 chỉ số chính.
import { heroLook } from '../render/draw-hero.js';
import { spriteIcon } from './sprite-icon.js';
import { realmLabel, rootOf } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { el } from './bag-detail.js';
import { gearCell, buffCell, uiIco } from './self-gear.js';

export const vn = n => Math.round(n || 0).toLocaleString('vi-VN');
export const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
// Chủ dự án 12/11/2026 03:04: linh thú đổi chỗ với pháp bảo (cột phải ô 3), thú cưỡi ô phải thứ 4; hàng 4 ô dưới dành cho pháp bảo
// (hệ Pháp Bảo Luyện Chế sắp ra: ô 1 là pháp bảo đang mặc, 3 ô còn khoá). 03:12: bỏ khôi lỗi khỏi thẻ (đứng sau lưng thì nhỏ, bị che);
// khôi lỗi xem ở mục Linh thú → Khôi lỗi. Nhân vật thu từ cao 76 xuống 64.
const LEFT = ['vu-khi', 'mu', 'giap', 'giay'], RIGHT = ['ngoc-boi', 'nhan', 'b:pet', 'b:mount'];   // 'b:': ô thú (buffCell)
const FABAO = ['phap-bao', 'spare', 'spare', 'spare'];

function column(game, side, slots, h) {
  const c = el('div', 'sv-col ' + side);
  for (const k of slots) {
    if (!k.startsWith('b:')) { c.append(gearCell(game, k, side, h.pick)); continue; }
    const w = el('div', 'sv-cell'); w.append(buffCell(game, k.slice(2), h.openExtra)); c.append(w);
  }
  return c;
}

// h: { pick(slot, it), openExtra(kind), rename(), stats() }; stt: chỉ số (playerStats).
// Hồ sơ người khác (src/ui/profile-panel.js): game là bản nhìn có save của người đó, h.name tên, h.cp lực chiến máy chủ ghi; không đổi tên
export function leftCard(game, stt, h) {
  const s = game.save, d = game.data, card = el('div', 'sv-card');
  const top = el('div', 'sv-top'), nm = el('button', 'sv-nm', h.name || game.cloud?.name || 'Đạo hữu');
  nm.onclick = h.rename || null;
  top.append(nm);
  const area = el('div', 'sv-hero-area'), mid = el('div', 'sv-center');
  // giữ đúng tỉ lệ hình (khung chibi rộng vì hiệu ứng chiêu: cắt bớt hai bên trong suốt, không ép bề ngang)
  const hero = spriteIcon(game, heroLook(game).sprite, 0, 64, 'sv-hero', true);
  hero.dataset.k = heroLook(game).sprite;   // cùng hình thì vá giữ canvas cũ (src/ui/morph.js), khỏi trống một khung
  mid.append(uiIco(d, 'ui.nv-nen', 'sv-nen'), uiIco(d, 'ui.nv-be', 'sv-be'), hero);   // nền phù văn xoay chậm sau lưng, bệ pháp trận dưới chân
  if (s.element) {
    const e = d.elements[s.element], seal = uiIco(d, 'ui.nv-' + s.element, 'sv-seal');   // huy hiệu ngũ hành (ảnh GPT 11/11/2026)
    seal.title = `Linh căn ${e.name} · ${rootOf(s, d).name}`; mid.append(seal);
  }
  area.append(column(game, 'l', LEFT, h), mid, column(game, 'r', RIGHT, h), el('span', 'sv-realm', realmLabel(s, d.realms)));   // cảnh giới giữa, dưới chân
  const buffs = el('div', 'sv-buffs');
  for (const k of FABAO) buffs.append(k === 'spare' ? buffCell(game, k, h.openExtra) : gearCell(game, k, 'b', h.pick));
  const cp = el('button', 'sv-cpbar');   // chạm: đủ chỉ số ở khung phải
  cp.append(uiIco(d, 'ui.nv-luc-chien', 'sv-cpico'), el('span', null, 'Lực Chiến'), el('b', null, vn(h.cp ?? power(game))), el('small', null, '›'));
  cp.onclick = h.stats;
  const grid = el('div', 'sv-grid');
  const row = (ic, k, v, cls) => { const r = el('div', 'sv-row ' + cls); r.append(uiIco(d, 'ui.nv-' + ic, 'sv-sico'), el('span', null, k), el('b', null, v)); grid.append(r); };
  row('hp', 'HP', vn(stt.maxHp), 'c-hp'); row('bao', 'Bạo kích', pct(stt.crit), 'c-cr');
  row('cong', 'Công', vn(stt.atk), 'c-atk'); row('st-bao', 'ST bạo', pct(stt.critMult), 'c-cr');
  row('thu', 'Thủ', vn(stt.def), 'c-def'); row('hoi-chieu', 'Hồi chiêu', pct(stt.cdr), 'c-mp');
  row('toc', 'Tốc độ', pct(stt.speedMul), 'c-spd'); row('hut-mau', 'Hút máu', pct(stt.lifesteal), 'c-hp');
  card.append(top, area, buffs, cp, grid);
  return card;
}

// Đủ chỉ số (chạm Lực Chiến), vẽ ở khung phải. cp: lực chiến người khác (hồ sơ): không có máu, linh lực hiện tại
export function statsSheet(game, stt, box, close, cp) {
  const p = cp == null ? game.player : null, head = el('div', 'sv-shead'), x = el('button', 'd-close', '✕');
  x.onclick = close;
  head.append(el('div', 'd-name', 'Tổng quan chỉ số'), x);
  const d = game.data, list = el('div', 'sv-allstats');
  const row = (ic, k, v) => { const r = el('div', 'sv-row'); r.append(uiIco(d, 'ui.nv-' + ic, 'sv-sico'), el('span', null, k), el('b', null, v)); list.append(r); };
  row('luc-chien', 'Lực chiến', vn(cp ?? power(game))); row('hp', 'Sinh lực', p ? `${vn(p.hp)}/${vn(stt.maxHp)}` : vn(stt.maxHp)); if (p) row('linh-luc', 'Linh lực', `${vn(p.mp)}/${vn(p.mpMax)}`);
  row('cong', 'Công', vn(stt.atk)); row('thu', 'Phòng ngự', vn(stt.def)); row('bao', 'Bạo kích', pct(stt.crit)); row('st-bao', 'Sát thương bạo', pct(stt.critMult));
  row('hoi-chieu', 'Giảm hồi chiêu', pct(stt.cdr)); row('toc', 'Tốc chạy', pct(stt.speedMul)); row('tu-luyen', 'Tốc tu', `×${stt.qiMul.toFixed(2)}`);
  row('hut-mau', 'Hút máu', pct(stt.lifesteal)); row('phan-don', 'Phản đòn', pct(stt.thorns)); row('hoi-mau', 'Hồi máu', `${vn(stt.regen)}/giây`);
  row('giam-st', 'Giảm sát thương', pct(stt.dr)); row('linh-luc', 'Hồi linh lực', `${Math.round((d.config.mana.regen_pct + stt.mpRegen) * 1000) / 10}%/giây`);
  box.replaceChildren(head, list);
  return true;
}
