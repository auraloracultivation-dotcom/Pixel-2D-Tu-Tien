// Vẽ Vạn Kiếm Thiên Lâm (src/game/skill-kiem-vu.js; chủ dự án 10/11/2026 12:35). Hình: vfx.vk-kiem (kiếm sạch, ảnh 3),
// vfx.vk-khi (kiếm quấn kiếm khí, ảnh 1, cộng sáng), vfx.vk-dam (kiếm bốc lửa linh khí đâm xuống, ảnh 2, cộng sáng); cặp cùng sắc ở
// data/kiem-vu.json. Code vẽ thêm: vệt sáng khi bay về, vòng linh quang trên đầu, kiếm khí cuộn, vệt đâm trắng, loé và vết nứt sáng khi cắm.
// Vẽ mượt, lớp trên cùng (sau hiệu ứng chiêu).
// Hiệu ứng điểm ảnh đang bật (13/11/2026, src/game/pfx.js): thay ba tấm ảnh GPT bằng kiếm điểm ảnh pfx.vk-kiem-0..5 (6 kiểu, dựng sẵn theo
// hướng), pfx.vk-khi (kiếm khí xoắn), pfx.vk-dam (lửa linh khí sau kiếm); vệt sáng, vòng linh quang, vết nứt vẫn do code vẽ.
import { spriteImage } from './sprites.js';
import { orbitPos } from '../game/skill-kiem-vu.js';
import { pxOn } from '../game/pfx.js';
import { pfxDraw } from './vfx/pfx.js';

const TAU = Math.PI * 2;
const ease = k => k * k * (3 - 2 * k);
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, a)})`; };

// Một khung hình, tâm ô ở (x, y), cao h đơn vị, xoay rot (0: mũi kiếm chúc xuống như trong ảnh)
function frame(ctx, spr, f, x, y, h, rot, a, add) {
  const im = spr && spriteImage(spr);
  if (!im || a <= 0.01) return;
  const w = h * spr.w / spr.h;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, a);
  if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function glow(ctx, x, y, r, c, a) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.3, rgba(c, a * 0.7)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function streak(ctx, x0, y0, x1, y1, w, c, a) {   // vệt sáng: lõi trắng, viền màu
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(c, a * 0.55); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

export function drawKiemVu(ctx, game, t) {
  const L = game.kiemVu;
  if (!L?.length) return;
  const A = game.data.art.sprites, K = A['vfx.vk-kiem'], KH = A['vfx.vk-khi'], KD = A['vfx.vk-dam'], p = game.player;
  const PX = pxOn(game) && A['pfx.vk-kiem-0'], HALF = Math.PI / 2;
  // kiếm điểm ảnh: rot 0 = mũi chúc xuống (như ảnh cũ); hình pfx dựng mũi hướng phải nên cộng 90 độ
  const px = (name, x, y, rot, a, T) => { if (a <= 0.01) return; ctx.save(); pfxDraw(ctx, game.data.art, name, x, y, T, { dir: rot + HALF, a: Math.min(1, a), loop: true }); ctx.restore(); };
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const c of L) {
    const s = c.s, T = c.t, H = s.size, col = s.color;
    const sword = (w, x, y, h, rot, a) => (PX ? px('vk-kiem-' + (w.k % 6), x, y, rot, a, T) : frame(ctx, K, w.k, x, y, h, rot, a, false));
    const qi = (w, x, y, h, rot, a) => (PX ? px('vk-khi', x, y, rot, a, T + w.slot * 0.07) : frame(ctx, KH, w.khi, x, y, h, rot, a, true));
    const fire = (w, x, y, h, a) => (PX ? px('vk-dam', x, y + H * 0.25, 0, a, T + w.slot * 0.05) : frame(ctx, KD, w.dam, x, y, h, 0, a, true));
    const khi = T > s.summon ? Math.min(1, (T - s.summon) / 0.12) : 0;   // kiếm khí bùng
    const ringA = T < s.release + s.fall ? Math.min(1, T / 0.6) * (T > s.release ? Math.max(0.25, 1 - (T - s.release) / s.fall) : 1) : 0;
    ctx.globalCompositeOperation = 'lighter';
    if (ringA > 0) {   // vòng linh quang trên đầu
      ctx.strokeStyle = rgba(col, 0.35 * ringA + 0.3 * khi); ctx.lineWidth = 1.2 + khi * 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - s.lift, s.orbit, s.orbit * 0.32, 0, 0, TAU); ctx.stroke();
      glow(ctx, p.x, p.y - s.lift, s.orbit * (0.6 + 0.5 * khi), col, 0.12 * ringA + 0.25 * khi * (T < s.release ? 1 : 0.4));
    }
    ctx.globalCompositeOperation = 'source-over';
    // vẽ từ sau ra trước theo chiều sâu vòng (nửa sau vòng nằm sau)
    const order = c.swords.map(w => ({ w, o: orbitPos(c, w, p) })).sort((a, b) => a.o.y - b.o.y);
    for (const { w, o } of order) {
      const land = w.go + s.leave + s.drop;
      if (T < w.arrive) {   // bay về từ bốn phía, mũi kiếm theo hướng bay, kéo vệt sáng
        const k = ease(T / w.arrive), sx = c.sx + w.ox, sy = c.sy + w.oy, x = sx + (o.x - sx) * k, y = sy + (o.y - sy) * k;
        const rot = Math.atan2(o.y - sy, o.x - sx) - Math.PI / 2;
        ctx.globalCompositeOperation = 'lighter'; streak(ctx, x - (o.x - sx) * 0.12, y - (o.y - sy) * 0.12, x, y, 2, col, 0.7 * (1 - k * 0.6)); ctx.globalCompositeOperation = 'source-over';
        sword(w, x, y, H * (0.7 + 0.3 * k), rot * (1 - k), Math.min(1, T / 0.15 + 0.2));
      } else if (T < w.go) {   // xoay vòng, mũi chúc xuống; tụ kiếm khí thì ảnh 1 cuộn quanh
        const tilt = Math.sin(o.a) * 0.25;
        sword(w, o.x, o.y, H, tilt, 1);
        if (khi > 0) qi(w, o.x, o.y, H * 1.25, tilt, khi * (0.85 + 0.15 * Math.sin(T * 30 + w.slot * 5)));
      } else if (T < w.go + s.leave) {   // rời vòng, vọt tới trên điểm rơi
        const k = ease((T - w.go) / s.leave), tx = w.lx, ty = w.ly - s.height, x = w.hx + (tx - w.hx) * k, y = w.hy + (ty - w.hy) * k;
        ctx.globalCompositeOperation = 'lighter'; streak(ctx, w.hx + (x - w.hx) * 0.5, w.hy + (y - w.hy) * 0.5, x, y, 1.6, col, 0.6); ctx.globalCompositeOperation = 'source-over';
        if (PX) fire(w, x, y - H * 0.25, H * 1.7, k);   // lửa điểm ảnh nằm sau kiếm
        sword(w, x, y, H, 0, 1);
        if (!PX) fire(w, x, y - H * 0.25, H * 1.7, k);
      } else if (T < land) {   // đâm thẳng xuống, nhanh dần, lửa linh khí kéo lên trên
        const k = ((T - w.go - s.leave) / s.drop) ** 2, y = w.ly - s.height * (1 - k) - H * 0.35;
        ctx.globalCompositeOperation = 'lighter'; streak(ctx, w.lx, y - H * 1.4 - 10, w.lx, y + H * 0.3, 2.4, col, 0.8); ctx.globalCompositeOperation = 'source-over';
        if (PX) fire(w, w.lx, y - H * 0.3, H * 1.8, 1);
        sword(w, w.lx, y, H, 0, 1);
        if (!PX) fire(w, w.lx, y - H * 0.3, H * 1.8, 1);
      } else if (T < land + s.stick + 0.25) {   // cắm đất: nửa lưỡi chìm, loé sáng, vết nứt sáng, rồi tan
        const u = T - land, a = u < s.stick ? 1 : 1 - (u - s.stick) / 0.25, tilt = ((w.k * 37) % 11 - 5) * 0.03;
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, w.lx, w.ly, 10 + 14 * Math.max(0, 1 - u / 0.15), col, (u < 0.15 ? 1 : 0.45) * a);
        ctx.strokeStyle = rgba(col, 0.7 * a); ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) { const g = w.k * 1.7 + i * TAU / 5, r = 6 + (i % 2) * 5; ctx.beginPath(); ctx.moveTo(w.lx, w.ly); ctx.lineTo(w.lx + Math.cos(g) * r, w.ly + Math.sin(g) * r * 0.45); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.beginPath(); ctx.rect(w.lx - H, w.ly - H * 2, H * 2, H * 2 + 1); ctx.clip();   // phần dưới mặt đất bị che
        sword(w, w.lx, w.ly - H * 0.18, H, tilt, a);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}
