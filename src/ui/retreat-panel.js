// Bảng thưởng bế quan tích luỹ (Nhiệm vụ → Bế quan tích luỹ): mốc giờ, đã bế quan bao lâu, nút nhận. Luật ở src/game/retreat.js.
import { retreatHours, retreatList, claimRetreat } from '../game/retreat.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createRetreatPanel(game) {
  const root = el('div', 'panel ev-panel retreat-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', '✕'), body = el('div', 'ev-body');
  head.append(el('b', null, 'Bế quan tích luỹ'), x);
  root.append(head, body);
  document.body.append(root);
  const close = () => { root.hidden = true; game.uiOpen = false; };
  x.onclick = close;
  const rewardText = r => [r.item && `1 trang bị từ phẩm ${game.data.items.rarities.find(q => q.id === r.item)?.name}`, r.gem && `${r.gem} ngọc`, r.stones && `${r.stones} Tẩy Luyện Thạch`].filter(Boolean).join(', ');

  function render(msg) {
    const h = retreatHours(game);
    body.replaceChildren(el('p', null, `Đã bế quan ${Math.floor(h).toLocaleString('vi-VN')} giờ (đả tọa trong game và lúc vắng mặt cộng dồn).`));
    if (msg) body.append(el('p', 'fb-reward', msg));
    for (const m of retreatList(game)) {
      const card = el('div', 'ev-note' + (m.ready ? ' top' : ''));
      card.append(el('b', 'ev-note-title', `Mốc ${m.h.toLocaleString('vi-VN')} giờ`), el('p', null, rewardText(m.reward)), el('p', null, m.got ? '✓ Đã nhận' : `${Math.min(m.h, Math.floor(h))}/${m.h} giờ`));
      if (m.ready) {
        const b = el('button', 'act-btn', 'Nhận');
        b.onclick = () => { const got = claimRetreat(game, m.i); if (got) { game.sfx('levelup'); render('Nhận: ' + got.join(', ')); } };
        card.append(b);
      }
      body.append(card);
    }
  }
  game.openRetreat = () => {
    if (!game.save || game.dialog.open) return;
    for (const p of document.querySelectorAll('.panel, #bag')) if (p !== root && !p.hidden) p.querySelector('[id$="-close"]')?.click();
    game.uiOpen = true; root.hidden = false; render();
  };
}
