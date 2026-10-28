// Đồ lặt vặt ở sân xóm cho ấm cúng (chill): giếng nước bên trái sân, ghế gỗ và chậu hoa bên phải.
// Chỉ để nhìn, không chắn đường. Vẽ theo toạ độ thế giới, trước người và quái; vị trí tính từ tâm sân (map.def.hamlets).
const INK = '#1b1830';

function well(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(27,24,48,.25)'; ctx.fillRect(x - 7, y + 5, 15, 3);
  ctx.fillStyle = INK; ctx.fillRect(x - 8, y - 3, 17, 10);
  ctx.fillStyle = '#8a8aa0'; ctx.fillRect(x - 7, y - 2, 15, 8);   // thành đá
  ctx.fillStyle = '#a8a8be'; ctx.fillRect(x - 7, y - 2, 15, 2);
  ctx.fillStyle = '#6a6a80'; for (let i = -5; i <= 5; i += 5) ctx.fillRect(x + i, y + 1, 1, 4);
  ctx.fillStyle = '#2a4a6a'; ctx.fillRect(x - 5, y - 2, 11, 1);   // mặt nước
  ctx.fillStyle = INK; ctx.fillRect(x - 8, y - 15, 2, 13); ctx.fillRect(x + 7, y - 15, 2, 13); ctx.fillRect(x - 9, y - 16, 19, 3);
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 8, y - 15, 17, 1);   // xà
  const sw = Math.sin(t * 2) > 0.7 ? 1 : 0;
  ctx.fillStyle = INK; ctx.fillRect(x - 2 + sw, y - 14, 1, 6); ctx.fillRect(x - 3 + sw, y - 8, 5, 4);
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 2 + sw, y - 7, 3, 2);   // gầu
}

function bench(ctx, x, y) {
  ctx.fillStyle = 'rgba(27,24,48,.25)'; ctx.fillRect(x - 8, y + 3, 17, 2);
  ctx.fillStyle = INK; ctx.fillRect(x - 9, y - 4, 19, 4); ctx.fillRect(x - 8, y, 2, 4); ctx.fillRect(x + 6, y, 2, 4);
  ctx.fillStyle = '#b07a44'; ctx.fillRect(x - 8, y - 3, 17, 2);
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 8, y - 1, 17, 1);
}

function pot(ctx, x, y, c) {
  ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 2, 7, 6);
  ctx.fillStyle = '#b0603a'; ctx.fillRect(x - 2, y - 1, 5, 4);
  ctx.fillStyle = '#4a9a4a'; ctx.fillRect(x - 2, y - 5, 5, 3);
  ctx.fillStyle = c; ctx.fillRect(x - 1, y - 6, 1, 1); ctx.fillRect(x + 1, y - 5, 1, 1); ctx.fillRect(x, y - 4, 1, 1);
}

export function drawHamlets(ctx, game, t) {
  const hs = game.map?.def.hamlets;
  if (!hs) return;
  const T = game.map.T;
  hs.forEach(([hx, hy], i) => {
    const c = game.map.center(hx, hy), x = Math.round(c.x), y = Math.round(c.y);
    well(ctx, x - Math.round(T * 2.4), y + Math.round(T * 0.6), t + i);
    bench(ctx, x + Math.round(T * 1.6), y + Math.round(T * 1.4));
    pot(ctx, x - Math.round(T * 1.6), y - Math.round(T * 1.2), '#ff8ab8');
    pot(ctx, x + Math.round(T * 1.6), y - Math.round(T * 1.2), '#ffd27a');
  });
}
