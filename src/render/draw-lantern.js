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
