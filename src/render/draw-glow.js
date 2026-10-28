// Ánh đèn ban đêm ngoài trời (chill như lễ hội, chủ dự án 28/10/2026): cửa sổ nhà, đèn lồng, lò, dung nham, truyền tống trận
// hắt quầng sáng ấm lên lớp tối đêm; mỗi xóm mới có một cột đèn lồng ở sân. Màu, bán kính ở data/light.json → night.
import { phase, outdoor } from '../game/daynight.js';
import { glow } from './draw-lights.js';
import { decorLights } from './draw-den.js';

let cache = { map: null, list: [], le: null };

function scan(game) {
  const map = game.map, T = map.T, N = game.data.light.night, list = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const ch = map.at(x, y), src = N.tiles[ch];
    if (!src) continue;
    if (src.edge && map.at(x, y + 1) === ch) continue;   // nhà: chỉ hàng dưới (cửa, cửa sổ) mới sáng
    if (src.every && (x + y) % src.every) continue;
    list.push({ x: (x + 0.5) * T, y: (y + 0.5) * T + (src.dy || 0), r: src.r, c: src.c, ph: (x * 7 + y * 13) % 10 });
  }
  for (const d of decorLights(game)) list.push(d);   // đèn trang trí (draw-den.js)
  for (const [hx, hy] of map.def.hamlets || []) list.push({ x: (hx + 2.5) * T, y: (hy + 0.2) * T, r: N.lamp.r, c: N.lamp.c, ph: hx % 10, lamp: true });
  cache = { map, list, le: document.body.dataset.le || '' };
}

// Cột đèn lồng ở sân xóm (vẽ theo toạ độ thế giới, trước người và quái)
export function drawLamps(ctx, game, t) {
  if (!game.map.def.hamlets) return;
  if (cache.map !== game.map) scan(game);
  for (const o of cache.list) {
    if (!o.lamp) continue;
    const x = Math.round(o.x), y = Math.round(o.y), sw = Math.sin(t * 1.5 + o.ph) > 0.6 ? 1 : 0;
    ctx.fillStyle = 'rgba(27,24,48,.25)'; ctx.fillRect(x - 3, y + 7, 7, 2);
    ctx.fillStyle = '#3a2618'; ctx.fillRect(x, y - 16, 2, 24); ctx.fillRect(x - 3, y - 16, 8, 2);
    ctx.fillStyle = '#1b1830'; ctx.fillRect(x - 4 + sw, y - 15, 5, 7);
    ctx.fillStyle = '#e0484a'; ctx.fillRect(x - 3 + sw, y - 14, 3, 5);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 2 + sw, y - 13, 1, 3);
  }
}

// Quầng sáng: vẽ sau lớp ngày đêm, cộng sáng; trời càng tối càng rõ
export function drawGlow(ctx, game, screen, t) {
  if (!outdoor(game)) return;
  const p = phase(game), a = p.tint ? p.tint[3] : 0;
  if (a < 0.15) return;
  if (cache.map !== game.map || cache.le !== (document.body.dataset.le || '')) scan(game);
  const z = screen.zoom, k = Math.min(1, a / 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.imageSmoothingEnabled = true;   // quầng vẽ sẵn (draw-lights.js → glow), độ đậm theo trời tối
  for (const o of cache.list) {
    const s = screen.toScreen(o.x, o.y), r = o.r * z;
    if (s.x < -r || s.y < -r || s.x > screen.w + r || s.y > screen.h + r) continue;
    const f = 1 + 0.08 * Math.sin(t * 6 + o.ph * 2.1), R = r * f;
    ctx.drawImage(glow('night|' + o.c, [[0, `rgba(${o.c},0.42)`], [0.5, `rgba(${o.c},0.16)`], [1, `rgba(${o.c},0)`]]), s.x - R, s.y - R, R * 2, R * 2);
  }
  ctx.restore();
}
