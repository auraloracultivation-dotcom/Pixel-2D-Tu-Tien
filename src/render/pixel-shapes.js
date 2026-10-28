// Vòng tròn, cung, đĩa tròn bằng điểm ảnh nguyên (thuật toán trung điểm), thay ctx.arc khử răng cưa cho vật trong thế giới:
// vòng đả tọa, khiên, vòng báo đòn, cung chém, vòng sóng, vòng sét sắp giáng, vùng chiêu (docs/02: không khử răng cưa).
const rings = new Map();

// Các điểm của vòng bán kính r (làm tròn), lưu sẵn theo r
function points(r) {
  r = Math.max(1, Math.round(r));
  if (rings.has(r)) return rings.get(r);
  const out = [];
  let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) out.push([a, b, Math.atan2(b, a)]);
    y++;
    if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
  rings.set(r, out);
  return out;
}

const inArc = (a, a0, a1) => { const d = ((a - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return d <= a1 - a0; };

// Vòng (hoặc cung từ góc a0 tới a1), dày thick điểm ảnh vào trong
export function ring(ctx, x, y, r, color, a0 = null, a1 = null, thick = 1) {
  const cx = Math.round(x), cy = Math.round(y);
  ctx.fillStyle = color;
  for (let k = 0; k < Math.max(1, Math.round(thick)); k++) {
    for (const [dx, dy, a] of points(r - k)) if (a0 == null || inArc(a, a0, a1)) ctx.fillRect(cx + dx, cy + dy, 1, 1);
  }
}

// Đĩa tròn đặc: từng hàng một dải ngang
export function disc(ctx, x, y, r, color) {
  const cx = Math.round(x), cy = Math.round(y), R = Math.max(0, Math.round(r));
  ctx.fillStyle = color;
  for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy + R * 0.8)); ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
}
