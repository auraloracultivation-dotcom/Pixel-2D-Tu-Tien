// Vật vùng gió đen (Hắc Phong Đảo, Hắc Phong Động): cây khô, trụ đá đen, vệt gió trôi trên đá.
export function drawWindTile(ctx, ch, px, py, T, h, t) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 'd' && h > 0.8) {
    const k = (t * 0.6 + h * 7) % 1;   // vệt gió lướt ngang
    ctx.fillStyle = `rgba(200,190,230,${0.3 * Math.sin(k * Math.PI)})`;
    ctx.fillRect(Math.round(px + k * T), Math.round(py + 5 + h * 6), 7, 1);
  } else if (ch === 'V') {
    ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy - 4); ctx.lineTo(cx - 5, cy - 8);
    ctx.moveTo(cx, cy - 1); ctx.lineTo(cx + 6, cy - 6); ctx.moveTo(cx + 3, cy - 3.5); ctx.lineTo(cx + 3, cy - 9); ctx.stroke();
  } else if (ch === 'U') {
    ctx.fillStyle = '#2a2434'; ctx.fillRect(cx - 5, py - 5, 10, T + 3);
    ctx.fillStyle = '#4a4258'; ctx.fillRect(cx - 5, py - 5, 3, T + 3);
    ctx.fillStyle = `rgba(160,130,220,${0.2 + 0.15 * Math.sin(t * 2 + h * 9)})`; ctx.fillRect(cx - 1, py, 2, T - 4);
  } else if (ch === 'e' && h > 0.86) {
    ctx.fillStyle = 'rgba(138,122,176,0.22)'; ctx.fillRect(Math.round(px + h * 10), py + 5, 3, 2);
  }
}
