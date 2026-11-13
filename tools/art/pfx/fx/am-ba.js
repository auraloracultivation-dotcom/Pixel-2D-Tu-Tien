import { fit, WHITE } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Âm ba",
  desc: "Ba vòng cung sóng âm tím nối nhau bay tới: vòng trước sáng trắng, hai vòng sau mờ dần, rung theo nhịp, kèm nốt sáng li ti.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [52, 44],
  origin: [36, 22],
  duration: 0.3,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"], half: 13, seed: 6 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), H = o.half, S = o.seed, ph = (t / D) % 1;
  // các vòng cung sinh ở phía sau rồi trôi lên trước, lớn dần: vòng lặp liền mạch vì mỗi vòng thế chỗ vòng trước nó
  for (let i = 3; i >= 0; i--) {
    const u = (i + 1 - ph) / 4, x = 6 - u * 22, h = H * (1 - u * 0.5), k = 1 - u;   // u: 0 ở trước → 1 ở sau
    if (k <= 0.02) continue;
    const cx = x - h * 0.9, R = h * 1.35, half = Math.asin(Math.min(1, h / R)), m = Math.ceil(R * half * 2.4);
    for (let j = 0; j <= m; j++) {
      const a = -half + (2 * half * j) / m, e = Math.abs(j / m - 0.5) * 2, px = cx + Math.cos(a) * R, py = Math.sin(a) * R;
      p.dot(px, py, u < 0.3 ? (e < 0.55 ? WHITE : C[6]) : u < 0.6 ? C[5] : C[4], (1.25 - e * e * 0.7) * (0.35 + k));
      if (u < 0.34 && e < 0.8) p.dot(px - 1, py, C[5], 1);
      if (u < 0.34 && e < 0.45) p.dot(px - 2, py, C[3], 0.8);
    }
    p.glow(x, 0, h * 1.1, C[4], 0.22 * k);
  }
  // nốt sáng nảy hai bên
  for (const s of [-1, 1]) {
    const y = s * (H * 0.55 + 2 * ln(t, D, 1, S + s)), x = -6 + 3 * ln(t, D, 1, S + 3 + s);
    p.px(x, y, WHITE); p.px(x + 1, y, C[6]); p.px(x, y - 1, C[6]); p.light(x, y, C[5], 0.7);
  }
  p.glow(4, 0, 20, C[4], 0.28);
}
