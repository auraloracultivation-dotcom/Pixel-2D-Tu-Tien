// Vật vùng rừng Đảo Mộc: cổ thụ, nấm phát sáng, đốm sáng trên rêu, nhà trên cây, đèn lồng, rễ trong Cổ Thụ Tâm.
export function drawForestTile(ctx, ch, px, py, T, h, t, up) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 'm' && h > 0.84) {
    const a = 0.35 + 0.35 * Math.sin(t * 2 + h * 20);   // đốm sáng lơ lửng
    ctx.fillStyle = `rgba(216,255,176,${a})`; ctx.fillRect(Math.round(px + h * 12), Math.round(py + 4 + Math.sin(t + h * 9) * 2), 1, 1);
  } else if (ch === 'n') {
    const a = 0.55 + 0.25 * Math.sin(t * 2.5 + h * 11);
    for (const [dx, s] of [[-3, 1], [3, 0.75]]) {
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(cx + dx - 0.8, cy, 1.6, 3 * s + 1);
      ctx.fillStyle = `rgba(122,224,255,${a})`; ctx.beginPath(); ctx.ellipse(cx + dx, cy, 3.2 * s, 2 * s, 0, Math.PI, 0); ctx.fill();
    }
  } else if (ch === 'Z') {
    const top = up !== 'Z';
    ctx.fillStyle = '#4a3420'; ctx.fillRect(cx - 3, cy - 2, 6, T / 2 + 2);
    ctx.fillStyle = '#1f5a32'; ctx.beginPath(); ctx.arc(cx, cy - 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e7a3e'; ctx.beginPath(); ctx.arc(cx - 3, cy - 5 - (top ? 2 : 0), 7, 0, Math.PI * 2); ctx.fill();
    if (h > 0.6) { ctx.fillStyle = '#4aa860'; ctx.beginPath(); ctx.arc(cx + 3, cy - 7, 3, 0, Math.PI * 2); ctx.fill(); }
  } else if (ch === 'l') {
    ctx.strokeStyle = 'rgba(80,50,20,0.25)'; ctx.lineWidth = 0.6;
    for (let i = 4; i < T; i += 5) { ctx.beginPath(); ctx.moveTo(px, py + i); ctx.lineTo(px + T, py + i); ctx.stroke(); }
  } else if (ch === 'W') {
    const roof = up !== 'W';
    ctx.fillStyle = '#5a3e24'; ctx.fillRect(px + 2, py + 3, T - 4, T - 3);
    ctx.fillStyle = '#8a6a3e'; ctx.fillRect(px + 3, py + 4, T - 6, T - 6);
    if (roof) { ctx.fillStyle = '#2e7a3e'; ctx.fillRect(px - 1, py - 2, T + 2, 6); ctx.fillStyle = '#4aa860'; ctx.fillRect(px, py - 3, T, 2); }
    else { ctx.fillStyle = '#ffe27a'; ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 2 + h * 5); ctx.fillRect(cx - 2, cy - 1, 4, 4); ctx.globalAlpha = 1; }
  } else if (ch === 'Q') {
    ctx.fillStyle = '#4a3420'; ctx.fillRect(cx - 0.8, cy - 6, 1.6, 12);
    ctx.fillStyle = `rgba(255,200,90,${0.75 + 0.2 * Math.sin(t * 3 + h * 7)})`; ctx.fillRect(cx - 3, cy - 7, 6, 6);
    ctx.fillStyle = 'rgba(255,220,140,0.18)'; ctx.beginPath(); ctx.arc(cx, cy - 4, 9, 0, Math.PI * 2); ctx.fill();
  } else if (ch === 'r' && h > 0.8) {   // rễ nổi trên nền: dải 1 điểm ảnh uốn lên giữa ô
    const y = Math.round(py + 6 + h * 4);
    ctx.fillStyle = 'rgba(120,90,50,0.5)';
    ctx.fillRect(px, y, 4, 1); ctx.fillRect(px + 4, y - 1, 3, 1); ctx.fillRect(px + 7, y - 2, 3, 1); ctx.fillRect(px + 10, y - 1, 3, 1); ctx.fillRect(px + 13, y, 3, 1);
  } else if (ch === 'X') {
    ctx.fillStyle = '#241a12'; ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + h * 6, py); ctx.quadraticCurveTo(cx + 4, cy, px + 4 + h * 8, py + T); ctx.stroke();
    if (up !== 'X') { ctx.fillStyle = '#3e7a3e'; ctx.fillRect(px, py, T, 2); }
  }
}
