import { fit, WHITE, TAU, cycle, sparkle } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Linh châu",
  desc: "Viên linh châu tròn bay lơ lửng, lặp liền mạch: thân châu tô bóng cầu (viền mực, sáng trên trái, tối dưới phải, đốm phản quang trắng), bên trong có vân linh khí xoáy chậm; hai vành linh quang nghiêng chéo nhau quay quanh, mỗi vành một đốm sáng kéo đuôi (nửa sau khuất sau châu); tia lấp lánh và quầng sáng mềm.",
  tags: ["p2d", "projectile", "loop"],
  size: [72, 72],
  origin: [36, 36],
  duration: 0.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], radius: 13, part: "chau", seed: 8 },   // part 'duoi': đuôi sao chổi kéo sau châu (châu bay sang phải)
};
const D = meta.duration;

// một vành linh quang: elip bán trục (a, b) nghiêng tilt; đốm sáng ở góc th kéo đuôi dài; half: 'back' nửa khuất, 'front' nửa nổi
function orbit(p, C, a, b, tilt, th, half) {
  const ct = Math.cos(tilt), st = Math.sin(tilt), m = Math.ceil(a * 3.2);
  for (let j = 0; j <= m; j++) {
    const u = j / m, g = th - u * 2.3, ex = Math.cos(g) * a, ey = Math.sin(g) * b, front = Math.sin(g) > 0;
    if (front !== (half === "front")) continue;
    const x = ex * ct - ey * st, y = ex * st + ey * ct, k = 1.15 - u;
    p.dot(x, y, u < 0.1 ? WHITE : u < 0.4 ? C[5] : C[4], front ? k : k * 0.55);
    if (u < 0.22 && front) p.dot(x, y + 1, C[5], 0.9);
  }
  const front = Math.sin(th) > 0;
  if (front === (half === "front")) { const ex = Math.cos(th) * a, ey = Math.sin(th) * b, x = ex * ct - ey * st, y = ex * st + ey * ct; p.px(x, y, WHITE); p.px(x + 1, y, WHITE); p.px(x, y - 1, C[6]); p.light(x, y, C[5], 1); p.glow(x, y, 5, C[5], 0.3); }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), R = o.radius, S = o.seed, ph = (t / D) % 1, INK = C[0], bob = 0.6 * ln(t, D, 1, S);
  if (o.part === "duoi") {   // đuôi sao chổi: lưỡi linh quang bốn lớp thon dần về sau, mép gợn sóng chạy, chót đuôi tan qua lưới chấm, tia sáng tách ra
    const LEN = R * 3.5, x0 = R * 0.35;
    p.shade(-LEN - 2, -R - 3, x0 + 1, R + 3, (x, y, out) => {
      const u = (x0 - x) / (LEN + x0);
      if (u < 0 || u > 1) return;
      const w = R * 0.94 * Math.pow(1 - u, 0.78) * (0.85 + 0.15 * Math.sin(u * 13 - ph * TAU * 2 + (y > 0 ? 1.9 : 0))) + 0.5, d = Math.abs(y) / w;
      if (d > 1) return;
      out.c = d < 0.28 ? WHITE : d < 0.54 ? C[5] : d < 0.8 ? C[4] : C[3]; out.a = u > 0.5 ? (1 - u) / 0.5 + 0.08 : 1;
    });
    cycle(t, D, 9, S + 5, (g) => 0.14 + 0.14 * g.next(), (age, L, r) => { const k = 1 - age / L, x = -r.range(R * 0.6, LEN * 0.85) - 70 * age, y = r.range(-R, R) * (0.7 + age * 2.5); p.line(x, y, x + 3 * k, y, k > 0.5 ? WHITE : C[5]); p.light(x, y, C[4], 0.5 * k); });
    p.glowLine(-LEN * 0.75, 0, 0, 0, R * 1.3, C[3], 0.36); p.glowLine(-LEN * 0.3, 0, 0, 0, R * 0.7, WHITE, 0.22);
    return;
  }
  const A = R * 1.55, B = R * 0.5, th1 = ph * TAU, th2 = ph * TAU + 2.4;
  orbit(p, C, A, B, -0.45, th1, "back"); orbit(p, C, A * 0.92, B * 0.9, 0.6, th2, "back");
  // thân châu: tô bóng cầu, vân xoáy bên trong
  p.shade(-R - 2, -R - 2 + bob, R + 2, R + 2 + bob, (x, y, out) => {
    const yy = y - bob, d = Math.hypot(x, yy);
    if (d > R + 0.45) return;
    if (d > R - 0.75) { out.c = INK; return; }
    const nx = x / R, ny = yy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lam = nx * -0.52 + ny * -0.62 + nz * 0.58;
    let i = lam > 0.84 ? 6 : lam > 0.6 ? 5 : lam > 0.3 ? 4 : lam > 0 ? 3 : lam > -0.32 ? 2 : 1;
    const sw = Math.sin(Math.atan2(yy, x) * 2 + d * 0.62 - ph * TAU);   // vân linh khí xoáy
    if (sw > 0.74 && d < R - 2.5 && i < 6) i++;
    if (d > R - 2 && lam < -0.1) i = Math.min(4, i + 2);   // viền hắt sáng phía tối (châu trong)
    out.c = i >= 6 ? WHITE : C[i];
  });
  const hx = -R * 0.42, hy = -R * 0.48 + bob;   // đốm phản quang
  p.px(hx, hy, WHITE); p.px(hx + 1, hy, WHITE); p.px(hx, hy + 1, WHITE); p.px(hx + 1, hy + 1, C[6]); p.px(hx + 3, hy - 2, C[5]);
  orbit(p, C, A, B, -0.45, th1, "front"); orbit(p, C, A * 0.92, B * 0.9, 0.6, th2, "front");
  cycle(t, D, 5, S, (g) => 0.22 + 0.16 * g.next(), (age, L, r) => {
    const k = Math.sin(Math.PI * (age / L)), a = r.range(0, TAU), d = R * r.range(1.15, 1.9);
    sparkle(p, Math.cos(a) * d, Math.sin(a) * d * 0.8 + bob, 1 + 2.2 * k, WHITE, C[5], 0.35 * k);
  });
  p.glow(0, bob, R * 2.5, C[3], 0.42 + 0.06 * ln(t, D, 2, S + 3));
  p.glow(0, bob, R * 1.25, C[5], 0.3);
  p.glow(hx, hy, R * 0.6, WHITE, 0.3);
}
