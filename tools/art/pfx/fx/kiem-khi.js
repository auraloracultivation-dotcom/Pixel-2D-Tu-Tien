import { fit, clamp, WHITE, TAU, cycle, sparkle, rand } from "../../core/index.js";
import { crescent, arcLine, windLines, ln } from "./_td.js";

export const meta = {
  name: "Kiếm khí",
  desc: "Một lưỡi liềm kiếm khí bay sang phải: viền màu, lõi trắng, hai bóng mờ kéo sau, vệt gió và đốm sáng rớt lại.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [84, 56],
  origin: [58, 28],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], half: 17, seed: 3 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), H = o.half, S = o.seed, R = H * 1.02, d = H * 0.44, R2 = H * 1.06;
  const breathe = 1 + 0.06 * ln(t, D, 1.2, S), cx = -R + 7 + 0.6 * ln(t, D, 1, S + 1);
  // bóng mờ phía sau: ba nét cung mảnh, ngắn và sẫm dần
  for (let i = 3; i >= 1; i--) arcLine(p, cx - 2 - i * 5.5 - 1.5 * ln(t, D, 1.5, S + 40 + i), 0, R * 0.98, 1.05 - i * 0.2, C[5 - i], 1.1 - i * 0.22);
  windLines(p, t, D, 8, S + 10, cx + R - 6, cx + R - 20, H * 0.75, 130, C);
  // lưỡi chính
  crescent(p, cx, 0, R * breathe, d, R2 * breathe, C, { hot: 0.55 + 0.2 * ln(t, D, 2, S + 2) });
  // hai mũi lưỡi lóe sáng, đốm sáng bong ra bay ngược
  for (const s of [-1, 1]) {
    const tw = 0.5 + 0.5 * ln(t, D, 2.2, S + 5 + s);
    if (tw > 0.35) sparkle(p, cx + R * 0.42, s * H * 0.93, 2 + 2 * tw, C[5], C[4], 0.4 * tw);
  }
  cycle(t, D, 10, S + 30, (g) => 0.14 + 0.16 * g.next(), (age, L, r) => {
    const a = r.range(-1.25, 1.25), x = cx + Math.cos(a) * R - 100 * age - 2, y = Math.sin(a) * R + r.range(-8, 8) * age, k = 1 - age / L;
    p.px(x, y, k > 0.5 ? WHITE : C[5]);
    if (k > 0.4) p.px(x - 1, y, C[4]);
    p.light(x, y, C[4], 0.5 * k);
  });
  // ánh sáng: dọc lưỡi và một quầng rộng
  for (let a = -1.1; a <= 1.1; a += 0.275) p.glow(cx + Math.cos(a) * (R - 2), Math.sin(a) * (R - 2), 9, C[4], 0.22);
  p.glow(cx + R * 0.7, 0, 30, C[3], 0.3);
  p.glow(cx + R - 3, 0, 8, WHITE, 0.25);
}
