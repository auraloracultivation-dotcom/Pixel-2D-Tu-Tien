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

/**
 * Pháp trận trên mặt đất bán kính R (điểm ảnh): hai vành, vạch khắc quanh vành, chữ phù, hình giữa theo ngũ hành.
 * motif: 'kim' (hai hình vuông lồng), 'moc' (lục mang), 'thuy' (ba xoáy nước), 'hoa' (ngũ mang), 'tho' (vuông + thập tự), 'vo' (chỉ vành).
 * C: dải màu tối → sáng; k: độ đục 0..1 (nét tan qua lưới chấm khi k nhỏ); rot: góc xoay vành ngoài, hình giữa xoay ngược.
 */
export function runeCircle(p, R, rot, C, k = 1, motif = "vo", seed = 1) {
  if (R < 4 || k <= 0.02) return;
  const n = C.length, hi = C[n - 2], mid = C[n - 3], lo = C[n - 4];
  const seg = (a0, r0, a1, r1, c, kk = k) => { const [x0, y0] = gp(a0, r0), [x1, y1] = gp(a1, r1); p.line(x0, y0, x1, y1, c, kk); };
  groundArc(p, R, 0, TAU, hi, k * 1.15);
  groundArc(p, R - 3, 0, TAU, mid, k * 0.95);
  const ticks = Math.max(8, Math.round(R / 3.2));
  for (let i = 0; i < ticks; i++) { const a = rot + (i * TAU) / ticks; if (i % 2) seg(a, R - 3, a, R, lo, k * 0.9); else { const [x, y] = gp(a + 0.5 * TAU / ticks, R - 1.5); p.dot(x, y, hi, k * 1.2); } }
  // chữ phù: cụm 2–4 điểm sáng đặt đều trên vành trong
  const glyphs = Math.max(5, Math.round(R / 7));
  for (let i = 0; i < glyphs; i++) {
    const a = -rot * 0.6 + (i * TAU) / glyphs, [gx, gy] = gp(a, R * 0.8);
    for (let j = 0; j < 4; j++) if (rand(seed, i, j) < 0.62) p.dot(gx + (j % 2) * 1.6 - 0.8, gy + (j >> 1) * 1.6 - 0.8, j === 0 ? hi : mid, k * 1.1);
  }
  const r2 = R * 0.62, a0 = -rot * 0.8;
  const poly = (m, r, off, step = 1, c = hi) => { for (let i = 0; i < m; i++) seg(a0 + off + (i * TAU) / m, r, a0 + off + (((i + step) % m) * TAU) / m, r, c); };
  if (motif === "kim") { poly(4, r2, 0); poly(4, r2, TAU / 8, 1, mid); groundArc(p, r2 * 0.45, 0, TAU, mid, k); }
  else if (motif === "moc") { poly(3, r2, -TAU / 4); poly(3, r2, TAU / 4, 1, mid); groundArc(p, r2 * 0.4, 0, TAU, mid, k); }
  else if (motif === "hoa") { poly(5, r2, -TAU / 4, 2); groundArc(p, r2, 0, TAU, lo, k * 0.8); }
  else if (motif === "tho") { poly(4, r2, TAU / 8); seg(a0, r2 * 0.7, a0 + Math.PI, r2 * 0.7, mid); seg(a0 + TAU / 4, r2 * 0.7, a0 - TAU / 4, r2 * 0.7, mid); groundArc(p, r2 * 0.3, 0, TAU, hi, k); }
  else if (motif === "thuy") {
    groundArc(p, r2, 0, TAU, lo, k * 0.8);
    for (let i = 0; i < 3; i++) for (let u = 0; u <= 1; u += 1 / (r2 * 1.6)) { const a = a0 + (i * TAU) / 3 + u * 2.6, [x, y] = gp(a, r2 * (0.12 + 0.86 * u)); p.dot(x, y, u > 0.75 ? hi : mid, k * (0.5 + u * 0.8)); }
  }
  p.glowRing(0, 0, R * 0.92, Math.max(4, R * 0.16), mid, 0.2 * k);   // quầng sáng vành (vẽ tròn, lớp sáng mềm nên không lộ)
}

/** Bán kính mép gợn nhẹ theo góc (mép mảng phủ không tròn vo như com-pa): 1 ± vài phần trăm, liền mạch quanh vòng. */
export const wob = (a, seed = 0, k = 1) => 1 + k * (0.035 * Math.sin(3 * a + seed) + 0.025 * Math.sin(7 * a + seed * 2.3) + 0.015 * Math.sin(13 * a + seed * 4.1));

/**
 * Mảng phủ trong mờ trên mặt đất trong elip bán kính R (băng, cháy sém, cát, cỏ): fn(d, a, x, y) → [màu, độ đục] hoặc null;
 * d 0..1 từ tâm ra mép (mép gợn theo wob). Độ đục < 1 là trong mờ thật (không lưới chấm), ≥ 1 là điểm đặc.
 */
export function groundPatch(p, R, fn, seed = 0, rough = 1) {
  p.each(-R * 1.1 - 2, -R * SY * 1.1 - 2, R * 1.1 + 2, R * SY * 1.1 + 2, (x, y, sx, sy) => {
    const yy = y / SY, a = Math.atan2(yy, x), d = Math.hypot(x, yy) / (R * wob(a, seed, rough));
    if (d > 1) return;
    const r = fn(d, a, x, y);
    if (!r) return;
    if (r[1] >= 1) p.put(sx, sy, r[0], 1); else p.blendPx(sx, sy, r[0], r[1]);
  });
}

/**
 * Đường nứt / vân băng toả từ gần tâm ra mép trên mặt đất: n đường gấp khúc có nhánh, dài tới tỉ lệ grow (0..1) của R. c(u) màu theo chiều dài.
 * o: { jit (độ gấp khúc mỗi đốt, rad; mặc định 0,5), branch (xác suất mọc nhánh mỗi đốt; 0,38), edge(u) (màu mép: vẽ thêm một nét sẫm sát bên
 * dưới cho khe nứt dày 2 điểm ảnh như khe dung nham; không khai thì nét đơn), straight (càng xa tâm càng ít lệch góc: khe toả thẳng ra mép
 * chứ không chạy vòng) }
 */
export function groundVeins(p, R, n, seed, grow, c, k = 1, from = 0.14, o = {}) {
  const jit = o.jit ?? 0.5, br = o.branch ?? 0.38;
  const seg = (x0, y0, x1, y1, u, m = 1) => { if (o.edge) p.line(x0, y0 + 1, x1, y1 + 1, o.edge(u), k * m); p.line(x0, y0, x1, y1, c(u), k * m); };
  for (let i = 0; i < n; i++) {
    let a = (i * TAU) / n + (rand(seed, i, 1) - 0.5) * 0.5, r = R * from, L = R * (0.72 + 0.26 * rand(seed, i, 2)) * grow;
    let [x, y] = gp(a, r);
    for (let st = 0; r < L; st++) {
      const step = 4 + 3 * rand(seed, i, st, 3); const near = o.straight ? Math.min(1, 14 / r) : 1; a += (rand(seed, i, st, 4) - 0.5) * jit * near; r = Math.min(L, r + step);
      const [nx, ny] = gp(a, r), u = r / R;
      seg(x, y, nx, ny, u);
      if (rand(seed, i, st, 5) < br && r < L * 0.9) { const b = a + (rand(seed, i, st, 6) < 0.5 ? -1 : 1) * (0.5 + 0.4 * rand(seed, i, st, 7)) * near, [bx, by] = gp(b, r + 3 + 5 * rand(seed, i, st, 8)); seg(nx, ny, nx + (bx - nx) * 0.8, ny + (by - ny) * 0.8, u, 0.9); }
      x = nx; y = ny;
    }
  }
}

/** Sắp vật đứng quanh tâm theo các vòng: rings = [{ q: tỉ lệ bán kính, n: số vật, ... }]. Trả về [{ x, y (trên đất), a, ring, i, u (ngẫu nhiên 0..1) }] đã xếp xa → gần. */
export function ringSites(R, rings, rnd) {
  const out = [];
  rings.forEach((g, ri) => {
    const a0 = rnd.range(0, TAU);
    for (let i = 0; i < g.n; i++) {
      const a = a0 + ((i + rnd.range(-0.3, 0.3)) * TAU) / g.n, r = R * g.q * rnd.range(0.92, 1.08);
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * SY, a, d: r, ring: ri, i, u: rnd.next() });
    }
  });
  return byDepth(out);
}

/** Một ngọn lửa đứng tại (x, y) cao h cho hiệu ứng lặp (chu kỳ D): đốm lửa sinh ở gốc, bốc lên, co lại và nguội dần theo dải F (trắng nóng → đỏ sẫm). */
export function flameLoop(p, x, y, h, t, D, seed, F, cycle) {
  cycle(t, D, Math.round(5 + h * 0.45), seed, (g) => 0.28 + 0.26 * g.next(), (age, L, r) => {
    const u = age / L, px = x + r.range(-1, 1) * (1.6 + h * 0.07) * (1 - u) + Math.sin(age * 9 + r.range(0, 6)) * 1.1, py = y - 1.5 - u * h * r.range(0.7, 1.1), rr = (1.3 + h * 0.1) * (1 - u * 0.72) * r.range(0.8, 1.2);
    const idx = Math.min(F.length - 3, Math.floor(Math.pow(u, 0.75) * (F.length - 2)));
    p.circle(px, py, rr + 0.7, F[idx + 2]); p.circle(px, py - 0.3, rr, F[idx]);
    if (u < 0.3 && rr > 1.5) p.circle(px, py, rr * 0.5, F[0]);
  });
  p.glow(x, y - h * 0.4, h * 0.9 + 6, F[4], 0.2);
}
