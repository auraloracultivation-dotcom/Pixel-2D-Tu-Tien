// Vật vùng Ngoại Vực Vết Nứt: đá hư không lấm tấm sao, khe nứt tím phập phồng, tinh thể tím.
export function drawVoidTile(ctx, ch, px, py, T, h, t) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 'p') {
    if (h > 0.7) { ctx.fillStyle = `rgba(220,190,255,${0.25 + 0.3 * Math.sin(t * 1.5 + h * 40)})`; ctx.fillRect(Math.round(px + h * 13), Math.round(py + (h * 97 % 1) * 13), 1, 1); }
    if (h < 0.08) {   // phù văn cổ: vòng tròn điểm ảnh có gạch ngang
      ctx.fillStyle = 'rgba(192,106,255,0.25)';
      ctx.fillRect(cx - 2, cy - 4, 4, 1); ctx.fillRect(cx - 2, cy + 3, 4, 1); ctx.fillRect(cx - 4, cy - 2, 1, 4); ctx.fillRect(cx + 3, cy - 2, 1, 4);
      ctx.fillRect(cx - 3, cy - 3, 1, 1); ctx.fillRect(cx + 2, cy - 3, 1, 1); ctx.fillRect(cx - 3, cy + 2, 1, 1); ctx.fillRect(cx + 2, cy + 2, 1, 1);
      ctx.fillRect(cx - 3, cy, 6, 1);
    }
  } else if (ch === 'f') {
    const k = 0.5 + 0.5 * Math.sin(t * 2.2 + h * 8);
    ctx.fillStyle = '#0a0414'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = `rgba(160,80,255,${0.25 + 0.35 * k})`; ctx.fillRect(px + 3 + h * 4, py, 3 + k * 2, T);
    ctx.fillStyle = `rgba(230,200,255,${0.2 + 0.3 * k})`; ctx.fillRect(px + 4 + h * 4, py, 1, T);
    if (h > 0.6) { ctx.fillStyle = `rgba(192,106,255,${0.4 * (1 - (t * 0.7 + h) % 1)})`; ctx.fillRect(cx - 1, py - ((t * 8 + h * 20) % 12), 2, 2); }   // khói tím bốc lên
  } else if (ch === '*') {
    ctx.fillStyle = '#5a2a8a'; ctx.beginPath(); ctx.moveTo(cx, py - 4); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx + 2, py + T - 1); ctx.lineTo(cx - 3, py + T - 1); ctx.lineTo(cx - 5, cy + 1); ctx.fill();
    ctx.fillStyle = '#c06aff'; ctx.beginPath(); ctx.moveTo(cx, py - 4); ctx.lineTo(cx + 1.5, cy); ctx.lineTo(cx - 3, cy + 1); ctx.fill();
    ctx.fillStyle = `rgba(192,106,255,${0.12 + 0.08 * Math.sin(t * 2 + h * 6)})`; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  }
}
