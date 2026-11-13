import { fit, clamp, TAU, WHITE, cycle, FIRE_RAMP } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Phượng hoàng",
  desc: "Một con phượng lửa bay vút sang phải nhìn từ trên xuống: đầu có mào và mỏ sáng, hai cánh xoè rộng vỗ nhịp nhàng với ba lớp lông, năm dải lông đuôi dài uốn lượn có mắt lửa, lửa bốc dọc cánh và đuôi, tàn lửa rơi lại phía sau.",
  tags: ["p2d", "projectile", "loop", "directional", "showpiece"],
  size: [136, 108],
  origin: [104, 54],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], seed: 27 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, INK = C[1], f = Math.sin((t / D) * TAU), bob = -f * 1.2;
  // lông đuôi: năm dải dài uốn sóng, dải giữa dài nhất, cuối mỗi dải một mắt lửa
  for (let i = 0; i < 5; i++) {
    const sp = (i - 2) * 0.16, L = 52 - Math.abs(i - 2) * 9, pts = [];
    for (let k = 0; k <= 14; k++) { const u = k / 14, x = -8 - u * L, y = bob * (1 - u) + Math.sin(sp) * u * L * 0.9 + Math.sin(u * 5 - (t / D) * TAU + i * 1.3) * 3.2 * u; pts.push([x, y]); }
    for (let k = 1; k <= 14; k++) { const u = k / 14, [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; p.beam(x0, y0, x1, y1, 2.6 * (1 - u * 0.6), u < 0.3 ? C[6] : u < 0.65 ? C[5] : C[4]); }
    p.polyline(pts, C[7]);
    const [ex, ey] = pts[14]; p.circle(ex, ey, 2.6, C[3]); p.circle(ex, ey, 1.5, C[6]); p.px(ex, ey, WHITE); p.glow(ex, ey, 7, C[5], 0.3);
  }
  // hai cánh: gốc ở vai, mũi cánh quạt lên / xuống theo nhịp vỗ; ba lớp lông từ sáng (trong) tới đỏ (mũi)
  for (const sd of [-1, 1]) {
    const lift = sd * (27 + 7 * f), sweep = -13 - 3 * f;
    const W = (x, y) => [x, bob + sd * y];
    const tip = [sweep - 2, lift + sd * 0], root = W(5, 3);
    const outer = [root, W(0, 14 + 3 * f), [sweep, lift], [sweep - 9, lift - sd * 5], W(-15, 13 + 2 * f), [sweep - 13, lift - sd * 12], W(-19, 8), W(-10, 4)];
    const grow = outer.map(([x, y]) => [x + (x < -4 ? -1 : 1), y + sd * 1]);
    p.poly(grow, INK); p.poly(outer, C[4]);
    p.poly([root, W(0, 11 + 2 * f), [sweep * 0.7, lift * 0.74], W(-12, 9 + f), W(-9, 4)], C[5]);
    p.poly([root, W(1, 8 + f), [sweep * 0.42, lift * 0.46], W(-7, 4.5)], C[6]);
    p.line(root[0], root[1], sweep, lift, C[7]);   // xương cánh sáng
    for (const [qx, qy] of [[sweep - 9, lift - sd * 5], [sweep - 13, lift - sd * 12]]) p.line(-8, bob + sd * 5, qx, qy, C[3]);
    p.px(sweep, lift, WHITE); p.glow(sweep * 0.6, lift * 0.6, 14, C[4], 0.24);
    // lửa bốc dọc mép cánh
    cycle(t, D, 9, S + (sd > 0 ? 40 : 60), (g) => 0.16 + 0.14 * g.next(), (age, L, r) => {
      const u = age / L, q = r.range(0.25, 1), x = sweep * q - 14 * u - 2, y = lift * q - sd * 1 + r.range(-2, 2), rr = (1.3 + 1.6 * r.next()) * (1 - u * 0.7), idx = Math.min(6, 1 + Math.floor(u * 5));
      p.circle(x, y, rr + 0.6, FIRE_RAMP[idx + 2]); p.circle(x, y, rr, FIRE_RAMP[idx]);
    });
  }
  // thân, cổ, đầu, mào, mỏ, mắt
  p.ellipse(-1, bob, 9.5, 5.2, INK); p.ellipse(-1, bob, 8.5, 4.2, C[5]); p.ellipse(0, bob - 0.6, 6.5, 2.6, C[6]); p.line(-6, bob - 1, 5, bob - 1, C[7]);
  p.beam(6, bob, 12, bob - 0.5, 3.2, C[5]); p.circle(13, bob - 0.5, 3.6, INK); p.circle(13, bob - 0.5, 2.8, C[6]); p.px(12, bob - 1.5, C[7]);
  p.tri(15.4, bob - 1.8, 15.4, bob + 0.8, 20, bob - 0.4, C[7]); p.px(19, bob - 0.4, WHITE);
  p.px(14, bob - 1.2, INK);
  for (const [dy, len] of [[-2.6, 9], [-0.6, 11], [1.6, 8]]) { const w = ln(t, D, 2, S + dy) * 1.4; p.line(11, bob + dy, 11 - len, bob + dy * 2.4 + w, dy === -0.6 ? C[7] : C[6]); p.px(11 - len, bob + dy * 2.4 + w, WHITE); }
  // tàn lửa rớt lại
  cycle(t, D, 12, S + 80, (g) => 0.2 + 0.2 * g.next(), (age, L, r) => {
    const u = age / L, x = -r.range(4, 50) - 60 * age, y = bob + r.range(-18, 18) + r.range(-12, 12) * age;
    p.px(x, y, u < 0.4 ? C[7] : u < 0.7 ? C[5] : C[3]); p.light(x, y, C[5], 0.5 * (1 - u));
  });
  p.glow(4, bob, 34, C[4], 0.42); p.glow(13, bob, 9, WHITE, 0.32); p.glowLine(-10, bob, -50, bob, 16, C[3], 0.2);
}
