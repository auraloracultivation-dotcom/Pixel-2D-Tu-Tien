import { fit, clamp, TAU, WHITE, cycle, sparkle } from "../../core/index.js";

export const meta = {
  name: "Hồ lô hút (phễu linh khí xoáy vào miệng)",
  desc: "Phần hiệu ứng lúc Hồ Lô hít linh khí trong 1 giây, vẽ theo cỡ điểm của nhân vật. Gốc toạ độ = tâm miệng hồ lô, trục x = hướng miệng nhìn ra (game dựng sẵn theo góc miệng của hình hồ lô). Bốn dải linh khí xoáy trôn ốc từ ngoài chui vào miệng: nửa phía sau mờ, nửa phía trước sáng, càng gần miệng càng trắng và dày; hạt bụi sáng bị cuốn theo; miệng hồ lô rực dần, cuối cùng lóe trắng (hít đầy). Trái hồ lô là hình riêng (tranh gốc của chủ dự án, tools/art/pb_vat.py), hiệu ứng này vẽ đè lên miệng nó.",
  tags: ["p2d", "self", "one-shot", "directional"],
  size: [150, 130],
  origin: [30, 65],
  duration: 1.0,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], scale: 1, seed: 13 },
};
const LEN = 50, RAD = 32, ARMS = 3;

export function draw(p, t, o) {
  const C = fit(o.palette, 7), s = o.scale, u = clamp(t / 1.0), grow = Math.min(1, u * 4.5), flash = u > 0.92 ? (u - 0.92) / 0.08 : 0, power = 0.55 + 0.45 * u;
  p.glow(0, 0, 13 * s, C[4], 0.3 + 0.45 * u); p.glow(10 * s, 0, 30 * s, C[3], 0.16 * grow);
  const arm = (front) => {
    for (let k = 0; k < ARMS; k++) for (let v = 0.02; v < grow; v += 0.006) {
      const a = (k * TAU) / ARMS + 7.4 * v - t * (9 + 5 * u), fr = Math.sin(a) > 0;
      if (fr !== front) continue;
      const x = (1 + LEN * v) * s, y = (1.5 + RAD * Math.pow(v, 0.8)) * s * Math.cos(a), al = (0.4 + 0.6 * (1 - v)) * power * (fr ? 1 : 0.6) * (v > grow - 0.15 ? (grow - v) / 0.15 : 1), w = fr ? (v < 0.35 ? 2 : 1) : 1;
      for (let j = -w; j <= w; j++) for (let i = 0; i <= (fr ? 1 : 0); i++) {
        const core = Math.abs(j) < w || w === 1 && j === 0;
        p.dot(x + i, y + j, fr ? (core ? (v < 0.4 ? WHITE : C[5]) : v < 0.5 ? C[5] : C[4]) : (core ? C[4] : C[3]), al * (core ? 1 : 0.7));
      }
      if (fr && v < 0.6) p.light(x, y, C[4], 0.5 * al);
    }
  };
  arm(false);
  // hạt bụi sáng bị cuốn vào: bay theo đường xoáy, nhanh dần
  cycle(t, 1.0, 14, o.seed, (g) => 0.22 + 0.2 * g.next(), (age, L, r) => {
    const k = age / L, v = (1 - k) * r.range(0.5, 1), a = r.range(0, TAU) + 7.4 * v - t * 9, x = (1 + LEN * v) * s, y = (1.5 + RAD * Math.pow(v, 0.8)) * s * Math.cos(a);
    if (v > grow) return;
    p.px(x, y, k > 0.6 ? WHITE : C[5]); if (r.chance(0.4)) p.px(x + 1, y, C[4]);
    p.light(x, y, C[5], 0.6);
  });
  arm(true);
  // vành sáng quanh miệng (miệng nhìn nghiêng: elip dẹt theo trục x), lóe trắng lúc hít đầy
  for (let a = 0; a < TAU; a += 0.16) { const k = 0.5 + 0.5 * Math.sin(a * 3 - t * 20); if (k > 0.45) p.dot(Math.cos(a) * 3.2 * s, Math.sin(a) * 9.5 * s, k > 0.8 ? WHITE : C[5], (0.4 + 0.6 * u) * k); }
  if (u > 0.3) sparkle(p, 0, 0, (1.5 + 3.5 * u + 4 * flash) * s, WHITE, C[5], 0.35 + 0.4 * u);
  if (flash > 0) { p.glow(0, 0, 34 * s, WHITE, 0.75 * flash); p.glow(0, 0, 16 * s, C[5], 0.6 * flash); }
}
