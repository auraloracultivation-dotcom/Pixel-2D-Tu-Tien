// Đồ trang trí trong động phủ (data/home.json → decor), vẽ bằng khối pixel theo kiểu (kind).
import { hasDecor } from '../game/decor.js';

const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

const KINDS = {
  lantern(ctx, x, y, t) {
    R(ctx, '#3a2a1a', x - 0.5, y - 8, 1, 4);
    const g = 0.25 + 0.1 * Math.sin(t * 2 + x);
    ctx.globalAlpha = g; ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    R(ctx, '#d83a3a', x - 3, y - 4, 6, 8); R(ctx, '#ff6a5a', x - 2, y - 3, 2, 6); R(ctx, '#f2c94c', x - 3, y - 5, 6, 1); R(ctx, '#f2c94c', x - 3, y + 4, 6, 1);
    R(ctx, '#f2c94c', x - 0.5, y + 5, 1, 3);
  },
  vase(ctx, x, y, t) {
    R(ctx, '#e8eef8', x - 3, y, 6, 6); R(ctx, '#5a7ac8', x - 3, y + 2, 6, 1); R(ctx, '#e8eef8', x - 2, y - 2, 4, 2);
    R(ctx, '#5a3a2a', x - 1, y - 9, 1, 7); R(ctx, '#5a3a2a', x + 1, y - 7, 1, 5); R(ctx, '#5a3a2a', x - 4, y - 7, 3, 1);
    for (const [dx, dy] of [[-4, -8], [-1, -10], [2, -8], [1, -5], [-3, -5]]) R(ctx, '#ffb0c8', x + dx, y + dy, 2, 2);
    const k = (t * 0.3 + x) % 1; ctx.globalAlpha = 1 - k; R(ctx, '#ffc8dc', x + 3 + k * 4, y - 6 + k * 12, 1.5, 1.5); ctx.globalAlpha = 1;
  },
  bonsai(ctx, x, y) {
    R(ctx, '#6a4a3a', x - 4, y + 1, 8, 4); R(ctx, '#8a6a4a', x - 5, y + 1, 10, 1);
    R(ctx, '#5a3a2a', x - 1, y - 4, 2, 5); R(ctx, '#5a3a2a', x, y - 6, 3, 2);
    R(ctx, '#3a7a4a', x - 6, y - 8, 7, 3); R(ctx, '#4a9a5a', x - 1, y - 10, 7, 3); R(ctx, '#3a7a4a', x + 1, y - 5, 5, 2);
  },
  shelf(ctx, x, y) {
    R(ctx, '#5a3a2a', x - 7, y - 8, 14, 14); R(ctx, '#7a5a3a', x - 6, y - 7, 12, 12);
    for (const row of [-7, -2, 3]) {
      R(ctx, '#5a3a2a', x - 6, y + row + 4, 12, 1);
      ['#c84a4a', '#4a7ac8', '#e8c86a', '#6ab87a', '#a86ac8'].forEach((c, i) => R(ctx, c, x - 5 + i * 2.2, y + row + (i % 2), 1.8, 4 - (i % 2)));
    }
  },
  rug(ctx, x, y) {
    ctx.globalAlpha = 0.85; R(ctx, '#8a2a3a', x - 22, y - 20, 44, 40); R(ctx, '#b83a4a', x - 20, y - 18, 40, 36);
    ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 1; ctx.strokeRect(x - 18.5, y - 16.5, 37, 33);
    for (const [dx, dy] of [[-14, -12], [12, -12], [-14, 10], [12, 10]]) R(ctx, '#f2c94c', x + dx, y + dy, 2, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8a040'; ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 5, 0, 0, Math.PI * 2); ctx.fill();   // bồ đoàn nằm trên thảm
    ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  },
  chime(ctx, x, y, t) {
    R(ctx, '#3a2a1a', x - 0.5, y - 8, 1, 3); R(ctx, '#c8a050', x - 5, y - 5, 10, 1);
    for (let i = 0; i < 4; i++) { const sw = Math.sin(t * 1.6 + i) * 1.2; R(ctx, '#d8e0f0', x - 4 + i * 2.6 + sw, y - 4, 1, 4 + (i % 2) * 2); }
    R(ctx, '#d83a3a', x - 1 + Math.sin(t * 1.3) * 1.5, y + 3, 2, 4);
  },
  pond(ctx, x, y, t) {
    ctx.fillStyle = '#6a6a7a'; ctx.beginPath(); ctx.ellipse(x, y, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a7ab8'; ctx.beginPath(); ctx.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 2; i++) { const a = t * (0.6 + i * 0.3) + i * 3; R(ctx, i ? '#ffffff' : '#ff6a3a', x + Math.cos(a) * 6 - 1.5, y + Math.sin(a) * 3 - 1, 3, 2); }
    R(ctx, '#4a9a5a', x + 6, y - 3, 3, 2);
  },
};

export function drawDecor(ctx, game, t) {
  if (game.map.id !== game.data.home.map) return;
  for (const [id, d] of Object.entries(game.data.home.decor.items)) {
    if (!hasDecor(game, id)) continue;
    for (const at of d.at) { const c = game.map.center(at[0], at[1]); KINDS[d.kind]?.(ctx, c.x, c.y, t); }
  }
}
