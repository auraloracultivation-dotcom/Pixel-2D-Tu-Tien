// Ma giới ngoài kết giới trên tinh đồ, vẽ trên tấm nhỏ (mỗi điểm = P điểm màn) cho ra điểm ảnh thật (chủ dự án 19/11/2026 02:28):
// 1 thiên không nền tím đen; 2 biển ma vân hai lớp nối liền theo chiều ngang, trôi rất chậm; 3 dòng ma khí uốn lượn từng khúc,
// tia điện tím hồng chạy dọc. Bản xem trước: tools/art/tinh_vuc_ma_gioi.py. Trong kết giới do draw-starmap.js vẽ đè lên.
const TAU = Math.PI * 2;
const NEN = '#07050e';
const MAY = ['#0e091c', '#160d2a', '#22113a', '#321850'];
const VIEN = '#422062', DINH = '#603088';
const DONG = ['#281240', '#401c60', '#6e349c'];
const DIEN = ['#d678ff', '#ffaaf0', '#fff0ff'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
const TW = 320, TH = 120;   // tấm vân: nối liền mép trái phải (tần số nguyên theo bề ngang)

let tex = null;

// Vân mây: tổng sóng tần số nguyên theo x nên lặp ngang không thấy chỗ ghép; kéo dài ngang (tần số dọc lớn hơn)
function van(seed, nguong) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d'), im = g.createImageData(TW, TH), d = new Float32Array(TW * TH);
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const song = [];
  for (let k = 0; k < 9; k++) song.push({ fx: 1 + Math.floor(rnd() * (2 + k)), fy: (0.02 + rnd() * 0.06) * (1 + k * 0.4), a: 1 / (1 + k * 0.55), p: rnd() * TAU, q: rnd() * TAU });
  let lo = 1e9, hi = -1e9;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    let v = 0;
    for (const w of song) v += w.a * Math.sin(TAU * w.fx * x / TW + w.p + Math.sin(y * w.fy + w.q) * 1.6) * Math.cos(y * w.fy * 1.7 + w.q);
    d[y * TW + x] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const pal = MAY.map(hex), vien = hex(VIEN), dinh = hex(DINH);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const i = y * TW + x, v = (d[i] - lo) / (hi - lo) + 0.08 * (BAYER[(y & 3) * 4 + (x & 3)] - 0.5);
    let k = -1;
    nguong.forEach((n, j) => { if (v > n) k = j; });
    if (k < 0) continue;
    let c3 = pal[Math.min(3, k + (seed > 5 ? 1 : 0))];
    const tren = y > 1 ? (d[i - 2 * TW] - lo) / (hi - lo) : 0;
    if (k === nguong.length - 1 && tren <= nguong[k]) c3 = y > 0 && (d[i - TW] - lo) / (hi - lo) <= nguong[k] ? dinh : vien;   // mép trên tầng mây được rọi
    im.data.set([...c3, 255], i * 4);
  }
  g.putImageData(im, 0, 0);
  return c;
}

// c: tấm nhỏ W×H; t giây
export function drawMaGioi(c, W, H, t) {
  if (!tex) tex = [van(3, [0.35, 0.55, 0.75]), van(7, [0.6, 0.75, 0.88])];
  c.fillStyle = NEN; c.fillRect(0, 0, W, H);
  const sy = H / TH, w = TW * sy;   // vân phóng theo bề cao tấm, lặp ngang
  for (const [k, toc] of [[0, 0.6], [1, 1.2]]) {
    const o = -((t * toc) % w);
    for (let x = o; x < W; x += w) c.drawImage(tex[k], Math.round(x), 0, Math.ceil(w), H);
  }
  // Dòng ma khí: 5 dải uốn lượn, chỉ hiện từng khúc; điện chạy dọc
  for (let n = 0; n < 5; n++) {
    const y0 = H * (0.1 + 0.2 * n) + 7 * Math.sin(n * 3.1), A = 5 + 3 * Math.sin(n * 1.7), f = 0.012 + 0.004 * n, ph = n * 1.9;
    const yAt = x => y0 + A * Math.sin(x * f + t * 0.25 + ph) + 0.5 * A * Math.sin(x * 0.035 + t * 0.4);
    for (let x = 0; x < W; x++) {
      const day = Math.sin(x * 0.012 + ph * 3 + t * 0.2);
      if (day < 0 || (day < 0.35 && (x & 1))) continue;
      const y = Math.round(yAt(x)), b = day > 0.5 ? 2 : 1;
      c.fillStyle = DONG[0]; c.fillRect(x, y - b, 1, b * 2 + 1);
      c.fillStyle = DONG[1]; c.fillRect(x, y, 1, 1);
      if (b > 1) { c.fillStyle = DONG[2]; c.fillRect(x, y - 1, 1, 1); }
    }
    for (let s = 0; s < 2; s++) {   // tia điện chạy dọc dòng
      const xh = Math.floor(((t * 0.05 * (1 + n * 0.3) + s / 2 + ph) % 1) * W);
      for (let j = 0; j < 12; j++) {
        const x = xh - j; if (x < 0) continue;
        c.fillStyle = j < 2 ? DIEN[2] : j < 6 ? DIEN[1] : DIEN[0];
        c.fillRect(x, Math.round(yAt(x)) + ((j + Math.floor(t * 12)) % 4 < 2 ? 1 : -1), 1, 1);
      }
    }
  }
}
