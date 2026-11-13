import { fit, WHITE, cycle } from "../../core/index.js";
import { windLines, ln } from "./_td.js";

export const meta = {
  name: "Phi kiếm",
  desc: "Một thanh kiếm nhỏ bay mũi về phía trước: thân trắng ánh kim, chuôi vàng, kiếm khí bọc quanh và vệt sáng kéo dài phía sau.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [72, 28],
  origin: [56, 14],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], length: 22, seed: 9 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), L = o.length, S = o.seed, tip = 8, hilt = tip - L, bob = 0.5 * ln(t, D, 1, S);
  // vệt kiếm khí phía sau: ba dải mảnh dài ngắn khác nhau, sáng ở sát chuôi
  for (const [dy, len, ci] of [[0, 30, 5], [-2, 18, 4], [2, 20, 4]]) {
    const l = len * (0.85 + 0.15 * ln(t, D, 2, S + dy + 3));
    p.line(hilt - 3 - l, bob + dy, hilt - 3, bob + dy, (u) => (u > 0.75 ? C[6] : C[ci]), (u) => u * 1.15);
  }
  windLines(p, t, D, 5, S + 20, hilt, hilt - 14, 5, 150, C, 0.16);
  // thân kiếm: sống trắng, hai mép vàng nhạt, mũi nhọn
  for (let x = hilt + 5; x <= tip; x++) {
    const u = (tip - x) / (L - 5), hw = u < 0.14 ? (u / 0.14) * 1.5 : 1.5;
    p.px(x, bob, WHITE);
    if (hw >= 0.75) { p.px(x, bob - 1, C[6]); p.px(x, bob + 1, C[5]); }
    if (hw >= 1.5 && u > 0.5) { p.dot(x, bob - 2, C[3], 0.9); p.dot(x, bob + 2, C[3], 0.9); }
  }
  // chắn tay, chuôi, tua
  p.line(hilt + 4, bob - 3, hilt + 4, bob + 3, C[4]); p.px(hilt + 4, bob - 3, C[6]); p.px(hilt + 5, bob, C[6]);
  p.line(hilt, bob, hilt + 3, bob, C[2]); p.px(hilt + 1, bob, C[3]); p.px(hilt - 1, bob, C[5]);
  // ánh chạy dọc lưỡi
  const g = hilt + 6 + ((t / D) % 1) * (L - 6);
  p.px(g, bob - 1, WHITE); p.px(g + 1, bob, WHITE); p.px(g - 1, bob + 1, WHITE);
  cycle(t, D, 6, S + 40, (r) => 0.12 + 0.1 * r.next(), (age, life, r) => {
    const k = 1 - age / life, x = tip - r.range(2, L) - 110 * age, y = bob + r.range(-3, 3) + r.range(-10, 10) * age;
    p.px(x, y, k > 0.5 ? WHITE : C[5]); p.light(x, y, C[4], 0.5 * k);
  });
  p.glowLine(hilt, bob, tip, bob, 7, C[5], 0.34);
  p.glow(tip - 2, bob, 6, WHITE, 0.3);
  p.glowLine(hilt - 26, bob, hilt, bob, 5, C[4], 0.16);
}
