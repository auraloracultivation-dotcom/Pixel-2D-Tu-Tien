// Đồ lễ hội trên tinh cầu (chủ dự án 02/11/2026: đêm trăng, phố hội đèn đuốc). Hình từ ảnh GPT đã về điểm ảnh thật
// (tools/art/le_hoi.py, data/art.json hb.*), toạ độ, kiểu chân ở src/world/hoi-foot.js. Hiệu ứng vẽ bằng code để điều khiển được:
// đèn lồng, pha lê hắt quầng sáng lập loè (hoiLights → draw-glow.js), mặt hồ lấp lánh (glints), lò lửa có lưỡi lửa nhảy và tàn bay
// (flame). Đồ phẳng (sân lát, gợn nước) vẽ sát đất dưới người; đồ đứng xếp theo chân cùng người, quái (draw.js).
import { spriteImage } from './sprites.js';

const flat = it => it.foot.flat;

// Đồ phẳng: vẽ ngay sau nền, trước mọi thứ đứng trên đất
export function drawHoiFlat(ctx, game, t) {
  const items = game.map?.hoi;
  if (!items?.length) return;
  for (const it of items) if (flat(it)) drawHoiItem(ctx, game, it, t);
}

// Đồ đứng trong khung nhìn (chừa lề cho hình cao), để draw.js xếp theo chân cùng người, quái
export function hoiEnts(game, view) {
  const items = game.map?.hoi;
  if (!items?.length) return [];
  const out = [];
  for (const it of items) {
    if (flat(it) || it.x + it.w / 2 < view.x0 || it.x - it.w / 2 > view.x1 || it.y < view.y0 || it.y - it.h > view.y1) continue;
    out.push(['h', it]);
  }
  return out;
}

export function drawHoiItem(ctx, game, it, t) {
  const im = spriteImage(it.spr);
  if (!im) return;
  const s = it.spr, k = it.k, ox = it.x - s.anchor[0] * k, oy = it.y - s.anchor[1] * k;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, 0, 0, s.w, s.h, ox, oy, s.w * k, s.h * k);
  if (s.glints) glints(ctx, s.glints, ox, oy, k, t, it.x);
  if (s.flame) flame(ctx, game, it, ox + s.flame[0] * k, oy + s.flame[1] * k, t);
}

// Mặt nước, mặt băng lấp lánh: điểm sáng chớp lên rồi tắt, mỗi điểm một nhịp
function glints(ctx, pts, ox, oy, k, t, seed) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < pts.length; i++) {
    const v = Math.sin(t * 2.1 + i * 2.37 + seed * 0.013);
    if (v < 0.78) continue;
    const a = Math.min(1, (v - 0.78) * 5), x = ox + pts[i][0] * k, y = oy + pts[i][1] * k;
    ctx.globalAlpha = a; ctx.fillRect(x, y, 1, 1);
    if (v > 0.95) { ctx.globalAlpha = a * 0.6; ctx.fillRect(x - 1, y, 3, 0.6); ctx.fillRect(x, y - 1, 0.6, 3); }
  }
  ctx.globalAlpha = 1;
}

// Lò lửa: năm lưỡi lửa nhảy so le theo thời gian, lõi sáng, tàn lửa bay lên rồi tắt; màu theo tên lò (lam, hồng, vàng)
function flame(ctx, game, it, x, y, t) {
  const P = game.data['le-hoi'].flame, c = P[it.id.includes('lam') ? 'lam' : it.id.includes('hong') ? 'hong' : 'vang'];
  const ph = it.x * 0.07;
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.1, hh = 2.2 + 3.2 * Math.abs(Math.sin(t * 8.3 + i * 1.7 + ph)) * (i === 2 ? 1.4 : 1);
    ctx.fillStyle = c[2]; ctx.fillRect(x + dx - 0.6, y - hh, 1.2, hh);
    ctx.fillStyle = c[1]; ctx.fillRect(x + dx - 0.4, y - hh * 0.7, 0.8, hh * 0.7);
  }
  ctx.fillStyle = c[0]; ctx.fillRect(x - 1, y - 2.2, 2, 2.2);
  for (let i = 0; i < 3; i++) {   // tàn lửa
    const u = (t * 0.9 + i / 3 + ph) % 1;
    ctx.globalAlpha = 1 - u; ctx.fillStyle = c[1];
    ctx.fillRect(x + Math.sin(u * 6 + i * 2) * 2.5, y - 4 - u * 12, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
}

// Nguồn sáng của đồ hội cho lớp quầng đêm (draw-glow.js)
export function hoiLights(game) {
  const items = game.map?.hoi, G = game.data['le-hoi']?.glow;
  if (!items?.length || !G) return [];
  const out = [];
  for (const it of items) {
    const s = it.spr, k = it.k, ox = it.x - s.anchor[0] * k, oy = it.y - s.anchor[1] * k;
    for (const [lx, ly, kind] of s.lights || []) {
      const g = G[kind] || G.warm;
      out.push({ x: ox + lx * k, y: oy + ly * k, r: g.r, c: g.c, a: g.a, ph: (lx * 7 + ly * 13 + it.x) % 10 });
    }
    if (s.flame) { const g = G[it.id.includes('lam') ? 'cold' : it.id.includes('hong') ? 'pink' : 'warm']; out.push({ x: ox + s.flame[0] * k, y: oy + s.flame[1] * k - 3, r: g.r + 8, c: g.c, a: g.a * 1.4, ph: it.x % 10 }); }
  }
  return out;
}
