// Đạn bay: chiêu có fx thì vẽ hình pixel proj.<fx> xoay theo hướng bay (tools/art/fx_proj.py), quầng màu chiêu cộng nhẹ phía dưới.
// Đạn thường (quái, linh thú, chiêu chưa có hình) vẫn là chấm tròn màu.
import { circle } from '../world/draw-map.js';
import { spriteImage } from './sprites.js';
import { drawDragon } from './draw-ult.js';

// Đạn tròn theo bài Đạn trong trang Xưởng VFX Pixel: quầng mềm cộng sáng, viền sẫm mỏng (đọc được trên nền sáng khi máy quay xa),
// vành màu đậm, lõi trắng lệch về phía bay; đạn quái có viền sẫm rõ hơn để nhìn là biết phải né.
const darker = new Map();
function darkOf(hex) {
  if (!darker.has(hex)) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''), n = m ? parseInt(m[1], 16) : 0xffffff;
    darker.set(hex, `rgb(${(n >> 16 & 255) * 0.35 + 20 | 0},${(n >> 8 & 255) * 0.3 + 10 | 0},${(n & 255) * 0.4 + 30 | 0})`);
  }
  return darker.get(hex);
}
function drawShape(ctx, b) {
  const mob = b.from !== 'player', sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28; ctx.fillStyle = b.color; circle(ctx, b.x, b.y, b.r + 3);
  ctx.globalCompositeOperation = 'source-over';
  if (b.trail) { ctx.globalAlpha = 0.35; circle(ctx, b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.r * 0.8); }
  ctx.globalAlpha = 1;
  if (mob) { ctx.fillStyle = darkOf(b.color); circle(ctx, b.x, b.y, b.r + 1); }
  ctx.fillStyle = b.color; circle(ctx, b.x, b.y, b.r);
  ctx.fillStyle = '#fff'; circle(ctx, b.x + ux * b.r * 0.2, b.y + uy * b.r * 0.2, Math.max(1, b.r * 0.45));
}

export function drawBullets(ctx, game, t) {
  const sprites = game.data.art.sprites;
  for (const b of game.bullets) {
    if (b.ult === 'dragon') { drawDragon(ctx, b, t); continue; }
    const spr = b.fx && sprites['proj.' + b.fx], im = spr && spriteImage(spr);
    if (!im) { drawShape(ctx, b); continue; }
    const i = Math.floor(t * 12) % spr.frames, s = Math.max(0.6, b.r / 4.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35; ctx.fillStyle = b.color; circle(ctx, b.x, b.y, b.r + 3);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.fx === 'rock' || b.fx === 'liem' ? t * (b.fx === 'liem' ? 18 : 12) : Math.atan2(b.vy, b.vx));   // đá, lưỡi liềm xoay tròn
    ctx.scale(s, s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, i * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
    ctx.restore();
  }
}

// Lửa rơi của boss, thiên kiếp hỏa: cầu lửa pixel lao chéo xuống chỗ vòng báo. h: độ cao còn lại.
export function drawMeteor(ctx, game, x, y, h, t) {
  const spr = game.data.art.sprites['proj.fire'], im = spr && spriteImage(spr);
  if (!im) return false;
  ctx.save();
  ctx.translate(x + h * 0.4, y - h);
  ctx.rotate(Math.atan2(1, -0.4));
  ctx.scale(1.4, 1.4);
  ctx.imageSmoothingEnabled = false;
  const i = Math.floor(t * 12) % spr.frames;
  ctx.drawImage(im, i * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}
