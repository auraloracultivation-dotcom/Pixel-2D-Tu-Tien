// Đồ rơi trên đất và đồ nhiệm vụ nhặt được, vẽ bằng điểm ảnh nguyên (trước là hình thoi, hình tròn vẽ nét khử răng cưa).
// Đồ rơi: viên ngọc thoi 7×7 viền mực, màu theo độ hiếm, đốm sáng trên trái, nhấp nháy quầng; đồ nhiệm vụ: hình riêng pickup.<món>
// (tools/art/pickups.py; báo cáo #10: linh thảo trước là hạt tròn) có quầng sáng nhịp thở, thiếu hình thì về hạt tròn 5×5.
import { lootColor } from '../game/loot.js';
import { spriteImage } from './sprites.js';

const INK = '#1b1830';
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

function gem(ctx, x, y, c, t) {
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6 + x); R(ctx, c, x - 4, y - 1, 9, 3); R(ctx, c, x - 1, y - 4, 3, 9); ctx.globalAlpha = 1;   // quầng chữ thập
  for (let i = 0; i <= 3; i++) { R(ctx, INK, x - i, y - 3 + i, 1 + i * 2, 1); R(ctx, INK, x - i, y + 3 - i, 1 + i * 2, 1); }   // viền thoi
  for (let i = 0; i <= 2; i++) { R(ctx, c, x - i, y - 2 + i, 1 + i * 2, 1); R(ctx, c, x - i, y + 2 - i, 1 + i * 2, 1); }
  R(ctx, '#ffffff', x - 1, y - 1, 1, 1);   // đốm sáng
}

function orb(ctx, x, y, base, top) {
  R(ctx, INK, x - 2, y - 3, 5, 7); R(ctx, INK, x - 3, y - 2, 7, 5);
  R(ctx, base, x - 2, y - 2, 5, 5);
  R(ctx, top, x - 1, y - 2, 3, 2); R(ctx, '#ffffff', x - 1, y - 2, 1, 1);
}

export function drawLoot(ctx, game, t) {
  for (const l of game.loot) gem(ctx, Math.round(l.x), Math.round(l.y + Math.sin(t * 8 + l.x)), lootColor(game, l), t);
}

export function drawQuestPickups(ctx, game, t) {
  for (const k of game.pickups) {
    const q = game.data.items.quest_items[k.item] || {}, bob = Math.sin(t * 4) > 0 ? -1 : 0;
    const spr = game.data.art.sprites['pickup.' + k.item], im = spr && spriteImage(spr);
    if (!im) { orb(ctx, Math.round(k.x), Math.round(k.y + bob), q.base || '#2f7a44', q.color || '#9af0a8'); continue; }
    const x = Math.round(k.x), y = Math.round(k.y);
    ctx.globalAlpha = 0.22 + 0.12 * Math.sin(t * 3 + x);   // quầng sáng dưới chân cho dễ thấy trên cỏ
    ctx.fillStyle = q.color || '#9af0a8'; ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.drawImage(im, x - spr.anchor[0], y - spr.anchor[1] + bob);
  }
}
