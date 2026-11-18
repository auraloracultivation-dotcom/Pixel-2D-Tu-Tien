// Kiếm khí đánh thường (chủ dự án 17/11/2026 11:12: "hiệu ứng đánh thường cũng cần"): mỗi nhát chém phóng ra một lưỡi liềm điểm ảnh
// bay ngắn về phía trước theo hướng chém, lõi trắng viền màu hệ, tan dither Bayer. Chỉ là hình (sát thương vẫn theo vệt chém).
// Tạo ở src/game/player.js strike → addFx({ draw: drawKiemKhi, ... }); số ở data/config.json → kiem_khi.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function drawKiemKhi(ctx, f, k) {
  const e = 1 - (1 - k) * (1 - k), d = f.from + f.len * e, cx = f.x + Math.cos(f.ang) * d, cy = f.y + Math.sin(f.ang) * d;
  const R = f.r * (0.85 + 0.3 * e), cut = Math.floor(k * k * 16), half = (f.half || 1) * (1 - 0.2 * k);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = -12; i <= 12; i++) {
    const a = f.ang + half * i / 12, w = Math.round(2 * (1 - Math.abs(i) / 13)) + 1;   // giữa dày, hai đầu mảnh
    for (let j = 0; j < w + 1; j++) {
      const x = Math.round(cx + Math.cos(a) * (R - j)), y = Math.round(cy + Math.sin(a) * (R - j) * 0.8);
      if (BAYER[(y & 3) * 4 + (x & 3)] < cut) continue;
      ctx.globalAlpha = 0.9; ctx.fillStyle = j === 0 ? f.color : j < w ? '#ffffff' : f.color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}
