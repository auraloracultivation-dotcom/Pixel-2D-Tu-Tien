// Vật vùng Đảo Hậu Thổ: đất nâu nứt, đường đá lát, ruộng bậc thang, cột đá, nhà đất, vách núi trong Địa Cung.
export function drawEarthTile(ctx, ch, px, py, T, h, t, up) {
  const cx = px + T / 2, cy = py + T / 2;
  if (ch === 't') {
    if (h > 0.75) { ctx.strokeStyle = 'rgba(90,50,20,0.3)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px + h * 8, py + 3); ctx.lineTo(cx, cy); ctx.lineTo(px + 4 + h * 9, py + T - 3); ctx.stroke(); }
    else if (h < 0.12) { ctx.fillStyle = '#7a9a4a'; ctx.fillRect(px + 4 + h * 40, py + 8, 1.2, 3); ctx.fillRect(px + 6 + h * 40, py + 7, 1.2, 4); }
  } else if (ch === 'o') {
    ctx.strokeStyle = 'rgba(80,60,40,0.22)'; ctx.lineWidth = 0.6;
    ctx.strokeRect(px + 0.3, py + 0.3, T / 2 - 0.6, T - 0.6); ctx.strokeRect(px + T / 2 + 0.3, py + 0.3, T / 2 - 0.6, T / 2 - 0.6);
  } else if (ch === 'y') {
    // Luống bậc thang: bờ đất trên, lúa non xanh
    ctx.fillStyle = '#6a5030'; ctx.fillRect(px, py, T, 2);
    ctx.fillStyle = '#a8c05a';
    for (let i = 2; i < T; i += 4) { const k = Math.sin(t * 1.5 + px * 0.1 + i) * 0.8; ctx.fillRect(px + i + k, py + 5, 1, 4); ctx.fillRect(px + i + 1 + k, py + 10, 1, 4); }
  } else if (ch === 'I') {
    ctx.fillStyle = '#6a4a30'; ctx.fillRect(cx - 4, cy - 8, 8, 14);
    ctx.fillStyle = '#8a6a4a'; ctx.fillRect(cx - 4, cy - 8, 3, 14);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(cx - 5, cy - 10, 10, 3); ctx.fillRect(cx - 5, cy + 5, 10, 3);
    if (h > 0.6) { ctx.fillStyle = '#d8a070'; ctx.fillRect(cx - 1, cy - 4, 2, 2); }   // ký tự cổ khắc trên cột
  } else if (ch === 'z') {
    const roof = up !== 'z';
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(px, py + 2, T, T - 2);
    if (roof) { ctx.fillStyle = '#c89a5a'; ctx.beginPath(); ctx.ellipse(cx, py + 3, T / 2 + 2, 5, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#7a5a2a'; ctx.fillRect(px - 1, py + 2, T + 2, 2); }
    else { ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.arc(cx, cy + 3, 4, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 4, cy + 3, 8, 4); }
  } else if (ch === 'E') {
    ctx.fillStyle = '#3a2618'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#4e3422'; ctx.fillRect(px + h * 8, py + 3, 5, 3); ctx.fillRect(px + 2, py + 9 + h * 3, 6, 2);
    if (up !== 'E') { ctx.fillStyle = '#8a5a32'; ctx.fillRect(px, py, T, 2); }
  } else if (ch === 'v' && h > 0.86) {
    ctx.fillStyle = `rgba(216,160,112,${0.3 + 0.25 * Math.sin(t * 2 + h * 9)})`; ctx.fillRect(px + h * 12, py + 4 + h * 5, 2, 2);   // hổ phách lấp lánh
  }
}
