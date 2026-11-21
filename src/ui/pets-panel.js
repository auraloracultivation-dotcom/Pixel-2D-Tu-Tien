// Bảng Thú: tab Linh thú (con đang mang, cấp, kinh nghiệm, đổi con), Thú cưỡi (chọn con để cưỡi), Đồng hành (comp-tab.js).
import { petNeed, setPet, setMount, mergeCost, canMerge, mergePet } from '../game/pets.js';
import { petDef, petMax, canEvolve, evolvePet } from '../game/evolve.js';
import { costText } from '../game/cave.js';
import { renderComps } from './comp-tab.js';
import { petPrice, sellPet } from '../game/home-pets.js';
import { beastStats, statLine, linesText, rerollCost, costLine, mountLine } from '../game/beast.js';
import { kyRerollBeast, kyRerollMount } from '../game/ky-thu.js';
import { t } from '../core/i18n.js';   // chữ ghép: dịch theo khuôn
import { buyBlock } from './buy-mats.js';
import { quality } from '../game/tiers.js';
import { baseOf, mountKeys, mountKeyOf } from '../game/inst.js';
import { petSnap, mungEvolve, mungMerge } from './mung-them.js';   // màn mừng ghép sao, tiến hoá (docs/10-CAI-HON.md việc 4b)   // mua nguyên liệu tiến hoá, tẩy luyện: ô cuối tấm chi tiết, mua theo số lượng

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createPetsPanel(game) {
  const { data } = game, P = data.pets;
  let tab = 'linh-thu';

  // icon, act: hình ô lưới và chữ nút chính trong tấm chi tiết (src/ui/grid-cards.js)
  function card(color, title, lines, using, onPick, icon, act, used) {
    const c = el('button', 'skill-card' + (using ? ' using' : ''));
    c.style.borderLeftColor = color;
    if (icon) c.dataset.icon = icon;
    if (act) c.dataset.act = act;
    if (used) c.dataset.used = used;
    c.append(el('b', null, title), ...lines.map(l => el('small', null, l)));
    c.onclick = () => { onPick(); game.sfx('pickup'); render(); };
    return c;
  }

  // Nút Bán trong tấm chi tiết (src/ui/grid-cards.js bấm hộ): bấm lần đầu hỏi lại, lần hai mới bán (src/game/home-pets.js)
  let sure = null;
  function sellRow(id) {
    const row = el('div', 'card-acts skill-up'), price = petPrice(game, id).toLocaleString('vi-VN'), key = id;
    const b = el('button', 'mini', sure === key ? `Bấm lần nữa để bán (${price} Linh Thạch)` : `Bán ${price} Linh Thạch`);
    b.onclick = () => { if (sure !== key) { sure = key; render(); return; } sure = null; game.toast(sellPet(game, id), 2.4); render(); };
    row.append(b);
    return row;
  }

  // Nút Tẩy luyện trong tấm chi tiết: linh thú mở thêm 1 dòng, thú cưỡi bốc lại dòng % (src/game/beast.js)
  function rerollRow(id, mount) {
    const row = el('div', 'card-acts skill-up'), b0 = !mount && s0().pets[id];
    const cost = mount ? data.pets.beast.mount.reroll : rerollCost(data, b0), full = b0 && Number.isInteger(b0.cap) && (b0.lines || []).length >= b0.cap;
    const b = el('button', 'mini', full ? 'Đã đủ dòng' : `Tẩy luyện (${costLine(data, cost)})`);
    b.disabled = !!full;
    b.onclick = async () => { game.toast(await (mount ? kyRerollMount(game, id) : kyRerollBeast(game, 'pet', id)), 2.4); render(); };   // máy chủ tung khi đã đăng nhập (src/game/ky-thu.js)
    row.append(b);
    return row;
  }
  const s0 = () => game.save;
  // Ô lưới kiểu trang bị (chủ dự án 19/11/2026 12:47): khung theo phẩm dòng chỉ số (data-o), cấp góc trên, sao góc dưới (src/ui/grid-cards.js)
  const eq = (c, lines, badge, star) => { c.dataset.o = quality(data, { lines: lines || [] })?.id || 'pham'; if (badge) c.dataset.badge = badge; if (star) c.dataset.star = star; return c; };
  // Nút thêm trong tấm chi tiết (Gộp, Tiến hóa): dòng .skill-up sau thẻ, grid-cards gom vào
  const actRow = (text, fn, off) => { const r = el('div', 'card-acts skill-up'), b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); game.sfx('pickup'); render(); }; r.append(b); return r; };
  // Ô mua nguyên liệu tẩy luyện: cuối tấm chi tiết (sau Tẩy luyện, Bán), mua theo số lượng (src/ui/buy-mats.js)
  function buyRow(list, id, mount) {
    const b0 = !mount && s0().pets[id], full = b0 && Number.isInteger(b0.cap) && (b0.lines || []).length >= b0.cap;
    const cost = mount ? data.pets.beast.mount.reroll : rerollCost(data, b0);
    const bm = !full && buyBlock(game, Object.entries(cost.mats || {}), (mount ? 'cuoi:' : 'lt:') + id, render, m => { game.toast(m, 2.4); render(); }, 'skill-up');
    if (bm) list.append(bm);
  }

  function renderPets(s, list) {
    $('pets-sub').textContent = 'Chạm để mang theo. Linh thú hưởng nửa linh khí bạn thu được.';
    const ids = Object.keys(s.pets);
    if (!ids.length) list.append(el('p', 'muted', 'Chưa có linh thú. Hạ quái dị chủng (có ánh vàng) để thu phục.'));
    for (const id of ids) {
      const d = petDef(data, s, id), st = s.pets[id], max = st.lv >= petMax(data, s, id), M = P.merge.texts;
      const c = card(d.color, `${st.evo ? '✦ ' : ''}${d.name} · cấp ${st.lv}${st.star ? ` · ★${st.star}` : ''}${s.pet === id ? ' · đang mang' : ''}`, [
        d.desc,
        `Sát thương ${Math.round(d.mult * (1 + (st.lv - 1) * P.lv_bonus) * (1 + (st.star || 0) * P.merge.bonus) * 100)}% công của bạn`,
        max ? 'Đã tối đa.' : `Kinh nghiệm ${Math.floor(st.exp)}/${petNeed(data, st.lv)}`,
        M.line.replace('{star}', st.star || 0).replace('{n}', st.copies || 0).replace('{cost}', mergeCost(st)),
        `Chỉ số (cộng lực chiến khi mang): ${statLine(data, beastStats(data, s, 'pet', id))}`,
        ...linesText(data, st.lines),
      ], s.pet === id, () => setPet(game, id), 'pet.' + id, 'Mang theo', 'Đang mang');
      list.append(eq(c, st.lines, 'c' + st.lv, st.star));
      if (canMerge(game, id)) list.append(actRow(M.card.replace('{name}', d.name).replace('{star}', st.star || 0).replace('{next}', (st.star || 0) + 1).replace(/^Gộp .*?:/, 'Gộp') + ` (${mergeCost(st)} bản sao)`, () => { const a = petSnap(game, id); if (mergePet(game, id)) game.mung?.(mungMerge(game, id, a)); }));
      const ev = canEvolve(game, id);
      if (ev && ev !== 'level') {   // đủ cấp tiến hóa: nút ngay trong tấm chi tiết của con đó, thiếu nguyên liệu thì mờ + ô mua
        list.append(actRow(`Tiến hóa thành ${P.evolve && P.pets[id]?.evo || ''} (${costText(data, P.evolve.cost)}, ${P.evolve.coins} ${data.shop.name})`, () => { const a = petSnap(game, id); if (evolvePet(game, id)) game.mung?.(mungEvolve(game, id, a)); }, ev !== 'ok'));
        const bm = ev !== 'ok' && buyBlock(game, Object.entries(P.evolve.cost), 'tienhoa:' + id, render, m => { game.toast(m, 2.4); render(); }, 'skill-up'); if (bm) list.append(bm);
      }
      if (P.pets[id]) list.append(rerollRow(id));
      if (s.pet !== id && P.pets[id]) list.append(sellRow(id));
      if (P.pets[id]) buyRow(list, id);   // bán linh thú ngay trong thẻ (thay ô Bán linh thú ở Động phủ); grid-cards gom dòng .skill-up vào tấm chi tiết
    }
  }

  function renderMounts(s, list) {
    $('pets-sub').textContent = `Chọn thú rồi bấm nút Cưỡi / Xuống. Cưỡi thì thú công kích, người đả tọa. Thú mới đổi bằng ${P.thu_lenh.per_mount} ${P.thu_lenh.name} ở Ngự Thú Sư (làm đủ việc ngày được 1 ${P.thu_lenh.name}).`;
    // Mỗi bản một ô (chủ dự án 19/11/2026 12:58–13:02: cùng loại có nhiều con, phẩm khác nhau; src/game/inst.js). Chưa có thì không hiện.
    // Thú cưỡi không bán được, chỉ đổi bằng Thú Lệnh (13:50)
    const order = Object.keys(P.mounts), cur = mountKeyOf(s);
    const keys = mountKeys(s).filter(k => P.mounts[baseOf(k)]).sort((x, y) => (x !== cur) - (y !== cur) || order.indexOf(baseOf(x)) - order.indexOf(baseOf(y)));
    for (const k of keys) {
      const id = baseOf(k), m = P.mounts[id], ml = mountLine(game, k), on = k === cur;
      const c = card(m.color, m.name + (on ? ' ' + t('· đang dùng') : ''), [m.desc, `Tốc chạy +${Math.round(m.speed * 100)}%`, ...(ml ? linesText(data, [ml]).map(t => `Cộng cho bạn khi chọn: ${t}`) : [])], on, () => setMount(game, k), 'mount.' + id, 'Chọn', 'Đang chọn');
      c.dataset.key = k;
      list.append(eq(c, ml ? [ml] : []));
      list.append(rerollRow(k, true));
      buyRow(list, k, true);
    }
  }

  function render() {
    const s = game.save, list = $('pets-list');
    for (const b of document.querySelectorAll('#pets-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    $('pets').querySelector('.bag-head b').textContent = document.querySelector(`#pets-tabs [data-tab="${tab}"]`).textContent;
    list.innerHTML = '';
    if (tab === 'linh-thu') renderPets(s, list);
    else if (tab === 'dong-hanh') renderComps(game, list, { render, close, sub: t => { $('pets-sub').textContent = t; } });
    else renderMounts(s, list);
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.uiOpen = true; game.newPets = false; sure = null; $('pets').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('pets').hidden = true; }

  $('pets-close').onclick = close;
  for (const b of document.querySelectorAll('#pets-tabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; render(); };
  $('btn-pets').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  return { open, close };
}
