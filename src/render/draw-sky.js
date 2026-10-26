// Lớp ngày đêm ngoài trời: phủ màu theo giờ, sao lấp lánh, trăng, đom đóm quanh người chơi, quầng sáng quanh người.
import { phase, outdoor } from '../game/daynight.js';

const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (Math.sin(i * 12.9898) * 43758.5453) % 1, y: (Math.sin(i * 78.233) * 12543.21) % 1, s: i % 3 }));
const FLIES = Array.from({ length: 16 }, (_, i) => ({ a: i * 2.4, r: 30 + (i * 37) % 70, sp: 0.2 + (i % 5) * 0.07 }));

export function drawDayNight(ctx, game, screen, t) {
  if (!outdoor(game)) return;
  const p = phase(game);
  if (!p.tint) return;
  const [r, g, b, a] = p.tint, pos = screen.toScreen(game.player.x, game.player.y - 6);
  const gr = ctx.createRadialGradient(pos.x, pos.y, 20, pos.x, pos.y, Math.max(screen.w, screen.h) * 0.6);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a * 0.5})`); gr.addColorStop(1, `rgba(${r},${g},${b},${a})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, screen.w, screen.h);
  if (p.stars) for (const s of STARS) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * (1 + s.s) + s.x * 20);
    ctx.fillStyle = '#e8f0ff'; ctx.fillRect(Math.abs(s.x) * screen.w, Math.abs(s.y) * screen.h * 0.5, 1 + s.s * 0.5, 1 + s.s * 0.5);
  }
  if (p.moon) {
    const mx = screen.w - 70, my = 60;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,160,0.5)'; ctx.beginPath(); ctx.arc(mx - 4, my - 3, 3, 0, Math.PI * 2); ctx.arc(mx + 5, my + 4, 2, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < (p.flies || 0); i++) {
    const f = FLIES[i], ang = f.a + t * f.sp, z = screen.zoom;
    const x = pos.x + Math.cos(ang) * f.r * z + Math.sin(t * 1.3 + i) * 6, y = pos.y + Math.sin(ang * 1.3) * f.r * 0.6 * z;
    ctx.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(t * 2 + i * 1.7));
    ctx.fillStyle = '#e8ff9a'; ctx.beginPath(); ctx.arc(x, y, 1.6 * z, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
