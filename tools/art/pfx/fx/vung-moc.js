import { fit, clamp, rand, TAU, WHITE, cycle, sparkle } from "../../core/index.js";
import { SY, gp, groundPatch, runeCircle, byDepth, ln } from "./_td.js";

export const meta = {
  name: "Thanh mộc lĩnh vực (vùng mộc)",
  desc: "Lĩnh vực cây cỏ nhìn từ trên xuống, lặp liền mạch: thảm cỏ xanh trong mờ, hoa nhỏ nở rải rác, pháp trận mộc xoay chậm, vòng sinh khí toả ra theo nhịp, bụi cỏ và mầm non đung đưa quanh mép, đốm sáng xanh và dấu cộng hồi phục bay lên, lá xoay vòng.",
  tags: ["p2d", "zone", "wood", "loop"],
  size: [200, 200],
  origin: [100, 112],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"], reach: 84, seed: 37 },
};
const D = meta.duration, FLOWERS = ["#ffd6ec", "#fff3a0", "#ffffff", "#c8e8ff"];

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, ph = t / D;
  groundPatch(p, R, (d, a, x, y) => {
    const g = rand(Math.floor(x / 2), Math.floor(y / 2), 5);
    if (d > 0.94) return [C[5], 0.6];
    return [g < 0.25 ? C[4] : g < 0.6 ? C[3] : C[2], 0.4 - 0.1 * d];
  }, S);
  // vòng sinh khí: hai vành sáng toả từ tâm ra mép, lệch nhau nửa nhịp
  for (const off of [0, 0.5]) { const u = (ph + off) % 1, r = R * (0.12 + 0.86 * u); for (let a = 0; a < TAU; a += 0.9 / r) { const [x, y] = gp(a, r); p.dot(x, y, u < 0.5 ? C[7] : C[6], Math.sin(Math.PI * u) * 1.1); } }
  runeCircle(p, R * 0.52, ph * TAU / 16 * 2, C, 0.95, "moc", 7);
  for (let i = 0; i < 16; i++) {   // hoa nhỏ
    const a = rand(S, i, 1) * TAU, [x, y] = gp(a, R * (0.25 + 0.65 * rand(S, i, 2))), c = FLOWERS[i % 4], op = 0.5 + 0.5 * Math.sin((ph + rand(S, i, 3)) * TAU);
    p.px(x, y, "#ffe27a"); if (op > 0.2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, c);
  }
  p.glowRing(0, 0, R * 0.9, 16, C[4], 0.14 + 0.05 * Math.sin(ph * TAU));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, tufts = [];
  for (let i = 0; i < 20; i++) { const a = (i * TAU) / 20 + 0.1 * Math.sin(i * 3), [x, y] = gp(a, R * (0.9 + 0.08 * rand(S, i, 11))); tufts.push({ x, y, i }); }
  for (const s of byDepth(tufts)) {   // bụi cỏ, mầm non đung đưa
    const sw = ln(t, D, 1, S + s.i) * 2, h = 6 + 5 * rand(S, s.i, 12);
    for (const [dx, k, c] of [[-2, 0.7, C[4]], [0, 1, C[5]], [2, 0.8, C[4]]]) p.line(s.x + dx, s.y, s.x + dx * 1.6 + sw * k, s.y - h * k, c);
    p.px(s.x + sw, s.y - h, C[7]);
  }
  cycle(t, D, 18, S + 30, (g) => 0.8 + 0.5 * g.next(), (age, L, r) => {   // đốm sinh khí bay lên; vài đốm là dấu cộng hồi phục
    const u = age / L, a = r.range(0, TAU), d = Math.sqrt(r.next()) * R * 0.92, x = Math.cos(a) * d + Math.sin(age * 4 + r.range(0, 6)) * 2.5, y = Math.sin(a) * d * SY - 3 - 34 * u, al = Math.min(1, u * 6) * Math.min(1, (1 - u) * 3);
    if (r.chance(0.3)) { p.dot(x, y, WHITE, al); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], al); p.light(x, y, C[6], 0.6 * al); }
    else { p.dot(x, y, u < 0.5 ? C[7] : C[6], al); p.light(x, y, C[5], 0.4 * al); }
  });
  cycle(t, D, 8, S + 50, () => D, (age, L, r) => {   // lá xoay vòng quanh vùng
    const u = age / L, a = r.range(0, TAU) + u * 2.4, d = R * r.range(0.35, 0.85), x = Math.cos(a) * d, y = Math.sin(a) * d * SY - 10 - 12 * Math.sin(Math.PI * u), ca = Math.cos(a * 3 + u * 9), sa = Math.sin(a * 3 + u * 9), al = Math.sin(Math.PI * u) * 1.4;
    p.line(x - ca * 2, y - sa * 2, x + ca * 2, y + sa * 2, C[5], al); p.dot(x + ca * 2, y + sa * 2, C[7], al);
  });
}
