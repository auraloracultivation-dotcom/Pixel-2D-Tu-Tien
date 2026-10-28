// Vẽ vũ khí bay (ngự kiếm, src/game/flyweapon.js tính vị trí): hình fw.<loại vũ khí> xoay sẵn 32 hướng (tools/art/flyweapons.py),
// quầng linh lực màu linh căn nhấp nháy, đốm linh khí bay lên; lúc lao ra có bóng mờ màu linh căn phía sau.
// Gọi hai lần quanh hình nhân vật: layer 'back' (đang treo sau lưng) và 'front' (đang lao ra, hoặc lượn phía trước lúc đả tọa).
import { spriteImage, tintedImage } from './sprites.js';
import { weaponId } from '../game/stats.js';

// Hình vũ khí bay: fw.<loại> (tools/art/flyweapons.py, xoay sẵn từng hướng); loại mới chưa có hình thì xoay biểu tượng túi đồ
function weaponSprite(game) {
  const s = game.save, wid = weaponId(s, game.data), fw = game.data.art.sprites['fw.' + wid];
  if (fw) return { spr: fw, im: spriteImage(fw), dirs: fw.frames };
  const it = s.bag?.find(i => i.uid === s.equip?.['vu-khi']), id = it && 'gear.' + it.base, spr = id && game.data.art.sprites[id];
  return spr ? { spr, im: spriteImage(spr), dirs: 0 } : null;
}

// Vẽ một bản tại (x, y) góc a: hình xoay sẵn thì chọn khung gần góc nhất, không thì xoay biểu tượng (mũi gốc chĩa lên phải)
function blit(ctx, ws, im, x, y, a, k) {
  const { spr, dirs } = ws;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dirs) {
    const f = ((Math.round(a / (Math.PI * 2) * dirs) % dirs) + dirs) % dirs;
    ctx.scale(k, k);
    ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  } else {
    ctx.rotate(a + Math.PI / 4); ctx.scale(k * 16 / spr.w, k * 16 / spr.w);
    ctx.drawImage(im, 0, 0, spr.w, spr.h, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
  }
  ctx.restore();
}

export function drawFlyWeapon(ctx, game, layer) {
  const p = game.player, fw = p?.fw, ws = fw && weaponSprite(game);
  if (!ws?.im || (layer === 'front') !== !!fw.front) return;
  const { spr, im } = ws, c = game.data.heroes.fly, k = c.scale, t = game.time;
  const el = game.save.element ? game.data.elements[game.save.element].color : '#bff4ff', glow = tintedImage(spr, im, el);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  fw.trail.forEach((q, i) => { ctx.globalAlpha = 0.45 - i * 0.13; blit(ctx, ws, glow, q.x, q.y, q.a, k); });   // bóng linh lực khi lao
  ctx.globalAlpha = (c.halo ?? 0.3) + 0.12 * Math.sin(t * 4);   // quầng linh lực: bản màu linh căn lệch một điểm tám phía, nổi trên tóc tối và cỏ
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) blit(ctx, ws, glow, fw.x + ox, fw.y + oy, fw.a, k);
  ctx.globalAlpha = 1;
  blit(ctx, ws, im, fw.x, fw.y, fw.a, k);
  ctx.fillStyle = el;   // đốm linh khí bay lên quanh vũ khí
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.9 + i * 0.5) % 1;
    ctx.globalAlpha = 0.8 * (1 - ph);
    ctx.fillRect(Math.round(fw.x + (i ? 4 : -3) + Math.sin(t * 3 + i) * 1.5), Math.round(fw.y + 4 - ph * 12), 1, 1);
  }
  ctx.restore();
}
