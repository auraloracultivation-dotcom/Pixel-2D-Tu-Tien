// Vẽ bản đồ bằng hình khối đơn giản (bản tạm). Hình pixel thật thay vào ở bước 3.
import { drawFurnace, drawAnvil, drawPlot } from './draw-cave.js';
import { plotGrowth, plotIndex, cropOf } from '../game/garden.js';
import { drawIceTile } from './draw-ice.js';
import { drawWindTile } from './draw-wind.js';
import { drawForestTile } from './draw-forest.js';
import { drawMetalTile } from './draw-metal.js';
import { drawEarthTile } from './draw-earth.js';
import { drawVoidTile } from './draw-void.js';
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawSky(ctx, screen, map, t) {
  screen.screenTransform();
  const sky = map.def.sky || '#9fd8f0';
  const g = ctx.createLinearGradient(0, 0, 0, screen.h);
  g.addColorStop(0, shade(sky, 0.8)); g.addColorStop(1, shade(sky, 1.1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, screen.w, screen.h);
  if ((map.def.dark || 0) > 0.3 || map.def.indoor) return;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 9; i++) {
    const y = (hash(i, 7) * 1.2 - 0.1) * screen.h;
    const x = ((hash(i, 3) * 1.4 * screen.w + t * (6 + i * 2) - screen.camX * 0.15 * screen.zoom) % (screen.w * 1.4) + screen.w * 1.4) % (screen.w * 1.4) - screen.w * 0.2;
    const r = 24 + hash(i, 9) * 30;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.8, y - r * 0.3, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMap(ctx, map, tiles, view, t, game) {
  const T = map.T;
  const x0 = Math.max(0, Math.floor(view.x0 / T)), x1 = Math.min(map.w - 1, Math.floor(view.x1 / T));
  const y0 = Math.max(0, Math.floor(view.y0 / T)), y1 = Math.min(map.h - 1, Math.floor(view.y1 / T));
  // Lớp nền
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = map.at(tx, ty), ty_ = tiles.types[ch] || {};
    const px = tx * T, py = ty * T;
    if (ty_.void) {
      // Vách đảo: ô mây ngay dưới đất liền
      const above = map.type(tx, ty - 1);
      if (!above.void) {
        ctx.fillStyle = '#8a6a48'; ctx.fillRect(px, py, T, 6);
        ctx.fillStyle = '#6a4e36'; ctx.fillRect(px, py + 6, T, 3);
        ctx.fillStyle = 'rgba(106,78,54,0.5)'; ctx.fillRect(px + 3, py + 9, T - 6, 3);
      }
      continue;
    }
    const base = (ty_.solid && map.def.ground) || ty_.color || '#7cc46a'; // nền dưới cây, đá, nhà theo màu đất của đảo
    ctx.fillStyle = shade(base, 0.96 + hash(tx, ty) * 0.08);
    ctx.fillRect(px, py, T, T);
    if (ch === '.' && hash(tx, ty + 99) > 0.7) {
      ctx.fillStyle = shade(base, 1.15);
      ctx.fillRect(px + 3 + hash(tx, ty) * 8, py + 4 + hash(ty, tx) * 7, 2, 3);
    }
    if (ch === '_') { ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 0.6; ctx.strokeRect(px + 0.3, py + 0.3, T - 0.6, T - 0.6); }
  }
  // Vật trên nền
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = map.at(tx, ty), px = tx * T, py = ty * T, cx = px + T / 2, cy = py + T / 2;
    if (ch === 'F') {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#fff', '#ffe27a', '#ffb0d0'][Math.floor(hash(tx + i, ty) * 3)];
        ctx.fillRect(px + 2 + hash(tx, ty + i) * 11, py + 2 + hash(tx + i, ty + 5) * 11, 2, 2);
      }
    } else if (ch === 'T') {
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(cx - 2, cy, 4, 7);
      ctx.fillStyle = '#2f7a44'; circle(ctx, cx, cy - 2, 9);
      ctx.fillStyle = '#4aa860'; circle(ctx, cx - 2, cy - 4, 6);
    } else if (ch === 'H') {
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(px, py + 4, T, T - 4);
      ctx.fillStyle = map.at(tx, ty - 1) === 'H' ? '#e8dcc0' : '#a0423a';
      ctx.fillRect(px - 1, py, T + 2, map.at(tx, ty - 1) === 'H' ? 4 : 7);
      if (map.at(tx, ty + 1) !== 'H') { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 3, py + 8, 6, 8); }
    } else if (ch === 'R') {
      ctx.fillStyle = '#7a7488'; circle(ctx, cx, cy + 1, 6);
      ctx.fillStyle = '#a8a2b8'; circle(ctx, cx - 2, cy - 1, 3);
    } else if (ch === '#') {
      ctx.fillStyle = '#1f1830'; ctx.fillRect(px, py, T, T);
      if (map.at(tx, ty + 1) !== '#') { ctx.fillStyle = '#4a3a62'; ctx.fillRect(px, py + T - 5, T, 5); }
    } else if (ch === 'S') {
      const col = game.save.element ? game.data.elements[game.save.element].color : '#bff4ff';
      ctx.fillStyle = '#8a8498'; ctx.fillRect(cx - 5, py - 6, 10, T + 4);
      ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3);
      ctx.fillRect(cx - 3, py - 3, 6, T - 2); ctx.globalAlpha = 1;
    } else if (ch === 'M') {
      ctx.fillStyle = '#c0504a'; circle(ctx, cx, cy, 6);
      ctx.fillStyle = '#f2c94c'; circle(ctx, cx, cy, 3);
    } else if (ch === 'P') {
      ctx.strokeStyle = `rgba(180,120,255,${0.6 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, 7, 5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(180,120,255,0.3)'; ctx.fill();
    } else if (ch === 'L') {
      const k = 0.5 + 0.5 * Math.sin(t * 2 + hash(tx, ty) * 6);
      ctx.fillStyle = '#c03a1a'; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = `rgba(255,180,60,${0.35 + k * 0.4})`;
      ctx.fillRect(px + 2 + hash(tx, ty) * 6, py + 3 + hash(ty, tx) * 6, 5, 3);
      ctx.fillRect(px + 8 - hash(ty, tx) * 4, py + 10, 4, 2);
      if (map.at(tx, ty - 1) !== 'L') { ctx.fillStyle = '#5a2a1a'; ctx.fillRect(px, py, T, 2); }
    } else if (ch === 'B') {
      ctx.fillStyle = '#5a4a44'; ctx.fillRect(px, py + 4, T, T - 4);
      ctx.fillStyle = '#2a1e1e'; ctx.fillRect(px + 2 + hash(tx, ty) * 6, py + 6, 5, 6);
      if (map.at(tx, ty - 1) !== 'B') { ctx.fillStyle = '#3a2a2a'; ctx.fillRect(px - 1, py + 1, T + 2, 4); ctx.fillRect(px + hash(tx, ty) * 8, py - 2, 6, 3); }
    } else if (ch === 'K') drawFurnace(ctx, cx, cy, t);
    else if (ch === 'A') drawAnvil(ctx, cx, cy, t);
    else if ('wiYOjk'.includes(ch)) drawIceTile(ctx, ch, px, py, T, hash(tx, ty), t, map.at(tx, ty - 1));
    else if ('dVUe'.includes(ch)) drawWindTile(ctx, ch, px, py, T, hash(tx, ty), t);
    else if ('mnZlWQrX'.includes(ch)) drawForestTile(ctx, ch, px, py, T, hash(tx, ty), t, map.at(tx, ty - 1));
    else if ('sghJNbCu'.includes(ch)) drawMetalTile(ctx, ch, px, py, T, hash(tx, ty), t, map.at(tx, ty - 1));
    else if ('toyIzEv'.includes(ch)) drawEarthTile(ctx, ch, px, py, T, hash(tx, ty), t, map.at(tx, ty - 1));
    else if ('pf*'.includes(ch)) drawVoidTile(ctx, ch, px, py, T, hash(tx, ty), t);
    else if (ch === 'G') drawPlot(ctx, px, py, T, plotGrowth(game, tx, ty), hash(tx, ty), cropOf(game, plotIndex(game, tx, ty)));
    else if (ch === 'q' && hash(tx, ty) > 0.82) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 2 + hash(ty, tx) * 9, py + 3 + hash(tx, ty + 3) * 9, 3, 2);
    } else if (ch === 'D' && map.locked.has(tx + ',' + ty)) {
      ctx.fillStyle = '#5a1a28'; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#c0283a';
      for (let i = 2; i < T; i += 5) ctx.fillRect(px + i, py, 2, T);
    }
  }
}

export function circle(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
