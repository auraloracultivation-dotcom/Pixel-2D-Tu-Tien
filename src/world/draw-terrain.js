// Địa hình tinh cầu (tools/terrain.py): núi (^) và nước (=). Hình khối dự phòng khi hình pixel (tools/art/terrain2.py) chưa tải xong.
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Núi: ô không có núi phía trên thì là đỉnh nhọn cao quá ô, có núi phía trên thì là sườn đá; đỉnh phủ tuyết
export function drawMountain(ctx, map, tx, ty, T, h) {
  const px = tx * T, py = ty * T, base = map.def.ground || '#8a8070';
  const top = map.at(tx, ty - 1) !== '^', below = map.at(tx, ty + 1) === '^';
  ctx.fillStyle = shade(base, 0.62); ctx.fillRect(px, py + (top ? 6 : 0), T, T - (top ? 6 : 0) + (below ? 0 : 0));
  if (top) {
    const peak = py - 6 - h * 6, cx = px + T / 2 + (h - 0.5) * 4;
    ctx.fillStyle = shade(base, 0.62);
    ctx.beginPath(); ctx.moveTo(px - 3, py + T); ctx.lineTo(cx, peak); ctx.lineTo(px + T + 3, py + T); ctx.fill();
    ctx.fillStyle = shade(base, 0.45);   // sườn khuất sáng bên phải
    ctx.beginPath(); ctx.moveTo(cx, peak); ctx.lineTo(px + T + 3, py + T); ctx.lineTo(cx + 2, py + T); ctx.fill();
    ctx.fillStyle = '#f4f6fa';            // chóp tuyết
    ctx.beginPath(); ctx.moveTo(cx, peak); ctx.lineTo(cx + 4, peak + 6); ctx.lineTo(cx + 1, peak + 5); ctx.lineTo(cx - 1, peak + 7); ctx.lineTo(cx - 4, peak + 6); ctx.fill();
  } else {
    ctx.fillStyle = shade(base, 0.5);
    ctx.fillRect(px + 3 + h * 6, py + 4, 4, 2); ctx.fillRect(px + 9 - h * 5, py + 10, 3, 2);
  }
  if (!below) { ctx.fillStyle = 'rgba(20,16,30,.25)'; ctx.fillRect(px, py + T - 2, T, 2); }
}

// Nước: lăn tăn sáng theo thời gian, bờ phía trên có viền
export function drawWater(ctx, map, tx, ty, T, h, t) {
  const px = tx * T, py = ty * T, k = 0.5 + 0.5 * Math.sin(t * 1.6 + h * 9);
  ctx.fillStyle = '#3a72b8'; ctx.fillRect(px, py, T, T);
  ctx.fillStyle = '#4a8ad0'; ctx.fillRect(px, py + (ty % 2 ? 2 : 8), T, 4);
  ctx.fillStyle = `rgba(220,240,255,${(0.25 + 0.35 * k).toFixed(2)})`;
  ctx.fillRect(px + 2 + h * 8, py + 4 + ((t * 2 + h * 7) % 8), 4, 1);
  if (map.at(tx, ty - 1) !== '=') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px, py, T, 2); }
}
