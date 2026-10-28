// Hào quang cảnh giới (data/status.json → auras) và danh hiệu trên đầu người chơi.
import { titleOf } from '../game/achieve.js';
import { textQ } from './draw-focus.js';

export function drawAura(ctx, game, p, t) {
  const a = game.data.status.auras[game.save.realm];
  if (!a) return;
  const y = p.y - 6, pulse = 1 + Math.sin(t * 2.2) * 0.08;
  const g = ctx.createRadialGradient(p.x, y, 2, p.x, y, a.r * pulse);
  g.addColorStop(0, a.color + '00'); g.addColorStop(0.55, a.color + '55'); g.addColorStop(1, a.color + '00');
  ctx.globalAlpha = a.alpha * 2; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, y, a.r * pulse, 0, Math.PI * 2); ctx.fill();
  if (a.ring) {
    ctx.globalAlpha = a.alpha; ctx.strokeStyle = a.color; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, a.r * 0.9, a.r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // hạt sáng bay quanh
  ctx.fillStyle = a.color;
  for (let i = 0; i < (a.motes || 0); i++) {
    const k = (t * 0.5 + i / a.motes) % 1, ang = i * 2.4 + t * 0.8;
    ctx.globalAlpha = a.alpha * 2 * (1 - k);
    ctx.fillRect(p.x + Math.cos(ang) * a.r * 0.7 - 0.5, y + 6 - k * 22 + Math.sin(ang) * 2, 1, 1);
  }
  ctx.globalAlpha = 1;
}

export function drawTitle(ctx, game, p) {
  const ti = titleOf(game);
  if (!ti) return;
  const y = p.y - (p.top || 24) - (game.data.heroes.title_gap ?? 10);   // tách hẳn khỏi đầu, tóc, vũ khí đeo vai (chủ dự án xin 29/10/2026)
  const q = textQ(game, 6);   // máy quay xa: chữ không nhỏ quá
  ctx.font = `bold ${6 * q}px system-ui`; ctx.textAlign = 'center';
  ctx.lineWidth = 2 * q; ctx.strokeStyle = '#1b1830'; ctx.strokeText(ti.name, p.x, y);
  ctx.fillStyle = ti.color; ctx.fillText(ti.name, p.x, y);
}
