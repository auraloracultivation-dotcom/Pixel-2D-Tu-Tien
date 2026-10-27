// Mạch linh khoáng (src/game/gather.js): tảng đá có tinh thể phát sáng khi còn, đá xám khi cạn; vòng tiến độ khi đang đào.
import { veinReady } from '../game/gather.js';

const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

export function drawVeins(ctx, game, t) {
  for (const v of game.veins || []) {
    const x = Math.round(v.x), y = Math.round(v.y), ok = veinReady(game, v);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y + 4, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    R(ctx, '#1b1830', x - 8, y - 3, 16, 8); R(ctx, ok ? '#6a6480' : '#5a5660', x - 7, y - 2, 14, 6); R(ctx, ok ? '#8a84a0' : '#6a6670', x - 6, y - 2, 6, 2);
    if (!ok) continue;
    const g = 0.6 + 0.4 * Math.sin(t * 3 + x);
    ctx.fillStyle = `rgba(122,208,255,${(0.18 * g).toFixed(2)})`; ctx.beginPath(); ctx.arc(x, y - 4, 11, 0, Math.PI * 2); ctx.fill();
    for (const [dx, h] of [[-4, 7], [0, 10], [4, 6]]) { R(ctx, '#1b1830', x + dx - 2, y - h - 1, 4, h + 1); R(ctx, '#4aa0e0', x + dx - 1, y - h, 2, h); R(ctx, '#bff4ff', x + dx - 1, y - h, 1, Math.ceil(h / 2)); }
  }
  const d = game.dig;
  if (d) {
    const p = game.player, k = Math.min(1, d.t / d.dur);
    ctx.strokeStyle = 'rgba(27,24,48,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 30, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#7ad0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 30, 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
  }
}
