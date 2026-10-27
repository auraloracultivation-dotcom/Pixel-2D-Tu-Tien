// NPC chibi bằng hình pixel (tools/art/npcs.py, mỗi NPC một tấm npc.<id>): đứng thì nhún chậm, đi thì bước luân phiên.
// Hình gốc nhìn phải, quay trái lật gương. Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { spriteImage } from './sprites.js';

export function drawNpcSprite(ctx, game, n, t) {
  const spr = game.data.art.sprites['npc.' + n.id], im = spr && spriteImage(spr);
  if (!im) return false;
  if (n.face && Math.abs(n.face.x) > 0.2) n.lookX = Math.sign(n.face.x);
  const f = n.moving ? 2 + Math.floor(t * 6) % 2 : Math.floor(t * 1.5 + (n.bob || 0)) % 2;
  ctx.fillStyle = 'rgba(27,24,48,0.25)';   // bóng dưới chân
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(Math.round(n.x), Math.round(n.y) + 1);
  ctx.scale(n.lookX || 1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}
