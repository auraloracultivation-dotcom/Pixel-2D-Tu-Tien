import { fit, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.js";
import { SY, gp, crescent, arcLine, groundPatch } from "./_td.js";

export const meta = {
  name: "Cuồng phong",
  desc: "Nhìn từ trên xuống: cả vùng thành một xoáy lốc. Mặt đất hiện ba dải gió xoắn ốc trong mờ quay quanh tâm, vành gió trắng nở bung ra mép; phía trên là những lưỡi phong nhận đặc (viền lục, lõi trắng) lao vòng quanh người kéo theo vệt cung mờ, ba tầng vành gió thu hẹp dần lên cao như phễu lốc, lá và bụi bị cuốn bay vòng rồi văng ra.",
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
const env = (t) => Math.min(1, t / 0.06) * (1 - smooth(0.74, D - 0.02, t));
const grow = (t) => 0.3 + 0.7 * ease.outCubic(clamp(t / 0.2));

// vành gió ở độ cao cy: cung dày (viền màu, lõi trắng ở đầu), đầu ở góc a, đuôi dài len rad
function gust(p, C, cy, r, a, len, k, thick) {
  const m = Math.ceil(r * len * 1.3);
  for (let j = 0; j <= m; j++) {
    const u = j / m, g = a - len * u, ca = Math.cos(g), sa = Math.sin(g), al = k * (1.25 - u);
    for (let w = 0; w < thick * (1 - u * 0.6); w++) {
      const rr = r - w, c = w === 0 ? (u < 0.5 ? C[5] : C[4]) : u < 0.22 && w < 2 ? WHITE : w < 2 ? C[5] : C[3];
      p.dot(ca * rr, cy + sa * rr * SY * 0.9, c, al * (1 - w * 0.12));
    }
  }
}

// lớp đất: ba dải gió xoắn ốc trong mờ quay quanh tâm, vành gió nở bung lúc đầu, bụi bị hất ra mép
export function drawBack(p, t, o) {
  const C = fit(o.palette, 7), R = o.reach, S = o.seed, k = env(t), g = grow(t), Rg = R * g;
  const ARMS = 3, TW = 4.6, W = 6.2;
  groundPatch(p, Rg, (d, a) => {
    if (d < 0.07) return null;
    const s = 0.5 + 0.5 * Math.cos(ARMS * (a + TW * d - W * t)), edge = (1 - smooth(0.78, 1, d)) * smooth(0.07, 0.24, d);
    if (s < 0.5) return null;
    const band = smooth(0.5, 0.9, s);
    return [s > 0.965 ? WHITE : s > 0.86 ? C[5] : C[4], Math.min(0.92, band * (s > 0.965 ? 0.75 : 0.34) * k * edge * 1.25)];
  }, S, 0.6);
  if (t < 0.34) {   // vành gió nở bung: hai nét, nét trong trắng
    const u = t / 0.34, r = R * (0.16 + 0.9 * ease.outCubic(u));
    for (let a = 0; a < TAU; a += 0.7 / r) { const [x, y] = gp(a, r); p.dot(x, y, u < 0.4 ? WHITE : C[5], 1.2 - u); const [x2, y2] = gp(a, r - 2); p.dot(x2, y2, C[4], 0.9 - u); }
  }
  for (let i = 0; i < 20; i++) {   // bụi bị hất ra mép, bay vòng theo gió
    const born = rand(S, i, 31) * 0.4, age = t - born, life = 0.4 + 0.3 * rand(S, i, 32);
    if (age < 0 || age > life) continue;
    const u = age / life, a = rand(S, i, 33) * TAU + age * 3.2, [x, y] = gp(a, R * (0.55 + 0.5 * ease.outCubic(u)));
    p.dot(x, y, u < 0.5 ? C[5] : C[3], k * (1 - u)); p.dot(x - Math.sin(a) * 1.5, y + Math.cos(a) * 1.5 * SY, C[3], k * 0.6 * (1 - u));
  }
  p.glowRing(0, 0, Rg * 0.66, R * 0.36, C[3], 0.24 * k);
}

// lớp nổi: lưỡi phong nhận lao vòng, phễu lốc ba tầng, lá bụi bay vòng, chớp giữa
export function draw(p, t, o) {
  const C = fit(o.palette, 7), R = o.reach, S = o.seed, k = env(t), g = grow(t);
  const far = [], near = [];
  // 7 lưỡi phong nhận: quay quanh tâm ở các vòng khác nhau, mặt lồi hướng theo chiều bay
  for (let i = 0; i < 7; i++) {
    const q = 0.34 + 0.6 * ((i * 0.618) % 1), w = 5.2 + 3.2 * (1 - q) + rand(S, i, 41), a = (i * TAU) / 7 + rand(S, i, 42) + t * w, r = R * q * g;
    const [x, y] = gp(a, r), size = 11 + 9 * rand(S, i, 43) + 5 * q, lift = -7 - 6 * rand(S, i, 44);
    (Math.sin(a) < 0 ? far : near).push({ x, y: y + lift, a: a + TAU / 4, size, r, ang: a, lift });
  }
  const blade = (b, kk) => {
    for (let e = 1; e <= 3; e++) { const [ex, ey] = gp(b.ang - e * 0.17, b.r); arcLine(p, ex, ey + b.lift, b.size * 0.9, 0.5, e === 1 ? C[5] : C[4], kk * (0.6 - e * 0.15), b.a - e * 0.17); }   // vệt cung mờ kéo sau
    crescent(p, b.x, b.y, b.size, b.size * 0.42, b.size * 0.9, C, { a: b.a, k: kk, hot: 0.6 });
  };
  for (const b of far) blade(b, k * 0.8);
  // phễu lốc: ba tầng vành gió thu hẹp dần lên cao, quay nhanh dần
  const tiers = [[-10, 0.5, 7.5, 3], [-30, 0.33, 9.5, 3], [-50, 0.2, 12, 2]];
  for (const [cy, q, w, th] of tiers) for (let i = 0; i < 3; i++) { const a = (i * TAU) / 3 + cy * 0.07 + t * w; if (Math.sin(a - 0.5) < 0) gust(p, C, cy, R * q * g, a, 1.15, k * 0.8, th); }
  // lá, bụi bị cuốn: quay quanh tâm, bốc dần lên rồi văng ra
  for (let i = 0; i < 30; i++) {
    const born = rand(S, i, 11) * 0.55, age = t - born, life = 0.45 + 0.3 * rand(S, i, 12);
    if (age < 0 || age > life) continue;
    const u = age / life, q = 0.2 + 0.72 * rand(S, i, 13), a = rand(S, i, 14) * TAU + age * (6 + 5 * (1 - q)), r = R * q * (0.7 + 0.55 * u), x = Math.cos(a) * r, y = Math.sin(a) * r * SY - 6 - 52 * u * rand(S, i, 15);
    const ca = Math.cos(a * 2.3 + i), sa = Math.sin(a * 2.3 + i);
    if (rand(S, i, 16) < 0.6) { p.line(x - ca * 2.5, y - sa * 2.5, x + ca * 2.5, y + sa * 2.5, u < 0.7 ? C[4] : C[3], k); p.dot(x + ca * 2.5, y + sa * 2.5, WHITE, k); p.dot(x - sa, y + ca, C[3], k * 0.8); }
    else { p.dot(x, y, C[5], k * (1 - u * 0.5)); p.dot(x - Math.sin(a), y + Math.cos(a) * SY, C[3], k * 0.7); }
  }
  for (const [cy, q, w, th] of tiers) for (let i = 0; i < 3; i++) { const a = (i * TAU) / 3 + cy * 0.07 + t * w; if (Math.sin(a - 0.5) >= 0) gust(p, C, cy, R * q * g, a, 1.15, k, th); }
  for (const b of near) blade(b, k);
  if (t < 0.18) { const u = t / 0.18; p.glow(0, -10, 46, WHITE, 0.55 * (1 - u)); p.glow(0, -10, 84, C[4], 0.32 * (1 - u)); }
  p.glow(0, -26, R * 0.7, C[3], 0.2 * k);
  for (const b of near) p.glow(b.x, b.y, b.size * 1.3, C[4], 0.16 * k);
}
