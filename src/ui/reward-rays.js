// Vầng sáng xoay sau món quà (nghi lễ nhận thưởng, docs/10-CAI-HON.md việc 4). Vẽ từng điểm ảnh lên một khung vuông rồi phóng to kiểu điểm ảnh,
// không dùng dải màu mượt của trình duyệt: mỗi vòng sáng là một sắc độ phẳng, chỗ chuyển sắc tan bằng mẫu Bayer như tranh pixel vẽ tay.
// Từ trong ra: lõi trắng ấm → vành sáng → quầng thưa; tia dài hình nêm, dài ngắn xen kẽ, đầu vuốt nhọn, quay chậm theo chiều kim đồng hồ;
// tia mảnh quay ngược; món phẩm cao có thêm vòng hạt chạy quanh; sao bốn cánh nhấp nháy. Tia quay theo nấc 2 độ (như hoạt hình vẽ tay).
// Mọi số đo tính trên khung chuẩn 120 đơn vị nên khung to hay nhỏ hình vẫn y nguyên, chỉ mịn hơn.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], TAU = Math.PI * 2, STEP = Math.PI / 90;
const POL = {};   // bảng góc, bán kính từng điểm theo cỡ khung (tính một lần)
function polar(n) {
  if (POL[n]) return POL[n];
  const ang = new Float32Array(n * n), rad = new Float32Array(n * n), c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x - c, dy = y - c; ang[y * n + x] = Math.atan2(dy, dx) + Math.PI; rad[y * n + x] = Math.hypot(dx, dy) * 120 / n; }
  return (POL[n] = { ang, rad });
}
const rgb = hex => { const v = parseInt(hex.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const STARS = [[47, 0.5, 0], [55, 1.9, 2], [42, 3.35, 4], [56, 4.4, 1], [46, 5.6, 3], [37, 2.6, 5], [52, 0.05, 2.5], [50, 3.9, 0.5]];   // [bán kính, góc, lệch nhịp]

// color: màu phẩm của món. lvl 0..3: độ lớn của nghi lễ (0: 8 tia dài + 16 tia mảnh; 1: 12 + 24; 2: thêm vòng hạt; 3: 16 + 32, vòng hạt đôi). n: cạnh khung (điểm).
// Trả { canvas, draw(t, k) }: t giây kể từ lúc hiện, k độ nở của vầng sáng (0 chưa có … 1 đủ; quá 1 một chút là nở quá đà rồi thu về).
export function createRays(color, lvl = 1, n = 216) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = n;
  const g = canvas.getContext('2d'), img = g.createImageData(n, n), d = img.data, { ang, rad } = polar(n);
  const base = rgb(color), dark = Math.max(...base) < 90;   // phẩm đen (Thượng Cổ): tia đỏ sẫm cho thấy được trên nền tối
  const c1 = dark ? [150, 8, 14] : base, hi = mix(c1, [255, 250, 232], 0.55), lo = mix(c1, [14, 8, 26], 0.5), W = dark ? [255, 214, 214] : [255, 252, 236];
  const NA = lvl >= 3 ? 16 : lvl >= 1 ? 12 : 8, NB = NA * 2, sa = TAU / NA, sb = TAU / NB, WA = 0.44, ring = lvl >= 2, ring2 = lvl >= 3;   // WA: bề ngang tia so với khe lúc còn gần lõi
  const put = (i, c) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  function draw(t, k = 1) {
    if (k <= 0.001) { g.clearRect(0, 0, n, n); return; }
    const rotA = Math.round(t * 0.55 / STEP) * STEP, rotB = Math.round(t * 0.85 / STEP) * STEP, rotR = Math.round(t * 0.4 / STEP) * STEP, RM = 60 * k;
    for (let y = 0, p = 0; y < n; y++) for (let x = 0; x < n; x++, p++) {
      const i = p * 4, r = rad[p]; d[i + 3] = 0;
      if (r > RM) continue;
      const by = (BAYER[(x & 3) + (y & 3) * 4] + 0.5) / 16, u0 = r / k;   // u0: bán kính quy về lúc đã nở đủ
      if (u0 < 12) { put(i, W); continue; }
      if (u0 < 18) { put(i, by < (18 - u0) / 6 * 0.5 ? W : hi); continue; }
      if (u0 < 23) { put(i, by < (23 - u0) / 5 ? hi : c1); continue; }
      if (ring && u0 >= 50.4 && u0 < 52) {   // vòng hạt: 36 nét đứt chạy ngược chiều tia
        const q = ((ang[p] - rotR + TAU * 8) % TAU) / (TAU / 36); if (q - Math.floor(q) < 0.55) { put(i, hi); continue; }
      }
      if (ring2 && u0 >= 55.6 && u0 < 56.8) { const q = ((ang[p] + rotR * 1.5) % TAU) / (TAU / 48); if (q - Math.floor(q) < 0.4) { put(i, c1); continue; } }
      const a = (ang[p] + rotA) % TAU, ia = Math.floor(a / sa), fa = a / sa - ia, len = ia & 1 ? 46 : 59, u = u0 / len;
      if (u < 1) {
        // nêm: giữa khe là tâm tia, gần lõi toả rộng dần, ra ngoài giữ bề ngang (nửa bề ngang tối đa 5,2 đơn vị) rồi vuốt nhọn ở đầu
        const hw = Math.min(WA / 2 * sa * u0, 5.2) * (u < 0.72 ? 1 : 1 - (u - 0.72) / 0.28 * 0.8);
        if (Math.abs(fa - 0.5) * sa * u0 < hw) {
          if (u0 < 31) put(i, by < (31 - u0) / 8 ? hi : c1);
          else if (u < 0.6) put(i, c1);
          else if (by < (1 - u) * 2.6) put(i, u < 0.84 ? c1 : lo);
          else if (u < 0.8 && by < 0.9) put(i, lo);
          if (d[i + 3]) continue;
        }
      }
      const b = ((ang[p] - rotB + TAU * 8) % TAU) / sb, fb = b - Math.floor(b);
      if (fb < 0.16 && u0 < 41 && by < 0.85 - u0 / 100) { put(i, hi); continue; }   // tia mảnh
      if (u0 < 40 && by < 0.42 - u0 / 105) put(i, lo);   // quầng thưa giữa các tia
    }
    g.putImageData(img, 0, 0);
    if (k < 0.95) return;
    const c = (n - 1) / 2, s = n / 120, ns = lvl >= 2 ? STARS.length : lvl >= 1 ? 6 : 4;   // sao bốn cánh nhấp nháy (mỗi sao một nhịp 0,9 giây, lệch nhau)
    for (let j = 0; j < ns; j++) {
      const [r, a, ph] = STARS[j], f = Math.floor((t * 8 + ph * 1.5) % 7.2), sz = [0, 1, 2, 3, 2, 1, 0, 0][f] || 0;
      if (!sz) continue;
      const x = Math.round(c + Math.cos(a) * r * s), y = Math.round(c + Math.sin(a) * r * s), L = Math.round(sz * s * 1.1);
      if (sz > 1) { g.fillStyle = `rgb(${hi})`; g.fillRect(x - 1, y - 1, 3, 3); }
      g.fillStyle = '#fff'; g.fillRect(x - L, y, L * 2 + 1, 1); g.fillRect(x, y - L, 1, L * 2 + 1);
    }
  }
  return { canvas, draw };
}
