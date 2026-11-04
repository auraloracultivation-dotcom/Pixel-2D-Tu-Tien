// Chậu dược viên (chủ dự án 04/11/2026 12:27–12:32): luống đã mở vẽ thành chậu theo cấp (ui-vk-chau-<cấp + 1>, data/garden.json →
// levels), cây trồng là hình nguyên liệu của cây (ui-vk-<cây>) mọc từ lòng chậu, lớn dần theo độ chín; chín thì đung đưa, lấp lánh.
// Chưa có hình (đang tải) thì trả false để draw-map.js vẽ luống đất cũ.
import { spriteImage } from '../render/sprites.js';
import { plotIndex, plotLv } from '../game/garden.js';

export function drawChau(ctx, game, tx, ty, px, py, T, grow, crop, t) {
  if (grow < 0) return false;
  const S = game.data.art.sprites, i = plotIndex(game, tx, ty), pot = S['ui.vk-chau-' + (plotLv(game, i) + 1)], pim = pot && spriteImage(pot);
  if (!pim) return false;
  const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
  const W = T * 1.1, H = W * pot.h / pot.w, x0 = px + T / 2 - W / 2, y0 = py + T - H;   // chậu đứng đáy ô
  const cs = S['ui.vk-' + crop.id], cim = cs && spriteImage(cs);
  if (cim) {   // cây sau miệng chậu: mầm nhỏ → cây đủ lớn
    const k = 0.3 + 0.7 * Math.min(1, grow), cw = T * 0.85 * k, sway = grow >= 1 ? Math.sin(t * 1.6 + tx) * 0.05 : 0;
    ctx.save(); ctx.translate(px + T / 2, y0 + H * 0.35); ctx.rotate(sway);
    ctx.drawImage(cim, -cw / 2, -cw, cw, cw); ctx.restore();
  }
  ctx.drawImage(pim, x0, y0, W, H);
  if (grow >= 1) {   // chín: hạt sáng lấp lánh trên ngọn
    ctx.fillStyle = `rgba(255,240,170,${0.5 + 0.5 * Math.sin(t * 4 + tx * 3)})`;
    ctx.fillRect(px + T / 2 + Math.sin(t * 2 + ty) * T * 0.25, y0 - T * 0.45 + Math.cos(t * 2.4 + tx) * 2, 1.5, 1.5);
  }
  ctx.imageSmoothingEnabled = smooth;
  return true;
}
