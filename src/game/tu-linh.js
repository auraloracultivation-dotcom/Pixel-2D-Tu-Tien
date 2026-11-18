// Tụ linh trước khi tung pháp bảo (chủ dự án 18/11/2026 09:59: "đánh thường có khựng lại 1 nhịp nhỏ để lấy đà, nhưng dùng skill lại không
// có, thấy thiếu nghi lễ; trước khi xài skill cũng khựng lại 1 nhịp nhỏ để tụ linh, sau đó mới bắn ra"). Bấm pháp bảo: trừ linh lực, vào
// hồi chiêu ngay (không bấm đúp được), người đứng khựng s giây; linh khí màu pháp bảo xoáy từ vòng ngoài vào tay, vòng sáng co lại, chớp
// nhỏ lúc bắn. Hướng bắn chốt lúc buông: không tự ngắm thì quay về con quái gần nhất lúc đó. Số ở data/phap-bao.json → tu_linh.
import { addFx } from './combat.js';
import { pbx } from './phap-bao-hit.js';

export const tuLinhCfg = game => game.data['phap-bao'].tu_linh || {};

// Bắt đầu tụ; fire(ang) chạy khi tụ xong
export function startTuLinh(game, color, aimFn, fire) {
  const C = tuLinhCfg(game), p = game.player, s = C.on === false ? 0 : C.s ?? 0.22;
  if (s <= 0) { fire(aimFn()); return; }
  p.tuLinhT = Math.max(p.tuLinhT || 0, s);
  const seed = Math.random() * 1000;
  addFx(game, { type: 'tu-linh', x: p.x, y: p.y, life: s, color, draw: (ctx, f, k) => drawTuLinh(ctx, game, f, k, C, seed) });
  game.sfx?.(C.sfx || 'chime', 0.35);
  pbx(game).list.push({ kind: 'wait', t: 0, life: s, then: () => {
    addFx(game, { type: 'ring', x: p.x, y: p.y - 6, r: C.burst_r || 16, color, life: 0.18, fill: true });   // chớp nhỏ lúc bắn
    fire(aimFn());
  } });
}

function drawTuLinh(ctx, game, f, k, C, seed) {
  const p = game.player, x = Math.round(p.x), y = Math.round(p.y - 8), R0 = C.r || 26, n = C.motes || 12;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 + 0.5 * k; ctx.strokeStyle = f.color; ctx.lineWidth = 2;   // vòng tụ co dần về người
  ctx.beginPath(); ctx.ellipse(x, y + 6, R0 * (1 - 0.7 * k), R0 * 0.45 * (1 - 0.7 * k), 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < n; i++) {   // hạt linh khí xoáy vào tay: lõi trắng, đuôi màu pháp bảo
    const a = seed + i * (Math.PI * 2 / n) + k * 3, d = R0 * (1 - k) * (0.7 + 0.3 * Math.sin(seed + i * 1.7));
    const px = Math.round(x + Math.cos(a) * d), py = Math.round(y + Math.sin(a) * d * 0.6);
    const tx = Math.round(Math.cos(a - 0.5) * 3), ty = Math.round(Math.sin(a - 0.5) * 2);   // đuôi kéo ngược chiều xoáy
    ctx.globalAlpha = 0.9; ctx.fillStyle = f.color; ctx.fillRect(px + tx, py + ty, 2, 2); ctx.fillRect(px + tx * 2, py + ty * 2, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 0.35 + 0.45 * k; ctx.fillStyle = f.color;   // quầng sáng ở tay to dần, lõi trắng
  ctx.beginPath(); ctx.arc(x, y, 3 + 6 * k, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.5 + 0.5 * k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 1 + 2 * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
