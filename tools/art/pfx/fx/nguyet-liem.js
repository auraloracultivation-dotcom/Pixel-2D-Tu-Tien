import { fit, WHITE, TAU, cycle, sparkle } from "../../core/index.js";
import { crescent, arcLine, ln } from "./_td.js";

export const meta = {
  name: "Tử nguyệt liềm",
  desc: "Một vầng trăng khuyết tím xoay tròn như lưỡi hái: lõi trắng, viền tím, vệt xoay kéo theo và sao li ti văng ra.",
  tags: ["p2d", "projectile", "loop", "spin"],
  size: [64, 64],
  origin: [32, 32],
  duration: 0.5,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140a26", "#2b1252", "#5a24a8", "#8a48e8", "#b89af0", "#e4d0ff", "#ffffff"], half: 15, seed: 7 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), H = o.half, S = o.seed, a = (t / D) * TAU, R = H * 1.02;
  // tâm đường tròn ngoài lệch khỏi trục xoay một chút: trăng quay quanh "cán" của nó
  const ox = -Math.cos(a) * H * 0.3, oy = -Math.sin(a) * H * 0.3;
  // vệt xoay: các nét cung của những vị trí trước đó, sẫm và ngắn dần
  for (let i = 4; i >= 1; i--) {
    const b = a - i * 0.42;
    arcLine(p, -Math.cos(b) * H * 0.3, -Math.sin(b) * H * 0.3, R - 0.5, 1.0 - i * 0.16, C[5 - Math.min(3, i)], 1.05 - i * 0.2, b);
  }
  crescent(p, ox, oy, R, H * 0.5, H * 1.05, C, { a, hot: 0.5 + 0.2 * ln(t, D, 2, S) });
  // hai mũi trăng lóe, sao văng theo chiều xoay
  for (const s of [-1, 1]) {
    const g = a + s * 1.2, x = ox + Math.cos(g) * R * 0.98, y = oy + Math.sin(g) * R * 0.98;
    if (s > 0) sparkle(p, x, y, 3, C[5], C[4], 0.45);
    else p.px(x, y, WHITE);
  }
  cycle(t, D, 9, S + 20, (g) => 0.16 + 0.14 * g.next(), (age, L, r) => {
    const born = t - age, b = (born / D) * TAU + 1.2, k = 1 - age / L, d = R + 2 + 46 * age;
    const x = -Math.cos(b - 1.2) * H * 0.3 + Math.cos(b - 1.6 * age) * d, y = -Math.sin(b - 1.2) * H * 0.3 + Math.sin(b - 1.6 * age) * d;
    p.px(x, y, k > 0.55 ? WHITE : C[4]);
    p.light(x, y, C[3], 0.6 * k);
  });
  p.glow(0, 0, 26, C[3], 0.34);
  p.glow(ox + Math.cos(a) * R * 0.75, oy + Math.sin(a) * R * 0.75, 12, C[4], 0.3);
}
