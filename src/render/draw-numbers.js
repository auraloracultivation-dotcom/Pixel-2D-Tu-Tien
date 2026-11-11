// Số bay lên (sát thương, hồi máu, nhặt đồ), vẽ bằng phông chữ thường có viền mực (chủ dự án 09/11/2026 16:19: bỏ chữ số pixel
// ui.digits*, đau mắt; muốn bật lại thì đặt config.numbers.pixel = true).
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

// Cỡ số theo đòn đánh thường (chủ dự án 12/11/2026 04:14): đòn lẻ nhỏ hơn hẳn thì số bé ~1/3, quanh mức đánh thường cỡ thường,
// lớn hơn thì to dần, gấp 10 trở lên đổi màu cam, to và dày. ref: sát thương đánh thường lúc hiện số (src/game/combat.js addNumber)
const TIER = [[0.75, 0.4], [1.25, 1], [1.75, 1.15], [3, 1.35], [10, 1.6]];
const scaleOf = r => (TIER.find(([lim]) => r < lim) || [0, 1.9])[1];

export function drawNumbers(ctx, game) {
  for (const n of game.numbers) {
    const a = Math.min(1, (0.75 - n.t) * 4);
    if (game.data.config.numbers?.pixel && pixelNumber(ctx, game, n, 1 - a)) continue;
    ctx.globalAlpha = n.gain ? a * 0.85 : a;   // dòng nhận linh khí, linh thạch: nhỏ và dịu hơn số sát thương
    const r = n.ref ? n.v / n.ref : 0, k = n.ref ? scaleOf(r) : 1, huge = r >= 10;
    ctx.font = n.v != null || /^\d+$/.test(n.text) ? `${huge ? 900 : 800} ${n.ref ? Math.round(9 * k * (n.big ? 1.15 : 1) * 10) / 10 : n.big ? 12 : 9}px system-ui, sans-serif` : `600 ${n.big ? 11 : n.gain ? 7 : 8}px system-ui, sans-serif`; ctx.textAlign = 'center';   // n.v: số sát thương rút gọn (253Tr)
    ctx.lineWidth = huge ? 3.5 : k < 1 ? 1.6 : 2.5; ctx.strokeStyle = INK; ctx.strokeText(n.text, n.x, n.y); ctx.fillStyle = huge ? '#ff8a1e' : n.color; ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}
