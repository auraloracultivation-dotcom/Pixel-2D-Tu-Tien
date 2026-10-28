// Số bay lên (sát thương, hồi máu, nhặt đồ). Số sát thương trắng và vàng (bạo kích) vẽ bằng chữ số pixel ui.digits*;
// chữ khác, màu khác vẫn vẽ bằng phông chữ thường.
import { spriteImage } from './sprites.js';
import { drawDissolved } from './dither.js';

const INK = '#1b1830';
const SHEET = { '#fff': 'ui.digits', '#ffd84a': 'ui.digits-crit' };

// Số pixel: vừa hiện thì nảy to hơn một nấc (POP giây), cuối đời tan bằng dither Bayer thay vì mờ dần
const POP = 0.09;
function pixelNumber(ctx, game, n, fade) {
  const id = SHEET[n.color], spr = id && /^\d+$/.test(n.text) && game.data.art.sprites[id], im = spr && spriteImage(spr);
  if (!im) return false;
  const s = (n.big ? 2 : 1) + (n.t < POP ? 1 : 0), step = (spr.w - 1) * s, w = step * n.text.length + s;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n.text.length; i++) {
    const d = +n.text[i], x = Math.round(n.x - w / 2 + i * step), y = Math.round(n.y - spr.h * s);
    if (fade > 0) drawDissolved(ctx, im, d * spr.w, 0, spr.w, spr.h, x, y, spr.w * s, spr.h * s, fade);
    else ctx.drawImage(im, d * spr.w, 0, spr.w, spr.h, x, y, spr.w * s, spr.h * s);
  }
  ctx.restore();
  return true;
}

export function drawNumbers(ctx, game) {
  for (const n of game.numbers) {
    const a = Math.min(1, (0.75 - n.t) * 4);
    if (pixelNumber(ctx, game, n, 1 - a)) continue;
    ctx.globalAlpha = a;
    ctx.font = `bold ${n.big ? 11 : 8}px system-ui`; ctx.textAlign = 'center';
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeText(n.text, n.x, n.y); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}
