import { fit, TAU, WHITE, hex, cycle, sparkle, crystal, FIRE_RAMP } from "../../core/index.js";
import { flameLoop, ln } from "./_td.js";

export const meta = {
  name: "Trạng thái trên quái (pháp bảo khảm hệ)",
  desc: "Dấu trạng thái vẽ đè lên con quái đang dính hệ, lặp liền mạch. kind: lua (ngọn lửa cháy trên người), bang (khối băng trong mờ bọc quanh, có vệt sáng lướt), lanh (bông tuyết và hạt sương rơi quanh: đang bị làm chậm), re (dây leo quấn chân có lá), pha (khiên vỡ nhấp nháy trên đầu: phá giáp).",
  tags: ["p2d", "status", "loop"],
  size: [56, 56],
  origin: [28, 44],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"], kind: "lua", seed: 3 },
};
const D = meta.duration;
const LEAF = ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070"].map(hex), GOLD = ["#3a2206", "#8a5a0c", "#d09a1c", "#ffd24a", "#fff0a8"].map(hex);

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, ph = (t / D) % 1, K = o.kind;
  if (K === "lua") {   // hai ngọn lửa cao thấp cháy trên người
    flameLoop(p, -3, 0, 13, t, D, S, FIRE_RAMP, cycle); flameLoop(p, 3, 1, 17, t, D, S + 7, FIRE_RAMP, cycle);
    return;
  }
  if (K === "bang") {   // khối băng: ba tinh thể chụm lại, trong mờ để vẫn thấy quái, vệt sáng lướt từ dưới lên
    const g = ph * 1.4 - 0.2;
    crystal(p, -8, 2, 20, 12, -3, C, { a: 0.62, glint: g }); crystal(p, 9, 2, 22, 13, 3, C, { a: 0.62, glint: g - 0.15 });
    crystal(p, 0, 3, 32, 17, 0, C, { a: 0.7, glint: g + 0.1 });
    for (const [x, y] of [[-11, -2], [12, -6], [-4, -22], [5, -14]]) { const k = 0.5 + 0.5 * Math.sin(ph * TAU + x); if (k > 0.55) sparkle(p, x, y, 1 + 1.6 * k, WHITE, C[6], 0.3 * k); }
    p.glow(0, -12, 26, C[4], 0.3); p.glow(0, 0, 14, C[6], 0.2);
    return;
  }
  if (K === "lanh") {   // bông tuyết, hạt sương rơi chậm quanh người
    cycle(t, D, 9, S, (g) => 0.5 + 0.3 * g.next(), (age, L, r) => {
      const u = age / L, x = r.range(-13, 13) + Math.sin(u * 4 + r.range(0, 6)) * 2, y = -30 + u * 30 + r.range(-4, 4), big = r.chance(0.4), k = Math.sin(Math.PI * u);
      if (k < 0.2) return;
      p.px(x, y, WHITE);
      if (big) { p.px(x - 1, y, C[6]); p.px(x + 1, y, C[6]); p.px(x, y - 1, C[6]); p.px(x, y + 1, C[6]); }
      p.light(x, y, C[5], 0.5 * k);
    });
    p.glow(0, -12, 20, C[4], 0.16 + 0.04 * ln(t, D, 1, S));
    return;
  }
  if (K === "re") {   // dây leo quấn chân: bốn sợi mọc từ đất cuộn vào trong, đầu sợi có lá, đung đưa nhẹ
    for (let i = 0; i < 4; i++) {
      const sd = i % 2 ? 1 : -1, x0 = sd * (5 + (i >> 1) * 6), sway = Math.sin(ph * TAU + i * 1.7) * 0.8, hgt = 9 + (i >> 1) * 4;
      let x = x0, y = 2;
      for (let j = 0; j < hgt; j++) {
        const u = j / hgt, nx = x0 - sd * Math.sin(u * 2.6) * (5 + sway) + sway * u, ny = 2 - j;
        p.line(x, y, nx, ny, u > 0.7 ? LEAF[5] : LEAF[3]); p.px(nx + sd, ny, LEAF[1]);
        if (j % 4 === 2) { p.px(nx - sd * 2, ny - 1, LEAF[5]); p.px(nx - sd * 3, ny - 1, LEAF[4]); p.px(nx - sd * 2, ny, LEAF[2]); }   // lá
        x = nx; y = ny;
      }
      p.px(x, y - 1, LEAF[6]); p.px(x - sd, y - 1, LEAF[5]);
    }
    p.line(-12, 3, 12, 3, LEAF[1]); p.line(-9, 2, 9, 2, LEAF[3]);
    p.glow(0, -2, 16, LEAF[4], 0.2);
    return;
  }
  // pha: tấm khiên nhỏ nứt đôi, nhấp nháy (vẽ quanh gốc, game đặt trên đầu quái)
  const blink = 0.55 + 0.45 * Math.sin(ph * TAU * 2), y = -6;
  p.poly([[-5.5, y - 6], [5.5, y - 6], [5.5, y], [0, y + 6.5], [-5.5, y]], GOLD[0]);
  p.poly([[-4.5, y - 5], [4.5, y - 5], [4.5, y - 0.4], [0, y + 5.2], [-4.5, y - 0.4]], blink > 0.6 ? GOLD[3] : GOLD[2]);
  p.line(-4, y - 5, 3, y - 5, GOLD[4]); p.line(-4, y - 4, -4, y - 1, GOLD[4]);
  for (const [x0, y0, x1, y1] of [[1, y - 6, -1, y - 3], [-1, y - 3, 2, y - 1], [2, y - 1, 0, y + 2], [0, y + 2, 1, y + 5]]) p.line(x0, y0, x1, y1, GOLD[0]);   // vết nứt
  if (blink > 0.75) { p.px(-6, y - 8, WHITE); p.px(6, y - 7, WHITE); p.px(0, y + 8, GOLD[4]); }
  p.glow(0, y, 10, GOLD[3], 0.3 * blink);
}
