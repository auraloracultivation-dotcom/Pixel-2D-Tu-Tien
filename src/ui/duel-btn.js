// Nút "Rời đài" lúc đang so tài (src/game/duel.js duelQuit; chủ dự án 19/11/2026 11:23: solo không có nút thoát). Nằm giữa, ngay dưới bảng trên.
import { duelQuit } from '../game/duel.js';
import { every } from '../core/ticker.js';

export function createDuelBtn(game) {
  const T = game.data.duel?.text;
  if (!T?.quit) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'duel-quit'; b.textContent = T.quit; b.hidden = true;
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); duelQuit(game); b.hidden = true; });
  document.body.append(b);
  every(() => { const on = !!game.duel && !game.duel.left && !game.traveling; if (b.hidden === on) b.hidden = !on; }, 300);
}
