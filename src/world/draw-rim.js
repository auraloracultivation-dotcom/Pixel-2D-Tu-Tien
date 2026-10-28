// Mép tinh cầu tròn (chủ dự án 28/10/2026: "map tròn chưa làm xong"): tấm nền của bản đồ có planet được cắt theo vòng tròn
// điểm ảnh (bán kính ở discOf, src/world/map.js), mép đĩa viền tối một điểm ảnh, mép trên sáng nhẹ như ánh Linh Nhật,
// dưới mép là vách đất hai tầng (tile.cliff) uốn theo vòng tròn thay cho bậc thang ô vuông. Gọi một lần khi dựng tấm nền.
import { discOf } from './map.js';

export function roundRim(c, map, cliff, hash) {
  const d = discOf(map.def, map.T);
  if (!d) return;
  const W = c.canvas.width, H = c.canvas.height, r2 = d.r * d.r;
  const img = c.getImageData(0, 0, W, H), px = img.data;
  const inside = (x, y) => (x + 0.5 - d.cx) ** 2 + (y + 0.5 - d.cy) ** 2 <= r2;
  const keep = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) keep[y * W + x] = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!keep[i]) { px[i * 4 + 3] = 0; continue; }
      const edge = !keep[i - 1] || !keep[i + 1] || !keep[i - W] || !keep[i + W];
      const top = y + 0.5 < d.cy && (!keep[i - W] || !keep[i - 2 * W]);
      const k = edge ? 0.62 : top ? 1.18 : 1;   // viền tối ngoài cùng, hàng trong ở nửa trên sáng lên
      if (k !== 1) for (let j = 0; j < 3; j++) px[i * 4 + j] = Math.min(255, px[i * 4 + j] * k);
    }
  }
  c.putImageData(img, 0, 0);
  if (!cliff) return;
  // Vách: mỗi cột dưới mép dưới đĩa một dải 1 điểm ảnh lấy từ khung vách (hàng 1 rồi hàng 2), khung đổi theo từng đoạn 16 điểm ảnh
  const T = map.T, s = cliff.s;
  for (let x = Math.ceil(d.cx - d.r); x < d.cx + d.r; x++) {
    const dx = x + 0.5 - d.cx;
    if (dx * dx > r2) continue;
    const yb = Math.floor(d.cy + Math.sqrt(r2 - dx * dx)) + 1, seg = Math.floor(x / T), sx = ((x % T) + T) % T;
    c.drawImage(cliff.im, Math.floor(hash(seg, 7) * 3) * s.w + sx, 0, 1, s.h, x, yb, 1, s.h);
    c.drawImage(cliff.im, (3 + Math.floor(hash(seg, 9) * 3)) * s.w + sx, 0, 1, s.h, x, yb + s.h, 1, s.h);
  }
}
