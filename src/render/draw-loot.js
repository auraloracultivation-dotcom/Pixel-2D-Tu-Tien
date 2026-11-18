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
  const C = game.data.config.loot;
  if (C?.beam) for (const l of game.loot) beam(ctx, Math.round(l.x), Math.round(l.y), lootColor(game, l), t, C.beam, l);
  for (const l of game.loot) {
    const x = Math.round(l.x), y = Math.round(l.y + (l.down ? Math.sin(t * 3 + l.x) * 0.8 : 0)), ic = C?.icon && lootIcon(game, l, C.icon);
    if (ic) { drawIcon(ctx, ic, x, y, C.icon, lootColor(game, l)); continue; }
    gem(ctx, x, y, lootColor(game, l), t);   // chưa có hình (hoặc hình chưa tải): viên ngọc thoi như cũ
  }
}

// Icon món trên đất (chủ dự án 17/11/2026 11:55: "trang bị vật liệu rơi ra mặt đất biến thành hình icon chứ không phải một đốm ánh sáng").
// Hình icon là ảnh to (ui.vk-<món> 340 điểm, ui.ic-<ô> ~140 điểm): thu một lần vào tấm nhỏ cỡ icon.px điểm (khử răng cưa lúc thu)
// rồi giữ lại, mỗi khung chỉ vẽ tấm nhỏ đó (nhẹ máy). Số ở data/config.json → loot.icon.
const small = new Map();
function lootIcon(game, l, I) {
  const S = game.data.art.sprites, p = l.payload;
  const spr = l.kind === 'item' ? (S['ui.vk-' + p.base] || S['ui.ic-' + (game.data.items.bases[p.base]?.slot || '')])
    : l.kind === 'gem' ? S['gem.' + String(p).replace(':', '-')] : S['ui.vk-' + (l.kind === 'mat' ? p.id : 'tay-luyen-thach')];
  if (!spr) return null;
  const key = spr.file + '|' + I.px;
  let c = small.get(key);
  if (c) return c;
  const im = spriteImage(spr);
  if (!im) return null;
  const k = I.px / Math.max(spr.w, spr.h), w = Math.max(1, Math.round(spr.w * k)), h = Math.max(1, Math.round(spr.h * k));
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, spr.w, spr.h, 0, 0, w, h);
  small.set(key, c);
  return c;
}

function drawIcon(ctx, c, x, y, I, col) {
  const s = I.size, w = c.width * s / I.px, h = c.height * s / I.px;
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y + 1, w * 0.42, 1.6, 0, 0, Math.PI * 2); ctx.fill();   // bóng dưới đất
  ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 0.6;
  ctx.drawImage(c, Math.round(x - w / 2), Math.round(y - h - 1), w, h);
}

// Cột sáng đánh dấu chỗ có đồ (chủ dự án 16/11/2026 23:39): vòng sáng ôm món trên đất, cột chiếu thẳng lên trời, lên cao nhạt dần;
// màu theo phẩm của món. Cột mọc lên lúc món vừa nằm xuống. Số ở data/config.json → loot.beam.
function beam(ctx, x, y, c, t, B, l) {
  const grow = Math.min(1, Math.max(0, (l.t - 0.3) / 0.35)), h = B.h * grow, a = B.a * (0.85 + 0.15 * Math.sin(t * 3 + x));
  if (grow <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y, 0, y - h);
  g.addColorStop(0, hexA(c, a)); g.addColorStop(0.35, hexA(c, a * 0.55)); g.addColorStop(1, hexA(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - B.w / 2, y - h, B.w, h);
  ctx.fillStyle = hexA(c, a * 0.9); ctx.fillRect(x - 0.5, y - h * 0.8, 1, h * 0.8);   // lõi sáng giữa cột
  ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y + 1, B.ring + Math.sin(t * 4 + x) * 0.6, B.ring * 0.42, 0, 0, Math.PI * 2); ctx.stroke();   // vòng sáng quanh món
  ctx.restore();
}
const hexA = (c, a) => { const n = parseInt(c.slice(1, 7), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; };

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
