// Bọt dung nham (fx.lava-bubble, tools/art/terrain.py): khoảng một nửa số ô dung nham thỉnh thoảng phồng bọt rồi vỡ,
// mỗi ô một nhịp và một chỗ riêng theo hash ô. Mặt dung nham tĩnh đã vẽ sẵn trong tấm đệm nền (draw-ground.js).
import { spriteImage } from '../render/sprites.js';

const CYCLE = 3.2, STEP = 0.14;   // giây mỗi vòng, giây mỗi khung bọt

export function drawLavaBubble(ctx, game, px, py, h, t) {
  if (h < 0.45) return;
  const s = game.data.art.sprites['fx.lava-bubble'], im = s && spriteImage(s);
  if (!im) return;
  const f = Math.floor(((t + h * 17) % (CYCLE * (1 + h))) / STEP);
  if (f >= s.frames) return;
  const x = px + 3 + Math.floor(((h * 31) % 1) * 9), y = py + 4 + Math.floor(((h * 57) % 1) * 9);
  ctx.drawImage(im, f * s.w, 0, s.w, s.h, x - s.anchor[0], y - s.anchor[1], s.w, s.h);
}
