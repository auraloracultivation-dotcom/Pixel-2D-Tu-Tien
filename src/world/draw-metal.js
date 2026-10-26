// Vật vùng Đảo Thiên Kim: cát vàng gợn, bãi mộ kiếm, kiếm gãy, nhà rèn, kim thạch, vách đồng trong Kiếm Trủng.
export function drawMetalTile(ctx, ch, px, py, T, h, t, up) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 's') {
    if (h > 0.6) { ctx.strokeStyle = 'rgba(160,120,50,0.25)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px + 2, py + 6 + h * 6); ctx.quadraticCurveTo(cx, py + 3 + h * 6, px + T - 2, py + 7 + h * 6); ctx.stroke(); }
    if (h > 0.88) { ctx.fillStyle = `rgba(255,248,200,${0.5 + 0.4 * Math.sin(t * 3 + h * 30)})`; ctx.fillRect(px + h * 13, py + h * 9, 1.2, 1.2); }   // kim sa lấp lánh
  } else if (ch === 'g' || ch === 'u') {
    ctx.strokeStyle = ch === 'g' ? 'rgba(60,50,30,0.18)' : 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6;
    ctx.strokeRect(px + 0.3, py + 0.3, T - 0.6, T - 0.6);
    if (ch === 'u' && h > 0.85) { ctx.fillStyle = `rgba(255,210,74,${0.25 + 0.2 * Math.sin(t * 2 + h * 9)})`; ctx.fillRect(px + h * 12, py + 5, 1.5, 1.5); }
    if (ch === 'u' && h < 0.06) drawBroken(ctx, cx, cy, h * 50);
  } else if (ch === 'h') drawBroken(ctx, cx, cy, h * 3);
  else if (ch === 'J') {
    // Kiếm cắm xuống đất trước nấm mộ (nền đá bãi mộ, không lấy màu cát của đảo)
    ctx.fillStyle = '#a8987a'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.ellipse(cx, cy + 5, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8e0ea'; ctx.fillRect(cx - 1.2, cy - 8, 2.4, 13);
    ctx.fillStyle = '#9aa4b4'; ctx.fillRect(cx + 0.2, cy - 8, 1, 13);
    ctx.fillStyle = '#7a5a2a'; ctx.fillRect(cx - 4, cy - 9, 8, 1.8); ctx.fillRect(cx - 0.8, cy - 13, 1.6, 4);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - 1, cy - 14, 2, 1.5);
    const glint = (t * 0.6 + h * 5) % 4;
    if (glint < 0.25) { ctx.fillStyle = `rgba(255,255,255,${1 - glint * 4})`; ctx.fillRect(cx - 1.5, cy - 6 + glint * 30, 3, 1); }
  } else if (ch === 'N') {
    const roof = up !== 'N';
    ctx.fillStyle = '#8a7a6a'; ctx.fillRect(px, py + 2, T, T - 2);
    ctx.fillStyle = '#6a5a4a'; for (let i = 4; i < T; i += 5) ctx.fillRect(px, py + i, T, 0.8);
    if (roof) {
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(px - 1, py - 2, T + 2, 6);
      if (h > 0.5) {   // ống khói, khói bay
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx + 2, py - 7, 4, 6);
        ctx.fillStyle = 'rgba(200,200,200,0.3)'; const k = (t * 0.5 + h) % 1;
        ctx.beginPath(); ctx.arc(cx + 4 + k * 4, py - 9 - k * 10, 2 + k * 2, 0, Math.PI * 2); ctx.fill();
      }
    } else { ctx.fillStyle = `rgba(255,140,60,${0.5 + 0.2 * Math.sin(t * 4 + h * 5)})`; ctx.fillRect(cx - 3, cy, 6, 5); }
  } else if (ch === 'b') {
    ctx.fillStyle = '#a8802a'; ctx.beginPath(); ctx.moveTo(px + 2, py + T - 2); ctx.lineTo(px + 4, py + 4); ctx.lineTo(cx + 2, py + 1); ctx.lineTo(px + T - 2, py + 6); ctx.lineTo(px + T - 1, py + T - 2); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(px + 5, py + 6); ctx.lineTo(cx + 1, py + 3); ctx.lineTo(cx, cy); ctx.fill();
  } else if (ch === 'C') {
    ctx.fillStyle = '#2a2418'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#4a3e28'; ctx.fillRect(px + 2, py + 2, 1.5, 1.5); ctx.fillRect(px + T - 4, py + T - 4, 1.5, 1.5);
    if (up !== 'C') { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(px, py, T, 2); }
  }
}

// Kiếm gãy nằm trên nền
function drawBroken(ctx, cx, cy, a) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a - 1.5);
  ctx.fillStyle = '#c8d0dc'; ctx.fillRect(-5, -0.8, 8, 1.6);
  ctx.fillStyle = '#6a5030'; ctx.fillRect(3, -2, 1.5, 4); ctx.fillRect(4.5, -0.7, 3, 1.4);
  ctx.restore();
}
