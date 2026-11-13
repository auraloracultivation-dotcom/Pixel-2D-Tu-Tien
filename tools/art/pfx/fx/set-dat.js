import { fit, clamp, smooth, ease, rand, TAU, WHITE, hex } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, runeCircle } from "./_td.js";

export const meta = {
  name: "Sét đánh: mặt đất",
  desc: "Phần mặt đất của chiêu sét giáng: pháp trận kim lóe lên đón sét, vành sáng nở tròn, tia điện bò ngoằn ngoèo trên đất từ chỗ sét đánh ra mép rồi tắt, giữa cháy sém.",
  tags: ["p2d", "ground", "lightning", "one-shot"],
  size: [160, 140],
  origin: [80, 70],
  duration: 1.0,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"], reach: 60, hit: 0.06, seed: 16 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 7), R = o.reach, H = o.hit, out = 1 - smooth(0.6, meta.duration - 0.02, t);
  // pháp trận đón sét: hiện ngay, sáng rực lúc sét chạm
  runeCircle(p, R * 0.62 * (0.6 + 0.4 * ease.outBack(clamp(t / 0.1), 2)), t * 0.8, t > H && t < H + 0.12 ? C.map(() => WHITE) : C, out * (t < H ? 0.8 : 1), "kim", 4);
  if (t < H) return;
  const u = (t - H) / 0.3;
  groundPatch(p, 15, (d) => [hex("#17100f"), out * 0.5 * (1 - d * 0.5)], 2, 0.5);
  if (u < 1) { const r = R * (0.15 + 0.9 * ease.outCubic(u)); for (let a = 0; a < TAU; a += 0.7 / r) { const [x, y] = gp(a, r); p.dot(x, y, u < 0.3 ? WHITE : C[5], 1.2 - u); if (u < 0.5) p.dot(x * 0.97, y * 0.97, C[4], 0.9 - u); } p.glowRing(0, 0, r, 9, C[4], 0.3 * (1 - u)); }
  // tia điện bò trên đất: ba đợt, mỗi đợt một bộ đường khác nhau (chớp tắt)
  const fl = Math.floor((t - H) / 0.06);
  if (fl < 6 && (fl % 2 === 0 || fl < 2)) groundVeins(p, R * 0.95, 8, 100 + fl * 7, clamp(0.45 + fl * 0.2), (v) => (v < 0.5 ? WHITE : C[5]), 1.1 - fl * 0.13, 0.08);
  p.glow(0, 0, R * 0.9, C[4], 0.3 * out * (1 - clamp((t - H) / 0.5)));
}
