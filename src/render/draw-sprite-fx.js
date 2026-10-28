// Hiệu ứng bằng hình pixel (addFx type 'sprite', xem src/game/skill-fx.js): chạy hết các khung trong thời gian sống,
// hoặc lặp theo fps; bám vùng chiêu (on) nếu có; xoay theo hướng (rot) hoặc quay đều (spin).
import { spriteImage } from './sprites.js';

export function drawSpriteFx(ctx, game, f, k) {
  const spr = game.data.art.sprites[f.id], im = spr && spriteImage(spr);
  if (!im) return false;
  const list = f.frames;
  let i = f.fps ? Math.floor(f.t * f.fps + (f.phase || 0)) : Math.floor(k * (list ? list.length : spr.frames));
  i = list ? list[i % list.length] : f.fps ? i % spr.frames : Math.min(spr.frames - 1, i);
  const x = f.on ? f.on.x + f.ox : f.x, y = f.on ? f.on.y + f.oy : f.y;
  ctx.save();
  ctx.globalAlpha = f.fade ? Math.min(1, (1 - k) * 4) : 1;
  ctx.translate(x, y);
  ctx.rotate((f.rot || 0) + (f.spin || 0) * f.t);
  ctx.scale(f.s || 1, f.s || 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, i * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.globalCompositeOperation = 'lighter';   // quầng sáng cộng nhẹ
  ctx.globalAlpha *= 0.45;
  ctx.drawImage(im, i * spr.w, 0, spr.w, spr.h, -spr.anchor[0] - 1, -spr.anchor[1] - 1, spr.w + 2, spr.h + 2);
  ctx.restore();
  return true;
}
