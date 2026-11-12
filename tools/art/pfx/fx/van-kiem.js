import { fit, clamp, TAU, WHITE, cycle, hex } from "../../core/index.js";
import { ln } from "./_td.js";

export const meta = {
  name: "Vạn kiếm (linh kiếm lớn)",
  desc: "Một thanh linh kiếm lớn, mũi hướng sang phải: lưỡi có sống trắng, mép sáng mép tối, viền mực, ánh chạy dọc lưỡi; chắn tay vàng ba kiểu, chuôi quấn, tua. Phần 'khi': kiếm khí xoắn quanh lưỡi. Phần 'dam': lửa linh khí kéo dài phía sau khi kiếm lao đi.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [176, 60],
  origin: [88, 30],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], part: "kiem", guard: 0, length: 56, seed: 2 },
};
const D = meta.duration, GOLD = ["#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4"].map(hex);

export function draw(p, t, o) {
  const C = fit(o.palette, 7), L = o.length, tip = L / 2, grd = tip - L * 0.72, INK = C[0], ph = (t / D) % 1;
  const hw = (x) => (x > tip - 8 ? 2.6 * Math.pow((tip - x) / 8, 0.8) : 2.6);   // nửa bề rộng lưỡi tại x
  if (o.part === "khi") {   // kiếm khí: hai dải xoắn quanh lưỡi chạy về mũi, phần ở mặt trước sáng, mặt sau mờ; hạt sáng trôi theo
    for (const off of [0, Math.PI]) for (let x = grd - 2; x <= tip + 6; x += 0.5) {
      const u = (x - grd) / (tip - grd), a = u * 9 - ph * TAU + off, y = Math.sin(a) * (4.2 + 1.6 * Math.sin(u * 3.1)), front = Math.cos(a) > 0;
      p.dot(x, y, front ? (Math.cos(a) > 0.7 ? WHITE : C[5]) : C[3], front ? 1.1 : 0.5);
      if (front && Math.cos(a) > 0.5) p.dot(x, y + (y > 0 ? -1 : 1), C[4], 0.7);
    }
    cycle(t, D, 10, o.seed, (g) => 0.14 + 0.14 * g.next(), (age, life, r) => { const k = 1 - age / life, x = grd + r.range(0, L * 0.7) + 60 * age, y = r.range(-6, 6) * k; p.px(x, y, k > 0.5 ? WHITE : C[5]); p.light(x, y, C[4], 0.6 * k); });
    p.glowLine(grd, 0, tip + 4, 0, 11, C[4], 0.42 + 0.08 * ln(t, D, 2, 3)); p.glow(tip, 0, 9, WHITE, 0.35);
    return;
  }
  if (o.part === "dam") {   // lửa linh khí sau kiếm: lưỡi lửa ba lớp thon dần về sau, mép rung, tia sáng tách ra
    const LEN = 92, x0 = tip - 6;
    p.shade(x0 - LEN - 2, -13, x0 + 2, 13, (x, y, out) => {
      const u = (x0 - x) / LEN; if (u < 0 || u > 1) return;
      const w = 9.5 * Math.pow(1 - u, 0.75) * (0.82 + 0.18 * Math.sin(u * 14 - ph * TAU * 2 + (y > 0 ? 1.7 : 0))) + 0.6, d = Math.abs(y) / w;
      if (d > 1) return;
      out.c = d < 0.28 ? WHITE : d < 0.55 ? C[5] : d < 0.82 ? C[4] : C[3]; out.a = u > 0.6 ? (1 - u) / 0.4 + 0.15 : 1;
    });
    cycle(t, D, 12, o.seed + 5, (g) => 0.12 + 0.12 * g.next(), (age, life, r) => { const k = 1 - age / life, x = x0 - r.range(6, LEN * 0.8) - 90 * age, y = r.range(-9, 9) * (1 + age * 3); p.line(x, y, x + 3 * k, y, k > 0.5 ? WHITE : C[5]); p.light(x, y, C[4], 0.5 * k); });
    p.glowLine(x0 - LEN * 0.8, 0, x0, 0, 15, C[3], 0.4); p.glowLine(x0 - 30, 0, x0, 0, 8, WHITE, 0.3);
    return;
  }
  // ---- thanh kiếm
  for (let x = grd + 1; x <= tip; x++) {   // lưỡi: viền mực, mép trên sáng, sống trắng, mép dưới tối hơn
    const w = hw(x), h = Math.round(w);
    p.px(x, -h - 1, INK); p.px(x, h + 1, INK);
    for (let y = -h; y <= h; y++) p.px(x, y, y === 0 ? WHITE : y < 0 ? (y === -h ? C[5] : C[6] ?? WHITE) : y === h ? C[3] : C[4]);
  }
  p.px(tip + 1, 0, INK);
  for (let x = grd + 3; x < tip - 9; x += 7) p.px(x, 1, C[5]);   // hoa văn nhỏ dọc lưỡi
  const g = grd + 4 + ph * (L * 0.72 - 6);   // ánh chạy dọc lưỡi
  for (let d = -2; d <= 2; d++) { p.px(g + d, -Math.abs(d) + 1 - 1, WHITE); }
  // chắn tay
  const gx = grd;
  if (o.guard === 1) { for (let y = -7; y <= 7; y++) { const bx = gx + Math.round((Math.abs(y) / 7) ** 2 * 3); p.px(bx - 1, y, GOLD[1]); p.px(bx, y, Math.abs(y) < 2 ? GOLD[5] : GOLD[3]); p.px(bx + 1, y, GOLD[4]); } }   // khuyết trăng ôm lưỡi
  else if (o.guard === 2) { for (let y = -8; y <= 8; y++) { const bx = gx - Math.round((Math.abs(y) / 8) * 3); p.px(bx - 1, y, GOLD[1]); p.px(bx, y, GOLD[3]); p.px(bx + 1, y, Math.abs(y) < 3 ? GOLD[5] : GOLD[4]); } p.px(gx - 4, -8, GOLD[5]); p.px(gx - 4, 8, GOLD[5]); }   // cánh xoè về chuôi
  else { p.rect(gx - 1, -6, 3, 13, GOLD[1]); p.rect(gx, -5, 2, 11, GOLD[3]); p.line(gx + 1, -5, gx + 1, 5, GOLD[4]); p.px(gx, -6, GOLD[5]); p.px(gx, 6, GOLD[5]); }   // thẳng
  p.px(gx + 1, 0, C[5]); p.px(gx, 0, WHITE);   // ngọc giữa chắn tay
  // chuôi quấn, đốc, tua
  const hx0 = grd - L * 0.2, hx1 = grd - 2;
  for (let x = hx0; x <= hx1; x++) { const k = Math.round(x) % 3 === 0; p.px(x, -2, INK); p.px(x, 2, INK); p.px(x, -1, k ? C[2] : C[1]); p.px(x, 0, k ? C[3] : C[2]); p.px(x, 1, C[1]); }
  p.circle(hx0 - 2, 0, 2.4, GOLD[1]); p.circle(hx0 - 2, 0, 1.6, GOLD[3]); p.px(hx0 - 3, -1, GOLD[5]);
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([hx0 - 4 - u * 9, s * (1 + u * 2.4) + Math.sin(u * 4 - ph * TAU + s) * 1.3 * u]); } p.polyline(pts, s > 0 ? C[4] : C[5]); }
  p.glowLine(grd, 0, tip, 0, 8, C[3], 0.3); p.glow(tip - 1, 0, 6, WHITE, 0.22);
}
