// Hiệu ứng code cho nhân vật ảnh 7 khung (đồng hành, NPC, ảnh Canva theo mẫu chibi; chủ dự án 29/10/2026):
// - chạy: bụi tung sau gót theo nhịp bước,
// - đánh: vệt quét màu nhân vật trước mặt lúc khung đánh, chớp sáng nhỏ ở đầu vệt,
// - ngã (gục): khung nằm (ACT.down) nảy nhẹ khi chạm đất, nhạt dần, hồn linh khí trắng bay lên rồi tan.
// Lượt gục nằm ở game.downs [{ id, x, y, dir, t0, color }] (game/companion.js downFx, lúc người chơi gục; id null: chỉ hồn bay lên), tự bỏ khi hết DOWN_T.
import { ACT, drawAct } from './draw-acts.js';

const DOWN_T = 1.6;   // giây hiện lượt gục

// Bụi chạy: 2 cụm nhỏ sau gót, mỗi bước (7 bước/giây như walkFrame) bung ra rồi tan
export function drawRunDust(ctx, e, t, dir = e.lookX || 1) {
  const ph = (t * 3.5) % 1;
  ctx.save();
  ctx.fillStyle = '#e8dcc0';
  for (let i = 0; i < 2; i++) {
    const q = (ph + i * 0.5) % 1;
    ctx.globalAlpha = 0.32 * (1 - q);
    const r = 0.8 + q * 1.6;
    ctx.beginPath(); ctx.arc(e.x - dir * (3 + q * 5), e.y + 0.5 - q * 2 - i * 0.6, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Vệt quét lúc đánh: cung sáng trước mặt theo màu nhân vật, mạnh nhất ngay khung đánh (k: 0..1 tiến độ đòn)
export function drawHitSwoosh(ctx, e, color, dir, k) {
  const a = Math.max(0, 1 - k);
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const cx = e.x + dir * 6, cy = e.y - 11, r = 9 + k * 4, s = dir > 0 ? -1.2 : Math.PI - 0.9, end = dir > 0 ? 0.9 : Math.PI + 1.2;
  ctx.globalAlpha = 0.55 * a; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, s, end); ctx.stroke();
  ctx.globalAlpha = 0.9 * a; ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, r, s + 0.4, end - 0.2); ctx.stroke();
  const tip = dir > 0 ? end : s;   // chớp sáng ở đầu vệt
  ctx.globalAlpha = 0.7 * a; ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(cx + Math.cos(tip) * r) - 1, Math.round(cy + Math.sin(tip) * r) - 1, 2, 2);
  ctx.restore();
}

// Vẽ một lượt gục; trả false khi đã hết để bỏ khỏi danh sách
export function drawDown(ctx, game, d) {
  const k = (game.time - d.t0) / DOWN_T;
  if (k >= 1) return false;
  const bounce = k < 0.12 ? Math.sin(k / 0.12 * Math.PI) * 2.5 : 0;   // chạm đất nảy lên một chút
  if (d.id) {
    ctx.save();
    ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    drawAct(ctx, game.data.art, d.id, ACT.down, d.x, d.y + 1, d.dir, bounce);
    ctx.restore();
  }
  ctx.save();   // hồn linh khí: 5 đốm bay lên lắc lư, nhạt dần
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const q = Math.min(1, Math.max(0, k * 1.6 - i * 0.12));
    if (q <= 0 || q >= 1) continue;
    ctx.globalAlpha = 0.7 * (1 - q);
    ctx.fillStyle = i % 2 ? d.color : '#ffffff';
    const x = d.x + Math.sin(q * 6 + i * 1.7) * 3 + (i - 2) * 1.5, y = d.y - 6 - q * 22;
    ctx.fillRect(Math.round(x), Math.round(y), i % 2 ? 1 : 2, i % 2 ? 1 : 2);
  }
  ctx.restore();
  return true;
}

// Vẽ và dọn mọi lượt gục (gọi trong lớp thế giới, sau thực thể)
export function drawDowns(ctx, game) {
  if (game.downs?.length) game.downs = game.downs.filter(d => drawDown(ctx, game, d));
}
