import { fit, clamp, TAU, WHITE, cycle, rand, hex, mix } from "../../core/index.js";
import { SY, gp } from "./_td.js";

export const meta = {
  name: "Thạch giáp (giáp đá)",
  desc: "Giáp đá bọc người, lặp liền mạch: sáu phiến đá bay vòng quanh thân trên một quỹ đạo nghiêng (phiến ở xa nhỏ và sẫm, phiến ở gần to và sáng), vành bụi đất xoay dưới chân, màn chắn màu đất mờ và hạt sỏi lơ lửng.",
  tags: ["p2d", "self", "shield", "loop"],
  size: [96, 100],
  origin: [48, 78],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c", "#fff0c8"], radius: 24, rocks: 6, seed: 18 },
};
const D = meta.duration, CY = -22;

function rock(p, C, x, y, s, rot, k) {   // một phiến đá: đa giác 6 cạnh méo, mặt sáng trên trái, viền mực
  const pts = []; for (let i = 0; i < 6; i++) { const a = rot + (i * TAU) / 6, r = s * (0.8 + 0.3 * rand(i, 91)); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8]); }
  const grow = pts.map(([px, py]) => { const l = Math.hypot(px - x, py - y) || 1; return [px + ((px - x) / l), py + ((py - y) / l)]; });
  p.poly(grow, C[0]); p.poly(pts, k > 0.5 ? C[4] : C[3]);
  p.poly([pts[3], pts[4], pts[5], [x, y]], k > 0.5 ? C[6] : C[4]);
  if (k > 0.5) { p.px(x - s * 0.3, y - s * 0.3, C[7]); p.line(x, y, pts[1][0] * 0.6 + x * 0.4, pts[1][1] * 0.6 + y * 0.4, C[2]); }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), r = o.radius * 0.8, ph = t / D, N = 14;
  for (let i = 0; i < N; i++) { const a0 = ((i - ph) * TAU) / N; for (let a = a0; a < a0 + (TAU / N) * 0.55; a += 0.5 / r) { const [x, y] = gp(a, r); p.dot(x, y, C[5], 1); } }
  p.each(-r, -r * SY, r, r * SY, (x, y, sx, sy) => { const d = Math.hypot(x, y / SY) / r; if (d < 1) p.blendPx(sx, sy, C[2], 0.22 * (1 - d * 0.5)); });
  p.glow(0, 0, r * 1.3, C[4], 0.16);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, N = o.rocks, ph = t / D, list = [];
  // màn chắn mờ: viền trái xoan quanh người
  for (let a = 0; a < TAU; a += 0.5 / R) { const x = Math.cos(a) * (R - 2), y = CY + Math.sin(a) * (R + 3), lit = Math.cos(a + 2.3); p.dot(x, y, lit > 0.6 ? C[7] : C[5], 0.4 + 0.3 * lit); }
  for (let i = 0; i < N; i++) {
    const a = ((i + ph) * TAU) / N * 1 + ph * 0 , ang = (i * TAU) / N + ph * TAU / N * 2;   // mỗi vòng lặp tiến đúng hai phiến
    const x = Math.cos(ang) * R, z = Math.sin(ang), y = CY + z * R * 0.36 + Math.sin(ang * 2 + i) * 3;
    list.push({ x, y, z, i });
  }
  list.sort((a, b) => a.z - b.z);
  for (const q of list) rock(p, q.z < 0 ? C.map((c, j) => C[Math.max(0, j - 1)]) : C, q.x, q.y, (q.z < 0 ? 3.6 : 5) + rand(q.i, 5) * 1.6, q.i * 1.3 + ph * TAU * (q.i % 2 ? 1 : -1), q.z < 0 ? 0 : 1);
  cycle(t, D, 9, o.seed, (g) => 0.5 + 0.4 * g.next(), (age, L, r) => {   // sỏi lơ lửng
    const u = age / L, x = r.range(-R, R) * 0.9, y = CY + r.range(-R, R * 0.7) - 6 * u;
    p.dot(x, y, r.chance(0.5) ? C[6] : C[4], Math.sin(Math.PI * u) * 1.3);
  });
  p.glowRing(0, CY, R, 7, C[4], 0.22);
}
