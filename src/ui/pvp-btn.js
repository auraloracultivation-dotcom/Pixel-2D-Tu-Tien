// Nút Bảo vệ PvP (data/pvp.json; game/pvp.js): chỉ hiện ở Ngoại Vực Vết Nứt, ngay trên bảng boss bên phải. Chạm để tắt / bật
// bảo vệ (máy chủ phòng quyết, báo lại thì nút mới đổi). Kiểu ở pvp.css.
import { every } from '../core/ticker.js';
import { pvpMap, togglePvp } from '../game/pvp.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';

export function createPvpBtn(game) {
  const C = game.data.pvp;
  if (!C) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./pvp.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const b = document.createElement('button');
  b.className = 'pvp-btn'; b.id = 'pvp-btn'; b.type = 'button'; b.hidden = true;
  b.addEventListener('click', ev => { ev.stopPropagation(); togglePvp(game); });
  document.body.append(b);
  let key = '';
  every(() => {
    const show = pvpMap(game) && !game.trip && !!game.save, off = !!game.pvp?.off, k = `${show}|${off}`;
    if (k === key) return;
    key = k; b.hidden = !show;
    b.textContent = off ? C.text.off : C.text.on;
    b.classList.toggle('off', off);
  }, 300);
}
