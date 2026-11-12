// Hình hiệu ứng chiêu điểm ảnh pfx.* (chủ dự án 13/11/2026: bỏ ảnh GPT; hình dựng từ PixelFX bằng tools/art/pfx/, khai ở data/art.json).
// Mỗi hình là một tấm lưới: n khung mỗi hướng, dirs hướng dựng sẵn từ 0 tới 90 độ; lớp sáng riêng 'pfx.<tên>.l' vẽ cộng ('lighter').
// Giữ nét điểm ảnh: một điểm hình = k đơn vị bản đồ (mặc định 0,5 = đúng 1 điểm khung vẽ trên điện thoại); cỡ gần số nguyên thì lấy
// số nguyên, điểm neo đặt đúng lưới khung vẽ, không làm mượt. Hình có hướng: chọn góc dựng sẵn gần nhất, lật ngang / dọc cho đủ vòng,
// chỉ xoay thêm phần lẻ (tối đa nửa bước góc). Tải hình khi lần đầu cần tới (không tải sẵn cả kho).
import { spriteImage } from '../sprites.js';

let T = { z: 1, tx: 0, ty: 0, lk: 1 };
const HALF = Math.PI / 2;

// Gọi một lần mỗi khung khi ctx đang ở phép biến đổi thế giới. lk: độ rực lớp sáng theo trời (tối thì rực hơn).
export function pfxBegin(ctx, lk = 1) { const m = ctx.getTransform(); T = { z: m.a, tx: m.e, ty: m.f, lk }; }

// Khung ở tuổi age giây (theo giờ game); -1: hình một lượt đã diễn xong hoặc chưa tới lúc
export function pfxFrame(spr, age, loop = spr.loop) {
  if (age < 0) return -1;
  if (loop) age %= spr.dur; else if (age >= spr.dur) return -1;
  if (!spr.times) return Math.min(spr.n - 1, Math.floor(age * spr.fps));
  let i = 0; while (i + 1 < spr.n && spr.times[i + 1] <= age) i++;
  return i;
}

export const pfxSpr = (art, name) => art.sprites['pfx.' + name];
export function pfxWarm(art, name) { const s = art.sprites['pfx.' + name]; if (s) { spriteImage(s); if (s.lit) spriteImage(art.sprites['pfx.' + name + '.l']); } }
export const pfxReady = (art, name) => { const s = art.sprites['pfx.' + name]; return !s || !!spriteImage(s); };

// Số điểm khung vẽ cho một điểm hình
export const pfxScale = (spr, mul = 1) => { const K = T.z * (spr.k || 0.5) * mul, r = Math.round(K); return r >= 1 && Math.abs(K - r) <= 0.13 * K ? r : K; };

// Vẽ khung của hình name tại (x, y) bản đồ. o: dir (góc bay, rad), rot (xoay thẳng, hình không có hướng), flip, k (phóng), a (độ đục),
// light (nhân độ rực lớp sáng), loop (ép lặp / không lặp), f (khung chỉ định). Trả false nếu hình không có hoặc đã diễn xong.
export function pfxDraw(ctx, art, name, x, y, age, o) {
  const spr = art.sprites['pfx.' + name];
  if (!spr) return false;
  const f = o?.f ?? pfxFrame(spr, age, o?.loop);
  if (f < 0) return false;
  const im = spriteImage(spr);
  if (!im) return true;   // đang tải: coi như đang diễn
  const K = pfxScale(spr, o?.k || 1), wrap = spr.rows / spr.dirs;
  let fx = o?.flip ? -1 : 1, fy = 1, rot = o?.rot || 0, d = 0;
  if (spr.dirs > 1) {
    let a = Math.atan2(Math.sin(o?.dir || 0), Math.cos(o?.dir || 0));
    if (a < 0) { fy = -1; a = -a; }
    if (a > HALF) { fx = -1; a = Math.PI - a; }
    const st = HALF / (spr.dirs - 1);
    d = Math.round(a / st); rot = a - d * st;
  }
  const col = f % spr.frames, row = d * wrap + Math.floor(f / spr.frames), c = Math.cos(rot) * K, s = Math.sin(rot) * K, al = Math.max(0, Math.min(1, o?.a ?? 1));
  ctx.setTransform(fx * c, fy * s, -fx * s, fy * c, Math.round(T.tx + x * T.z), Math.round(T.ty + y * T.z));
  if (al > 0.01) {
    ctx.imageSmoothingEnabled = K < 1; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al;
    ctx.drawImage(im, col * spr.w, row * spr.h, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  }
  const lk = T.lk * (o?.light ?? 1) * al;
  if (spr.lit && lk > 0.02) {
    const L = art.sprites['pfx.' + name + '.l'], lim = L && spriteImage(L);
    if (lim) {
      ctx.imageSmoothingEnabled = L.s > 1 || K < 1; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, lk);
      ctx.drawImage(lim, col * L.w, row * L.h, L.w, L.h, -spr.anchor[0], -spr.anchor[1], L.w * L.s, L.h * L.s);
    }
  }
  return true;
}

// Chỉ cho vẽ phần nằm phía trước điểm (x, y) theo hướng dir (rồng, vật dài chui ra từ tay người tung chứ không thò đuôi ra sau lưng).
// Gọi giữa ctx.save() / ctx.restore().
export function pfxClipAhead(ctx, x, y, dir, back = 0) {
  const c = Math.cos(dir) * T.z, s = Math.sin(dir) * T.z;
  ctx.setTransform(c, s, -s, c, T.tx + x * T.z, T.ty + y * T.z);
  ctx.beginPath(); ctx.rect(-back, -400, 1200, 800); ctx.clip();
}

// Hạt điểm ảnh: ô vuông bám lưới, màu đi dọc dải ramp (sáng → sẫm) theo tuổi, có quầng cộng sáng nhỏ. parts: [{ x, y, t, life, s, ramp, add }]
export function pfxParts(ctx, parts) {
  if (!parts.length) return;
  const K = Math.max(1, Math.round(T.z * 0.5));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const q of parts) {
    const k = q.t / q.life;
    if (k < 0 || k >= 1) continue;
    const R = q.ramp, s = Math.max(1, Math.round(q.s * (k > 0.7 ? 0.5 : 1))) * K;
    const x = Math.round((T.tx + q.x * T.z) / K) * K, y = Math.round((T.ty + q.y * T.z) / K) * K;
    ctx.fillStyle = R[Math.min(R.length - 1, Math.floor(k * R.length))];
    if (q.add) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * (1 - k) * T.lk; ctx.fillRect(x - s, y - s, s * 3, s * 3); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k > 0.85 ? 0.6 : 1; ctx.fillRect(x, y, s, s);
  }
}
