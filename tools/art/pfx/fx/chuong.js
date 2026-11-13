import { fit, clamp, smooth, ease, TAU, WHITE, hex, flare } from "../../core/index.js";

export const meta = {
  name: "Đồng chung (chuông đồng gõ một tiếng)",
  desc: "Quả chuông đồng hiện ra lơ lửng trên đầu người gõ, bị gõ một tiếng: chớp trắng, chuông lắc qua lại tắt dần, những vòng sóng âm màu linh khí nở ra quanh miệng chuông, hai bên có vạch rung, rồi chuông tan dần. Thân chuông tô bóng kim loại (sáng bên trái, tối bên phải), ba đai, miệng loe, quai treo, quả lắc.",
  tags: ["p2d", "self", "one-shot"],
  size: [120, 150],
  origin: [60, 140],
  duration: 0.7,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140a26", "#2b1252", "#5a24a8", "#8a48e8", "#b89af0", "#e4d0ff", "#ffffff"], seed: 5 },
};
const BR = ["#1a0e06", "#3e2410", "#6e4418", "#a06a22", "#d09a3a", "#f4cc6a", "#fff0b8"].map(hex);   // đồng: tối → sáng
const TOP = -96, H = 36, W = 15, STRIKE = 0.06;
const half = (u) => W * ((u < 0.28 ? 0.6 * Math.sqrt(1 - (1 - u / 0.28) ** 2) : 0.6 + 0.24 * ((u - 0.28) / 0.72) ** 1.3) + 0.16 * smooth(0.82, 1, u));

export function draw(p, t, o) {
  const C = fit(o.palette, 7), s = ease.outBack(clamp(t / 0.07), 2), out = 1 - smooth(0.5, 0.68, t), hit = t >= STRIKE ? t - STRIKE : -1;
  const swing = hit >= 0 ? 0.3 * Math.sin(hit * 30) * Math.exp(-hit * 6) : 0, white = hit >= 0 && hit < 0.05;
  const tx = p.tx, ty = p.ty, cy = TOP + H * 0.55;
  // sóng âm quanh chuông: ba vòng elip nở ra, vòng trong sáng nhất
  if (hit >= 0) for (let i = 0; i < 3; i++) {
    const u = (hit - i * 0.09) / 0.42;
    if (u <= 0 || u >= 1) continue;
    const r = 10 + 34 * ease.outCubic(u), k = (1 - u) * out;
    for (let a = 0; a < TAU; a += 0.9 / r) { const x = Math.cos(a) * r * 1.15, y = cy + 6 + Math.sin(a) * r * 0.8; p.dot(x, y, u < 0.25 ? WHITE : u < 0.6 ? C[5] : C[4], k * 1.2); if (u < 0.5) p.dot(x * 0.96, cy + 6 + Math.sin(a) * (r - 1.5) * 0.8, C[4], k * 0.8); }
    p.glowRing(0, cy + 6, r, 5, C[4], 0.22 * k);
  }
  // chuông: lắc quanh quai treo
  p.place(tx, ty + TOP, false, swing);
  const hh = H * s;
  p.shade(-W - 4, -6, W + 4, hh + 3, (x, y, o2) => {
    const u = y / hh;
    if (u < 0 || u > 1) return;
    const hw = half(u) * s, e = hw - Math.abs(x);
    if (e < 0) return;
    let c;
    if (e < 1) c = BR[0];
    else if (white) c = WHITE;
    else {
      const side = x / hw, band = (u > 0.3 && u < 0.36) || (u > 0.6 && u < 0.66), lip = u > 0.9;
      let i = 3 + (side < -0.5 ? 2 : side < -0.1 ? 1 : side > 0.6 ? -2 : side > 0.25 ? -1 : 0);
      if (band) i = Math.max(1, i - 1); if (lip) i = Math.min(6, i + 1);
      if (side > -0.62 && side < -0.42 && u > 0.12 && u < 0.86) i = 6;   // vệt phản quang dọc thân
      c = BR[i];
    }
    o2.c = c; o2.a = out;
  });
  if (out > 0.3) {
    p.ring(0, -3 * s, 3 * s, 1.2, white ? WHITE : BR[5], 1); p.px(0, -6 * s, BR[6]);                      // quai treo
    p.line(0, hh * 0.7, 0, hh + 2, BR[1]); p.circle(0, hh + 3, 2, white ? WHITE : BR[4]); p.px(-1, hh + 2, BR[6]);   // quả lắc
    for (const u of [0.33, 0.63]) { const hw = half(u) * s; p.line(-hw + 1, u * hh, hw - 1, u * hh, white ? WHITE : BR[5]); }
  }
  p.place(tx, ty, false, 0);
  // vạch rung hai bên miệng chuông
  if (hit >= 0 && hit < 0.4) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const u = (hit * 3 + i / 3) % 1, x = sd * (W + 5 + u * 14), y = TOP + H * 0.9, l = 4 - i;
    p.line(x, y - l, x + sd * 1.5, y, u < 0.4 ? WHITE : C[5], (1 - u) * out); p.line(x + sd * 1.5, y, x, y + l, u < 0.4 ? WHITE : C[5], (1 - u) * out);
  }
  if (hit >= 0 && hit < 0.12) { const k = 1 - hit / 0.12; flare(p, 0, TOP + H * 0.9, 16 * k + 4, k, [C[3], C[4], C[5], C[6]]); p.glow(0, cy, 44, WHITE, 0.5 * k); }
  p.glow(0, cy, 34, C[4], 0.3 * out * (0.7 + 0.3 * Math.abs(swing) * 3));
  p.glow(0, cy, 16, BR[5], 0.22 * out);
}
