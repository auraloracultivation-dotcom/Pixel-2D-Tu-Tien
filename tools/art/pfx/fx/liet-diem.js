// Lửa cuộn thành khói, tia lửa, tàn lửa: dùng bộ hạt của PixelFX (src/core/sim.js, phỏng theo Sprite Fusion, MIT, Copyright (c) 2026 Hugo Duprez).
import { Particles, Lights, P, PF, Rng, fit, band, flare, clamp, smooth, ease, rand, TAU, WHITE, hex, mix } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, ringSites, runeCircle } from "./_td.js";

export const meta = {
  name: "Liệt diễm",
  desc: "Nhìn từ trên xuống: đất nứt đỏ rực dưới chân, một vòng lửa quét ra, ba vòng cột lửa phụt lên tứ phía rồi cháy tàn thành khói, tàn lửa bay lên, mặt đất cháy sém nguội dần. Có thể thêm bóng chuông lửa ngân vang ở giữa (Hỏa Hồn Linh).",
  tags: ["p2d", "aoe", "fire", "one-shot"],
  size: [212, 220],
  origin: [106, 134],
  duration: 1.5,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], reach: 76, bell: false, seed: 6 },
};

const SPREAD = 0.2, BURN = 0.55;
const RINGS = [{ q: 0.4, n: 6, pow: 1 }, { q: 0.72, n: 10, pow: 0.72 }, { q: 0.96, n: 15, pow: 0.46 }];
const SOOT = hex("#17100f"), SOOT2 = hex("#2a1c18");

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), lights = new Lights();
  const front = (t) => REACH * (0.12 + 0.88 * (1 - Math.pow(1 - clamp(t / SPREAD), 3)));
  const sites = ringSites(REACH, RINGS, R).map((s) => ({ ...s, pow: RINGS[s.ring].pow * R.range(0.85, 1.15), t0: SPREAD * (1 - Math.cbrt(1 - Math.min(1, (s.d / REACH - 0.12) / 0.88))) + R.range(0, 0.04), acc: R.next(), lit: false }));
  lights.add(0, -6, REACH * 1.5, C[4], 0.8, 0.7);
  lights.add(0, -6, 46, WHITE, 0.8, 0.12);
  for (let i = 0; i < 26; i++) { const a = R.range(0, TAU), sp = R.range(120, 330); ps.spawn(P.SPARK, 0, -6, Math.cos(a) * sp, Math.sin(a) * sp * SY - 70, R.range(0.2, 0.5)); }
  for (let i = 0; i < 9; i++) { const a = R.range(0, TAU), d = R.range(0, 9); ps.spawn(P.FIRE, Math.cos(a) * d, -6 + Math.sin(a) * d, Math.cos(a) * 50, Math.sin(a) * 40 - 50, R.range(0.3, 0.55), 0, R.range(5, 8), 0, PF.SMOKES); }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const s of sites) {
        if (t < s.t0 || t > s.t0 + BURN * (0.7 + 0.5 * s.pow)) continue;
        if (!s.lit) { s.lit = true; lights.add(s.x, s.y - 8, 26 + 22 * s.pow, C[4], 0.5, 0.5); for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, s.x, s.y - 3, R.range(-60, 60), -R.range(120, 260) * s.pow, R.range(0.2, 0.45)); }
        // cột lửa: phụt mạnh lúc đầu rồi lụi; ngọn to bay cao hơn và nguội thành khói
        const k = 1 - (t - s.t0) / (BURN * (0.7 + 0.5 * s.pow)), power = s.pow * (0.35 + 0.65 * k) * (t - s.t0 < 0.08 ? 1.5 : 1);
        for (s.acc += dt * (22 + 30 * power); s.acc > 1; s.acc--) {
          const sz = R.range(2.2, 4.6) * (0.55 + power);
          ps.spawn(P.FIRE, s.x + R.range(-2.5, 2.5) * (1 + s.pow), s.y - sz * 0.5, R.range(-10, 10), -R.range(60, 150) * power, R.range(0.22, 0.46), 0, sz, 0, R.chance(0.22) ? PF.SMOKES : 0);
        }
        if (R.chance(0.1)) ps.spawn(P.EMBER, s.x, s.y - 6, R.range(-22, 22), -R.range(50, 110), R.range(0.5, 1), C[4]);
      }
      if (t > 0.1 && t < 0.9 && R.chance(0.35)) { const a = R.range(0, TAU), d = Math.sqrt(R.next()) * REACH; ps.spawn(P.EMBER, Math.cos(a) * d, Math.sin(a) * d * SY - 3, R.range(-12, 12), -R.range(30, 80), R.range(0.5, 1.1), C[5]); }
      ps.update(dt); lights.update(dt);
    },
    // lớp đất: nền cháy sém, khe nứt đỏ rực nguội dần, pháp trận hỏa, vành lửa quét ra
    drawBack(p) {
      const fr = front(t), out = 1 - smooth(1.05, meta.duration - 0.03, t), heat = 1 - smooth(0.25, 1.1, t);
      if (out > 0) {
        groundPatch(p, Math.max(8, fr + 1), (d) => [d > 0.9 ? SOOT2 : SOOT, out * (d > 0.9 ? 0.34 : 0.5 - 0.14 * d)], 9);
        groundVeins(p, REACH, 11, 31, clamp(fr / REACH), (u) => (heat > 0.75 ? (u < 0.7 ? WHITE : C[6]) : heat > 0.45 ? (u < 0.7 ? C[6] : C[5]) : heat > 0.15 ? C[4] : C[2]), out > 0.6 ? 1 : out * out * 2.6, 0.55,
          { jit: 0.6, branch: 0.34, straight: true, edge: () => (heat > 0.45 ? C[3] : heat > 0.15 ? C[2] : C[1]) });   // khe dung nham dày 2 điểm ảnh toả từ mép pháp trận ra ngoài (không chồng lên hình giữa), nguội thì tắt nhanh
        runeCircle(p, REACH * 0.52 * clamp(fr / REACH + 0.02), -t * 0.6, heat > 0.3 ? C : C.slice(0, 6), out * 0.95, "hoa", 3);
        for (let i = 0; i < 12; i++) { const [x, y] = gp((i * TAU) / 12 + 0.3, fr * (0.35 + 0.5 * rand(i, 77))); p.glow(x, y, 16, C[4], 0.12 * heat * out); }
      }
      const u = clamp(t / (SPREAD + 0.14));
      if (u < 1) band(p, 0, 0, fr + 2, SY, Math.max(2, 8 * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, t < 0.09);
    },
    // lớp nổi: lửa, khói, tia lửa, chớp giữa, bóng chuông
    draw(p) {
      ps.draw(p);
      if (t < 0.22) { const a = t / 0.22; flare(p, 0, -6, 34 * Math.pow(1 - a, 1.5), 1 - a, C); p.glow(0, -6, 44, WHITE, 0.6 * (1 - a)); }
      if (o.bell) {   // bóng chuông lửa: hiện lên giữa, ngân hai nhịp (phình ra, vành âm toả), rồi tan
        const k = (t < 0.1 ? t / 0.1 : 1) * (1 - smooth(0.75, 1.05, t)), beat = 1 + 0.08 * Math.exp(-(((t - 0.12) / 0.05) ** 2)) + 0.06 * Math.exp(-(((t - 0.45) / 0.05) ** 2));
        if (k > 0.02) {
          const W = 17 * beat, Hh = 26 * beat, by = -12, sway = Math.sin(t * 16) * 1.2 * (1 - clamp(t / 0.9));
          p.each(-W - 3, by - Hh - 6, W + 3, by + 3, (x, y, sx, sy) => {
            const v = (by - y) / Hh; if (v < 0 || v > 1.12) return;
            const hw = v > 1 ? 2.2 : W * (v < 0.14 ? 1 + (0.14 - v) * 1.6 : 0.62 + 0.38 * Math.pow(1 - (v - 0.14) / 0.86, 0.5) * (1 - 0.25 * v)), dx = Math.abs(x - sway * (1 - v));
            if (dx > hw) return;
            const edge = hw - dx < 1.1 || v < 0.05 || (v > 0.97 && v <= 1);
            if (edge) p.put(sx, sy, k > 0.6 ? C[6] : C[5], k); else p.blendPx(sx, sy, v < 0.3 ? C[5] : C[4], 0.42 * k * (0.7 + 0.3 * (1 - dx / hw)));
          });
          p.line(-W * 0.35, by - Hh * 0.82, -W * 0.5, by - Hh * 0.3, WHITE, k); p.px(sway * 2, by + 2, WHITE); p.px(sway * 2, by + 3, C[6]);
          p.glow(0, by - Hh * 0.5, 30, C[5], 0.4 * k);
          for (const d of [0.12, 0.45]) { const w = (t - d) / 0.4; if (w > 0 && w < 1) band(p, 0, by - Hh * 0.4, (W + 6) + REACH * 0.55 * ease.outCubic(w), 0.55, 1.5, 1.1 - w, C, () => true, w < 0.25); }
        }
      }
      lights.draw(p);
    },
  };
}
