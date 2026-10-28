// Tab Đồng hành trong bảng Thú: cấp, thiện cảm, tặng quà, mang theo, kết đạo lữ.
import { canInvite, compLevel, setCompanion } from '../game/companion.js';
import { affinity, tierOf, giftsLeft, canGive, giveGift, daoLu, canPropose, propose } from '../game/affinity.js';
import { matInfo } from '../game/cave.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function renderComps(game, list, { render, close, sub }) {
  const { data } = game, A = data.affinity, s = game.save;
  const ids = Object.keys(data.companions.list).filter(id => canInvite(game, id));
  sub(daoLu(game) ? `Đạo lữ: ${data.npcs[daoLu(game)].name} · song tu x${A.dao_lu.meditate_mul} linh khí đả tọa` : 'Tặng quà để tăng thiện cảm và cấp. Mỗi người 3 lần một ngày.');
  if (!ids.length) { list.append(el('p', 'muted', 'Chưa có bạn đồng hành. Cứu Tiểu Hỏa ở Chương 3 để mở.')); return; }
  const giftName = g => g.kind === 'coins' ? `${g.n} ${data.shop.name}` : `${g.n} ${g.kind === 'pill' ? data.cave.pills[g.id].name : matInfo(data, g.id).name}`;
  const scene = lines => { close(); game.dialog.say(lines.map(([who, t]) => [data.npcs[who]?.name || who, t])); };
  for (const id of ids) {
    const d = data.companions.list[id], npc = data.npcs[id], pts = affinity(game, id), tier = tierOf(game, pts);
    const c = el('div', 'skill-card wide-card'); c.style.borderLeftColor = d.color; c.dataset.icon = data.art.sprites['comp.' + id] ? 'comp.' + id : 'npc.' + id; c.dataset.iconSize = 46;   // hình ô lưới: cùng hình người đi theo trong game (comp.<id>)
    const dl = daoLu(game) === id ? ' · đạo lữ' : '';
    c.append(el('b', null, `${npc.name} · cấp ${compLevel(game, id) || 1}${s.companion === id ? ' · đang đi cùng' : ''}${dl}`),
      el('small', null, d.desc),
      el('small', null, `Thiện cảm ${pts}/${A.max}${tier ? ` (${tier.name})` : ''} · thích ${giftName(A.gifts.find(g => g.id === A.likes[id]))} · còn ${Math.max(0, giftsLeft(game, id))} lần tặng`));
    const row = el('div', 'card-acts wrap');
    const mini = (t, fn, off) => { const b = el('button', 'mini', t); b.disabled = !!off; b.onclick = fn; row.append(b); };
    if (s.companion !== id) mini('Mang theo', () => { setCompanion(game, id); render(); });
    row.append(el('small', 'gift-lbl', 'Tặng:'));
    for (const g of A.gifts) {
      mini(giftName(g), () => {
        const r = giveGift(game, id, g.id);
        if (!r) return;
        game.sfx('pickup'); game.toast(`${npc.name} thiện cảm +${r.pts}${r.liked ? ' (rất thích!)' : ''}`, 1.6);
        if (r.scene) scene(r.scene); else render();
      }, !canGive(game, g) || giftsLeft(game, id) <= 0);
    }
    if (canPropose(game, id)) mini(A.dao_lu.ask, () => { const v = propose(game, id); if (v) { game.sfx('levelup'); scene([...v, ['', `${npc.name} thành đạo lữ của bạn. Song tu: linh khí đả tọa x${A.dao_lu.meditate_mul}. Khi đi cùng có chiêu ${A.dao_lu.combo.name}.`]]); } });
    c.append(row); list.append(c);
  }
}
