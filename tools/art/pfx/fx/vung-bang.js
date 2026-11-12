import { fit, clamp, rand, TAU, WHITE, cycle, crystal } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, runeCircle, byDepth, ln } from "./_td.js";

export const meta = {
  name: "Hàn băng vực (vùng băng)",
  desc: "Vùng băng giá nhìn từ trên xuống, lặp liền mạch: mặt băng trong mờ có vân nứt lấp lánh, pháp trận thủy xoay chậm, tinh thể băng viền quanh mép và rải trong vùng có ánh chạy, tuyết rơi xoáy, hơi lạnh trôi là là.",
  tags: ["p2d", "zone", "ice", "loop"],
  size: [220, 216],
  origin: [110, 122],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"], reach: 92, seed: 33 },
};
const D = meta.duration;

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), R = o.reach, S = o.seed, tw = Math.floor((t / D) * 8);
  groundPatch(p, R, (d, a, x, y) => {
    if (d > 0.955) return [C[6], 0.85];
    if (rand(Math.floor(x), Math.floor(y), 7 + tw) < 0.008) return [WHITE, 1];   // hạt băng nhấp nháy
    return [d > 0.8 ? C[6] : C[5], 0.22 + 0.22 * d];
  }, S);
  groundVeins(p, R, 12, S + 5, 1, (u) => (u > 0.7 ? C[6] : WHITE), 0.85);
  runeCircle(p, R * 0.5, (t / D) * TAU / 14 * 2, C, 0.95, "thuy", 5);
  p.glowRing(0, 0, R * 0.9, 16, C[4], 0.16 + 0.05 * Math.sin((t / D) * TAU));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], R = o.reach, S = o.seed, sites = [];
  for (let i = 0; i < 15; i++) { const a = (i * TAU) / 15 + 0.12 * Math.sin(i * 5), [x, y] = gp(a, R * (0.93 + 0.05 * rand(S, i, 1))); sites.push({ x, y, a, h: 7 + 6 * rand(S, i, 2), w: 5 + 2.5 * rand(S, i, 3), i }); }
  for (let i = 0; i < 5; i++) { const a = rand(S, i, 4) * TAU, [x, y] = gp(a, R * (0.42 + 0.3 * rand(S, i, 5))); sites.push({ x, y, a, h: 12 + 7 * rand(S, i, 6), w: 7 + 3 * rand(S, i, 7), i: 20 + i }); }
  for (const s of byDepth(sites)) {
    const sw = ((t / D + rand(S, s.i, 8)) % 1) * 2.4;   // ánh chạy dọc tinh thể mỗi vòng lặp một lần
    crystal(p, s.x, s.y, s.h, s.w, Math.cos(s.a) * s.h * 0.22, s.y < -R * SY * 0.35 ? DIM : C, { glint: sw <= 1 ? sw : -1 });
  }
  cycle(t, D, 22, S + 40, (g) => 0.9 + 0.6 * g.next(), (age, L, r) => {   // tuyết rơi xoáy nhẹ
    const u = age / L, a = r.range(0, TAU) + age * 0.9, d = Math.sqrt(r.next()) * R, x = Math.cos(a) * d + Math.sin(age * 3 + r.range(0, 6)) * 3, y = Math.sin(a) * d * SY - 38 * (1 - u) - 2, big = r.chance(0.3);
    const al = Math.min(1, u * 5) * Math.min(1, (1 - u) * 4);
    p.dot(x, y, r.chance(0.5) ? WHITE : C[6], al); if (big) { p.dot(x + 1, y, C[6], al * 0.8); p.dot(x, y + 1, C[6], al * 0.8); p.dot(x - 1, y, C[5], al * 0.7); p.dot(x, y - 1, C[5], al * 0.7); }
  });
  cycle(t, D, 9, S + 60, () => D, (age, L, r) => {   // hơi lạnh: đốm mờ trôi ngang, sống trọn một vòng lặp, mờ ở hai đầu
    const u = age / L, a = r.range(0, TAU), d = Math.sqrt(r.next()) * R * 0.9, x = Math.cos(a) * d + (u - 0.5) * 22, y = Math.sin(a) * d * SY - 3;
    p.disc(x, y, 5 + 4 * r.next(), C[6], 0.16 * Math.sin(Math.PI * u));
  });
}
