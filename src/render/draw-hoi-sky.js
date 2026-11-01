// Trời đêm lễ hội (tinh cầu có đồ hội, data/le-hoi.json → festivals.<bản đồ>.troi): đèn trời bay lên chầm chậm, lắc nhẹ theo gió,
// quầng ấm quanh đèn; pháo hoa nổ từng đợt trên phố (bung tia, rơi theo trọng lực, tắt dần). Tính thẳng theo thời gian (không lưu
// trạng thái, không tốn bộ nhớ), toạ độ màn hình, vẽ sau lớp đêm, cộng sáng.
import { outdoor } from '../game/daynight.js';
import { glow } from './draw-lights.js';

const h1 = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

export function drawHoiSky(ctx, game, screen, t) {
  const S = game.data['le-hoi']?.festivals?.[game.map?.id]?.troi;
  if (!S || !game.map.hoi?.length || !outdoor(game)) return;
  const W = screen.w, H = screen.h, z = screen.zoom, px = Math.max(1, Math.round(z * 0.9));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  // đèn trời: mỗi chiếc một làn, bay từ đáy lên đỉnh màn rồi vòng lại
  for (let i = 0; i < S.den; i++) {
    const sp = (S.den_speed[0] + h1(i, 1) * (S.den_speed[1] - S.den_speed[0])) * z, span = H + 80;
    const y = H + 40 - ((t * sp + h1(i, 2) * span) % span), x = h1(i, 3) * W + Math.sin(t * 0.35 + i * 1.7) * 14 * z;
    const f = 0.85 + 0.15 * Math.sin(t * 3 + i), r = 9 * z * f;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glow('troi|den', [[0, 'rgba(255,170,80,0.5)'], [0.5, 'rgba(255,140,60,0.18)'], [1, 'rgba(255,120,40,0)']]), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    const w = 4 * px, hh = 5 * px;
    ctx.fillStyle = '#c8502a'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - hh / 2), w, hh);
    ctx.fillStyle = '#ffd890'; ctx.fillRect(Math.round(x - w / 2 + px), Math.round(y - hh / 2 + px), w - 2 * px, hh - 2 * px);
  }
  // pháo hoa: mỗi ô nổ một quả theo chu kỳ riêng, gốc ở dưới, bay lên rồi bung tia
  for (let i = 0; i < S.phao; i++) {
    const P = S.phao_every[0] + h1(i, 4) * (S.phao_every[1] - S.phao_every[0]), cyc = Math.floor((t + h1(i, 5) * P) / P), u = (t + h1(i, 5) * P) % P;
    const bx = (0.15 + 0.7 * h1(i, cyc + 6)) * W, by = (0.12 + 0.3 * h1(i, cyc + 7)) * H, col = S.mau[Math.floor(h1(i, cyc + 8) * S.mau.length)];
    const up = 0.9;
    if (u < up) {   // đuôi pháo bay lên
      const k = u / up, y = H * 0.85 + (by - H * 0.85) * (1 - (1 - k) * (1 - k));
      ctx.fillStyle = `rgba(${col},0.9)`; ctx.fillRect(Math.round(bx), Math.round(y), px, px * 3);
      continue;
    }
    const tt = u - up, life = 1.6;
    if (tt > life) continue;
    const a = Math.max(0, 1 - tt / life), n = S.tia;
    if (tt < 0.25) { ctx.globalAlpha = (0.25 - tt) * 2.4; const r = 40 * z; ctx.drawImage(glow('troi|' + col, [[0, `rgba(${col},0.55)`], [1, `rgba(${col},0)`]]), bx - r, by - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`;
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2 + h1(i, cyc + j) * 0.2, v = (44 + h1(j, cyc + i) * 26) * z;
      const x = bx + Math.cos(ang) * v * tt, y = by + Math.sin(ang) * v * tt + 18 * z * tt * tt;
      ctx.fillRect(Math.round(x), Math.round(y), px * 2, px * 2);
      if (tt > 0.3 && j % 3 === 0) ctx.fillRect(Math.round(x - Math.cos(ang) * 3 * z), Math.round(y - Math.sin(ang) * 3 * z), px, px);   // vệt kéo
    }
  }
  ctx.restore();
}
