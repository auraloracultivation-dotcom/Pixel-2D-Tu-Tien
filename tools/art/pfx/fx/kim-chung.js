import { fit, clamp, smooth, TAU, WHITE, cycle, sparkle } from "../../core/index.js";
import { SY, gp } from "./_td.js";

export const meta = {
  name: "Kim chung hộ thể (Bất Hoại Kim Thân)",
  desc: "Chuông vàng trong mờ úp quanh người, lặp liền mạch: thân chuông chỉ rõ ở viền (giữa trong để vẫn thấy nhân vật), ba đai chuông, hàng chữ phù chạy vòng quanh đai giữa, quai chuông trên đỉnh, vệt sáng lướt quanh thân; dưới đất là vành kim quang xoay và nửa sau của miệng chuông; sau đầu có vầng hào quang, sao vàng lấp lánh.",
  tags: ["p2d", "self", "buff", "loop"],
  size: [100, 132],
  origin: [50, 112],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], seed: 21 },
};
const D = meta.duration, YT = -64, YB = -1, W = 24, RIM = 0.26;   // đỉnh, miệng chuông (y), nửa bề ngang miệng, độ dẹt của vành nhìn chếch
// nửa bề ngang thân chuông theo u (0 đỉnh … 1 miệng): vòm tròn ở trên, thân xuôi dần, miệng loe
const half = (u) => W * ((u < 0.3 ? 0.64 * Math.sqrt(1 - (1 - u / 0.3) ** 2) : 0.64 + 0.22 * ((u - 0.3) / 0.7) ** 1.4) + 0.14 * smooth(0.84, 1, u));
const yOf = (u) => YT + (YB - YT) * u;

// lớp đất: vành kim quang xoay, quầng sáng, nửa SAU của miệng chuông (nằm dưới chân nên không che người)
export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, r = 27, N = 14;
  for (let i = 0; i < N; i++) {
    const a0 = ((i + ph) * TAU) / N;   // mỗi vòng lặp xoay đúng một đốt
    for (let a = a0; a < a0 + (TAU / N) * 0.6; a += 0.5 / r) { const [x, y] = gp(a, r); p.dot(x, y, a - a0 < 0.1 ? WHITE : C[6], 1); const [x2, y2] = gp(a, r - 2); p.dot(x2, y2, C[4], 0.75); }
  }
  for (let a = 0; a < TAU; a += 0.5 / 18) { const [x, y] = gp(a, 18); p.dot(x, y, C[5], 0.5 + 0.3 * Math.sin(ph * TAU)); }
  const hw = half(1);
  for (let a = Math.PI; a < TAU; a += 0.4 / hw) { const x = Math.cos(a) * hw, y = YB + Math.sin(a) * hw * RIM; p.dot(x, y, C[5], 1); p.dot(x, y + 1, C[3], 0.8); }
  p.glow(0, 0, r * 1.5, C[4], 0.32);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed, ph = t / D, pulse = 0.5 + 0.5 * Math.sin(ph * TAU);
  // vầng hào quang sau đầu
  { const cy = -42, r = 14;
    for (let a = 0; a < TAU; a += 0.5 / r) { p.dot(Math.cos(a) * r, cy + Math.sin(a) * r, C[6], 0.75 + 0.2 * pulse); p.dot(Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), C[4], 0.45); }
    for (let i = 0; i < 12; i++) { const a = ((i + ph) * TAU) / 12, l = i % 2 ? 3 : 5; p.line(Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), Math.cos(a) * (r + 2 + l), cy + Math.sin(a) * (r + 2 + l), i % 2 ? C[5] : C[7], 0.8); } }
  // thân chuông trong mờ: viền đặc, vào trong nhạt dần (giữa gần như trong suốt để thấy nhân vật)
  p.each(-W - 4, YT - 2, W + 4, YB + 2, (x, y, sx, sy) => {
    const u = (y - YT) / (YB - YT);
    if (u < 0 || u > 1) return;
    const hw = half(u), e = hw - Math.abs(x);
    if (e < 0) return;
    if (e < 1.1) { p.put(sx, sy, u < 0.1 || (x < 0 && u < 0.55) ? C[7] : C[6], 1); return; }   // viền: nửa trái phía trên bắt sáng
    if (e < 2.2) { p.blendPx(sx, sy, C[5], 0.8); return; }
    const f = 1 - Math.min(1, e / (hw * 0.85)), sweep = Math.max(0, Math.cos(Math.atan2(0.0001 + Math.sqrt(Math.max(0, hw * hw - x * x)), x) - ph * TAU));   // vệt sáng lướt quanh mặt trước
    p.blendPx(sx, sy, f > 0.55 ? C[5] : C[4], Math.min(0.85, 0.06 + 0.34 * f * f + 0.05 * pulse + 0.16 * sweep ** 6));
  });
  // ba đai chuông (nửa trước), đai miệng dày hơn
  for (const [u, c, th] of [[0.33, C[6], 1], [0.63, C[6], 1], [1, C[7], 2]]) {
    const hw = half(u), y0 = yOf(u);
    for (let a = 0; a <= Math.PI; a += 0.4 / hw) for (let w = 0; w < th; w++) p.dot(Math.cos(a) * hw, y0 + Math.sin(a) * hw * RIM - w, w ? C[5] : c, 1);
  }
  // hàng chữ phù chạy vòng quanh đai giữa: chỉ thấy khi ở mặt trước, sát mép thì hẹp lại
  const G = 9, ub = 0.48, hb = half(ub), yb = yOf(ub);
  for (let i = 0; i < G; i++) {
    const a = ((i + ph) * TAU) / G, s = Math.sin(a);
    if (s <= 0.12) continue;
    const x = Math.cos(a) * hb * 0.9, y = yb + s * hb * RIM, k = clamp(s * 1.6), w = s > 0.5 ? 1 : 0;
    p.dot(x, y - 2, WHITE, k); p.dot(x, y, C[6], k); p.dot(x, y + 2, C[6], k * 0.9);
    if (w) { p.dot(x - 1, y - 1, C[5], k); p.dot(x + 1, y + 1, C[5], k); p.dot(x + 1, y - 2, C[6], k * 0.8); }
    p.light(x, y, C[5], 0.5 * k);
  }
  // quai chuông trên đỉnh
  p.ring(0, YT - 3, 3.2, 1.2, C[6], 1); p.dot(0, YT - 6, WHITE, 1); p.dot(-1, YT, C[6], 1); p.dot(1, YT, C[6], 1);
  // sao vàng lấp lánh quanh chuông
  cycle(t, D, 6, S, (g) => 0.3 + 0.2 * g.next(), (age, L, r) => {
    const k = Math.sin(Math.PI * (age / L)), u = r.range(0.1, 0.95), x = r.sign() * (half(u) + r.range(-1, 4)), y = yOf(u);
    sparkle(p, x, y, 1 + 2.6 * k, WHITE, C[6], 0.45 * k);
  });
  // quầng sáng: thân chuông và hai mép
  p.glowLine(0, YB - 6, 0, YT + 10, 20, C[4], 0.16 + 0.05 * pulse);
  p.glowLine(-half(0.7), yOf(0.95), -half(0.35), yOf(0.3), 5, C[5], 0.2); p.glowLine(half(0.7), yOf(0.95), half(0.35), yOf(0.3), 5, C[5], 0.2);
  p.glow(0, YT - 3, 9, C[6], 0.3 + 0.1 * pulse);
}
