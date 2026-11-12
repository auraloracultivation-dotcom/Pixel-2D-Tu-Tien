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
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], part: "kiem", guard: 0, length: 56, slim: 0, seed: 2 },   // slim: kiếm mảnh, ngắn (Phi Kiếm vẽ to gấp đôi)
};
const D = meta.duration, GOLD = ["#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4"].map(hex);

export function draw(p, t, o) {
  const C = fit(o.palette, 7), L = o.length, tip = L / 2, grd = tip - L * 0.72, INK = C[0], ph = (t / D) % 1;
  const BW = o.slim ? 1.7 : 2.6, TP = o.slim ? 6 : 8, G = o.slim ? 4 : 6;
  const hw = (x) => (x > tip - TP ? BW * Math.pow((tip - x) / TP, 0.8) : BW);   // nửa bề rộng lưỡi tại x
  if (o.part === "khi") {   // kiếm khí: hai dải xoắn quanh lưỡi chạy về mũi, phần ở mặt trước sáng, mặt sau mờ; hạt sáng trôi theo
    for (const off of [0, Math.PI]) for (let x = grd - 2; x <= tip + 6; x += 0.5) {
      const u = (x - grd) / (tip - grd), a = u * 9 - ph * TAU + off, y = Math.sin(a) * ((o.slim ? 3 : 4.2) + (o.slim ? 1.1 : 1.6) * Math.sin(u * 3.1)), front = Math.cos(a) > 0;
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
  // ---- thanh kiếm. Lưỡi, chắn tay, chuôi tô theo điểm màn hình (p.shade) chứ không chấm từng điểm: xoay góc nào nét cũng kín, không rỗ.
  const fl = Math.floor, bx0 = fl(grd + 1), fr = grd + 1 - bx0, bx1 = bx0 + fl(tip - grd - 1);
  p.shade(grd, -6, tip + 3, 7, (x, y) => {   // lưỡi: viền mực, mép trên sáng, sống trắng, mép dưới tối hơn
    const xi = fl(x), r = fl(y), a = Math.abs(r);
    if (xi < bx0 || xi > bx1 + 1) return 0;
    if (xi === bx1 + 1) return r === 0 ? INK : 0;
    const h = Math.round(hw(xi + fr));
    if (a > h + 1) return 0;
    if (a === h + 1) return INK;
    return r === 0 ? WHITE : r < 0 ? (r === -h ? C[5] : C[6] ?? WHITE) : r === h ? C[3] : C[4];
  });
  for (let x = grd + 3; x < tip - 9; x += 7) p.px(x, 1, C[5]);   // hoa văn nhỏ dọc lưỡi
  const g = grd + 4 + ph * (L * 0.72 - 6);   // ánh chạy dọc lưỡi
  for (let d = -2; d <= 2; d++) { p.px(g + d, -Math.abs(d) + 1 - 1, WHITE); }
  // chắn tay
  const gx = grd, gc = fl(gx);
  if (o.guard === 1) p.shade(gx - 3, -8, gx + 7, 9, (x, y) => { const r = fl(y), a = Math.abs(r); if (a > 7) return 0; const d = fl(x) - gc - Math.round((a / 7) ** 2 * 3); return d === -1 ? GOLD[1] : d === 0 ? (a < 2 ? GOLD[5] : GOLD[3]) : d === 1 ? GOLD[4] : 0; });   // khuyết trăng ôm lưỡi
  else if (o.guard === 2) { p.shade(gx - 6, -9, gx + 3, 10, (x, y) => { const r = fl(y), a = Math.abs(r); if (a > 8) return 0; const d = fl(x) - gc + Math.round((a / 8) * 3); return d === -1 ? GOLD[1] : d === 0 ? GOLD[3] : d === 1 ? (a < 3 ? GOLD[5] : GOLD[4]) : 0; }); p.px(gx - 4, -8, GOLD[5]); p.px(gx - 4, 8, GOLD[5]); }   // cánh xoè về chuôi
  else { p.rect(gx - 1, -G, 3, G * 2 + 1, GOLD[1]); p.rect(gx, -G + 1, 2, G * 2 - 1, GOLD[3]); p.line(gx + 1, -G + 1, gx + 1, G - 1, GOLD[4]); p.px(gx, -G, GOLD[5]); p.px(gx, G, GOLD[5]); }   // thẳng
  p.px(gx + 1, 0, C[5]); p.px(gx, 0, WHITE);   // ngọc giữa chắn tay
  // chuôi quấn, đốc, tua
  const hx0 = grd - L * 0.2, hx1 = grd - 2;
  const hc = fl(hx0), hf = hx0 - hc, hn = fl(hx1 - hx0);
  p.shade(hx0 - 1, -3, hx1 + 2, 4, (x, y) => { const j = fl(x) - hc, r = fl(y); if (j < 0 || j > hn || Math.abs(r) > 2) return 0; const k = Math.round(hc + j + hf) % 3 === 0; return Math.abs(r) === 2 ? INK : r === -1 ? (k ? C[2] : C[1]) : r === 0 ? (k ? C[3] : C[2]) : C[1]; });
  p.circle(hx0 - 2, 0, 2.4, GOLD[1]); p.circle(hx0 - 2, 0, 1.6, GOLD[3]); p.px(hx0 - 3, -1, GOLD[5]);
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([hx0 - 4 - u * 9, s * (1 + u * 2.4) + Math.sin(u * 4 - ph * TAU + s) * 1.3 * u]); } p.polyline(pts, s > 0 ? C[4] : C[5]); }
  p.glowLine(grd, 0, tip, 0, 8, C[3], 0.3); p.glow(tip - 1, 0, 6, WHITE, 0.22);
}
