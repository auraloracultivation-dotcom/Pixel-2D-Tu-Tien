import { fit, clamp, rand, TAU, WHITE, cycle, hex, mix } from "../../core/index.js";
import { SY, gp, runeCircle, wob } from "./_td.js";

export const meta = {
  name: "Lưu sa (cát lún)",
  desc: "Hố cát lún nhìn từ trên xuống, lặp liền mạch: cát chảy xoáy ốc vào tâm thành từng dải sáng tối, giữa hố sẫm lại, sỏi đá trôi vòng bị hút vào, bụi cát bốc lên ở mép.",
  tags: ["p2d", "zone", "earth", "loop"],
  size: [204, 184],
  origin: [102, 98],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2", "#fff4d8"], reach: 88, arms: 5, seed: 35 },
};
const D = meta.duration;

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, N = o.arms, ph = (t / D) * TAU;
  // cát xoáy: dải theo góc + k·ln(bán kính), quay đúng một dải mỗi vòng lặp
  p.each(-R * 1.1, -R * SY * 1.1, R * 1.1, R * SY * 1.1, (x, y, sx, sy) => {
    const yy = y / SY, a = Math.atan2(yy, x), d = Math.hypot(x, yy) / (R * wob(a, S));
    if (d > 1) return;
    const sp = ((a * N + Math.log(d + 0.04) * 5.2 + ph) / TAU) % 1, band = (sp + 1) % 1, grain = rand(Math.floor(x), Math.floor(y), 3);
    let c = band < 0.18 ? C[6] : band < 0.5 ? C[5] : band < 0.8 ? C[4] : C[3];
    if (d < 0.3) c = band < 0.5 ? C[3] : C[2];
    if (d < 0.13) c = C[1];
    if (d > 0.93) return p.blendPx(sx, sy, C[5], 0.5);
    if (grain < 0.03) c = C[7];
    p.blendPx(sx, sy, c, d < 0.3 ? 0.85 : 0.5 + 0.3 * (1 - d));
  });
  runeCircle(p, R * 0.62, -ph / 14 * 2, C, 0.5, "tho", 9);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, INK = C[0], DUST = mix(C[5], hex("#9a9088"), 0.4);
  cycle(t, D, 10, S + 20, () => D, (age, L, r) => {   // sỏi đá trôi theo dòng xoáy, bị hút dần vào tâm rồi chìm
    const u = age / L, a = r.range(0, TAU) + u * 3.4, d = R * (0.86 - 0.7 * u), x = Math.cos(a) * d, y = Math.sin(a) * d * SY, s = r.chance(0.4) ? 2 : 1, al = Math.min(1, u * 6) * Math.min(1, (1 - u) * 3);
    if (al < 0.5 && Math.floor(age * 30) % 2) return;
    p.rect(x - 1, y - 1, s + 2, s + 2, INK); p.rect(x, y, s, s, r.chance(0.5) ? C[5] : C[4]); p.px(x, y, C[6]);
  });
  cycle(t, D, 12, S + 40, (g) => 0.6 + 0.4 * g.next(), (age, L, r) => {   // bụi cát ở mép
    const u = age / L, a = r.range(0, TAU), [x, y] = gp(a, R * r.range(0.82, 1)); p.disc(x + Math.cos(a) * 6 * u, y - 10 * u, 2.5 + 3.5 * u, DUST, 0.34 * (1 - u));
  });
  cycle(t, D, 14, S + 60, (g) => 0.3 + 0.3 * g.next(), (age, L, r) => {   // hạt cát nảy
    const u = age / L, a = r.range(0, TAU), d = R * r.range(0.3, 0.95), x = Math.cos(a) * d, y = Math.sin(a) * d * SY - 14 * Math.sin(Math.PI * u);
    p.px(x, y, u < 0.5 ? C[7] : C[6]);
  });
  p.glow(0, 0, R * 0.5, C[4], 0.1);
}
