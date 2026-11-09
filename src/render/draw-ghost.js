// Bong bóng linh hồn lúc gục chờ hồi sinh (src/game/ghost.js): hình nhân vật mờ nằm trong bong bóng trong suốt lơ lửng bay lên nhẹ,
// viền sáng, đốm phản quang góc trên trái, số giây còn lại phía trên. Số ở data/config.json → ghost.
import { drawHero } from './draw-hero.js';

export function drawGhost(ctx, game, t) {
  const g = game.ghost, p = game.player, G = game.data.config.ghost || {};
  const k = Math.min(1, g.t / 0.6), lift = -(G.rise ?? 10) * k + Math.sin(t * 3) * 1.5, R = G.r ?? 13;
  const cx = p.x, cy = p.y - 8 + lift;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.translate(0, lift);
  drawHero(ctx, game, p, t, false);
  ctx.restore();
  ctx.save();
  const gr = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.6, 'rgba(150,220,255,0.12)'); gr.addColorStop(1, 'rgba(170,230,255,0.38)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + 0.04 * Math.sin(t * 5)), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,245,255,0.75)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(cx - R * 0.42, cy - R * 0.45, R * 0.18, R * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
  const left = Math.max(1, Math.ceil(g.sec - g.t));
  ctx.font = `bold ${G.font ?? 9}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.lineWidth = 2; ctx.strokeStyle = '#1b1830'; ctx.strokeText(String(left), cx, cy - R - 2); ctx.fillStyle = '#dff6ff'; ctx.fillText(String(left), cx, cy - R - 2);
  ctx.restore();
}
