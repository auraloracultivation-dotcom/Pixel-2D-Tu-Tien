// Mộc Nhân (game/dummy.js): cọc gỗ có tay ngang, đầu tròn quấn rơm, vẽ bằng khối đơn giản (chưa có hình pixel riêng).
// Bị đánh thì chớp trắng và lắc nhẹ. Trên đầu: sát thương/giây đang chạy, kết quả, hoặc kỷ lục.
import { dummyLabel } from '../game/dummy.js';
import { textQ } from './draw-focus.js';

const INK = '#1b1830', WOOD = '#a8743a', DARK = '#6e4a22', ROPE = '#e0c47a';

export function drawDummy(ctx, game, m, t) {
  const hit = m.flash > 0, wob = hit ? Math.sin(t * 60) * 0.6 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 1, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(wob * 0.08);
  const W = hit ? '#fff' : WOOD, D = hit ? '#fff' : DARK;
  ctx.fillStyle = D; ctx.fillRect(-6, -2, 12, 3);           // đế gỗ
  ctx.fillStyle = W; ctx.fillRect(-2, -20, 4, 19);          // thân cọc
  ctx.fillStyle = D; ctx.fillRect(-2, -20, 1, 19);
  ctx.fillStyle = W; ctx.fillRect(-9, -16, 18, 3);          // tay ngang
  ctx.fillStyle = D; ctx.fillRect(-9, -14, 18, 1);
  ctx.fillStyle = hit ? '#fff' : ROPE; ctx.fillRect(-3, -12, 6, 2); ctx.fillRect(-3, -7, 6, 2);   // dây rơm quấn
  ctx.fillStyle = W; ctx.beginPath(); ctx.arc(0, -24, 4.5, 0, Math.PI * 2); ctx.fill();          // đầu
  if (!hit) { ctx.fillStyle = INK; ctx.fillRect(-2, -25, 1.2, 1.2); ctx.fillRect(1, -25, 1.2, 1.2); }
  ctx.restore();
  m.top = 30;
  const L = dummyLabel(game, m), q = textQ(game, 6), ny = m.y - 33;
  ctx.font = `bold ${6 * q}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * q; ctx.strokeStyle = INK;
  ctx.strokeText(L.text, m.x, ny); ctx.fillStyle = L.color; ctx.fillText(L.text, m.x, ny);
  return true;
}
