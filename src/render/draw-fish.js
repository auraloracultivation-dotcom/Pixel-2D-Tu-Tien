// Cần câu: dây từ tay người chơi tới phao trên biển mây; cá cắn thì phao chìm, gợn sóng.
export function drawFishing(ctx, game, t) {
  const f = game.fish;
  if (!f) return;
  const p = game.player, d = Math.hypot(f.dir.x, f.dir.y) || 1;
  const hx = p.x + f.dir.x / d * 6, hy = p.y - 10;
  const bx = p.x + f.dir.x / d * 18, by = p.y + f.dir.y / d * 18 + (f.bite ? 2 + Math.sin(t * 30) : Math.sin(t * 3) * 0.8);
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,240,255,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + bx) / 2, by - 2, bx, by); ctx.stroke();
  ctx.fillStyle = '#e0484a'; ctx.fillRect(bx - 1.2, by - 2.5, 2.4, 2); ctx.fillStyle = '#fff'; ctx.fillRect(bx - 1.2, by - 0.8, 2.4, 1.2);
  const k = (t * (f.bite ? 2.5 : 0.8)) % 1;
  ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * (f.bite ? 0.8 : 0.35)})`; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.ellipse(bx, by + 0.5, 2 + k * (f.bite ? 8 : 4), 1 + k * (f.bite ? 3 : 1.5), 0, 0, Math.PI * 2); ctx.stroke();
}
