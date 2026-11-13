import { fit, clamp, TAU, WHITE, cycle, sparkle, rand } from "../../core/index.js";
import { SY, gp, ln } from "./_td.js";

export const meta = {
  name: "Kim thân (hào quang tăng sức)",
  desc: "Hào quang vàng bọc người, lặp liền mạch: vòng kim quang xoay dưới chân, những lưỡi lửa linh khí vàng chạy dọc từ chân lên quanh thân, bốn mảnh kim cương xoay quanh ngang ngực, sao vàng lấp lánh; bản mạnh có thêm vầng hào quang tròn sau đầu.",
  tags: ["p2d", "self", "buff", "loop"],
  size: [84, 112],
  origin: [42, 92],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], power: 1, halo: false, seed: 15 },
};
const D = meta.duration;

// lớp đất: vòng kim quang xoay dưới chân (nét đứt)
export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), K = o.power, r = 17 * K, ph = t / D, N = 12;
  for (let i = 0; i < N; i++) {
    const a0 = ((i + ph) * TAU) / N;   // mỗi vòng lặp xoay đúng một đốt
    for (let a = a0; a < a0 + (TAU / N) * 0.62; a += 0.5 / r) { const [x, y] = gp(a, r); p.dot(x, y, (a - a0) < 0.12 ? WHITE : C[6], 1); const [x2, y2] = gp(a, r - 2); p.dot(x2, y2, C[4], 0.7); }
  }
  for (let a = 0; a < TAU; a += 0.6 / (r * 0.6)) { const [x, y] = gp(a, r * 0.6); p.dot(x, y, C[5], 0.55 + 0.3 * Math.sin(ph * TAU)); }
  p.glow(0, 0, r * 1.5, C[4], 0.34);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), K = o.power, S = o.seed, ph = t / D;
  if (o.halo) {   // vầng hào quang sau đầu: hai vành và tia ngắn
    const cy = -40, r = 13;
    for (let a = 0; a < TAU; a += 0.5 / r) { p.dot(Math.cos(a) * r, cy + Math.sin(a) * r, C[6], 0.9 + 0.2 * Math.sin(ph * TAU)); p.dot(Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), C[4], 0.5); }
    for (let i = 0; i < 12; i++) { const a = ((i + ph) * TAU) / 12, l = i % 2 ? 3 : 5; p.line(Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), Math.cos(a) * (r + 2 + l), cy + Math.sin(a) * (r + 2 + l), i % 2 ? C[5] : C[7]); }
    p.glow(0, cy, r * 2.2, C[5], 0.3);
  }
  // vệt linh khí chạy dọc thân: mỗi vệt là một lưỡi lửa mảnh uốn nhẹ, sinh ở chân, vút lên rồi nhạt
  cycle(t, D, Math.round(17 * K), S, (g) => 0.4 + 0.25 * g.next(), (age, L, r) => {
    const u = age / L, side = r.sign(), x0 = side * r.range(5, 14) * K, y = -1 - u * r.range(34, 52) * (0.8 + 0.2 * K), x = x0 * (1 - 0.35 * u) + Math.sin(u * 5 + r.range(0, 6)) * 1.6, len = (6 + 7 * r.next()) * (1 - u * 0.4), al = u > 0.72 ? (1 - u) * 3.6 : Math.min(1, u * 8);
    p.line(x, y + len, x - side * 0.6, y, (v) => (v > 0.75 ? WHITE : v > 0.4 ? C[6] : C[5]), al);   // lưỡi lửa đặc: đầu trắng, thân vàng
    p.line(x + side, y + len, x + side * 0.4, y + 2, (v) => (v > 0.5 ? C[5] : C[4]), al);             // dày 2 điểm ảnh, mép ngoài sẫm hơn
    p.light(x, y, C[5], 0.8 * al); p.light(x, y + len * 0.5, C[4], 0.5 * al);
  });
  // bốn mảnh kim cương xoay quanh thân ngang ngực (mỗi vòng lặp xoay đúng một phần tư vòng): mảnh ở mặt sau khuất sau người
  for (let i = 0; i < 4; i++) {
    const a = ((i + ph) * TAU) / 4, s = Math.sin(a), c = Math.cos(a);
    if (s < 0 && Math.abs(c) < 0.62) continue;
    const x = c * 17 * K, y = -22 + s * 5, kk = s < 0 ? 0.55 : 1, h = s < 0 ? 3 : 4.4, w = s < 0 ? 2 : 2.8;
    p.poly([[x, y - h], [x + w, y], [x, y + h], [x - w, y]], C[5], kk);
    p.line(x, y - h, x - w, y, C[7], kk); p.line(x, y - h, x, y + h, C[6], kk); p.line(x + w, y, x, y + h, C[3], kk);
    p.light(x, y, C[6], 0.9 * kk); p.glow(x, y, 8, C[5], 0.24 * kk);
  }
  cycle(t, D, Math.round(5 * K), S + 9, (g) => 0.3 + 0.2 * g.next(), (age, L, r) => {   // sao vàng
    const k = Math.sin(Math.PI * (age / L)), x = r.range(-16, 16) * K, y = r.range(-48, -4);
    sparkle(p, x, y, 1 + 2.4 * k, WHITE, C[6], 0.4 * k);
  });
  // viền sáng hai bên thân: hai cột sáng mềm
  p.glowLine(0, -4, 0, -44, 16 * K, C[4], 0.26 + 0.06 * Math.sin(ph * TAU));
  p.glowLine(0, -8, 0, -36, 7, C[6], 0.14);
}
