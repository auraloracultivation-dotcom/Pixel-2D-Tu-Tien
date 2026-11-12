import { fit, WHITE, cycle } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Mảnh linh quang",
  desc: "Một mảnh linh quang hình thoi nhọn bay mũi về phía trước (mảnh bắn ra khi đòn pháp bảo nổ): viền mực, mặt trên sáng, sống trắng, vệt sáng kéo sau, đầu mũi lóe.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [44, 20],
  origin: [30, 10],
  duration: 0.3,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], seed: 4 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), S = o.seed, INK = C[0], f = 0.5 + 0.5 * ln(t, D, 2, S);
  for (const [dy, len, ci] of [[0, 18, 5], [-1, 11, 4], [1, 12, 4]]) p.line(-5 - len * (0.85 + 0.15 * f), dy, -5, dy, (u) => (u > 0.75 ? C[6] : C[ci]), (u) => u * 1.1);   // vệt sáng kéo sau
  p.poly([[8, 0], [1, -3.6], [-6, 0], [1, 3.6]], INK);
  p.poly([[7, 0], [1, -2.6], [-5, 0], [1, 2.6]], C[3]);
  p.poly([[7, 0], [1, -2.6], [-5, 0]], C[4]);   // mặt trên sáng
  p.line(-4, 0, 6, 0, WHITE); p.px(1, -1, C[5]); p.px(2, -1, C[5]); p.px(0, 1, C[2]);
  if (f > 0.4) { p.px(8, 0, WHITE); p.px(9, 0, C[5]); p.px(8, -1, C[5]); p.px(8, 1, C[5]); }
  cycle(t, D, 4, S + 9, (g) => 0.1 + 0.1 * g.next(), (age, L, r) => { const k = 1 - age / L, x = -4 - 90 * age - r.range(0, 6), y = r.range(-3, 3); p.px(x, y, k > 0.5 ? WHITE : C[5]); p.light(x, y, C[4], 0.5 * k); });
  p.glowLine(-6, 0, 8, 0, 6, C[4], 0.36); p.glow(7, 0, 5, WHITE, 0.3); p.glowLine(-22, 0, -6, 0, 4, C[3], 0.16);
}
