// Vật vùng băng (Đảo Hàn Băng, Băng Quật): tùng phủ tuyết, hồ băng nứt, trụ băng, lấp lánh trên tuyết.
export function drawIceTile(ctx, ch, px, py, T, h, t, above) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 'w' && h > 0.75) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 3 + h * 40)})`;
    ctx.fillRect(Math.round(px + h * 13), Math.round(py + (h * 97 % 1) * 13), 1, 1);
  } else if (ch === 'i') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px + 3 + h * 4, py + 12); ctx.lineTo(px + 9 + h * 4, py + 4); ctx.stroke();
  } else if (ch === 'Y') {
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx - 1.5, cy + 3, 3, 5);
    for (const [w, y, c] of [[8, 2, '#2f6a5a'], [6, -3, '#3a7a68'], [4, -7, '#4a8a78']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - w, cy + y + 3); ctx.lineTo(cx + w, cy + y + 3); ctx.lineTo(cx, cy + y - 5); ctx.fill();
      ctx.fillStyle = '#f4f8fc'; ctx.fillRect(cx - w * 0.6, cy + y - 1, w * 1.2, 1.5);
    }
  } else if (ch === 'O') {
    ctx.fillStyle = '#7ab8e0'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 2 + h * 6, py + 3, 5, 1.5);
    ctx.strokeStyle = 'rgba(30,60,100,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px + h * T, py); ctx.lineTo(px + T / 2, py + T / 2); ctx.lineTo(px + T, py + h * T); ctx.stroke();
    if (above !== 'O') { ctx.fillStyle = '#e4eef6'; ctx.fillRect(px, py, T, 2); }
  } else if (ch === 'j' && h > 0.85) {
    ctx.fillStyle = 'rgba(154,216,255,0.25)'; ctx.fillRect(Math.round(px + h * 10), py + 4, 3, 3);
  } else if (ch === 'k') {
    ctx.fillStyle = '#5a8ab8'; ctx.beginPath(); ctx.moveTo(cx - 5, py + T); ctx.lineTo(cx - 2, py - 6); ctx.lineTo(cx + 5, py + T); ctx.fill();
    ctx.fillStyle = '#bfe8ff'; ctx.beginPath(); ctx.moveTo(cx - 1, py + T - 2); ctx.lineTo(cx - 1, py - 3); ctx.lineTo(cx + 2, py + T - 2); ctx.fill();
    ctx.fillStyle = `rgba(191,232,255,${0.15 + 0.1 * Math.sin(t * 2 + h * 9)})`; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  }
}
