// Bóng lướt Thiểm Ảnh Liên Trảm (src/game/skill-chain.js): lúc đang lướt, cứ đi được F.step đơn vị bản đồ thì chụp một bóng nhân
// vật (đúng dáng, đúng động tác lúc đó) tô màu viền chiêu (mình: màu trang phục; người khác: màu chiêu), bóng mờ dần trong F.life
// giây. Các bóng liền nhau nối bằng dải sáng lõi trắng viền màu như vệt chém (render/draw-slash.js). Dùng cho mình (p.chain) và
// người khác đang lướt (p.chainT, game/others-cast.js); bản sao so tài cũng có p.chain. Số ở data/config.json → chain_fx.
// Gọi từ drawHero trước khi vẽ thân (bóng nằm sau người). draw: chính drawHero (truyền vào để khỏi nhập vòng).

const pool = [];   // tấm vẽ dùng lại (mỗi lần lướt chụp vài chục bóng)
const take = () => pool.pop() || document.createElement('canvas');

function snap(ctx, game, p, t, save, draw, color, F) {
  const S = F.box, d = Math.min(4, Math.abs(ctx.getTransform().d) || 1), c = take(), px = Math.ceil(S * d);
  if (c.width !== px) { c.width = px; c.height = px; }
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, px, px);
  x.setTransform(d, 0, 0, d, (S / 2 - p.x) * d, (S * 0.78 - p.y) * d);
  draw(x, game, { ...p, chain: null, chainT: 0, ghostOf: true }, t, false, save);
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = F.tint;   // tô màu, giữ lại chút nét
  x.fillStyle = color; x.fillRect(0, 0, px, px);
  return { c, x: p.x - S / 2, y: p.y - S * 0.78, cx: p.x, cy: p.y - (p.top || 24) * 0.45, at: game.time };
}

export function drawChainGhosts(ctx, game, p, t, save, draw) {
  if (p.ghostOf) return;
  const F = game.data.config.chain_fx;
  if (!F) return;
  const on = !!p.chain || (p.chainT || 0) > game.time, color = p.chain?.color || p.chainColor || '#e8f0ff';
  const G = p.chainGh || (on ? (p.chainGh = []) : null);
  if (!G) return;
  const last = G[G.length - 1];
  if (on && (!last || Math.hypot(p.x - last.cx, p.y - (last.cy + (p.top || 24) * 0.45)) >= F.step) && G.length < F.max) G.push({ ...snap(ctx, game, p, t, save, draw, color, F), color });
  while (G.length && game.time - G[0].at > F.life) pool.push(G.shift().c);
  if (!G.length) { if (!on) p.chainGh = null; return; }
  ctx.save();
  // dải sáng nối các bóng (hai bóng chụp cách nhau dưới F.join giây mới nối: khỏi vẽ vệt ngang qua chỗ đứng chờ giữa hai nhát)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const dd = Math.abs(ctx.getTransform().d) || 1;
  for (let i = 1; i < G.length; i++) {
    const a = G[i - 1], b = G[i], k = 1 - (game.time - a.at) / F.life;
    if (k <= 0 || b.at - a.at > F.join) continue;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 8 * dd; ctx.globalAlpha = 0.55 * k; ctx.lineWidth = F.w;
    ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 3 * dd; ctx.globalAlpha = 0.9 * k; ctx.lineWidth = F.w * 0.35;
    ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true;
  for (const g of G) {
    const k = 1 - (game.time - g.at) / F.life;
    if (k <= 0) continue;
    ctx.globalAlpha = F.alpha * k * k;
    ctx.drawImage(g.c, g.x, g.y, F.box, F.box);
  }
  ctx.restore();
}
