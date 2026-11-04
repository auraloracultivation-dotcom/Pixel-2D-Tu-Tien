// Bể cá động phủ (data/home.json → be_ca, src/game/be-ca.js): nước trong lòng bể, cá đã thả (hình ui-vk-<loài>) bơi qua lại,
// rồi vẽ hình bể (kính trong mờ) đè lên. Thăm nhà bạn thì vẽ cá của nhà bạn (game.visiting.beCa) nếu có.
import { spriteImage } from './sprites.js';

export function drawBeCa(ctx, game, t) {
  const c = game.data.home.be_ca, S = game.data.art.sprites;
  if (!c || game.map.id !== game.data.home.map) return;
  const bowl = S['ui.vk-be-ca'], im = bowl && spriteImage(bowl);
  if (!im) return;
  const at = game.map.center(c.at[0], c.at[1]), W = c.w, H = W * bowl.h / bowl.w, x0 = at.x - W / 2, y0 = at.y + 8 - H;
  // nước: hình elip trong thân bể (đo trên hình), mặt nước lăn tăn
  const cx = at.x, cy = y0 + H * 0.56, rx = W * 0.4, ry = H * 0.22, top = y0 + H * 0.4;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createLinearGradient(0, top, 0, cy + ry);
  g.addColorStop(0, 'rgba(120,200,255,.55)'); g.addColorStop(1, 'rgba(40,90,180,.75)');
  ctx.fillStyle = g; ctx.fillRect(cx - rx, top + Math.sin(t * 2) * 0.4, rx * 2, cy + ry - top);
  ctx.fillStyle = 'rgba(220,245,255,.5)';
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - rx + ((i * 9 + t * 4) % (rx * 2)), top + Math.sin(t * 3 + i) * 0.6, 3, 0.6);
  // cá: mỗi con một làn bơi, đi qua lại, lật mặt theo hướng
  const fish = Object.entries((game.visiting ? game.visiting.beCa : game.save?.beCa) || {}).flatMap(([k, n]) => Array(Math.min(n, 40)).fill(k));   // tối đa 40 con (data/home.json → be_ca.max)
  ctx.imageSmoothingEnabled = true;
  fish.slice(0, 40).forEach((k, i) => {
    const spr = S['ui.vk-' + k], fi = spr && spriteImage(spr);
    if (!fi) return;
    // bơi đi về đều khắp bề ngang (sóng tam giác), chỗ xuất phát và làn sâu rải theo tỉ lệ vàng: 40 con không dồn một chỗ
    const sp = 0.05 + ((i * 0.618) % 1) * 0.05, q = (t * sp + i * 0.618) % 2, pos = q < 1 ? q : 2 - q, dir = q < 1 ? 1 : -1;
    const deep = cy + ry - top - 10, lane = (i * 0.381) % 1, half = rx * (0.85 - 0.4 * Math.abs(lane - 0.5));
    const fw = 11, fy = top + 6 + lane * deep + Math.sin(t * 1.3 + i) * 1, fx = cx - half + pos * 2 * half;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(-dir, 1);   // hình gốc nhìn trái
    ctx.drawImage(fi, -fw / 2, -fw / 2, fw, fw); ctx.restore();
  });
  ctx.restore();
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(im, x0, y0, W, H); ctx.restore();
}
