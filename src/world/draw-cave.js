// Vật trong động phủ: lò đan, lò rèn, luống linh điền (lớn dần theo độ chín).
export function drawFurnace(ctx, cx, cy, t) {
  const k = 0.6 + 0.4 * Math.sin(t * 6);
  ctx.fillStyle = `rgba(255,140,60,${0.25 * k})`;
  ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5a2a'; ctx.fillRect(cx - 6, cy + 3, 2, 5); ctx.fillRect(cx + 4, cy + 3, 2, 5);
  ctx.fillStyle = '#b8862e'; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8a84a'; ctx.fillRect(cx - 8, cy - 6, 16, 3);
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(cx - 2, cy - 1, 4, 3);
  ctx.fillStyle = `rgba(255,${150 + 60 * k},80,0.9)`; ctx.fillRect(cx - 1, cy, 2, 2);
  // khói thuốc bốc lên
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i / 3) % 1;
    ctx.fillStyle = `rgba(220,240,220,${0.5 * (1 - ph)})`;
    ctx.beginPath(); ctx.arc(cx + Math.sin(ph * 6 + i) * 3, cy - 8 - ph * 14, 2 + ph * 3, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawAnvil(ctx, cx, cy, t) {
  ctx.fillStyle = '#3a2a2a'; ctx.fillRect(cx - 7, cy + 2, 14, 6);
  ctx.fillStyle = `rgba(255,120,40,${0.6 + 0.3 * Math.sin(t * 5)})`; ctx.fillRect(cx - 5, cy + 3, 10, 3);
  ctx.fillStyle = '#5a5a6a'; ctx.fillRect(cx - 7, cy - 5, 14, 4);
  ctx.fillStyle = '#7a7a8a'; ctx.fillRect(cx - 9, cy - 6, 6, 3); ctx.fillRect(cx - 3, cy - 1, 6, 3);
  if ((t * 1.5) % 1 < 0.15) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(cx + 2, cy - 9, 2, 2); ctx.fillRect(cx - 4, cy - 10, 1, 1); }
}

// soil: đất đã vẽ bằng hình pixel (draw-ground.js drawPlotSoil) thì chỉ vẽ cây. Cây vẽ theo điểm nguyên cho sắc nét.
export function drawPlot(ctx, px, py, T, grow, h, crop, soil) {
  if (grow < 0) {   // đất hoang chưa khai: cỏ dại, đá vụn
    if (soil) return;
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
    ctx.fillStyle = '#6a7a4a'; for (let i = 0; i < 4; i++) ctx.fillRect(px + 2 + ((h * 97 * (i + 1)) % 11), py + 4 + i * 3, 2, 2);
    return;
  }
  if (!soil) {
    ctx.fillStyle = '#4a3020'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
    ctx.fillStyle = '#3a2418';
    for (let i = 3; i < T; i += 5) ctx.fillRect(px + 1, py + i, T - 2, 1);
  }
  const n = 3, ripe = grow >= 1;
  for (let i = 0; i < n; i++) {
    const x = px + 3 + i * 5, y = py + 12, hgt = Math.round(2 + grow * 7);
    ctx.fillStyle = ripe ? crop.color : '#4aa860';
    ctx.fillRect(x, y - hgt, 2, hgt);
    if (grow > 0.5) ctx.fillRect(x - 1, y - hgt + 1, 4, 2);
    if (ripe) { ctx.fillStyle = crop.flower; ctx.fillRect(x, y - hgt - 1 - (h * 2 | 0), 2, 2); }
  }
}
