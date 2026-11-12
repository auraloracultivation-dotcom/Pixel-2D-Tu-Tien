import { fit, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.js";
import { SY, gp } from "./_td.js";

export const meta = {
  name: "Cuồng phong",
  desc: "Nhìn từ trên xuống: gió xoáy tròn quanh người, những vệt gió sáng chạy vòng trên mặt đất, ba tầng vành gió bốc lên thu hẹp dần như phễu lốc, lá và bụi bị cuốn bay vòng, rồi gió tan.",
  tags: ["p2d", "aoe", "wind", "one-shot"],
  size: [232, 236],
  origin: [116, 146],
  duration: 1.15,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0a2a22", "#12493a", "#1e7a5c", "#3fb088", "#7fe0b8", "#c0ffe0", "#ffffff"], reach: 92, seed: 14 },
};
const D = meta.duration;

// vệt gió: một cung trên elip (tâm (0, cy), bán kính r, dẹt sy), đầu ở góc a, đuôi dài len rad, sáng ở đầu
function gust(p, C, cy, r, sy, a, len, k, w = 1) {
  const m = Math.ceil(r * len * 1.25);
  for (let j = 0; j <= m; j++) {
    const u = j / m, g = a - len * u, ca = Math.cos(g), sa = Math.sin(g), x = ca * r, y = cy + sa * r * sy;
    p.dot(x, y, u < 0.18 ? WHITE : u < 0.5 ? C[5] : C[4], k * (1.3 - u * 1.05));
    if (w > 1 && u < 0.62) { p.dot(ca * (r - 1), cy + sa * (r - 1) * sy, u < 0.3 ? C[5] : C[4], k * (1.2 - u * 1.5)); p.blend(ca * (r - 2), cy + sa * (r - 2) * sy, C[4], k * 0.5 * (1 - u * 1.5)); }
    if (w > 2 && u < 0.35) p.dot(ca * (r + 1), cy + sa * (r + 1) * sy, C[5], k * (1.1 - u * 2.6));
  }
}

function env(t) { return Math.min(1, t / 0.07) * (1 - smooth(0.72, D - 0.02, t)); }

// lớp đất: vệt gió quét vòng trên mặt đất, vành gió nở ra lúc đầu
export function drawBack(p, t, o) {
  const C = fit(o.palette, 7), R = o.reach, S = o.seed, k = env(t), grow = 0.35 + 0.65 * ease.outCubic(clamp(t / 0.18));
  for (let i = 0; i < 22; i++) {
    const q = 0.24 + 0.76 * rand(S, i, 1), r = R * q * grow, w = (4.2 + 5 * (1 - q)) * (0.8 + 0.4 * rand(S, i, 2)), a = rand(S, i, 3) * TAU + t * w, len = (0.5 + 0.7 * rand(S, i, 4)) * (0.6 + 0.4 * q);
    gust(p, C, 0, r, SY, a, len, k * (0.6 + 0.4 * rand(S, i, 5)), i % 3 ? 2 : 1);
  }
  if (t < 0.3) { const u = t / 0.3, r = R * (0.2 + 0.86 * ease.outCubic(u)); for (let a = 0; a < TAU; a += 0.8 / r) { const [x, y] = gp(a, r); p.dot(x, y, u < 0.35 ? WHITE : C[5], 1.15 - u); } }
  p.glowRing(0, 0, R * 0.7 * grow, R * 0.3, C[3], 0.2 * k);
}

// lớp nổi: ba tầng vành gió thu hẹp dần lên cao, lá và bụi bay vòng, chớp giữa
export function draw(p, t, o) {
  const C = fit(o.palette, 7), R = o.reach, S = o.seed, k = env(t), grow = 0.35 + 0.65 * ease.outCubic(clamp(t / 0.18));
  const tiers = [[-9, 0.8, 6.5], [-24, 0.6, 8], [-40, 0.42, 9.5], [-56, 0.27, 11]];
  const far = [], near = [];
  tiers.forEach(([cy, q, w], ti) => {
    for (let i = 0; i < 4 - (ti > 2 ? 1 : 0); i++) { const a = (i * TAU) / (4 - (ti > 2 ? 1 : 0)) + ti * 0.9 + t * w, len = 0.75 + 0.25 * rand(S, ti, i); (Math.sin(a - len * 0.4) < 0 ? far : near).push([cy, R * q * grow, a, len, ti]); }
  });
  for (const [cy, r, a, len, ti] of far) gust(p, C.slice(0, 6), cy, r, SY * 0.9, a, len, k * 0.75, 2);
  // lá, bụi bị cuốn: quay quanh tâm, bốc dần lên rồi văng ra
  for (let i = 0; i < 26; i++) {
    const born = rand(S, i, 11) * 0.5, age = t - born, life = 0.45 + 0.3 * rand(S, i, 12);
    if (age < 0 || age > life) continue;
    const u = age / life, q = 0.25 + 0.7 * rand(S, i, 13), a = rand(S, i, 14) * TAU + age * (6 + 5 * (1 - q)), r = R * q * (0.7 + 0.5 * u), x = Math.cos(a) * r, y = Math.sin(a) * r * SY - 6 - 46 * u * rand(S, i, 15);
    const leaf = rand(S, i, 16) < 0.6, ca = Math.cos(a * 2.3 + i), sa = Math.sin(a * 2.3 + i);
    if (leaf) { p.line(x - ca * 2, y - sa * 2, x + ca * 2, y + sa * 2, u < 0.7 ? C[4] : C[3], k); p.dot(x + ca * 2, y + sa * 2, C[6], k); }
    else { p.dot(x, y, C[5], k * (1 - u * 0.5)); p.dot(x - Math.sin(a), y + Math.cos(a) * SY, C[3], k * 0.7); }
  }
  for (const [cy, r, a, len, ti] of near) gust(p, C, cy, r, SY * 0.9, a, len, k, 3);
  if (t < 0.16) { const u = t / 0.16; p.glow(0, -10, 44, WHITE, 0.5 * (1 - u)); p.glow(0, -10, 80, C[4], 0.3 * (1 - u)); }
  p.glow(0, -24, R * 0.75, C[3], 0.2 * k);
  for (let i = 0; i < 4; i++) { const [x, y] = gp(i * TAU / 4 + t * 5, R * 0.55 * grow); p.glow(x, y - 8, 22, C[4], 0.12 * k); }
}
