// Cửu Đầu Thôn Thiên Mãng cả con trên tinh đồ (chủ dự án 06/11/2026 14:35: hình GPT, xuất hiện ngoài không gian, bay qua lại,
// to gần bằng Phương Thiên Địa Ma Vương). Hình 'boss.mang' (tools/art/boss_mang.py): 0–8 đứng, 9–20 gầm. Số ở data/thien-mang.json → sky.
// Lượn qua lại dọc vùng ma khí ngoài kết giới (cung từ góc from, rộng span độ), chậm dần ở hai đầu rồi quay đầu (lật hình);
// nhấp nhô, quầng ma khí tím sau lưng, vệt ma khí kéo theo; thỉnh thoảng gầm: chín miệng lóe sáng theo hệ, vòng sóng ma khí lan ra.
// Vẽ mượt ở độ phân giải thật, sau vòng ma khí, trước tên tinh cầu.
import { spriteImage } from './sprites.js';

const TAU = Math.PI * 2;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function blob(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// v: khung nhìn tinh đồ (toạ độ màn hình), ref: bán kính Ma Vương trên màn (để lấy cỡ)
export function drawMangSky(ctx, spr, S, v, ref, t) {
  const im = spr && spriteImage(spr);
  if (!im || !S) return null;
  const k = (Math.sin(t * TAU / S.period) + 1) / 2, dir = Math.cos(t * TAU / S.period) >= 0 ? 1 : -1;   // 0 → 1 → 0, chậm ở hai đầu
  const a = (S.from + S.span * k) * Math.PI / 180, R = S.ring;
  const x = v.cx + Math.cos(a) * R * v.rx, y0 = v.cy + Math.sin(a) * R * v.ry;
  const h = Math.max(48, ref * 2 * S.size), w = h * spr.w / spr.h, bob = Math.sin(t * 1.3) * h * S.bob, y = y0 + h * 0.35 + bob;
  const nr = spr.frames - 9, cyc = t % S.roar_every, roar = nr > 0 && cyc * S.roar_fps < nr;   // mỗi roar_every giây gầm một lượt
  const f = roar ? 9 + Math.floor(cyc * S.roar_fps) : Math.floor(t * S.idle_fps) % 9, pulse = roar ? Math.sin(cyc * S.roar_fps / nr * Math.PI) : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';   // quầng ma khí sau lưng, rực lên khi gầm
  blob(ctx, x, y - h * 0.45, h * (0.75 + 0.15 * pulse), rgba(S.aura, 0.28 + 0.25 * pulse), rgba(S.aura, 0));
  for (let i = 0; i < 14; i++) {   // vệt ma khí kéo theo phía sau
    const u = ((t * 0.35 + i / 14) % 1), px = x - dir * (u * w * 0.9 + w * 0.15), py = y - h * (0.2 + 0.5 * Math.sin(i * 2.7)) + Math.sin(t * 2 + i) * 4;
    blob(ctx, px, py, h * 0.06 * (1 - u) + 1, rgba(i % 3 ? S.aura : '#e0a0ff', 0.55 * (1 - u)), rgba(S.aura, 0));
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -w / 2, -h, w, h);
  ctx.restore();
  if (pulse > 0.02) {   // gầm: chín miệng lóe, vòng sóng ma khí lan ra
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    S.mouths.forEach(([mx, my, c], i) => {
      const px = x + dir * (mx - 0.5) * w, py = y - (1 - my) * h, r = h * (0.07 + 0.06 * pulse) * (1 + 0.3 * Math.sin(t * 20 + i));
      blob(ctx, px, py, r * 2, rgba(c, 0.5 * pulse), rgba(c, 0)); blob(ctx, px, py, r * 0.7, `rgba(255,255,255,${0.8 * pulse})`, rgba(c, 0));
    });
    const rr = h * (0.4 + 1.2 * (1 - pulse));
    ctx.strokeStyle = rgba('#d8a0ff', 0.5 * pulse); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, rr, rr * 0.55, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  return { x, y: y - h * 0.5, r: Math.max(w, h) * 0.45 };
}
