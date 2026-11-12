import { fit, TAU, WHITE, hex, cycle } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Hồ lô",
  desc: "Trái hồ lô tiên lơ lửng, lặp liền mạch: hai bầu tô bóng cầu màu hổ phách (viền mực, sáng trên trái, vệt phản quang), cổ thon có nút gỗ, dây lụa đỏ thắt eo có hai tua bay; miệng hồ lô toả linh khí cuộn lên, quanh thân có hạt sáng.",
  tags: ["p2d", "object", "loop"],
  size: [56, 68],
  origin: [28, 52],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], seed: 13 },
};
const D = meta.duration;
const A = ["#2a1206", "#5e2c0c", "#964c14", "#c8782a", "#eaa850", "#ffd88a", "#fff4d0"].map(hex), RED = ["#5a0c10", "#b01c1c", "#ff5a3c"].map(hex), WOOD = ["#2e1a0c", "#6a421e"].map(hex);

// một bầu tô bóng cầu tâm (cx, cy) bán kính R
function bulb(p, cx, cy, R) {
  p.shade(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y, out) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > R + 0.45) return;
    if (d > R - 0.7) { out.c = A[0]; return; }
    const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lam = nx * -0.52 + ny * -0.6 + nz * 0.6;
    out.c = A[lam > 0.86 ? 6 : lam > 0.62 ? 5 : lam > 0.34 ? 4 : lam > 0.04 ? 3 : lam > -0.3 ? 2 : 1];
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), S = o.seed, ph = (t / D) % 1, bob = Math.round(1.2 * Math.sin(ph * TAU));
  const Y = -11 + bob;   // tâm bầu dưới
  // linh khí cuộn lên từ miệng hồ lô
  cycle(t, D, 7, S, (g) => 0.35 + 0.25 * g.next(), (age, L, r) => {
    const u = age / L, x = Math.sin(u * 5 + r.range(0, 6)) * (2 + u * 5), y = Y - 26 - u * 16;
    p.px(x, y, u < 0.4 ? WHITE : C[5]); if (u < 0.7) p.px(x + 1, y, C[4]); if (u < 0.45) p.px(x, y + 1, C[5]);
    p.light(x, y, C[4], 0.7 * (1 - u));
  });
  bulb(p, 0, Y, 10); bulb(p, 0, Y - 14, 6.5);
  // cổ và nút gỗ
  p.rect(-2, Y - 24, 4, 4, A[0]); p.rect(-1, Y - 24, 2, 4, A[3]); p.px(-1, Y - 23, A[5]);
  p.rect(-3, Y - 27, 6, 3, WOOD[0]); p.rect(-2, Y - 27, 4, 2, WOOD[1]); p.px(-2, Y - 27, A[4]);
  // vệt phản quang trên hai bầu
  p.line(-6, Y - 5, -4, Y - 8, WHITE); p.px(-7, Y - 3, A[6]); p.px(-3, Y - 18, WHITE); p.px(-4, Y - 17, A[6]);
  // dây lụa đỏ thắt eo, hai tua bay
  p.rect(-6, Y - 10, 12, 3, RED[0]); p.rect(-5, Y - 10, 10, 2, RED[1]); p.line(-5, Y - 10, 3, Y - 10, RED[2]);
  for (const [k, len] of [[0, 10], [1, 7]]) {
    let x = 5, y = Y - 8;
    for (let i = 0; i < len; i++) { const nx = x + 1, ny = y + 0.8 + Math.sin(i * 0.8 - ph * TAU + k) * 0.8; p.line(x, y, nx, ny, i > len - 3 ? RED[2] : RED[1]); x = nx; y = ny; }
    p.px(x, y, RED[2]);
  }
  // hạt sáng quanh thân
  cycle(t, D, 4, S + 5, (g) => 0.3 + 0.2 * g.next(), (age, L, r) => { const k = Math.sin(Math.PI * (age / L)), x = r.sign() * r.range(11, 17), y = Y - r.range(-6, 22); if (k > 0.3) { p.px(x, y, WHITE); p.light(x, y, C[5], 0.6 * k); } });
  p.glow(0, Y - 6, 26, C[3], 0.3 + 0.05 * ln(t, D, 2, S));
  p.glow(0, Y - 28, 9, C[5], 0.4);
}
