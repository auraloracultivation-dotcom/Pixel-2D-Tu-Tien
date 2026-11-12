import { fit, TAU, WHITE, hex, cycle, sparkle } from "../../core/index.js";

export const meta = {
  name: "Đại ấn (khối ấn ngọc)",
  desc: "Khối ấn ngọc lớn nhìn chính diện, lặp liền mạch (game tự cho bay lơ lửng rồi giáng xuống): thân ngọc bích vuông có nẹp vàng trên dưới, bốn góc đinh vàng, mặt trước khắc triện đỏ viền vàng, mặt trên vát sáng, núm ấn hình thú nằm bằng vàng; một vệt sáng chạy chéo qua mặt ngọc, đáy ấn rực linh quang, sao vàng lấp lánh.",
  tags: ["p2d", "object", "loop"],
  size: [84, 96],
  origin: [42, 80],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], seed: 12 },
};
const D = meta.duration;
const J = ["#04201c", "#0a4038", "#12705c", "#22a884", "#5fe0bc", "#b4ffe8"].map(hex);    // ngọc bích
const G = ["#2a1806", "#6a400a", "#b07a10", "#e8b020", "#ffe066", "#fff6c4"].map(hex);    // vàng
const RED = ["#5a0c10", "#b01c1c", "#ff5a3c"].map(hex);
const BW = 21, BH = 30, TOPH = 7;   // nửa bề ngang thân, cao thân, cao mặt vát

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, ph = (t / D) % 1, sweep = -BW - 10 + ph * (BW * 2 + 40);
  // linh quang dưới đáy ấn
  p.glowLine(-BW + 2, 2, BW - 2, 2, 9, C[5], 0.5); p.glowLine(-BW + 6, 3, BW - 6, 3, 5, WHITE, 0.3);
  for (let x = -BW + 1; x < BW; x += 3) p.line(x, 1, x, 3 + ((x * 7) & 3), C[5], 0.8);
  // thân ngọc (mặt trước)
  p.rect(-BW - 1, -BH - 1, BW * 2 + 2, BH + 2, J[0]);
  p.shade(-BW, -BH, BW, 0, (x, y, out) => {
    const u = (x + BW) / (BW * 2), v = (y + BH) / BH;
    let i = 2 + (u < 0.16 ? 2 : u < 0.4 ? 1 : u > 0.86 ? -1 : 0) + (v < 0.12 ? 1 : v > 0.9 ? -1 : 0);
    const d = x + y * 0.6 - sweep;
    if (d > 0 && d < 3.5) i = 5; else if (d >= 3.5 && d < 6) i = Math.min(5, i + 1);   // vệt sáng chạy chéo
    out.c = J[Math.max(1, Math.min(5, i))];
  });
  // nẹp vàng trên, dưới và đinh góc
  for (const [y0, hgt] of [[-BH, 3], [-4, 4]]) { p.rect(-BW, y0, BW * 2, hgt, G[2]); p.line(-BW, y0, BW - 1, y0, G[4]); p.line(-BW, y0 + hgt - 1, BW - 1, y0 + hgt - 1, G[1]); }
  for (const sx of [-1, 1]) for (const y of [-BH + 1, -2]) { p.px(sx * (BW - 2), y, G[5]); p.px(sx * (BW - 3), y, G[3]); }
  // triện đỏ viền vàng ở mặt trước
  const gx = 9, gy0 = -BH + 6, gy1 = -7;
  p.rect(-gx - 1, gy0 - 1, gx * 2 + 2, gy1 - gy0 + 2, G[3]); p.rect(-gx, gy0, gx * 2, gy1 - gy0, RED[0]);
  for (const [x0, y0, x1, y1] of [[-6, gy0 + 2, 6, gy0 + 2], [-6, gy0 + 2, -6, gy1 - 3], [6, gy0 + 2, 6, gy0 + 7], [-6, gy0 + 7, 6, gy0 + 7], [0, gy0 + 7, 0, gy1 - 3], [-3, gy1 - 3, 6, gy1 - 3], [3, gy0 + 10, 3, gy1 - 6]]) p.line(x0, y0, x1, y1, RED[2]);
  p.px(-6, gy0 + 2, G[5]); p.px(6, gy1 - 3, G[5]);
  // mặt trên vát
  p.poly([[-BW, -BH], [-BW + 4, -BH - TOPH], [BW - 4, -BH - TOPH], [BW, -BH]], J[0]);
  p.poly([[-BW + 1, -BH - 1], [-BW + 4.6, -BH - TOPH + 1], [BW - 4.6, -BH - TOPH + 1], [BW - 1, -BH - 1]], J[4]);
  p.line(-BW + 5, -BH - TOPH + 1, BW - 5, -BH - TOPH + 1, J[5]); p.line(-BW + 3, -BH - 2, BW - 3, -BH - 2, J[3]);
  // núm ấn: thú vàng nằm (thân bầu, đầu ngẩng bên phải, đuôi cuộn bên trái)
  const ky = -BH - TOPH;
  p.ellipse(0, ky - 4, 10, 5.5, G[0]); p.ellipse(0, ky - 4, 9, 4.5, G[2]); p.ellipse(-1, ky - 5, 7, 3, G[3]);
  p.circle(8, ky - 8, 4, G[0]); p.circle(8, ky - 8, 3, G[3]); p.px(9, ky - 9, WHITE); p.px(10, ky - 7, G[0]); p.px(6, ky - 10, G[5]); p.px(11, ky - 11, G[4]); p.px(6, ky - 12, G[4]);
  p.line(-9, ky - 5, -12, ky - 9, G[3]); p.px(-12, ky - 10, G[5]); p.px(-11, ky - 10, G[4]);
  p.line(-6, ky - 7, 4, ky - 7, G[5]); p.line(-7, ky - 1, 7, ky - 1, G[1]);
  for (const x of [-6, 5]) { p.px(x, ky, G[1]); p.px(x + 1, ky, G[3]); }
  // sao vàng lấp lánh quanh ấn
  cycle(t, D, 5, S, (g) => 0.25 + 0.2 * g.next(), (age, L, r) => { const k = Math.sin(Math.PI * (age / L)); sparkle(p, r.sign() * r.range(BW - 2, BW + 8), r.range(-BH - 14, -2), 1 + 2.4 * k, WHITE, G[4], 0.4 * k); });
  p.glow(0, -BH * 0.5, 40, C[4], 0.26 + 0.05 * Math.sin(ph * TAU));
  p.glow(0, -BH * 0.5, 20, J[4], 0.18);
}
