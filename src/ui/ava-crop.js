// Khung cắt mặt cho chân dung góc trên trái (src/ui/hud-ava.js; chủ dự án 11/11/2026 12:05: chân dung chưa khớp, mặt to mờ toàn tóc).
// Tìm mặt theo màu da (mảng da gần vuông lớn nhất ở 60% trên của thân), cắt vuông quanh mặt cỡ đầu + vai; hình không có da (bộ xương, mặt nạ)
// thì như cũ: cắt từ đỉnh đầu theo bề ngang thân. a: điểm ảnh RGBA khung đứng (getImageData), w, h: cỡ khung. Trả { x, y, S }.
const skin = (a, i) => a[i + 3] > 200 && a[i] > 190 && a[i + 1] > 130 && a[i + 2] > 100 && a[i] > a[i + 1] + 12 && a[i + 1] >= a[i + 2] - 6 && a[i] - a[i + 2] < 110;

export function faceCrop(a, w, h) {
  let y0 = -1, y1 = 0, x0 = w, x1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 40) { if (y0 < 0) y0 = y; y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  if (y0 < 0) return null;
  const H = y1 - y0 + 1, seen = new Uint8Array(w * h);
  let best = null;
  for (let p = 0; p < w * h; p++) {   // các mảng da liền nhau (loang 4 hướng)
    if (seen[p] || !skin(a, p * 4)) continue;
    const st = [p]; seen[p] = 1;
    let n = 0, sx = 0, sy = 0, l = w, r = 0, t = h, b = 0;
    while (st.length) {
      const q = st.pop(), x = q % w, y = (q - x) / w;
      n++; sx += x; sy += y; if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
      for (const k of [q - 1, q + 1, q - w, q + w]) {
        if (k < 0 || k >= w * h || seen[k] || (k % w === 0 && q % w === w - 1) || (q % w === 0 && k % w === w - 1)) continue;
        if (skin(a, k * 4)) { seen[k] = 1; st.push(k); }
      }
    }
    const fw = r - l + 1, fh = b - t + 1;   // mặt gần vuông: bỏ mảng dài (ánh trăng, vệt sáng, tay áo)
    if (n >= 4 && sy / n - y0 <= H * 0.6 && fh <= fw * 1.6 && fw <= fh * 1.8 && (!best || n > best.n)) best = { n, cx: sx / n, cy: sy / n, fw, fh };
  }
  if (!best) { const S = Math.max(12, Math.round((x1 - x0 + 1) * 0.8)); return { x: Math.round((x0 + x1 + 1) / 2 - S / 2), y: Math.max(0, y0 - 2), S }; }
  const S = Math.round(Math.min(Math.max(best.fw * 2.4, best.fh * 2.8, Math.min(H * 0.5, 4 * Math.max(best.fw, best.fh))), H * 0.7));
  return { x: Math.round(best.cx - S / 2), y: Math.round(best.cy - S / 2), S };
}
