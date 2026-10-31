// Ma khí quanh Đại Ma Thần (chủ dự án 31/10/2026: "ma khí đâu?"): khói đen tím cuộn lên từ chân, lõi đen viền tím, đốm lửa tím
// bay quanh, vũng sương đen dưới đất. Thông số ở data/npcs.json → <npc>.ma_khi {r: bán kính, n: số làn khói, h: cao}.
// Vẽ hai lớp: back (sau hình nhân vật) và front (vài làn bay trước người), toàn ô vuông điểm ảnh, không làm mịn.
import { spriteImage } from './sprites.js';

const CORE = '#12061c', MID = '#3b1458', EDGE = '#8a3cc8', GLOW = '#c77dff';

function disc(ctx, cx, cy, r) {   // đĩa điểm ảnh: từng hàng ngang theo hình tròn, không làm mịn
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy + r * 0.6));
    ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

function puff(ctx, x, y, s, k) {   // một cụm khói tròn: viền tím, thân tím sẫm, lõi đen; càng lên càng nhỏ, nhạt
  const a = Math.min(1, (1 - k) * 1.3), r = Math.max(1, Math.round(s * (1 - k * 0.5))), cx = Math.round(x), cy = Math.round(y);
  ctx.globalAlpha = a * 0.45; ctx.fillStyle = EDGE; disc(ctx, cx, cy, r + 1);
  ctx.globalAlpha = a * 0.6; ctx.fillStyle = k < 0.35 ? CORE : MID; disc(ctx, cx, cy, r);
}

export function drawMaKhi(ctx, n, t, cfg, layer) {
  const R = cfg.r || 14, N = cfg.n || 14, H = cfg.h || 40;
  ctx.save();
  if (layer === 'back') {
    const pulse = 1 + Math.sin(t * 2.4) * 0.12;   // vũng sương đen dưới chân, nhịp thở
    ctx.globalAlpha = 0.75; ctx.fillStyle = CORE;
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, R * pulse, R * 0.38 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillStyle = EDGE;
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, R * 1.15 * pulse, R * 0.45 * pulse, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < N; i++) {
    const front = i % 16 === 0;   // ít làn bay trước người, còn lại sau lưng để vẫn thấy mặt và thương
    if ((layer === 'front') !== front) continue;
    const h1 = (i * 2654435761 >>> 0) % 1000 / 1000, h2 = (i * 40503 >>> 0) % 997 / 997;   // băm số làn: rải đều, không theo hàng
    const sp = 0.25 + h1 * 0.45, k = (t * sp + h2) % 1;   // mỗi làn một nhịp riêng, đi từ chân lên đỉnh rồi tan
    const side = (h1 * 2 - 1) * R * 1.1;   // rải ngang cả vùng quanh người
    const x = n.x + side * (1 - k * 0.5) + Math.sin(t * 2.4 + i * 1.7) * 4 * k;
    const y = n.y - k * H * (0.6 + h2 * 0.5);
    puff(ctx, x, y, 1.5 + (i % 4), k);
  }
  if (layer === 'front') {   // đốm lửa tím bay vòng quanh
    ctx.fillStyle = GLOW;
    for (let i = 0; i < 6; i++) {
      const ang = t * 1.6 + i * Math.PI / 3, k = (t * 0.7 + i / 6) % 1;
      ctx.globalAlpha = 0.9 * (1 - k);
      ctx.fillRect(Math.round(n.x + Math.cos(ang) * R * 0.9), Math.round(n.y - 10 - k * H * 0.8 + Math.sin(ang) * 3), 1, 2);
    }
  }
  ctx.restore();
}

// Vũ khí lơ lửng sau lưng NPC (data/npcs.json → <npc>.vu_khi {sprite, rot, dx, dy}): Đại Ma Thần cầm thương lớn gấp đôi vũ khí bay
// thường; nhấp nhô, chao nhẹ, quầng tím nhịp thở quanh lưỡi.
export function drawNpcWeapon(ctx, game, n, t, cfg) {
  const spr = game.data.art.sprites[cfg.sprite], im = spr && spriteImage(spr);
  if (!im) return;
  const face = n.lookX || 1, rot = (cfg.rot ?? -1.1) + Math.sin(t * 1.3) * 0.06, bob = Math.sin(t * 2) * 1.5;
  ctx.save();
  ctx.translate(Math.round(n.x + (cfg.dx ?? -6) * face), Math.round(n.y + (cfg.dy ?? -24) + bob));
  ctx.scale(face, 1); ctx.rotate(rot);
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = GLOW; ctx.shadowBlur = 5 + Math.sin(t * 3) * 3;   // quầng tím quanh thương
  ctx.drawImage(im, 0, 0, spr.w, spr.h, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
  ctx.restore();
}
