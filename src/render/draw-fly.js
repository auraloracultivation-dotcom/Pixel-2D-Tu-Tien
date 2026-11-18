// Bay — ngự kiếm phi hành (src/game/fly.js): người đứng trên thanh kiếm phát sáng theo hệ, nhấc khỏi mặt đất (lift), bóng dưới đất
// nhỏ lại, đang bay thì có vệt sáng và vài sợi gió kéo sau. Trả về độ cao nhấc để src/render/draw.js dời hình người lên.
// Vẽ bằng điểm ảnh nguyên theo lưới bản đồ (docs/02-CHUAN-PIXEL.md). Số ở data/config.json → fly (lift).
export function drawFlySword(ctx, game, p, t) {
  const C = game.data.config.fly || {}, up = Math.min(1, (p.flyT || 0) / 0.3), lift = Math.round(((C.lift || 9) + Math.sin(t * 2.5) * 1.2) * up);
  const col = game.data.elements[game.save.element]?.color || '#9ad8ff', dir = (p.face?.x ?? 1) >= 0 ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = 0.28 * (1 - 0.4 * up); ctx.fillStyle = '#1b1830';   // bóng dưới đất: bay càng cao càng nhỏ, nhạt
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 8 - 3 * up, 2.4 - up, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  const y = Math.round(p.y - lift + 2);
  ctx.translate(Math.round(p.x), y); ctx.scale(dir, 1);
  if (p.moving) {   // vệt sáng sau kiếm + sợi gió
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.35 - i * 0.1; ctx.fillStyle = col; ctx.fillRect(-16 - i * 6, -1, 6, 2); }
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) { const k = (t * 3 + i / 3) % 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(-14 - k * 18), -6 + i * 5, Math.round(5 - k * 4), 1); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#140c22'; ctx.fillRect(-13, -2, 25, 4);   // viền mực
  ctx.fillStyle = '#dfe8f5'; ctx.fillRect(-11, -1, 20, 2);   // lưỡi kiếm
  ctx.fillStyle = col; ctx.fillRect(-11, 0, 20, 1);
  ctx.fillStyle = '#140c22'; ctx.fillRect(9, -2, 5, 4); ctx.fillStyle = '#dfe8f5'; ctx.fillRect(9, -1, 4, 2); ctx.fillRect(13, 0, 1, 1);   // mũi kiếm
  ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-15, -1, 4, 2); ctx.fillStyle = col; ctx.fillRect(-12, -3, 2, 6);   // chuôi, đốc
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 6); ctx.fillStyle = col; ctx.fillRect(-12, -3, 26, 6);   // linh quang
  ctx.restore();
  return lift;
}
