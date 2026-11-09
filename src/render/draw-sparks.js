// Vẽ tia lửa li ti (src/game/sparks.js): ô vuông 2–3 đơn vị bản đồ (1–1,5 điểm ảnh) bám lưới, lõi giữ màu thật (không cộng sáng để
// khỏi bệt trắng trên nền sáng), quầng mờ nhỏ cộng sáng; cuối đời nhấp nháy rồi tắt. Vẽ ở lớp trên cùng cùng vệt chém.
export function drawSparks(ctx, game) {
  const list = game.sparks;
  if (!list?.length) return;
  ctx.save();
  for (const p of list) {
    const k = p.t / p.life, a = k < 0.7 ? 1 : (Math.floor(p.t * 30) % 2 ? 0.25 : 0.85) * (1 - k) / 0.3;
    const x = Math.round(p.x), y = Math.round(p.y), s = p.s;
    ctx.fillStyle = p.c;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.18; ctx.fillRect(x - s / 2, y - s / 2, s * 2, s * 2);   // quầng
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}
