import { fit, WHITE, cycle } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Mộc châm",
  desc: "Một mũi kim gỗ xanh bay vút: mũi trắng, thân xanh ngọc, hai lá non xoè ở đuôi, vệt sáng mảnh và lá vụn rớt lại.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [56, 20],
  origin: [44, 10],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"], length: 15, seed: 4 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), L = o.length, S = o.seed, tip = 6, tail = tip - L, w = ln(t, D, 1, S);
  // vệt sáng mảnh phía sau
  p.line(tail - 22, 0, tail, 0, (u) => (u > 0.7 ? C[7] : C[5]), (u) => u * 1.1);
  p.line(tail - 10, -1, tail, -1, C[4], (u) => u * 0.8);
  // thân kim: mũi trắng, thân sáng trên tối dưới
  for (let x = tail; x <= tip; x++) {
    const u = (tip - x) / L;
    p.px(x, 0, u < 0.3 ? WHITE : C[7]);
    if (u > 0.2 && u < 0.92) p.px(x, 1, u < 0.5 ? C[5] : C[3]);
    if (u > 0.45 && u < 0.85) p.px(x, -1, C[6]);
  }
  // hai lá non ở đuôi, rung nhẹ
  for (const s of [-1, 1]) {
    const lift = 3 + (s > 0 ? w : -w) * 0.8;
    p.line(tail + 1, s, tail - 4, s * lift, C[5]);
    p.line(tail, s * 2, tail - 3, s * (lift + 1), C[4]);
    p.px(tail - 4, s * lift, C[7]);
  }
  cycle(t, D, 5, S + 9, (r) => 0.18 + 0.14 * r.next(), (age, life, r) => {
    const k = 1 - age / life, x = tail - r.range(0, 8) - 70 * age, y = r.range(-2, 2) + r.range(-14, 14) * age;
    p.px(x, y, k > 0.5 ? C[6] : C[4]); if (r.chance(0.5)) p.px(x - 1, y + (r.chance(0.5) ? 1 : -1), C[3]);
    p.light(x, y, C[5], 0.4 * k);
  });
  p.glowLine(tail, 0, tip, 0, 5, C[6], 0.3);
  p.glow(tip - 1, 0, 5, WHITE, 0.22);
  p.glowLine(tail - 18, 0, tail, 0, 4, C[5], 0.14);
}
