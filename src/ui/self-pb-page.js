// Mục Pháp bảo trong Trang bị (chủ dự án 12/11/2026 04:07: "toàn bộ luyện chế gọn như các mục nâng cấp trang bị, nằm trong Trang bị → mục
// Pháp bảo, không kéo ra màn khác"; thay bảng Luyện chế nổi cũ). Lưới: mọi pháp bảo của ta; chạm: tấm chi tiết như trang bị (đầu tấm, lưới
// nút Mặc ô 1–4 / Nâng cấp / Đục ô, 4 ô khảm nối mũi tên, danh sách chiêu khảm). Số, chữ ở data/phap-bao.json; logic src/game/phap-bao.js.
import { PB, pbState, pbItem, pbType, pbGrade, pbItemStats, modOpen, modNeed, pbWear, pbSocket, pbUpgrade, pbUpCost, pbCap, pbDrill, pbMax, slotOpen, wearN } from '../game/phap-bao.js';
import { pbIcon } from './phap-bao-hud.js';
import { el } from './bag-detail.js';
import { uiIco } from './self-gear.js';

const PCT = new Set(['speed', 'atk_pct', 'hp_pct', 'crit', 'crit_dmg', 'cdr', 'dr', 'regen_pct', 'mp_regen']);
const ico = (game, id, f, cls) => { const i = el('i', cls); i.style.backgroundImage = pbIcon(game, id, f || 0, 48); return i; };
let tries = 0;
const later = (box, redo) => { if ([...box.querySelectorAll('.spb-ic')].some(i => !i.style.backgroundImage) && tries++ < 12) setTimeout(() => { if (box.isConnected) redo(); }, 300); else if (tries > 12) tries = 0; };

// Lưới pháp bảo (thay lưới đồ khi đang ở mục Pháp bảo); bar: dòng dưới (đá, Linh Thạch)
export function pbGrid(game, st, box, bar, redo) {
  const D = PB(game), s = pbState(game), wrap = el('div', 'spb-wrap'), grid = el('div', 'sv-bag-grid spb-grid');
  if (!s.items.length) wrap.append(el('p', 'spb-note', D.ui.page_none));
  for (const it of s.items) {
    const T = pbType(game, it), g = pbGrade(game, it), at = s.wear.indexOf(it.uid), b = el('button', 'sv-slot buff spb-cell');
    b.dataset.o = 'pb'; b.style.setProperty('--q', g.color);
    b.append(el('i', 'sv-bfr'), ico(game, T.icon, T.icon_f, 'spb-ic sv-pbi'));
    if (it.lv) b.append(el('b', 'sv-plus', '+' + it.lv));
    b.append(el('span', 'spb-slots', '◆' + it.slots));
    if (at >= 0 && slotOpen(game, at)) b.append(el('span', 'spb-at', String(at + 1)));
    b.title = `${T.name} · ${g.name}`;
    b.onclick = () => { st.pbSel = it.uid; st.pbK = 0; redo(); };
    grid.append(b);
  }
  wrap.append(grid, el('p', 'spb-note', D.ui.pick));
  box.replaceChildren(wrap);
  bar.replaceChildren(el('div', 'spb-bar', `${D.drill.name}: ${s.stones || 0} · Linh Thạch: ${(game.save.lingshi || 0).toLocaleString('vi-VN')}`));
  later(box, redo);
}

// Tấm chi tiết một pháp bảo; trả false nếu món không còn
export function pbSheet(game, st, box, changed, close) {
  const D = PB(game), U = D.ui, it = pbItem(game, st.pbSel);
  if (!it) return false;
  const T = pbType(game, it), g = pbGrade(game, it), s = pbState(game), cap = pbCap(game), max = pbMax(game);
  st.pbK = Math.min(st.pbK || 0, Math.max(0, it.slots - 1));
  const head = el('div', 'd-head'), nm = el('div', 'd-name'), x = el('button', 'd-close', '✕');
  const title = el('div', 'd-title', T.name); title.style.color = g.color;
  nm.append(title, el('div', 'd-sub', `Phẩm ${g.name} · ${D.groups[T.group]} · cấp ${it.lv || 0}/${cap} · ${it.slots}/${max} ô`));
  x.onclick = close;
  const big = ico(game, T.icon, T.icon_f, 'ico spb-ic spb-big'); big.style.borderColor = g.color;
  head.append(big, nm, x);
  box.replaceChildren(head);
  if (st.pbMsg) { box.append(el('div', 'd-msg', st.pbMsg)); st.pbMsg = ''; }
  const say = m => { st.pbMsg = m || ''; changed(); };
  // nút: Mặc ô 1–4, Nâng cấp, Đục ô
  const acts = el('div', 'd-acts d-grid spb-acts');
  const btn = (name, small, fn, off, on, icoKey) => {
    const b = el('button', 'act-btn' + (on ? ' primary' : '')); b.disabled = !!off; b.onclick = fn;
    if (icoKey) b.append(uiIco(game.data, 'ui.nv-' + icoKey, 'sv-aico'));
    b.append(el('b', null, name)); if (small) b.append(el('small', null, small));
    acts.append(b);
  };
  const at = s.wear.indexOf(it.uid);
  for (let i = 0; i < wearN(game); i++) {
    if (!slotOpen(game, i)) { btn(U.wear_to.replace('{i}', i + 1), U.slot_lock.replace('{realm}', game.data.realms.names[D.slot4_realm]), () => {}, true); continue; }
    btn(at === i ? U.worn.replace('{i}', i + 1) : U.wear_to.replace('{i}', i + 1), null, () => { pbWear(game, i, it.uid); changed(); }, false, at === i, 'mac-tot');
  }
  const upOff = (it.lv || 0) >= cap;
  btn(U.up_btn, upOff ? U.cap : `${pbUpCost(game, it).toLocaleString('vi-VN')} Linh Thạch`, () => say(pbUpgrade(game, it) || `${T.name} lên cấp ${it.lv}!`), upOff, false, 'cuong-hoa');
  const drOff = it.slots >= max;
  btn(U.drill_btn, drOff ? U.max : `${Math.round((D.drill.rate[it.slots - 1] ?? 0) * 100)}% · có ${s.stones || 0} đá`, () => say(pbDrill(game, it).msg), drOff || !(s.stones > 0), false, 'kham');
  box.append(acts);
  // 4 ô khảm nối mũi tên (chạm chọn ô, rồi chạm chiêu bên dưới)
  box.append(el('div', 'd-label spb-lb', `${U.slots} · ${U.order}`));
  const socks = el('div', 'spb-socks'), M = D.mods;
  for (let i = 0; i < max; i++) {
    if (i) socks.append(el('span', 'spb-arrow', '→'));
    const id = it.mods[i], lock = i >= it.slots, c = el('button', 'spb-sock' + (lock ? ' lock' : '') + (!lock && st.pbK === i ? ' on' : ''));
    if (lock) c.append(el('small', null, 'Chưa khai'));
    else if (id && M[id]) c.append(ico(game, M[id].icon, 0, 'spb-ic spb-mi'), el('small', null, M[id].name));
    else c.append(el('small', null, `Ô ${i + 1}`));
    c.onclick = () => { if (!lock) { st.pbK = i; changed(false); } };
    socks.append(c);
  }
  box.append(socks);
  // chỉ số, mô tả
  const stats = el('div', 'd-stats'), S = D.stats;
  stats.append(el('div', 'd-main', Object.entries(pbItemStats(D, it)).map(([k, v]) => `${S[k] || k} +${v}${PCT.has(k) ? '%' : ''}`).join(' · ')));
  stats.append(el('div', 'd-line', `${T.desc} Hồi ${T.cd} giây · ${T.mp} linh lực.`), el('div', 'd-line spb-gb', `Mạnh: ${T.good} · Yếu: ${T.bad}`));
  box.append(stats);
  // chiêu khảm theo nhóm
  for (const [grp, gname] of Object.entries(D.mod_groups)) {
    box.append(el('div', 'd-label spb-lb', gname));
    const grid = el('div', 'spb-mods');
    for (const [id, m] of Object.entries(M)) {
      if (m.group !== grp) continue;
      const open = modOpen(game, id), inK = it.mods[st.pbK] === id, used = it.mods.slice(0, it.slots).map((y, i) => (y === id ? i + 1 : 0)).filter(Boolean);
      const c = el('button', 'spb-mod' + (open ? '' : ' lock') + (inK ? ' on' : ''));
      c.append(ico(game, m.icon, 0, 'spb-ic spb-mi'), el('b', null, m.name + (used.length ? ` ·${used.join(',')}` : '')), el('small', null, open ? `${m.gain} · ${m.lose}` : U.locked.replace('{realm}', modNeed(game, id))));
      c.onclick = () => {
        if (!open) return say(U.locked.replace('{realm}', modNeed(game, id)));
        pbSocket(game, it, st.pbK, inK ? null : id);
        if (!inK && st.pbK < it.slots - 1) st.pbK++;
        changed();
      };
      grid.append(c);
    }
    box.append(grid);
  }
  box.append(el('div', 'd-line spb-gb', `${U.dummy}.`));
  later(box, () => changed(false));
  return true;
}
