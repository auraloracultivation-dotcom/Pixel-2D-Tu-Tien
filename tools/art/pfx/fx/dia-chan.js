import { Particles, Bits, Lights, P, B, Rng, fit, crystal, band, clamp, smooth, ease, rand, TAU, WHITE, hex, mix } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, ringSites, runeCircle } from "./_td.js";

export const meta = {
  name: "Địa chấn",
  desc: "Nhìn từ trên xuống: mặt đất rung nứt toác từ chân người ra, sóng bụi quét tròn, ba vòng mỏm đá nhọn trồi lên hất quái, sỏi đá nảy tung, rồi đá lún xuống lại trong bụi.",
  tags: ["p2d", "aoe", "earth", "one-shot"],
  size: [220, 210],
  origin: [110, 120],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c", "#fff0c8"], reach: 80, seed: 12 },
};

const SPREAD = 0.22, HOLD = 0.9, SINK = 0.3;
const RINGS = [{ q: 0.38, n: 5, h: [18, 26], w: [11, 15], kids: 2 }, { q: 0.68, n: 8, h: [12, 17], w: [8, 11], kids: 1 }, { q: 0.94, n: 12, h: [6, 10], w: [6, 8], kids: 0 }];

export function create(o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[1], C[2], C[3], C[4], C[5]], REACH = o.reach, R = new Rng(o.seed), DUST = mix(C[5], hex("#9a9088"), 0.5);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits(), lights = new Lights(), ramp = [C[0], C[2], C[4], C[5], C[6]];
  const front = (t) => REACH * (0.12 + 0.88 * (1 - Math.pow(1 - clamp(t / SPREAD), 3)));
  const sites = ringSites(REACH, RINGS, R).map((s) => {
    const g = RINGS[s.ring], h = R.range(...g.h), w = R.range(...g.w), kids = [];
    for (let k = 0; k < g.kids; k++) { const sd = k % 2 ? -1 : 1, kh = h * R.range(0.45, 0.66); kids.push({ dx: sd * R.range(0.36, 0.55) * w, h: kh, w: w * 0.66, lean: sd * kh * R.range(0.25, 0.45) }); }
    return { ...s, h, w, kids, lean: Math.cos(s.a) * h * R.range(0.18, 0.36), t0: SPREAD * (1 - Math.cbrt(1 - Math.min(1, (s.d / REACH - 0.12) / 0.88))) + R.range(0, 0.04), up: false, ph: R.next() };
  });
  lights.add(0, -4, REACH * 1.2, C[5], 0.5, 0.5);
  lights.add(0, -4, 34, WHITE, 0.6, 0.1);
  let t = 0;
  return {
    update(dt) {
      t += dt;
      const fr = front(t);
      if (t < SPREAD + 0.05) for (let i = 0; i < 4; i++) { const a = R.range(0, TAU), [x, y] = gp(a, fr); ps.spawn(P.DUST, x, y - 1, Math.cos(a) * R.range(30, 90), Math.sin(a) * R.range(30, 90) * SY - 6, R.range(0.5, 0.95), DUST, R.range(3, 5.5)); }
      for (const s of sites) {
        if (s.up || t < s.t0) continue;
        s.up = true;
        for (let i = 0; i < 2 + Math.round(s.h / 6); i++) { const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(70, 190) * (0.5 + s.h / 26); bits.add({ kind: B.CHUNK, x: s.x + R.range(-3, 3), y: s.y - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.7, life: R.range(0.45, 0.85), a: R.range(0, TAU), va: R.range(-16, 16), s: R.range(1.1, 2.5), ramp }); }
        for (let i = 0; i < 5; i++) ps.spawn(P.GRIT, s.x + R.range(-4, 4), s.y - 2, R.range(-70, 70), -R.range(90, 230), R.range(0.4, 0.75), R.pick([C[6], C[5], C[4], C[3]]), R.chance(0.4) ? 2 : 1);
        ps.spawn(P.DUST, s.x, s.y - 2, R.range(-20, 20), -R.range(6, 16), R.range(0.5, 0.9), DUST, R.range(3, 5) + s.h * 0.12);
      }
      if (t > HOLD && t < HOLD + SINK && R.chance(0.5)) { const s = R.pick(sites); ps.spawn(P.DUST, s.x + R.range(-4, 4), s.y - 1, R.range(-16, 16), -R.range(4, 14), R.range(0.4, 0.7), DUST, R.range(2.5, 4.5)); }
      ps.update(dt); bits.update(dt); lights.update(dt);
    },
    // lớp đất: đất sẫm lại, khe nứt đen viền sáng, pháp trận thổ, sóng chấn động
    drawBack(p) {
      const fr = front(t), out = 1 - smooth(HOLD + 0.15, meta.duration - 0.03, t);
      if (out > 0) {
        groundPatch(p, Math.max(8, fr + 1), (d) => [d > 0.92 ? C[3] : C[1], out * (d > 0.92 ? 0.4 : 0.34 - 0.1 * d)], 14);
        groundVeins(p, REACH, 13, 41, clamp(fr / REACH), () => C[0], out);
        p.place(p.tx + 1, p.ty - 1); groundVeins(p, REACH, 13, 41, clamp(fr / REACH), (u) => (t < 0.3 ? C[7] : C[5]), out * 0.55); p.place(p.tx - 1, p.ty + 1);
        runeCircle(p, REACH * 0.5 * clamp(fr / REACH + 0.02), t * 0.4, C, out * 0.9, "tho", 9);
      }
      for (const [d, th] of [[0, 9], [0.09, 5]]) { const u = clamp((t - d) / (SPREAD + 0.14)); if (u > 0 && u < 1) band(p, 0, 0, front(t - d) + 2, SY, Math.max(1.5, th * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, t < 0.08); }
    },
    // lớp nổi: mỏm đá (xa vẽ trước), sỏi, bụi
    draw(p) {
      const m = smooth(HOLD, HOLD + SINK, t);
      for (const s of sites) {
        if (!s.up || m >= 1) continue;
        const g = ease.outBack(clamp((t - s.t0) / 0.11), 2.4) * (1 - m), white = t < s.t0 + 0.03, far = s.y < -REACH * SY * 0.35;
        for (const q of s.kids) crystal(p, s.x + q.dx, s.y, q.h * g, q.w, q.lean * g, far ? DIM : C, { white });
        crystal(p, s.x, s.y, s.h * g, s.w, s.lean * g, far ? DIM : C, { white });
      }
      bits.draw(p);
      ps.draw(p);
      if (t < 0.16) p.glow(0, -4, 40, WHITE, 0.4 * (1 - t / 0.16));
      lights.draw(p);
    },
  };
}
