// Hội đèn (src/game/fair.js): dây đèn lồng quanh sân xóm (theo toạ độ thế giới) và pháo hoa, quầng đèn (sau lớp ngày đêm, cộng sáng).
import { fairSpot } from '../game/fair.js';
import { phase, outdoor } from '../game/daynight.js';

// Bốn cột ở góc sân, dây võng giữa hai cột, đèn treo dọc dây
function lanterns(game, s) {
  const G = game.data.fair.garland, T = game.map.T, R = G.r * T;
  const posts = [[s.x - R, s.y - T], [s.x + R, s.y - T], [s.x + R, s.y + R * 0.8], [s.x - R, s.y + R * 0.8]];
  const out = [], per = Math.max(1, Math.round(G.n / 4));
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = posts[i], [bx, by] = posts[(i + 1) % 4];
    for (let k = 1; k <= per; k++) {
      const f = k / (per + 1), sag = Math.sin(f * Math.PI) * 6;
      out.push({ x: ax + (bx - ax) * f, y: ay + (by - ay) * f + sag - 14, c: G.colors[(i * per + k) % G.colors.length], ph: i * 3 + k });
    }
  }
  return { posts, out };
}

export function drawFairWorld(ctx, game, t) {
  const s = fairSpot(game);
  if (!s) return;
  const { posts, out } = lanterns(game, s);
  ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {   // dây võng
    const [ax, ay] = posts[i], [bx, by] = posts[(i + 1) % 4];
    ctx.beginPath(); ctx.moveTo(ax, ay - 16); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 16 + 12, bx, by - 16); ctx.stroke();
  }
  for (const [x, y] of posts) { ctx.fillStyle = '#3a2618'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 17, 2, 18); }
  for (const o of out) {
    const x = Math.round(o.x + Math.sin(t * 1.6 + o.ph) * 0.6), y = Math.round(o.y);
    ctx.fillStyle = '#1b1830'; ctx.fillRect(x - 2, y - 1, 5, 6);
    ctx.fillStyle = o.c; ctx.fillRect(x - 1, y, 3, 4);
    ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.fillRect(x, y + 1, 1, 2);
  }
}

// Quầng đèn và pháo hoa: toạ độ màn hình, cộng sáng
export function drawFairSky(ctx, game, screen, t) {
  const st = game.fair, s = fairSpot(game);
  if (!outdoor(game) || (!s && !st?.fx.length)) return;
  const z = screen.zoom, p = phase(game), dark = Math.min(1, (p.tint ? p.tint[3] : 0) / 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (s && dark > 0.2) for (const o of lanterns(game, s).out) {
    const q = screen.toScreen(o.x, o.y + 2), r = 16 * z * (1 + 0.1 * Math.sin(t * 5 + o.ph));
    const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
    g.addColorStop(0, `rgba(255,190,110,${(0.35 * dark).toFixed(3)})`); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
  }
  const px = Math.max(1, Math.round(z));
  for (const o of st?.fx || []) {
    const q = screen.toScreen(o.x, o.y), a = o.rocket ? 1 : Math.max(0, 1 - o.t / o.life);
    ctx.fillStyle = `rgba(${o.c},${a.toFixed(3)})`;
    ctx.fillRect(Math.round(q.x), Math.round(q.y), px * (o.rocket ? 1 : 2), px * (o.rocket ? 3 : 2));
  }
  ctx.restore();
}
