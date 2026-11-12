import { fit, TAU, WHITE, hex, cycle } from "../../core/index.js";

export const meta = {
  name: "Trận kỳ (cờ trận cắm đất)",
  desc: "Lá cờ trận cắm xuống đất, lặp liền mạch: cán gỗ sẫm có mũi giáo vàng, lá cờ đuôi én màu vàng viền đỏ có ấn đỏ giữa lá, phấp phới theo gió (nếp vải sáng tối chạy dọc lá), tua đỏ dưới mũi giáo; gốc cán có quầng linh quang nhịp thở và hạt sáng bốc lên.",
  tags: ["p2d", "object", "loop"],
  size: [72, 84],
  origin: [26, 74],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], seed: 7 },
};
const D = meta.duration;
const WOOD = ["#1c0e06", "#3e2410", "#6a421e", "#96683a"].map(hex), GOLD = ["#3a2206", "#8a5a0c", "#d09a1c", "#ffd24a", "#fff0a8"].map(hex), RED = ["#4a0a10", "#a01c1c", "#e8442c"].map(hex);
const POLE = 44, LEN = 24, HGT = 17;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, ph = (t / D) % 1;
  // quầng linh quang ở gốc, hạt sáng bốc lên
  p.glow(0, -2, 22, C[4], 0.3 + 0.1 * Math.sin(ph * TAU)); p.glow(0, -2, 9, C[6], 0.3);
  p.ellipse(0, 0, 6, 2.5, WOOD[0]); p.ellipse(0, -1, 4, 1.5, WOOD[2]);
  cycle(t, D, 6, S, (g) => 0.4 + 0.3 * g.next(), (age, L, r) => { const u = age / L, x = r.range(-9, 9) * (1 - u * 0.4), y = -2 - u * r.range(14, 30); p.px(x, y, u < 0.5 ? WHITE : C[5]); if (u < 0.6) p.px(x, y + 1, C[4]); p.light(x, y, C[5], 0.6 * (1 - u)); });
  // cán cờ
  p.rect(-2, -POLE, 4, POLE, WOOD[0]); p.rect(-1, -POLE, 2, POLE - 1, WOOD[2]); p.line(-1, -POLE, -1, -2, WOOD[3]);
  for (const y of [-POLE + 21, -POLE + 32]) { p.rect(-2, y, 4, 2, GOLD[1]); p.px(-1, y, GOLD[3]); }
  // mũi giáo vàng và tua đỏ
  p.poly([[0, -POLE - 9], [3, -POLE - 2], [0, -POLE + 1], [-3, -POLE - 2]], GOLD[0]); p.poly([[0, -POLE - 8], [2, -POLE - 2], [0, -POLE], [-2, -POLE - 2]], GOLD[3]); p.line(0, -POLE - 8, 0, -POLE - 1, GOLD[4]); p.px(-1, -POLE - 3, WHITE);
  p.rect(-3, -POLE + 1, 6, 2, GOLD[2]); p.line(-3, -POLE + 1, 2, -POLE + 1, GOLD[4]);
  { const sw = Math.sin(ph * TAU + 1) * 1.5; p.line(-2, -POLE + 3, -4 + sw, -POLE + 10, RED[1]); p.line(-3, -POLE + 3, -5 + sw, -POLE + 9, RED[2]); p.px(-4 + sw, -POLE + 11, RED[2]); }
  // lá cờ đuôi én phấp phới: từng cột lệch theo sóng, nếp sáng tối theo độ dốc của sóng
  const y0 = -POLE + 4;
  for (let i = 0; i < LEN; i++) {
    const a = i * 0.42 - ph * TAU, amp = 0.6 + i * 0.11, dy = Math.sin(a) * amp, slope = Math.cos(a), top = y0 + dy + i * 0.12, hh = HGT - i * 0.22;
    const notch = i > LEN - 8 ? (i - (LEN - 8)) * 1.15 : 0, x = 2 + i;
    for (let r = 0; r < hh; r++) {
      const mid = Math.abs(r - hh / 2);
      if (mid < notch) continue;   // khe đuôi én
      const edge = r < 1 || r > hh - 2 || i === LEN - 1 || (notch && mid < notch + 1.2), inner = r < 2.5 || r > hh - 3.5;
      let c;
      if (edge) c = RED[0];
      else if (inner) c = slope > 0.3 ? RED[2] : RED[1];
      else c = slope > 0.55 ? GOLD[4] : slope > 0 ? GOLD[3] : slope > -0.55 ? GOLD[2] : GOLD[1];
      const ex = i - 9, ey = r - hh / 2, d = Math.hypot(ex, ey * 1.1);   // ấn đỏ giữa lá: vòng tròn và chấm giữa
      if (!edge && !inner && ((d > 3.1 && d < 4.5) || d < 1.3)) c = slope > 0 ? RED[2] : RED[1];
      p.px(x, top + r, c);
    }
  }
  p.glow(13, y0 + HGT / 2, 16, C[4], 0.14);
}
