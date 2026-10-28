// Quái bằng hình pixel (data/mobs.json → look, tools/art/mobs.py). Hình gốc nhìn phải, quay trái lật gương;
// 2 khung luân phiên khi đi (quái hiền nảy thì theo nhịp nảy). Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { spriteImage, drawHitFrame } from './sprites.js';

export function drawMobSprite(ctx, game, m, t, wind) {
  const spr = m.def.look && game.data.art.sprites['mob.' + m.id], im = spr && spriteImage(spr);
  if (!im) return false;
  m.top = spr.anchor[1] - 2;   // đỉnh hình: thanh máu, sao choáng đặt trên đó
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const f = m.def.ai === 'passive' ? (Math.abs(Math.sin(m.hop || 0)) > 0.5 ? 1 : 0) : Math.floor(t * (m.moving === false ? 2.5 : 5) + (m.uid || 0) * 0.37) % 2;
  ctx.save();
  ctx.translate(m.x, m.y + 1);
  ctx.scale(m.lookX || 1, 1);
  if (wind) ctx.scale(1.12, 0.9);   // lấy đà trước khi đánh
  ctx.imageSmoothingEnabled = false;
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0);
  ctx.restore();
  return true;
}

// Đấu sĩ luận võ (tools/art/build.py → rival.<id>, chibi như NPC): đứng thì nhún chậm, đi thì bước A/B. Trả false nếu chưa có hình.
export function drawRivalSprite(ctx, game, m, t, wind) {
  const spr = game.data.art.sprites['rival.' + m.def.rival], im = spr && spriteImage(spr);
  if (!im) return false;
  m.top = spr.anchor[1] - 2;
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const mv = Math.abs(m.x - (m.lastX ?? m.x)) + Math.abs(m.y - (m.lastY ?? m.y)) > 0.05;   // đang đi thì bước, đứng thì nhún
  m.lastX = m.x; m.lastY = m.y;
  const f = mv ? 2 + Math.floor(t * 6) % 2 : Math.floor(t * 2) % 2;
  ctx.save();
  ctx.translate(Math.round(m.x), Math.round(m.y) + 1);
  ctx.scale(m.lookX || 1, 1);
  if (wind) ctx.scale(1.1, 0.92);
  ctx.imageSmoothingEnabled = false;
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0);
  ctx.restore();
  return true;
}
