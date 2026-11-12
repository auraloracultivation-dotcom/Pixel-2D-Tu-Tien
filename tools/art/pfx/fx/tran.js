import { fit, clamp, ease, TAU, WHITE } from "../../core/index.js";
import { runeCircle, gp, SY } from "./_td.js";

export const meta = {
  name: "Pháp trận",
  desc: "Pháp trận ngũ hành trải trên mặt đất dưới chân: bật ra với một nhịp nảy, vành và chữ phù xoay ngược chiều nhau, sáng lên rồi tan qua lưới chấm.",
  tags: ["p2d", "ground", "circle"],
  size: [140, 124],
  origin: [70, 62],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], radius: 32, motif: "kim", mode: "cast", seed: 2 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R0 = o.radius;
  if (o.mode === "loop") {   // vùng kéo dài: xoay đều, nhịp thở sáng; mỗi vòng lặp xoay đúng một bước vạch khắc
    const ticks = Math.max(8, Math.round(R0 / 3.2)), ph = t / meta.duration;
    runeCircle(p, R0, (ph * TAU) / ticks * 2, C, 0.8 + 0.15 * Math.sin(ph * TAU), o.motif, o.seed);
    return;
  }
  const grow = ease.outBack(clamp(t / 0.14), 2.2), fade = 1 - clamp((t - 0.55) / 0.35), R = R0 * (0.35 + 0.65 * grow) * (1 + 0.06 * clamp((t - 0.55) / 0.35));
  runeCircle(p, R, t * 1.4, t < 0.07 ? C.map(() => WHITE) : C, fade * (t < 0.2 ? 1.2 : 0.95), o.motif, o.seed);
  if (t < 0.3) {   // lóe: vành sáng nở ra ngoài pháp trận
    const u = t / 0.3, r = R0 * (0.5 + 0.75 * ease.outCubic(u));
    for (let a = 0; a < TAU; a += 1 / r) { const [x, y] = gp(a, r); p.dot(x, y, u < 0.4 ? WHITE : C[6], 1.1 - u); }
    p.glow(0, 0, R0 * 1.1, C[5], 0.3 * (1 - u));
  }
  p.glow(0, 0, R0 * 0.9, C[4], 0.16 * fade);
}
