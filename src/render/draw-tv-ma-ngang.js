// Ma giới màn ngang, port nguyên tools/art/tinh_vuc_ma_gioi.py (video tinh-do-ngang.mp4, chủ dự án 19/11/2026 04:09 "làm đi"):
// tấm nhỏ = khung thiết kế / 3; nền tím đen; biển ma vân hai lớp (tv.van-1, tv.van-2 tô sẵn từ đúng vân của video) trôi rất chậm;
// vòng xoáy ma khí ở mép phải; dòng ma khí từng khúc có điện chạy; cột ma khí bốc lên; khe nứt mở khép; sét ngẫu nhiên.
// Chỉ vẽ ngoài kết giới (e > 1,03); vẽ lại 12 lần mỗi giây như video, giữa hai lần dùng lại tấm cũ.
import { spriteImage } from './sprites.js';

const TAU = Math.PI * 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
const NEN = '#07050e', MAY3 = [50, 24, 80], DONG = ['#281240', '#401c60'], DONG1 = [64, 28, 96], DIEN = ['#d678ff', '#ffaaf0', '#fff0ff'];
let cv = null, lastF = -1, sets = [];

const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

// W, H: cỡ tấm nhỏ; e(x, y): khoảng cách elip tới kết giới (1 = đúng vòng); dx: độ lệch khung thiết kế (màn rộng hơn 16:9)
export function maNgang(art, W, H, cx, cy, rx, ry, t, dx) {
  const f = Math.floor(t * 12);
  if (cv && cv.width === W && cv.height === H && f === lastF) return cv;
  if (!cv) cv = document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  lastF = f;
  const c = cv.getContext('2d'), a = TAU * ((f % 288) / 288), ng = (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry) > 1.03;
  c.imageSmoothingEnabled = false;
  c.fillStyle = NEN; c.fillRect(0, 0, W, H);
  // Biển ma vân: hai lớp trôi ngang (vân rộng gấp đôi khung nên nối liền)
  for (const [id, toc] of [['tv.van-1', 0.25], ['tv.van-2', 0.5]]) {
    const s = art[id], im = s && spriteImage(s); if (!im) continue;
    const o = Math.floor(f * toc) % s.w;
    for (let x = -o; x < W; x += s.w) c.drawImage(im, x, 0, s.w, H);
  }
  // Vòng xoáy ma khí ở mép phải (theo video: tâm 0,97 W gốc, bán kính 0,55 H)
  const vx = W - 640 * 0.03, vy = H * 0.46, vr = H * 0.55, x0 = Math.max(0, Math.floor(vx - vr)), y0 = Math.max(0, Math.floor(vy - vr / 1.4));
  const x1 = Math.min(W, Math.ceil(vx + vr)), y1 = Math.min(H, Math.ceil(vy + vr / 1.4));
  if (x1 > x0 && y1 > y0) {
    const id = c.getImageData(x0, y0, x1 - x0, y1 - y0), d = id.data;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!ng(x, y)) continue;
      const ddx = x - vx, ddy = (y - vy) * 1.4, r = Math.hypot(ddx, ddy);
      if (r >= vr) continue;
      const k = 1 - r / vr, xo = Math.sin(2 * Math.atan2(ddy, ddx) - r * 0.045 + a * 2), i = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
      let col = null;
      if (xo > 0.55 - 0.5 * k && BAYER[(y & 3) * 4 + (x & 3)] < 0.5 + k) col = MAY3;
      if (xo > 0.82 - 0.3 * k) col = DONG1;
      if (r < vr * 0.12) col = [10, 4, 16];
      if (Math.abs(r - vr * 0.12) < 1.2) col = [214, 120, 255];
      if (col) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
    }
    c.putImageData(id, x0, y0);
  }
  // Dòng ma khí: 5 dải uốn lượn hiện từng khúc, điện chạy dọc
  const R = rnd(9);
  for (let n = 0; n < 5; n++) {
    const y00 = H * (0.1 + 0.8 * n / 4) + R() * 20, fq = 0.4 + R() * 0.6, ph = R() * TAU, A = 12 + R() * 14;
    const yAt = x => y00 + A * Math.sin((x - dx) * 0.02 * fq + a + ph) + 0.5 * A * Math.sin((x - dx) * 0.05 + 2 * a);
    for (let x = 0; x < W; x++) {
      const day = Math.sin((x - dx) * 0.012 + ph * 3 + a), y = Math.floor(yAt(x));
      if (day < 0 || (day < 0.35 && (x + f) % 2) || !ng(x, y)) continue;
      const b = Math.floor(1 + 4 * Math.min(1, day * 2));
      for (let e = -b; e <= b; e++) {
        if (Math.abs(e) > 2 && (x + y + e + Math.floor(f / 2)) % (Math.abs(e) < 5 ? 2 : 3)) continue;
        c.fillStyle = e === -1 ? '#6e349c' : Math.abs(e) <= 2 ? DONG[1] : DONG[0]; c.fillRect(x, y + e, 1, 1);
      }
    }
    for (let s = 0; s < 3; s++) {
      const xh = Math.floor(((t / 24 * fq * 1.5 + s / 3 + ph) % 1) * W);
      for (let j = 0; j < 14; j++) {
        const x = (xh - j + W) % W, y = Math.floor(yAt(x)) + ((j + f) % 4 < 2 ? 1 : -1);
        if (!ng(x, y)) continue;
        c.fillStyle = j < 2 ? DIEN[2] : j < 6 ? DIEN[1] : DIEN[0]; c.fillRect(x, y, 1, 1);
      }
    }
  }
  // Cột ma khí bốc lên từ đáy
  for (const [fx, ph] of [[0.04, 1.0], [0.075, 2.7], [0.9, 0.3], [0.955, 1.9], [0.62, 4.0], [0.3, 5.2]]) {
    const x0c = fx < 0.5 ? fx * 640 : W - (1 - fx) * 640, w = 9 + 3 * Math.sin(a + ph);
    for (let y = 0; y < H; y++) {
      const cao = (H - y) / H; if (cao > 0.55 + 0.1 * Math.sin(a + ph)) continue;
      const cc = x0c + 3 * Math.sin(y * 0.08 + a * 2 + ph), hw = w * (1 - cao);
      for (let x = Math.floor(cc - hw); x <= cc + hw; x++) if (ng(x, y)) { c.fillStyle = (y + f * 2) % 6 < 3 ? DONG[1] : 'rgb(50,24,80)'; c.fillRect(x, y, 1, 1); }
      if (ng(cc, y) && (y + f * 3) % 9 < 2) { c.fillStyle = DIEN[0]; c.fillRect(Math.floor(cc), y, 1, 1); }
    }
  }
  // Khe nứt không gian ở bốn góc, mở rồi khép
  for (const [fx, fy, ph] of [[0.035, 0.2, 1.1], [0.93, 0.9, 2.3], [0.1, 0.86, 0.4], [0.84, 0.07, 3.0]]) {
    const mo = (Math.sin(a + ph) + 1) / 2, r2 = rnd(Math.floor(fx * 640 * 7 + fy * 360) + 1);
    let x = fx < 0.5 ? fx * 640 : W - (1 - fx) * 640, y = fy * H;
    for (let j = 0; j < 40; j++) {
      x += Math.floor(r2() * 5) - 2; y += (1 + Math.floor(r2() * 2)) * (j % 2 ? 1 : -1) * 0.5 + 1;
      const b = 2 * mo * (1 - Math.abs(j - 20) / 20);
      for (let e = -Math.floor(1 + b); e < Math.floor(2 + b); e++) if (ng(x + e, y)) {
        c.fillStyle = Math.abs(e) < 1 ? (mo > 0.6 ? '#ffdcff' : '#040208') : mo > 0.4 ? DIEN[0] : DONG[1]; c.fillRect(Math.floor(x + e), Math.floor(y), 1, 1);
      }
    }
  }
  // Sét ngẫu nhiên trong ma giới: lâu lâu một tia, sáng 3 khung
  if (Math.random() < 7 / 288) sets.push({ f, seed: Math.floor(Math.random() * 1e9), vung: Math.floor(Math.random() * 3) });
  sets = sets.filter(s => f - s.f < 3);
  for (const s of sets) {
    const r3 = rnd(s.seed), mau = f === s.f ? DIEN[2] : DIEN[1];
    let x = [r3() * W * 0.08, W - r3() * W * 0.1, r3() * W][s.vung], y = 0;
    const het = H * (0.4 + r3() * 0.5);
    while (y < het) {
      const nx = x + Math.floor(r3() * 9) - 4, ny = y + 2 + Math.floor(r3() * 4);
      for (let k = 0; k <= 5; k++) { const px = Math.floor(x + (nx - x) * k / 5), py = Math.floor(y + (ny - y) * k / 5); if (ng(px, py)) { c.fillStyle = mau; c.fillRect(px, py, 1, 1); } }
      x = nx; y = ny;
    }
  }
  // Sát kết giới: dải tối mỏng cho ranh giới rõ
  c.fillStyle = NEN;
  for (let y = 0; y < H; y++) {
    const q = ((y - cy) / ry) ** 2;
    for (const sg of [-1, 1]) {
      const a1 = q < 1 ? Math.sqrt(1 - q) : 0, a2 = q < 1.1236 ? Math.sqrt(1.1236 - q) : -1;
      if (a2 < 0) continue;
      const xa = cx + sg * a1 * rx, xb = cx + sg * a2 * rx;
      for (let x = Math.floor(Math.min(xa, xb)); x <= Math.max(xa, xb); x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 0.5) c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}
