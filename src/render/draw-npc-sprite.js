// NPC chibi bằng hình pixel. Hai loại hình:
// - npc.<id> 7 khung (ảnh Canva theo mẫu chibi, tools/art/ai_sprites.py "acts"): đứng, chạy ×2, lấy đà, đánh, ngã; vẽ qua draw-acts.js.
// - npc.<id> 4 khung (tools/art/npcs.py, hình code cũ): đứng, nhún, bước A, bước B.
// Người đồng hành đứng làm NPC dùng hình comp.<id> cho khớp với lúc đi theo. Hình gốc nhìn phải, quay trái lật gương.
// Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { spriteImage } from './sprites.js';
import { ACT, drawAct, isAct, walkFrame } from './draw-acts.js';
import { drawRunDust } from './draw-act-fx.js';

export function drawNpcSprite(ctx, game, n, t) {
  const art = game.data.art;
  if (n.face && Math.abs(n.face.x) > 0.2) n.lookX = Math.sign(n.face.x);
  const id = isAct(art, 'comp.' + n.id) ? 'comp.' + n.id : isAct(art, 'npc.' + n.id) ? 'npc.' + n.id : null;
  if (id) {
    shadow(ctx, n);
    if (n.moving) drawRunDust(ctx, n, t);
    const bob = !n.moving && Math.sin(t * 2.2 + (n.bob || 0) * 3) > 0.55 ? 0.5 : 0;   // đứng thì thở nhẹ
    return drawAct(ctx, art, id, n.moving ? walkFrame(art.sprites[id], t) : ACT.idle, n.x, n.y + 1, n.lookX || 1, bob);
  }
  const spr = art.sprites['npc.' + n.id], im = spr && spriteImage(spr);
  if (!im) return false;
  const f = n.moving ? 2 + Math.floor(t * 6) % 2 : Math.floor(t * 1.5 + (n.bob || 0)) % 2;
  shadow(ctx, n);
  ctx.save();
  ctx.translate(Math.round(n.x), Math.round(n.y) + 1);
  ctx.scale(n.lookX || 1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}

function shadow(ctx, n) {   // bóng dưới chân
  ctx.fillStyle = 'rgba(27,24,48,0.25)';
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
}
