// Đồ dùng chung cho hiệu ứng riêng của game (nhìn từ trên xuống). Tệp bắt đầu bằng _ là thư viện, không phải hiệu ứng.
import { clamp, TAU, WHITE, rand, loopNoise } from "../../core/index.js";

/** Mặt đất nhìn chếch từ trên: vòng tròn trên đất vẽ thành elip dẹt nhẹ (khung ngắm chiêu của game là tròn thật). */
export const SY = 0.84;

/** Điểm trên mặt đất ở góc a, cách tâm r (điểm ảnh). */
export const gp = (a, r) => [Math.cos(a) * r, Math.sin(a) * r * SY];

/**
 * Lưỡi liềm sáng (kiếm khí, nguyệt nhận): phần nằm trong đường tròn ngoài (tâm (cx, cy), bán kính R) và ngoài đường tròn trong
 * lùi về sau một đoạn d (bán kính R2). Mặt lồi quay về hướng a. ramp tối → sáng; viền ngoài màu đậm, lõi trắng, đuôi ngả màu rồi tan.
 * o: { a (hướng mặt lồi), k (độ đục), hot (0..1 lõi trắng dày hơn), fade (đuôi tan sớm) }
 */
export function crescent(p, cx, cy, R, d, R2, ramp, o = {}) {
  const n = ramp.length, a = o.a ?? 0, ca = Math.cos(a), sa = Math.sin(a), k = o.k ?? 1, hot = o.hot ?? 0.5;
  const ix = cx - ca * d, iy = cy - sa * d;   // tâm đường tròn trong
  p.shade(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y, out) => {
    const r1 = Math.hypot(x - cx, y - cy), r2 = Math.hypot(x - ix, y - iy);
    if (r1 > R || r2 < R2) return;
    const e = R - r1, w = e + (r2 - R2), white = Math.max(1, w * (0.3 + hot * 0.25));   // e: cách mép lồi; w: bề dày tại chỗ này
    let c, al = k;
    if (w < 1.2) c = ramp[n - 2];                       // mũi lưỡi: một nét sáng
    else if (e < 0.95) c = ramp[n - 4];                 // viền màu đậm ở mép lồi: nổi trên nền sáng
    else if (e < 0.95 + white) c = WHITE;               // lõi trắng
    else if (e < 1.9 + white) c = ramp[n - 2];
    else if (e < 3 + white) c = ramp[n - 3];
    else { c = ramp[n - 4]; al = k * clamp(1.5 - (e - white - 3) * 0.5); }   // đuôi tan dần
    out.c = c; out.a = al;
  });
}

/** Một nét cung mảnh (bóng mờ của lưỡi liềm): cùng tâm, bán kính R, mở half rad quanh hướng a. */
export function arcLine(p, cx, cy, R, half, c, k = 1, a = 0) {
  const m = Math.ceil(R * half * 2 * 1.2);
  for (let j = 0; j <= m; j++) { const g = a - half + (2 * half * j) / m, u = Math.abs(j / m - 0.5) * 2; p.dot(cx + Math.cos(g) * R, cy + Math.sin(g) * R, c, k * (1.15 - u * u)); }
}

/** Vệt gió lùi về sau (hướng -x): n vệt lặp theo chu kỳ D, mỗi vệt là một đoạn ngang ngắn sáng ở đầu. */
export function windLines(p, t, D, n, seed, x0, x1, hy, speed, ramp, life = 0.22) {
  for (let i = 0; i < n; i++) {
    const born = rand(seed, i, 1) * D, L = life * (0.6 + 0.8 * rand(seed, i, 2));
    let age = (((t - born) % D) + D) % D;
    if (age >= L) continue;
    const u = age / L, y = (rand(seed, i, 3) * 2 - 1) * hy, x = x0 - (x0 - x1) * rand(seed, i, 4) - speed * age, len = 3 + 7 * rand(seed, i, 5) * (1 - u * 0.5);
    p.line(x - len, y, x, y, (v) => (v > 0.7 ? ramp[ramp.length - 1] : ramp[ramp.length - 3]), (v) => (0.25 + 0.75 * v) * (1 - u));
  }
}

/** Nhiễu lặp không vết nối cho hiệu ứng lặp: -1..1 */
export const ln = (t, D, rate, seed) => loopNoise(t / D, rate, seed);

/** Xếp các vật đứng theo chiều sâu: xa (y nhỏ) vẽ trước. */
export const byDepth = (list) => list.sort((a, b) => a.y - b.y);

/** Vòng tròn chấm trên mặt đất (pháp trận, vòng chiêu): nét 1 điểm ảnh, k độ đục, có thể chỉ vẽ nửa trước / sau. */
export function groundArc(p, r, a0, a1, c, k = 1, cy = 0) {
  const m = Math.max(8, Math.ceil(r * Math.abs(a1 - a0) * 1.15));
  for (let j = 0; j <= m; j++) { const a = a0 + ((a1 - a0) * j) / m; p.dot(Math.cos(a) * r, cy + Math.sin(a) * r * SY, c, k); }
}
export { TAU };
