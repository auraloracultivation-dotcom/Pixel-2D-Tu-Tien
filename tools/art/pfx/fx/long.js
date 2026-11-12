import { fit, WHITE, TAU, cycle, clamp, mix, hex, rand } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Rồng",
  desc: "Một con rồng lao tới: đầu có sừng, râu dài, mắt sáng, miệng há phun sáng; thân uốn lượn hình sóng thon dần về đuôi, vảy sáng tối xen kẽ, gai lưng; mỗi hệ một dáng: rồng lửa bốc cháy, rồng mây mộc mọc lá, rồng nước tung bọt.",
  tags: ["p2d", "projectile", "loop", "directional", "showpiece"],
  size: [168, 88],
  origin: [128, 46],
  duration: 0.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], kind: "lua", len: 84, girth: 5.5, seed: 11 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), K = o.kind, L = o.len, G = o.girth, S = o.seed, INK = C[0], lam = L * 0.56;
  const amp = (s) => (G * 1.25) * Math.sin(Math.PI * clamp(s / (L * 0.5)) * 0.5) * (1 - 0.35 * clamp((s - L * 0.6) / (L * 0.4)));
  const yAt = (s) => amp(s) * Math.sin(TAU * (s / lam + t / D));
  const rAt = (s) => (s < 6 ? G * (0.78 + 0.22 * (s / 6)) : G * Math.pow(1 - (s - 6) / (L - 6), 0.62)) + 0.6;
  const hy = yAt(0), slope = (yAt(1) - yAt(0));
  // hào quang theo hệ ở lớp sau thân: lửa bốc ngược, lá bay, bọt nước
  cycle(t, D, K === "lua" ? 34 : 18, S + 3, (g) => (K === "lua" ? 0.2 + 0.25 * g.next() : 0.25 + 0.3 * g.next()), (age, life, r) => {
    const born = t - age, s0 = r.range(2, L * 0.92), k = 1 - age / life;
    const y0 = amp(s0) * Math.sin(TAU * (s0 / lam + born / D)), side = r.sign(), x = -s0 - (K === "lua" ? 46 : 60) * age, y = y0 + side * (rAt(s0) * 0.6 + r.range(4, 18) * age) - (K === "lua" ? 16 * age : 0);
    if (K === "lua") {
      const rr = (1.2 + rAt(s0) * 0.55) * (0.5 + 0.5 * k);
      p.circle(x, y, rr + 0.8, k > 0.5 ? C[3] : C[2]); p.circle(x - 0.3, y - 0.4, rr, k > 0.66 ? C[6] : k > 0.33 ? C[5] : C[4]);
      if (k > 0.7 && rr > 1.6) p.circle(x - 0.4, y - 0.6, rr * 0.45, C[7]);
      p.glow(x, y, rr * 2.6 + 2, C[4], 0.14 * k);
    } else if (K === "moc") {
      const a = age * 9 + r.range(0, 6), ca = Math.cos(a), sa = Math.sin(a);
      p.line(x - ca * 2, y - sa * 2, x + ca * 2, y + sa * 2, k > 0.5 ? C[6] : C[4]); p.px(x + ca * 2, y + sa * 2, C[7]); p.px(x - sa, y + ca, C[5]);
      p.light(x, y, C[5], 0.35 * k);
    } else {
      p.px(x, y, k > 0.6 ? WHITE : C[6]); if (r.chance(0.6)) { p.px(x - 1, y, C[5]); p.px(x, y + 1, C[4]); }
      if (r.chance(0.3) && k > 0.3) p.ring(x, y, 2, 1, C[6], k);
      p.light(x, y, C[5], 0.4 * k);
    }
  });
  // thân: viền mực trước, rồi vảy, rồi sống lưng và bụng
  for (let s = L; s >= 3; s -= 0.75) p.circle(-s, yAt(s), rAt(s) + 1, INK);
  for (let s = L; s >= 3; s -= 0.75) {
    const band = Math.floor((s + 0.5) / 3.2) % 2;
    p.circle(-s, yAt(s), rAt(s), band ? C[3] : C[2]);
  }
  for (let s = L - 3; s >= 4; s -= 0.5) {
    const y = yAt(s), r = rAt(s) - 0.6;
    if (r < 1) continue;
    p.px(-s, y - r * 0.55, Math.floor(s / 3.2) % 2 ? C[5] : C[4]);          // lưng bắt sáng
    if (r > 2.2) p.px(-s, y + r * 0.7, Math.floor(s / 2) % 2 ? C[6] : C[5]);   // bụng nhạt có khoang
  }
  // gai lưng / lá / vây: nhô lên xen kẽ dọc thân
  for (let s = 9; s < L - 8; s += K === "moc" ? 9 : 6.5) {
    const y = yAt(s), r = rAt(s), h = (K === "thuy" ? 4.5 : 3.6) * (0.5 + 0.5 * (1 - s / L)) + 1.2, fl = ln(t, D, 1.5, S + s);
    if (K === "moc") { for (const sd of [-1, 1]) { p.line(-s, y + sd * r, -s - 4, y + sd * (r + h + fl), C[5]); p.line(-s + 1, y + sd * r, -s - 2, y + sd * (r + h * 0.6), C[4]); p.px(-s - 4, y + sd * (r + h + fl), C[7]); } }
    else p.tri(-s + 2, y - r + 0.5, -s - 2, y - r + 0.5, -s - 3.5 - fl, y - r - h, K === "lua" ? C[6] : C[5]);
  }
  // đuôi: chùm lửa / lá / vây nước
  { const x = -L, y = yAt(L), fl = ln(t, D, 2, S + 77) * 2;
    for (const sd of [-1, 0, 1]) p.line(x, y, x - 7 - (sd === 0 ? 3 : 0), y + sd * 3.5 + fl, sd === 0 ? C[6] : C[5]); }
  // hai chân trước nhỏ
  for (const s of [L * 0.26, L * 0.62]) { const y = yAt(s), r = rAt(s), sw = ln(t, D, 1, S + s) * 1.5; p.line(-s, y + r, -s - 3 + sw, y + r + 3.5, C[2]); p.px(-s - 4 + sw, y + r + 4, C[6]); p.px(-s - 2 + sw, y + r + 4.5, C[6]); }
  // đầu nhìn nghiêng, to hơn thân một cỡ (HS) để đọc ra là đầu rồng ngay cả ở cỡ nhỏ: sọ có gờ mày nhô, mõm dài mũi gồ, miệng há rộng
  // (trong miệng tối, họng rực lửa), nanh trắng, mắt sáng dưới gờ mày, hai sừng dài vuốt về sau, tai vây, bờm, râu dài, chòm râu cằm
  const HS = (G / 5.5) * 1.18, X = 4, Y = hy, tl = clamp(slope * 2.2, -1.6, 1.6), H = (x, y) => [X + x * HS, Y + y * HS + tl * clamp((x + 8) / 20)];   // đầu hơi ngóc theo thân
  const P = (pts) => pts.map(([x, y]) => H(x, y)), L2 = (x0, y0, x1, y1, c) => { const [ax, ay] = H(x0, y0), [bx, by] = H(x1, y1); p.line(ax, ay, bx, by, c); };
  const PX = (x, y, c) => { const [qx, qy] = H(x, y); p.px(qx, qy, c); };
  const grow = (pts, g) => { const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length; return pts.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / l) * g, y + ((y - cy) / l) * g]; }); };
  const gape = 1 + 0.12 * Math.sin((t / D) * TAU);   // hàm dưới đớp nhẹ theo nhịp bay
  const skull = P([[-14, -4], [-9, -7], [-3, -8.6], [2, -7.2], [6, -4.6], [11, -5.4], [16, -4], [18.5, -1.6], [17, 0.6], [9, 1], [1, 2], [-14, 3.2]]);
  const jaw = P([[-13, 2.6], [-2, 3], [2, 5.4 * gape], [9, 9 * gape], [15, 12 * gape], [15.6, 13.6 * gape], [9, 12.6 * gape], [0, 9.6 * gape], [-8, 6.6], [-13, 5]]);
  for (let i = 0; i < 7; i++) {   // bờm mọc dọc gáy, tung về sau (vẽ trước để nằm sau sọ)
    const bx = -5 - i * 2.4, fl = ln(t, D, 2, S + 20 + i) * 1.8, len = 8 + (i % 2) * 4.5 + fl, [ax, ay] = H(bx, -5 + i * 0.5), [ex, ey] = H(bx - len, -8 - (i % 2) * 2.4 + fl * 0.5 + i * 0.9);
    p.tri(ax - 1.8, ay + 1, ax + 1.8, ay, ex, ey, INK); p.tri(ax - 1.2, ay, ax + 1.2, ay, ex + 1, ey + 0.4, i % 2 ? C[6] : C[5]);
  }
  for (const [x0, y0, x1, y1, w] of [[-4, -8, -16, -18, 1], [-8, -7, -19, -12.5, 0]]) {   // sừng: viền mực, thân sáng, chóp trắng
    for (const [dx, dy, c] of [[0, -1, INK], [0, 2, INK], [-1, 0, INK], [0, 0, C[6]], [0, 1, C[5]]]) { const [ax, ay] = H(x0, y0), [bx, by] = H(x1, y1); p.line(ax + dx, ay + dy, bx + dx, by + dy, c); }
    if (w) { const [mx, my] = H(-11, -13); p.line(mx, my, mx - 3 * HS, my + 0.5, C[6]); }   // nhánh sừng
    PX(x1, y1, WHITE); PX(x1 + 0.9, y1 + 0.8, C[7]);
  }
  p.poly(grow(jaw, 1), INK); p.poly(grow(skull, 1), INK);
  p.poly(P([[0, 2], [17, 0.6], [15, 12 * gape], [2, 5.4 * gape]]), C[0]);   // trong miệng: tối
  p.poly(P([[0, 2.2], [8, 1.6], [6.4, 6 * gape], [2, 5 * gape]]), C[5]); p.poly(P([[0.6, 2.6], [5.6, 2.2], [4.6, 4.8 * gape], [2, 4.4 * gape]]), C[7]);   // họng rực
  p.poly(jaw, C[2]); L2(-10, 4, 8, 9.6 * gape, C[3]); L2(-11, 5.4, 6, 11.6 * gape, C[1]);
  p.poly(skull, C[3]);
  p.poly(P([[-13, -3.6], [-9, -6.4], [-3, -7.8], [2, -6.4], [5.6, -4], [0, -2.8], [-13, -1.2]]), C[4]);   // đỉnh đầu bắt sáng
  p.poly(P([[6.4, -4], [11, -4.8], [15.6, -3.4], [17.4, -1.8], [9, -1.6]]), C[4]);                          // sống mũi bắt sáng
  L2(-8, -6.2, -3, -8, C[6]); L2(11, -4.8, 15.4, -3.6, C[6]); L2(-12, 2, -1, 1.4, C[2]); L2(2, 1.4, 16.4, 0.2, C[1]);
  for (const [x, y, h] of [[16, 1, 2.4], [13.6, 1.2, 1.6], [11.2, 1.3, 1.2], [8.8, 1.4, 1.6], [6.4, 1.6, 1]]) { L2(x, y, x - 0.3, y + h, WHITE); }   // nanh hàm trên (cái đầu dài nhất)
  for (const [x, y, h] of [[14, 11 * gape, 2.2], [11, 9.4 * gape, 1.4], [8, 7.8 * gape, 1.4], [5.2, 6.4 * gape, 1]]) { L2(x, y, x + 0.2, y - h, WHITE); }   // nanh hàm dưới
  { p.poly(P([[0.4, -6.4], [6.4, -5.4], [6, -2.8], [0.8, -3]]), INK);   // hốc mắt tối cho mắt nổi
    const [ex, ey] = H(2.4, -4.8);   // mắt: lõi trắng rực, đuôi mắt vàng, gờ mày sáng phía trên
    p.px(ex, ey, WHITE); p.px(ex + 1, ey, WHITE); p.px(ex + 2, ey, C[7]); p.px(ex, ey + 1, C[7]); p.px(ex + 1, ey + 1, C[6]);
    L2(-1, -7.4, 5.4, -6.4, C[5]); p.light(ex, ey, C[7], 1); p.light(ex + 1, ey, C[7], 1); p.light(ex + 1, ey + 1, C[6], 0.9); }
  PX(16.4, -2.8, INK); PX(15.6, -2.4, C[6]);   // lỗ mũi
  p.tri(...H(-9, -3).concat(H(-13, -1)), ...H(-15.5, -6.5), C[5]); L2(-9.4, -3, -15, -6.2, C[7]);   // tai vây sau mắt
  { const fl = ln(t, D, 1.6, S + 51) * 1.5, [ax, ay] = H(4, 11 * gape), [bx, by] = H(-1 + fl, 15.5 * gape); p.tri(ax - 1.5, ay, ax + 1.5, ay, bx, by, C[5]); p.line(ax, ay, bx, by, C[6]); }   // chòm râu cằm
  for (const sd of [-1, 1]) {   // râu: hai sợi dài uốn theo gió
    const pts = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(H(17 - u * 31, -1.6 + sd * (0.8 + u * 7) + Math.sin(u * 5 + (t / D) * TAU + sd) * 2.6 * u)); }
    p.polyline(pts, C[6]); const [wx, wy] = pts[12]; p.px(wx, wy, C[7]);
  }
  // ánh sáng: dọc thân, quầng lớn ở đầu, họng trắng
  for (let s = 6; s < L; s += 9) p.glow(-s, yAt(s), rAt(s) * 2.4 + 6, C[4], 0.2);
  p.glow(X + 4 * HS, Y, 30, C[4], 0.42); p.glow(X + 4 * HS, Y + 4 * HS, 6, C[7], 0.3);
}
