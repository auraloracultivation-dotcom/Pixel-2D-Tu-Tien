import { fit, clamp, WHITE, TAU, cycle, sparkle, rand } from "../../core/index.js";
import { crescent, windLines, ln } from "./_td.js";

export const meta = {
  name: "Kiếm khí",
  desc: "Một lưỡi liềm kiếm khí bay sang phải: lưỡi dày viền màu lõi trắng, sau lưỡi là vệt kiếm khí trong mờ tan dần, vệt gió và đốm sáng rớt lại.",
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
  const C = fit(o.palette, 7), H = o.half, S = o.seed, breathe = 1 + 0.06 * ln(t, D, 1.2, S), R = H * 1.02 * breathe, d = H * 0.5, R2 = H * 1.04 * breathe;
  const cx = -H * 1.02 + 7 + 0.6 * ln(t, D, 1, S + 1), ix = cx - d;
  // vệt kiếm khí kéo sau lưỡi: một mảng trong mờ hình liềm, đậm sát lưỡi rồi tan dần về sau, hai đầu thon lại (thay cho mấy nét cung mảnh
  // trước đây trông như sóng âm)
  const T = H * 1.05 * (1 + 0.1 * ln(t, D, 1.6, S + 7));
  p.each(cx - H - T, -H - 1, cx + R + 1, H + 1, (x, y, sx, sy) => {
    const r2 = Math.hypot(x - ix, y), fwd = (x - ix) / (r2 || 1);   // fwd: 1 là ngay sau giữa lưỡi, 0 là ngang tâm (hết lưỡi)
    if (r2 >= R2 || fwd <= 0.2) return;
    const span = clamp((fwd - 0.2) / 0.45) * clamp(1 - (Math.abs(y) / (H * 0.98)) ** 2);
    if (span <= 0.02) return;
    const depth = (R2 - r2) / (T * (0.35 + 0.65 * span));   // 0 sát lưỡi … 1 cuối vệt
    if (depth >= 1) return;
    p.blendPx(sx, sy, depth < 0.22 ? C[5] : depth < 0.55 ? C[4] : C[3], 0.66 * (1 - depth) ** 1.5 * Math.min(1, span * 2.4));
  });
  windLines(p, t, D, 6, S + 10, cx + R - 6, cx + R - 20, H * 0.7, 130, C);
  // lưỡi chính: dày, lõi trắng
  crescent(p, cx, 0, R, d, R2, C, { hot: 0.7 + 0.2 * ln(t, D, 2, S + 2) });
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
