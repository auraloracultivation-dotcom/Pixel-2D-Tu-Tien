import { fit, WHITE, TAU, cycle, clamp } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Kim luân",
  desc: "Bánh xe vàng xoay tít: vành răng cưa sáng, lõi rỗng, nan hoa lóe, vệt xoay và tia vàng bắn ra.",
  tags: ["p2d", "projectile", "loop", "spin"],
  size: [56, 56],
  origin: [28, 28],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], radius: 11, teeth: 6, seed: 5 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, N = o.teeth, S = o.seed, rot = (t / D) * TAU / N * 2;   // mỗi vòng lặp quay đúng 2 răng: lặp không vết nối
  // vệt xoay ngoài vành: nét cung mờ
  for (let i = 0; i < 3; i++) {
    const b = rot * (N / 2) + i * 2.1, r = R + 3 + i * 1.5;
    for (let g = 0; g < 1.1 - i * 0.25; g += 0.08) p.dot(Math.cos(b - g) * r, Math.sin(b - g) * r, C[5 - i], 0.9 - g * 0.6 - i * 0.15);
  }
  // vành có răng: bán kính ngoài nhô theo răng cưa lệch chiều quay
  p.shade(-R - 5, -R - 5, R + 5, R + 5, (x, y, out) => {
    const d = Math.hypot(x, y), a = Math.atan2(y, x) - rot, ph = ((a / TAU) * N % 1 + 1) % 1, tooth = R + 3.6 * Math.pow(1 - ph, 2.2);
    if (d > tooth || d < R * 0.42) return;
    const e = tooth - d;
    out.c = e < 0.9 ? C[2] : d < R * 0.42 + 1 ? C[3] : ph < 0.12 && d > R - 1 ? WHITE : d > R - 1.2 ? C[6] : d > R * 0.7 ? C[5] : C[4];
  });
  // nan hoa và trục
  for (let i = 0; i < 3; i++) {
    const a = -rot * 0.5 + (i * TAU) / 3;
    p.line(Math.cos(a) * 1.5, Math.sin(a) * 1.5, Math.cos(a) * R * 0.44, Math.sin(a) * R * 0.44, C[6]);
  }
  p.px(0, 0, WHITE); p.px(-1, 0, C[5]); p.px(0, -1, C[5]);
  // một vệt sáng chạy quanh vành, tia vàng văng theo tiếp tuyến
  const gl = (t / D) * TAU;
  p.px(Math.cos(gl) * (R - 0.5), Math.sin(gl) * (R - 0.5), WHITE);
  p.px(Math.cos(gl + 0.14) * (R - 0.5), Math.sin(gl + 0.14) * (R - 0.5), WHITE);
  cycle(t, D, 8, S, (g) => 0.12 + 0.12 * g.next(), (age, L, r) => {
    const a = r.range(0, TAU), k = 1 - age / L, d = R + 3 + 70 * age, tx = -Math.sin(a), ty = Math.cos(a);
    const x = Math.cos(a) * d + tx * 30 * age, y = Math.sin(a) * d + ty * 30 * age;
    p.line(x - Math.cos(a) * 2 * k, y - Math.sin(a) * 2 * k, x, y, k > 0.5 ? WHITE : C[5]);
    p.light(x, y, C[4], 0.6 * k);
  });
  p.glow(0, 0, R + 14, C[4], 0.36 + 0.06 * ln(t, D, 2, S));
  p.glow(0, 0, R * 0.9, C[6], 0.22);
}
