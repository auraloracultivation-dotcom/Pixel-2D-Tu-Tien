// Bảng Thú: tab Linh thú (con đang mang, cấp, kinh nghiệm, đổi con), Thú cưỡi (chọn con để cưỡi), Đồng hành (comp-tab.js).
import { petNeed, setPet, setMount, mergeCost, canMerge, mergePet } from '../game/pets.js';
import { petDef, petMax, canEvolve, evolvePet } from '../game/evolve.js';
import { costText } from '../game/cave.js';
import { renderComps } from './comp-tab.js';
import { petPrice, sellPet, mountPrice, sellMount } from '../game/home-pets.js';
import { beastStats, statLine, linesText, rerollCost, costLine, mountLine } from '../game/beast.js';
import { kyRerollBeast, kyRerollMount } from '../game/ky-thu.js';
import { t } from '../core/i18n.js';   // chữ ghép: dịch theo khuôn
import { buyBlock } from './buy-mats.js';   // mua nguyên liệu tiến hoá, tẩy luyện: ô cuối tấm chi tiết, mua theo số lượng

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
  function sellRow(id, mount) {
    const row = el('div', 'card-acts skill-up'), price = (mount ? mountPrice : petPrice)(game, id).toLocaleString('vi-VN'), key = (mount ? 'm:' : '') + id;
    const b = el('button', 'mini', sure === key ? `Bấm lần nữa để bán (${price} Linh Thạch)` : `Bán ${price} Linh Thạch`);
    b.onclick = () => { if (sure !== key) { sure = key; render(); return; } sure = null; game.toast((mount ? sellMount : sellPet)(game, id), 2.4); render(); };
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
    if (!ids.length) list.append(el('p', 'muted', 'Chưa có linh thú. Gặp Ngự Thú Sư ở Thiên Kiếm Phong, hoặc hạ quái dị chủng (có ánh vàng).'));
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
      list.append(c);
      if (P.pets[id]) list.append(rerollRow(id));
      if (s.pet !== id && P.pets[id]) list.append(sellRow(id));
      if (P.pets[id]) buyRow(list, id);   // bán linh thú ngay trong thẻ (thay ô Bán linh thú ở Động phủ); grid-cards gom dòng .skill-up vào tấm chi tiết
    }
    for (const id of ids.filter(i => canMerge(game, i))) {   // gộp: đủ bản sao thì hiện thẻ riêng
      const st = s.pets[id], M = P.merge.texts, nm = P.pets[id].name;
      list.append(card('#ffd27a', M.card.replace('{name}', nm).replace('{star}', st.star || 0).replace('{next}', (st.star || 0) + 1), [M.card_line.replace('{cost}', mergeCost(st)).replace('{pct}', Math.round(P.merge.bonus * 100))], false, () => mergePet(game, id), 'pet.' + id, 'Gộp'));
    }
    // Tiến hóa: con nào đủ cấp thì hiện thẻ riêng
    const E = P.evolve;
    for (const id of ids.filter(i => canEvolve(game, i) && canEvolve(game, i) !== 'level')) {
      const d = P.pets[id], ok = canEvolve(game, id) === 'ok';
      const c = card(ok ? '#ffb03a' : '#c8c4d0', `Tiến hóa ${d.name} thành ${d.evo}`, [
        `Sát thương x${E.mult}, chiêu hồi nhanh hơn, mở tới cấp ${E.max_level}.`,
        `Cần: ${costText(data, E.cost)}, ${E.coins} ${data.shop.name}${ok ? '' : ' (chưa đủ)'}`,
      ], false, () => evolvePet(game, id), 'pet.' + id, 'Tiến hóa');
      c.disabled = !ok; list.append(c);
      const bm = buyBlock(game, Object.entries(E.cost), 'tienhoa:' + id, render, m => { game.toast(m, 2.4); render(); }, 'skill-up'); if (bm) list.append(bm);
    }
    const missing = Object.entries(P.pets).filter(([id]) => !s.pets[id]).map(([id]) => P.rare.prefix + data.mobs[id].name);
    if (missing.length) list.append(el('p', 'muted', t('Chưa thu phục: {list}.', { list: missing.join(', ') })));
    list.append(el('p', 'muted', `Linh thú cấp ${E.level} có thể tiến hóa.`));
  }

  function renderMounts(s, list) {
    $('pets-sub').textContent = 'Đi trên đảo lúc yên ổn là tự cưỡi. Đánh nhau thì xuống.';
    for (const [id, m] of Object.entries(P.mounts)) {
      const got = s.mounts[id];
      const ml = got && mountLine(game, id);
      const c = card(m.color, m.name + (s.mount === id ? ' ' + t('· đang dùng') : got ? '' : ' ' + t('· chưa có')), [m.desc, `Tốc chạy +${Math.round(m.speed * 100)}%`, ...(ml ? linesText(data, [ml]).map(t => `Cộng cho bạn khi chọn: ${t}`) : [])], s.mount === id, () => setMount(game, id), 'mount.' + id, 'Cưỡi', 'Đang cưỡi');
      c.disabled = !got;
      if (!got) c.classList.add('locked');
      list.append(c);
      if (got) list.append(rerollRow(id, true));
      if (got && s.mount !== id) list.append(sellRow(id, true));
      if (got) buyRow(list, id, true);   // bán thú cưỡi ngay trong thẻ
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
