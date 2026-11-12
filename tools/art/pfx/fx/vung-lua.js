import { fit, clamp, rand, TAU, WHITE, hex, cycle, FIRE_RAMP } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, runeCircle, flameLoop, ln, byDepth } from "./_td.js";

export const meta = {
  name: "Phần thiên địa (vùng lửa)",
  desc: "Vùng đất cháy nhìn từ trên xuống, lặp liền mạch: nền cháy sém, khe nứt dung nham thở sáng tối, pháp trận hỏa xoay chậm, vành lửa viền quanh và những ngọn lửa nhảy múa rải trong vùng, tàn lửa bay lên.",
  tags: ["p2d", "zone", "fire", "loop"],
  size: [204, 204],
  origin: [102, 116],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], reach: 80, seed: 31 },
};
const D = meta.duration, SOOT = hex("#17100f"), SOOT2 = hex("#2a1c18");

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, breath = 0.5 + 0.5 * Math.sin((t / D) * TAU);
  groundPatch(p, R, (d) => [d > 0.9 ? SOOT2 : SOOT, d > 0.9 ? 0.36 : 0.52 - 0.12 * d], S);
  groundVeins(p, R, 13, S + 3, 1, (u) => (breath > 0.6 ? (u < 0.45 ? C[7] : C[6]) : u < 0.45 ? C[6] : C[5]), 1);
  runeCircle(p, R * 0.5, (t / D) * TAU / 16 * 2, C, 0.9, "hoa", 3);
  for (let i = 0; i < 9; i++) { const [x, y] = gp((i * TAU) / 9 + 0.2, R * (0.3 + 0.5 * rand(S, i, 9))); p.glow(x, y, 18, C[4], 0.1 + 0.08 * breath); }
  p.glowRing(0, 0, R * 0.96, 10, C[4], 0.16 + 0.08 * breath);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, sites = [];
  const N = 16; for (let i = 0; i < N; i++) { const [x, y] = gp((i * TAU) / N + 0.1 * Math.sin(i * 7), R * 0.97); sites.push({ x, y, h: 9 + 6 * rand(S, i, 1), s: S + 100 + i }); }   // vành lửa viền
  for (let i = 0; i < 9; i++) { const a = rand(S, i, 2) * TAU, d = R * (0.3 + 0.52 * rand(S, i, 3)), [x, y] = gp(a, d); sites.push({ x, y, h: 13 + 9 * rand(S, i, 4), s: S + 200 + i }); }   // lửa trong vùng (chừa giữa)
  for (const s of byDepth(sites)) flameLoop(p, s.x, s.y, s.h, t, D, s.s, FIRE_RAMP, cycle);
  cycle(t, D, 16, S + 50, (g) => 0.6 + 0.5 * g.next(), (age, L, r) => {   // tàn lửa
    const u = age / L, a = r.range(0, TAU), d = Math.sqrt(r.next()) * R, x = Math.cos(a) * d + Math.sin(age * 5 + r.range(0, 6)) * 3, y = Math.sin(a) * d * SY - 4 - 44 * u;
    if (u > 0.8 && Math.sin(age * 40) < 0) return;
    p.px(x, y, u < 0.4 ? C[7] : u < 0.7 ? C[5] : C[3]); p.light(x, y, C[5], 0.5 * (1 - u));
  });
}
