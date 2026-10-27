// Mây trôi trên tinh cầu (vẽ theo toạ độ thế giới, trên người và quái): vài cụm mây mờ trôi chậm theo gió, bóng mây mờ dưới đất.
function hash(i, k) { const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return h - Math.floor(h); }

function puff(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.7, r * 0.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.8, y + r * 0.1, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.7, y - r * 0.2, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawClouds(ctx, game, t) {
  const def = game.map.def;
  if (!def.planet || (def.dark || 0) >= 0.3) return;
  const W = game.map.w * game.map.T, H = game.map.h * game.map.T, span = W + 400;
  for (let i = 0; i < 7; i++) {
    const r = 40 + hash(i, 3) * 50, x = ((hash(i, 1) * span + t * (6 + hash(i, 4) * 6)) % span) - 200, y = hash(i, 2) * H;
    ctx.fillStyle = 'rgba(20,16,40,.06)'; puff(ctx, x + 30, y + 60, r);   // bóng mây
    ctx.fillStyle = 'rgba(255,255,255,.16)'; puff(ctx, x, y, r);
  }
}
