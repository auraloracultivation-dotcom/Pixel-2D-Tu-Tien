// Nút Rời đi trong vùng không gian Thôn Thiên Mãng (game/thien-mang.js leaveArena): bay về tinh cầu trước khi vào.
// Chỉ hiện trong vùng, giữa phía trên màn hình. Kiểu ở mang.css (.mang-leave).
import { every } from '../core/ticker.js';
import { isArena, leaveArena } from '../game/thien-mang.js';

export function createMangLeave(game) {
  const T = game.data['thien-mang']?.text;
  if (!T) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'mang-leave'; b.id = 'mang-leave'; b.hidden = true; b.textContent = T.leave;
  b.addEventListener('pointerdown', ev => ev.stopPropagation());
  b.addEventListener('click', ev => { ev.stopPropagation(); leaveArena(game); });
  document.body.append(b);
  every(() => { const show = isArena(game) && !game.trip && !game.traveling && !game.uiOpen; if (b.hidden === show) b.hidden = !show; }, 300);
}
