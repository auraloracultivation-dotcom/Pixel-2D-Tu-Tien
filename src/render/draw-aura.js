// Hào quang cảnh giới (data/status.json → auras) và danh hiệu trên đầu người chơi. Dùng chung cho mình và người khác
// (src/render/draw-nguoi.js): không đọc bản lưu, chỉ vẽ theo thứ được đưa vào.
import { textQ } from './draw-focus.js';

// ri: cảnh giới của người được vẽ; A: độ đậm nền của họ (người khác đang gục thì mờ). Xong trả độ đậm về A.
export function drawAura(ctx, game, p, t, ri, A = 1) {
  const a = game.data.status.auras[ri];
  if (!a) return;
  const y = p.y - 6, pulse = 1 + Math.sin(t * 2.2) * 0.08;
  const g = ctx.createRadialGradient(p.x, y, 2, p.x, y, a.r * pulse);
  g.addColorStop(0, a.color + '00'); g.addColorStop(0.55, a.color + '55'); g.addColorStop(1, a.color + '00');
  ctx.globalAlpha = A * a.alpha * 2; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, y, a.r * pulse, 0, Math.PI * 2); ctx.fill();
  if (a.ring) {
    ctx.globalAlpha = A * a.alpha; ctx.strokeStyle = a.color; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, a.r * 0.9, a.r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // hạt sáng bay quanh
  ctx.fillStyle = a.color;
  for (let i = 0; i < (a.motes || 0); i++) {
    const k = (t * 0.5 + i / a.motes) % 1, ang = i * 2.4 + t * 0.8;
    ctx.globalAlpha = A * a.alpha * 2 * (1 - k);
    ctx.fillRect(p.x + Math.cos(ang) * a.r * 0.7 - 0.5, y + 6 - k * 22 + Math.sin(ang) * 2, 1, 1);
  }
  ctx.globalAlpha = A;
}

// ti: danh hiệu (data/status.json → titles.*), y: dòng chữ. Chữ không nhỏ quá khi máy quay xa (textQ).
export function drawTitle(ctx, game, p, ti, y) {
  if (!ti) return;
  const q = textQ(game, 6);
  ctx.font = `${6 * q}px "Unifont VN", system-ui`; ctx.textAlign = 'center';
  ctx.lineWidth = 2 * q; ctx.strokeStyle = '#1b1830'; ctx.strokeText(ti.name, p.x, y);
  ctx.fillStyle = ti.color; ctx.fillText(ti.name, p.x, y);
}
