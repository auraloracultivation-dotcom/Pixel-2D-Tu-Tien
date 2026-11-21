// Ma khí quanh người đang hóa ma (chủ dự án 22/11/2026; data/pvp.json → ma.mau, mau_dam): quầng đỏ sau lưng, vũng ma khí đỏ sẫm dưới chân phập phồng
// có viền đỏ, khói ma bốc lên quanh thân. Vẽ chung cho mình và người khác (render/draw-nguoi.js), trước thân người. Không đọc bản lưu.
export function drawMaKhi(ctx, game, e, t, A) {
  const M = game.data.pvp?.ma;
  if (!M) return;
  const k = 0.5 + 0.5 * Math.sin(t * 4 + (e.x % 7));
  ctx.save();
  const g = ctx.createRadialGradient(e.x, e.y - 12, 2, e.x, e.y - 12, 20 + 3 * k);   // quầng đỏ sau lưng
  g.addColorStop(0, M.mau); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = A * (0.22 + 0.12 * k); ctx.fillStyle = g;
  ctx.fillRect(e.x - 24, e.y - 36, 48, 48);
  ctx.globalAlpha = A * (0.6 + 0.15 * k); ctx.fillStyle = M.mau_dam;   // vũng ma khí dưới chân
  ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, 12 + 2 * k, 4.5 + k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = A * (0.35 + 0.3 * k); ctx.strokeStyle = M.mau; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, 13 + 3 * k, 5 + k, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = M.mau;   // khói ma bốc lên
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.7 + i / 8) % 1, s = ph < 0.5 ? 2 : 1.5;
    ctx.globalAlpha = A * 0.85 * (1 - ph);
    ctx.fillRect(Math.round(e.x + Math.sin(i * 2.4 + t * 1.6) * (6 + 5 * ph)), Math.round(e.y - 2 - ph * 30), s, s);
  }
  ctx.restore();
}
