// Đèn hoa đăng (scenic.json → lantern): vẽ trên lớp ngày đêm để sáng giữa trời tối. Đèn trôi lên, đung đưa, mờ dần.
export function drawLanterns(ctx, game, screen) {
  const L = game.lanterns;
  if (!L?.length) return;
  const now = performance.now() / 1000, z = Math.max(1.6, screen.zoom * 1.4);   // ngắm cảnh lùi máy quay: giữ đèn đủ to
  game.lanterns = L.filter(l => now - l.born < l.life);
  for (const l of game.lanterns) {
    const k = (now - l.born) / l.life;
    if (k < 0) continue;
    const pos = screen.toScreen(l.x + Math.sin(now * 0.8 + l.sway) * 5, l.y - k * 150);
    const fade = Math.min(1, k * 6) * (1 - k);
    ctx.globalAlpha = fade * 0.35; ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 9 * z, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = fade; ctx.fillStyle = '#ffcf6a'; ctx.fillRect(pos.x - 2.5 * z, pos.y - 3 * z, 5 * z, 6 * z);
    ctx.fillStyle = '#ff8a3a'; ctx.fillRect(pos.x - 2.5 * z, pos.y - 3 * z, 5 * z, 1.2 * z); ctx.fillRect(pos.x - 1 * z, pos.y + 3 * z, 2 * z, 1 * z);
  }
  ctx.globalAlpha = 1;
}

// Sao băng: vệt sáng chéo trên nền trời, toạ độ theo tỉ lệ màn hình
export function drawMeteors(ctx, game, screen) {
  const M = game.meteors;
  if (!M?.length) return;
  const now = performance.now() / 1000, w = screen.w, h = screen.h;
  game.meteors = M.filter(m => now - m.born < m.life);
  ctx.lineCap = 'round';
  for (const m of game.meteors) {
    const k = (now - m.born) / m.life, x = (m.x - k * 0.3) * w, y = (m.y + k * 0.15) * h, a = Math.sin(k * Math.PI);
    const g = ctx.createLinearGradient(x, y, x + w * 0.08, y - h * 0.04);
    g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.08, y - h * 0.04); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
}
