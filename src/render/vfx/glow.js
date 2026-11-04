// Mảng sáng dựng sẵn cho hiệu ứng chiêu (src/render/vfx/draw-vfx.js): quầng màu mờ dần ra ngoài, lõi trắng mịn ở giữa.
// Vẽ một lần vào tấm nhỏ rồi phóng bằng drawImage (nhẹ hơn tạo gradient mỗi khung, máy yếu đỡ nóng). Vẽ mượt, không điểm ảnh
// (quy tắc chiêu 05/11/2026: giữa sáng trắng, mịn, ngoài mờ dần).
import { spriteImage } from '../sprites.js';

const cache = new Map();
const N = 128;

function tex(key, stops) {
  if (cache.has(key)) return cache.get(key);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N });
  const g = c.getContext('2d'), r = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  for (const [k, col] of stops) r.addColorStop(k, col);
  g.fillStyle = r; g.fillRect(0, 0, N, N);
  cache.set(key, c);
  return c;
}

const rgba = (hex, a) => { const n = parseInt((hex || '#ffffff').slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// Quầng màu: đậm ở giữa, mờ dần, tắt hẳn ở mép
export const haloTex = color => tex('h' + color, [[0, rgba(color, 0.9)], [0.25, rgba(color, 0.55)], [0.6, rgba(color, 0.18)], [1, rgba(color, 0)]]);
// Lõi trắng: trắng đặc ở tâm, ngả màu chiêu, tắt ở mép
export const coreTex = color => tex('c' + color, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.85)'], [0.55, rgba(color, 0.45)], [1, rgba(color, 0)]]);

// Cộng sáng một quầng (r: bán kính đơn vị bản đồ)
export function glow(ctx, x, y, r, color, a) {
  if (a <= 0.01 || r <= 0) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(haloTex(color), x - r, y - r, r * 2, r * 2);
}
export function core(ctx, x, y, r, color, a) {
  if (a <= 0.01 || r <= 0) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(coreTex(color), x - r, y - r, r * 2, r * 2);
}

// Hình vfx.<name> cạnh dài = size, tâm (x, y). o: rot, flip (lật dọc khi bay sang trái, khỏi lộn ngược), sx, sy, a, add, ox, oy (lệch tâm)
export function vimg(ctx, art, name, x, y, size, o = {}) {
  const spr = art.sprites['vfx.' + name], im = spr && spriteImage(spr);
  if (!im) return false;
  const s = size / Math.max(spr.w, spr.h);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1) * (o.flip ? -1 : 1));
  ctx.globalAlpha = Math.max(0, Math.min(1, o.a ?? 1));
  ctx.globalCompositeOperation = o.add ? 'lighter' : 'source-over';
  ctx.drawImage(im, -spr.w / 2 + (o.ox || 0), -spr.h / 2 + (o.oy || 0));
  ctx.restore();
  return true;
}

// Pháp trận dưới đất: nằm dẹt (nhìn chéo từ trên), xoay chậm, cộng sáng
export function groundCircle(ctx, art, name, x, y, r, rot, a) {
  const spr = art.sprites['vfx.' + name], im = spr && spriteImage(spr);
  if (!im || a <= 0.01) return;
  const s = (r * 2) / Math.max(spr.w, spr.h);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.rotate(rot); ctx.scale(s, s);
  ctx.globalAlpha = Math.min(1, a); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(im, -spr.w / 2, -spr.h / 2);
  ctx.restore();
}

export const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - (1 - k) ** 3);
export const back = k => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2);   // vọt quá rồi về
