import { Particles, Bits, Lights, P, B, Rng, fit, crystal, band, flare, clamp, smooth, ease, rand, TAU, WHITE } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, ringSites, runeCircle } from "./_td.js";

export const meta = {
  name: "Băng phong",
  desc: "Nhìn từ trên xuống: một vòng sương nở ra quanh người, băng phủ trắng mặt đất, ba vòng tinh thể băng bật lên tứ phía, lấp lánh giữ quái trong băng rồi vỡ vụn tan thành hơi lạnh.",
  tags: ["p2d", "aoe", "ice", "one-shot"],
  size: [232, 216],
  origin: [116, 122],
  duration: 1.75,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"], reach: 88, seed: 4 },
};

const SPREAD = 0.24, HOLD = 1.2, BREAK = 0.3;
// ba vòng tinh thể: cụm cao gần người (chừa khoảng giữa cho người đứng), thấp dần ra mép
const RINGS = [{ q: 0.36, n: 5, h: [22, 30], w: [10, 13], kids: 2 }, { q: 0.66, n: 8, h: [14, 20], w: [7, 10], kids: 1 }, { q: 0.93, n: 13, h: [7, 12], w: [5, 7], kids: 0 }];

export function create(o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], REACH = o.reach, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] }), bits = new Bits(), lights = new Lights();
  const front = (t) => REACH * (0.1 + 0.9 * (1 - Math.pow(1 - clamp(t / SPREAD), 3)));
  const sites = ringSites(REACH, RINGS, R).map((s) => {
    const g = RINGS[s.ring], h = R.range(...g.h), w = R.range(...g.w);
    const kids = [];
    for (let k = 0; k < g.kids; k++) { const sd = k % 2 ? -1 : 1, kh = h * R.range(0.42, 0.64); kids.push({ dx: sd * R.range(0.34, 0.52) * w, h: kh, w: w * 0.62, lean: sd * kh * R.range(0.3, 0.5) }); }
    return { ...s, h, w, lean: Math.cos(s.a) * h * R.range(0.14, 0.3), t0: SPREAD * (1 - Math.cbrt(1 - Math.min(1, (s.d / REACH - 0.1) / 0.9))) + R.range(0, 0.03), up: false, ph: R.next(), kids, gone: false };
  });
  lights.add(0, -8, REACH * 1.2, C[4], 0.75, 0.6);
  lights.add(0, -8, 40, WHITE, 0.8, 0.12);
  for (let i = 0; i < 16; i++) { const a = R.range(0, TAU), sp = R.range(60, 190); ps.spawn(P.FLAKE, 0, -8, Math.cos(a) * sp, Math.sin(a) * sp * SY - 20, R.range(0.6, 1.1), R.chance(0.6) ? WHITE : C[6], R.range(0.6, 1.6)); }
  let t = 0;
  const sink = () => smooth(HOLD, HOLD + BREAK, t);
  return {
    update(dt) {
      t += dt;
      const fr = front(t);
      if (t < SPREAD) for (let i = 0; i < 3; i++) { const a = R.range(0, TAU), [x, y] = gp(a, fr); ps.spawn(P.VAPOUR, x, y - 1, Math.cos(a) * R.range(20, 70), Math.sin(a) * R.range(20, 70) * SY - 4, R.range(0.4, 0.8), R.chance(0.7) ? C[6] : C[5], R.range(2.5, 4.5)); }
      for (const s of sites) {
        if (!s.up && t >= s.t0) {
          s.up = true;
          for (let i = 0; i < 2 + Math.round(s.h / 8); i++) { const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(50, 150) * (0.5 + s.h / 30); bits.add({ kind: B.SHARD, x: s.x + R.range(-2, 2), y: s.y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.5, drag: 1.2, life: R.range(0.35, 0.7), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.5, 3), c: R.pick([C[7], C[6], C[5]]) }); }
          if (s.h > 9) ps.spawn(P.STAR, s.x + R.range(-2, 2), s.y - s.h * R.range(0.4, 0.9), 0, -3, R.range(0.3, 0.5), C[6], R.range(1, 2.4));
        }
        if (s.up && !s.gone && t >= HOLD + s.ph * 0.12) {   // vỡ: mảnh văng, hơi lạnh bốc
          s.gone = true;
          for (let i = 0; i < 2 + Math.round(s.h / 6); i++) { const a = R.range(0, TAU), sp = R.range(40, 150); bits.add({ kind: B.SHARD, x: s.x + R.range(-3, 3), y: s.y - R.range(2, s.h * 0.8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, g: 0.6, drag: 1.4, life: R.range(0.3, 0.6), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.4), c: R.pick([C[7], C[6], C[5], C[4]]) }); }
          ps.spawn(P.VAPOUR, s.x, s.y - s.h * 0.4, R.range(-14, 14), -R.range(6, 18), R.range(0.4, 0.7), C[6], R.range(2.5, 4.5));
        }
      }
      if (t > SPREAD && t < HOLD) {   // giữ băng: ánh chạy trên tinh thể, tuyết rơi lác đác
        if (R.chance(0.35)) { const s = R.pick(sites); ps.spawn(P.STAR, s.x + R.range(-2, 2), s.y - s.h * R.range(0.3, 0.9), 0, -2, R.range(0.25, 0.5), R.chance(0.6) ? C[6] : WHITE, R.range(0.6, 2)); }
        if (R.chance(0.2)) { const a = R.range(0, TAU), d = Math.sqrt(R.next()) * REACH; ps.spawn(P.FLAKE, Math.cos(a) * d, Math.sin(a) * d * SY - R.range(26, 60), R.range(-5, 5), R.range(6, 14), R.range(0.8, 1.2), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.4)); }
      }
      ps.update(dt); bits.update(dt); lights.update(dt);
    },
    // lớp đất: băng phủ, pháp trận thủy, vành sương đang nở
    drawBack(p) {
      const fr = front(t), out = 1 - smooth(HOLD + 0.1, meta.duration - 0.05, t);
      if (out > 0) {
        const hot = t < SPREAD + 0.08;
        groundPatch(p, Math.max(8, fr + 2), (d, a, x, y) => {
          if (d > 0.955) return [hot ? WHITE : C[6], out * 0.85];                                  // mép băng sáng
          if (rand(Math.floor(x), Math.floor(y), 7) < 0.012) return [WHITE, out > 0.5 ? 1 : out];   // hạt băng lấp lánh
          return [d > 0.8 ? C[6] : C[5], out * (0.2 + 0.22 * d + (hot ? 0.18 : 0))];              // lớp băng trong mờ, dày dần ra mép
        }, 3);
        groundVeins(p, REACH, 11, 21, clamp(fr / REACH), (u) => (u > 0.7 ? C[6] : WHITE), out * 0.9);
        runeCircle(p, REACH * 0.5 * clamp(fr / REACH + 0.02), t * 0.5, C, out * 0.95, "thuy", 5);
      }
      const u = clamp(t / (SPREAD + 0.12));
      if (u < 1) band(p, 0, 0, fr + 2, SY, Math.max(2, 9 * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, t < 0.1);
      ps.draw(p, "back");
    },
    // lớp nổi: tinh thể (xa vẽ trước), chớp giữa, mảnh vỡ, tuyết, sáng
    draw(p) {
      const m = sink();
      for (const s of sites) {
        if (!s.up || m >= 1) continue;
        const g = ease.outBack(clamp((t - s.t0) / 0.1), 2.6) * (1 - m), white = t < s.t0 + 0.035, sw = (((t - s.t0) * 0.8 + s.ph * 3) % 1.7) / 0.5, far = s.y < -REACH * SY * 0.35;
        for (const q of s.kids) crystal(p, s.x + q.dx, s.y, q.h * g, q.w, q.lean * g, far ? DIM : C, { white });
        crystal(p, s.x, s.y, s.h * g, s.w * (1 - m * 0.3), s.lean * g, far ? DIM : C, { white, glint: sw <= 1 ? sw : -1 });
      }
      if (t < 0.2) { const a = t / 0.2; flare(p, 0, -8, 30 * Math.pow(1 - a, 1.5), 1 - a, C); p.glow(0, -8, 40, WHITE, 0.55 * (1 - a)); }
      if (t < HOLD + BREAK) { const k = (1 - smooth(HOLD - 0.1, HOLD + BREAK, t)) * (0.85 + 0.15 * Math.sin(t * 5)); for (let i = 0; i < 6; i++) { const [x, y] = gp((i * TAU) / 6 + 0.4, front(t) * 0.6); p.glow(x, y - 4, 30, C[4], 0.13 * k); } }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
