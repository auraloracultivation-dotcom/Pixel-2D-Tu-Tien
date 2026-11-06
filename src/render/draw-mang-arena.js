// Cửu Đầu Thôn Thiên Mãng cả con trong vùng không gian (data/maps/thon-thien-mang.json; chủ dự án 06/11/2026 15:03: boss to bằng cả
// hành tinh, người chơi ngự kiếm bay quanh, không thấy hết thân). Hình 'boss.mang' (tools/art/boss_mang.py, 0–8 đứng, 9–20 gầm)
// phóng to tới data/thien-mang.json → arena.h đơn vị bản đồ (gấp nhiều lần màn hình), vẽ sau mọi thứ như một thiên thể.
// Quầng ma khí tím phía sau, thân nhấp nhô rất chậm (to nên chậm), mỗi sky.roar_every giây gầm: chín miệng lóe sáng theo hệ.
// Chỗ chín miệng là chín chỗ đánh (game/thien-mang.js arenaHeads). Gọi từ world/draw-map.js khi bản đồ là vùng không gian.
import { spriteImage } from './sprites.js';
import { arenaBox, mangOn } from '../game/thien-mang.js';

const TAU = Math.PI * 2;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function blob(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

export function drawMangArena(ctx, game, t) {
  const c = game.data['thien-mang'], S = c?.sky, spr = game.data.art?.sprites?.['boss.mang'], im = spr && spriteImage(spr);
  if (!S || !c.arena || !mangOn(game)) return;   // theo lịch (data/thien-mang.json on false = chỉ hiện 20:30–21:00 giờ VN, mang-lich.js)
  const b = arenaBox(game), bob = Math.sin(t * 0.35) * b.h * 0.006;
  const nr = spr ? spr.frames - 9 : 0, cyc = t % S.roar_every, roar = nr > 0 && cyc * S.roar_fps < nr;
  const pulse = roar ? Math.sin(cyc * S.roar_fps / nr * Math.PI) : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  blob(ctx, b.x, b.y - b.h * 0.5, b.h * (0.6 + 0.06 * pulse), rgba(S.aura, 0.07 + 0.1 * pulse), rgba(S.aura, 0));
  ctx.globalCompositeOperation = 'source-over';
  if (im) {
    const f = roar ? 9 + Math.floor(cyc * S.roar_fps) : Math.floor(t * S.idle_fps * 0.6) % 9;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';   // phóng rất to: làm mịn cho khỏi thành ô vuông lớn (như bản trên tinh đồ, draw-mang-sky.js)
    ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, b.x - b.w / 2, b.y - b.h + bob, b.w, b.h);
  }
  ctx.globalCompositeOperation = 'lighter';
  S.mouths.forEach(([mx, my, col], i) => {   // mắt / miệng các đầu luôn le lói, gầm thì bùng sáng
    const px = b.x + (mx - 0.5) * b.w, py = b.y - (1 - my) * b.h + bob, r = (28 + b.h * 0.04 * pulse) * (1 + 0.15 * Math.sin(t * 3 + i));
    blob(ctx, px, py, r * 2, rgba(col, 0.18 + 0.4 * pulse), rgba(col, 0));
    if (pulse > 0.02) blob(ctx, px, py, r * 0.7, `rgba(255,255,255,${0.7 * pulse})`, rgba(col, 0));
  });
  ctx.restore();
}

// Ngự kiếm: mỗi người trong vùng đứng trên một thanh kiếm phát sáng theo hệ (vẽ ở lớp nền, dưới chân nhân vật), nghiêng theo
// hướng bay, vệt sáng kéo sau khi đang bay
export function drawArenaSwords(ctx, game, t) {
  const list = [];
  if (game.player) list.push({ x: game.player.x, y: game.player.y, el: game.save?.element, mv: game.player.moving, fx: game.player.face?.x || 1 });
  for (const o of game.others?.list?.values?.() || []) if (o.x !== null && (o.sword = true)) list.push({ x: o.x, y: o.y, el: o.element, mv: Math.hypot((o.tx ?? o.x) - o.x, (o.ty ?? o.y) - o.y) > 1, fx: o.face?.x || 1 });
  for (const s of list) {
    const col = game.data.elements[s.el]?.color || '#9ad8ff', dir = s.fx >= 0 ? 1 : -1, y = s.y + 7 + Math.sin(t * 3 + s.x) * 1.2;
    ctx.save(); ctx.translate(s.x, y); ctx.scale(dir, 1);
    if (s.mv) { ctx.globalCompositeOperation = 'lighter'; blob(ctx, -16, 0, 12, rgba(col, 0.35), rgba(col, 0)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = '#140c22'; ctx.fillRect(-13, -2, 25, 4);           // viền mực
    ctx.fillStyle = '#dfe8f5'; ctx.fillRect(-11, -1, 20, 2);           // lưỡi kiếm
    ctx.fillStyle = col; ctx.fillRect(-11, 0, 20, 1);
    ctx.beginPath(); ctx.moveTo(9, -2); ctx.lineTo(14, 0); ctx.lineTo(9, 2); ctx.closePath(); ctx.fillStyle = '#dfe8f5'; ctx.fill();   // mũi kiếm
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-15, -1, 4, 2); ctx.fillStyle = col; ctx.fillRect(-12, -3, 2, 6);   // chuôi, đốc
    ctx.restore();
  }
}
