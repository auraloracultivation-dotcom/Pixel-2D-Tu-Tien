import { Particles, Bits, Lights, P, B, Rng, fit, band, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, ringSites, runeCircle } from "./_td.js";

export const meta = {
  name: "Đằng phược",
  desc: "Nhìn từ trên xuống: rễ lan dưới đất, dây leo gai trồi lên ba vòng, uốn móc câu chụp vào trong trói quái, lá non bật ra, đung đưa giữ một lúc rồi héo rút xuống.",
  tags: ["p2d", "aoe", "wood", "one-shot"],
  size: [196, 196],
  origin: [98, 116],
  duration: 1.7,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"], reach: 68, seed: 9 },
};

const SPREAD = 0.22, HOLD = 1.25, WILT = 0.35;
const RINGS = [{ q: 0.36, n: 4, h: [28, 36] }, { q: 0.66, n: 7, h: [19, 27] }, { q: 0.94, n: 11, h: [11, 17] }];

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed), ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]] }), bits = new Bits(), lights = new Lights();
  const front = (t) => REACH * (0.12 + 0.88 * (1 - Math.pow(1 - clamp(t / SPREAD), 3)));
  const sites = ringSites(REACH, RINGS, R).map((s) => ({ ...s, h: R.range(...RINGS[s.ring].h), side: Math.cos(s.a) > 0 ? -1 : 1, curl: R.range(2.2, 3.1), ph: R.range(0, TAU), t0: SPREAD * (1 - Math.cbrt(1 - Math.min(1, (s.d / REACH - 0.12) / 0.88))) + R.range(0, 0.05), up: false, leaves: [R.range(0.3, 0.45), R.range(0.55, 0.7), R.range(0.8, 0.92)] }));
  lights.add(0, -6, REACH * 1.2, C[5], 0.5, 0.6);
  for (let i = 0; i < 14; i++) { const a = R.range(0, TAU), sp = R.range(50, 150); bits.add({ kind: B.SHARD, x: 0, y: -6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * SY - 40, g: 0.2, drag: 2.4, life: R.range(0.5, 0.9), a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(2, 3.6), c: R.pick([C[6], C[5], C[4]]) }); }
  let t = 0;
  // một dây leo: mọc thẳng lên rồi uốn móc câu về phía tâm; thân sẫm viền, sống sáng, gai và lá non
  const vine = (p, s, g, sway) => {
    const N = Math.max(4, Math.round(s.h * g)), ds = (s.h * g) / N;
    let x = s.x, y = s.y, th = -Math.PI / 2;
    const pts = [[x, y]];
    for (let i = 1; i <= N; i++) { const u = i / N; th = -Math.PI / 2 + s.side * (Math.pow(u, 1.6) * s.curl * g + sway * u); x += Math.cos(th) * ds; y += Math.sin(th) * ds; pts.push([x, y, th]); }
    for (let i = 0; i <= N; i++) { const u = i / N, r = 2.1 * (1 - u * 0.7); p.circle(pts[i][0], pts[i][1], r + 0.9, C[0]); }
    for (let i = 0; i <= N; i++) { const u = i / N, r = 2.1 * (1 - u * 0.7); p.circle(pts[i][0], pts[i][1], r, u > 0.85 ? C[5] : C[3]); }
    for (let i = 1; i <= N; i++) { const [qx, qy, a] = pts[i], u = i / N; p.px(qx - Math.sin(a) * 0.9 * s.side, qy + Math.cos(a) * 0.9 * s.side, u > 0.6 ? C[6] : C[5]);
      if (i % 4 === 2 && u < 0.9) { const nx = Math.sin(a) * s.side, ny = -Math.cos(a) * s.side; p.line(qx + nx * 2, qy + ny * 2, qx + nx * 4.4, qy + ny * 4.4 - 0.6, C[6]); } }
    for (const lu of s.leaves) { if (lu > g) continue; const [qx, qy, a] = pts[Math.min(N, Math.round(lu * N))], nx = -Math.sin(a) * s.side, ny = Math.cos(a) * s.side, L = 5.5;
      p.tri(qx, qy, qx + nx * L + Math.cos(a) * 2.4, qy + ny * L + Math.sin(a) * 2.4, qx + nx * L - Math.cos(a) * 1.6, qy + ny * L - Math.sin(a) * 1.6, C[5]); p.line(qx, qy, qx + nx * L, qy + ny * L, C[7]); }
    p.px(pts[N][0], pts[N][1], C[7]);
    return pts[N];
  };
  return {
    update(dt) {
      t += dt;
      for (const s of sites) {
        if (s.up || t < s.t0) continue;
        s.up = true;
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 130); bits.add({ kind: B.SHARD, x: s.x, y: s.y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.25, drag: 2.2, life: R.range(0.45, 0.8), a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(2, 3.4), c: R.pick([C[6], C[5], C[4]]) }); }
        ps.spawn(P.DUST, s.x, s.y - 1, R.range(-14, 14), -R.range(4, 10), R.range(0.35, 0.6), C[2], R.range(2.5, 4));
      }
      if (t > SPREAD && t < HOLD && R.chance(0.3)) { const a = R.range(0, TAU), d = Math.sqrt(R.next()) * REACH; ps.spawn(P.STAR, Math.cos(a) * d, Math.sin(a) * d * SY - R.range(4, 26), 0, -8, R.range(0.3, 0.6), R.chance(0.5) ? C[7] : C[6], R.range(0.6, 1.8)); }
      ps.update(dt); bits.update(dt); lights.update(dt);
    },
    // lớp đất: đất ẩm sẫm xanh, rễ lan, pháp trận mộc, vòng sinh khí
    drawBack(p) {
      const fr = front(t), out = 1 - smooth(HOLD + 0.2, meta.duration - 0.03, t);
      if (out > 0) {
        groundPatch(p, Math.max(8, fr + 1), (d) => [d > 0.92 ? C[4] : C[1], out * (d > 0.92 ? 0.5 : 0.36 - 0.1 * d)], 5);
        groundVeins(p, REACH, 12, 51, clamp(fr / REACH), (u) => (u > 0.75 ? C[5] : C[3]), out);
        runeCircle(p, REACH * 0.5 * clamp(fr / REACH + 0.02), t * 0.5, C, out * 0.9, "moc", 7);
      }
      const u = clamp(t / (SPREAD + 0.14));
      if (u < 1) band(p, 0, 0, fr + 2, SY, Math.max(1.5, 7 * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, t < 0.08);
    },
    // lớp nổi: dây leo (xa vẽ trước), lá bay, đốm sáng
    draw(p) {
      const wilt = smooth(HOLD, HOLD + WILT, t);
      for (const s of sites) {
        if (!s.up || wilt >= 1) continue;
        const g = ease.outBack(clamp((t - s.t0) / 0.2), 1.6) * (1 - wilt), tip = vine(p, s, Math.max(0.05, g), Math.sin(t * 3.2 + s.ph) * 0.22);
        if (g > 0.9) p.glow(tip[0], tip[1], 7, C[6], 0.2);
      }
      bits.draw(p);
      ps.draw(p);
      if (t < 0.18) { p.glow(0, -6, 36, WHITE, 0.4 * (1 - t / 0.18)); }
      for (let i = 0; i < 5; i++) { const [x, y] = gp((i * TAU) / 5 + 0.7, front(t) * 0.6); p.glow(x, y - 6, 26, C[4], 0.1 * (1 - wilt)); }
      lights.draw(p);
    },
  };
}
