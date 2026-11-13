import { Particles, Bits, Lights, P, B, Rng, fit, band, clamp, smooth, ease, rand, TAU, WHITE, hex, mix } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins, runeCircle } from "./_td.js";

export const meta = {
  name: "Sơn nhạc trấn",
  desc: "Nhìn từ trên xuống: bóng một quả núi pháp tướng từ trên trời giáng xuống trấn giữa trận, chạm đất thì đất nứt toang, sóng chấn động và bụi quét ra thật rộng, đá văng; núi trong mờ viền sáng đứng trấn một lúc, chữ ấn trên vách núi rực lên, rồi tan thành bụi sáng.",
  tags: ["p2d", "aoe", "earth", "one-shot", "showpiece"],
  size: [296, 380],
  origin: [148, 262],
  duration: 1.7,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c", "#fff0c8"], reach: 112, seed: 21 },
};

const LAND = 0.17, STAY = 1.2, FADE = 0.35;
// dáng núi: đường đỉnh (x, y) từ trái sang phải; ba ngọn, ngọn giữa cao nhất
const M = 1.45, PEAK = [[-46, 2], [-38, -22], [-27, -34], [-20, -58], [-13, -50], [-4, -92], [5, -70], [12, -78], [20, -52], [29, -44], [38, -18], [46, 2]].map(([x, y]) => [x * M, y * M]);
const topAt = (x) => { for (let i = 1; i < PEAK.length; i++) if (x <= PEAK[i][0]) { const [x0, y0] = PEAK[i - 1], [x1, y1] = PEAK[i]; return [y0 + ((y1 - y0) * (x - x0)) / (x1 - x0), y1 < y0]; } return [2, false]; };

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed), DUST = mix(C[5], hex("#9a9088"), 0.5);
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]] }), bits = new Bits(), lights = new Lights(), ramp = [C[0], C[2], C[4], C[5], C[6]];
  let t = 0, landed = false;
  const front = (tt) => REACH * (0.2 + 0.8 * (1 - Math.pow(1 - clamp((tt - LAND) / 0.26), 3)));
  return {
    update(dt) {
      t += dt;
      if (!landed && t >= LAND) {
        landed = true;
        lights.add(0, -10, REACH * 1.3, C[5], 0.8, 0.7); lights.add(0, -10, 60, WHITE, 0.9, 0.14);
        for (let i = 0; i < 26; i++) { const a = R.range(0, TAU), sp = R.range(90, 260); bits.add({ kind: B.CHUNK, x: Math.cos(a) * 30, y: Math.sin(a) * 12 - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * SY - R.range(60, 170), g: 0.8, drag: 0.7, life: R.range(0.5, 0.95), a: R.range(0, TAU), va: R.range(-16, 16), s: R.range(1.2, 3), ramp }); }
        for (let i = 0; i < 40; i++) { const a = R.range(0, TAU), sp = R.range(80, 260); ps.spawn(P.GRIT, Math.cos(a) * 34, Math.sin(a) * 14 - 3, Math.cos(a) * sp, Math.sin(a) * sp * SY - R.range(60, 200), R.range(0.4, 0.8), R.pick([C[6], C[5], C[4], C[3]]), R.chance(0.4) ? 2 : 1); }
        for (let i = 0; i < 30; i++) { const a = R.range(0, TAU); ps.spawn(P.DUST, Math.cos(a) * 40, Math.sin(a) * 40 * SY, Math.cos(a) * R.range(80, 230), Math.sin(a) * R.range(80, 230) * SY - 8, R.range(0.6, 1.1), DUST, R.range(4, 8)); }
      }
      if (landed && t < LAND + 0.3) for (let i = 0; i < 3; i++) { const a = R.range(0, TAU), [x, y] = gp(a, front(t)); ps.spawn(P.DUST, x, y - 1, Math.cos(a) * R.range(20, 60), Math.sin(a) * R.range(20, 60) * SY - 5, R.range(0.5, 0.9), DUST, R.range(3.5, 6)); }
      if (t > STAY && t < STAY + FADE && R.chance(0.8)) { const x = R.range(-58, 58), [ty] = topAt(x); ps.spawn(P.STAR, x, R.range(ty, 0), R.range(-8, 8), -R.range(10, 30), R.range(0.3, 0.6), R.chance(0.5) ? C[7] : C[6], R.range(0.8, 2.2)); }
      ps.update(dt); bits.update(dt); lights.update(dt);
    },
    // lớp đất: bóng núi lớn dần lúc đang rơi, rồi đất nứt, sóng chấn động, pháp trận thổ
    drawBack(p) {
      if (t < LAND) { const u = t / LAND; groundPatch(p, 30 + 44 * u, (d) => [C[0], (0.25 + 0.3 * u) * (1 - d * 0.6)], 3, 0.3); return; }
      const fr = front(t), out = 1 - smooth(STAY + 0.1, meta.duration - 0.03, t);
      if (out > 0) {
        groundPatch(p, Math.max(10, fr + 1), (d) => [d > 0.94 ? C[3] : C[1], out * (d > 0.94 ? 0.4 : 0.32 - 0.12 * d)], 17);
        groundVeins(p, REACH, 15, 61, clamp(fr / REACH), () => C[0], out, 0.3);
        p.place(p.tx + 1, p.ty - 1); groundVeins(p, REACH, 15, 61, clamp(fr / REACH), () => (t < LAND + 0.25 ? C[7] : C[5]), out * 0.5, 0.3); p.place(p.tx - 1, p.ty + 1);
        runeCircle(p, REACH * 0.6 * clamp(fr / REACH + 0.02), t * 0.3, C, out * 0.9, "tho", 13);
      }
      for (const [d, th] of [[0, 12], [0.08, 7], [0.17, 4]]) { const u = clamp((t - LAND - d) / 0.42); if (u > 0 && u < 1) band(p, 0, 0, front(t - d) + 2, SY, Math.max(1.5, th * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, u < 0.2); }
    },
    // lớp nổi: quả núi pháp tướng trong mờ, viền sáng, vách sáng tối theo sườn, chữ ấn; đá, bụi
    draw(p) {
      const fall = t < LAND ? 1 - Math.pow(t / LAND, 2) : 0, dy = -230 * fall, a = t < LAND ? 0.5 + 0.5 * (t / LAND) : 1 - smooth(STAY, STAY + FADE, t), squash = t >= LAND ? 1 - 0.1 * Math.exp(-(t - LAND) * 22) : 1;
      if (a > 0.02) {
        p.each(-48 * M, -96 * M + dy, 48 * M, 14 + dy, (x, y, sx, sy) => {
          const yy = (y - dy) / squash, [top, lit] = topAt(x), base = 10 * Math.sqrt(Math.max(0, 1 - (x / (46 * M)) ** 2));
          if (yy < top || yy > base) return;
          const edge = yy - top < 1.5 || base - yy < 1.2 || Math.abs(x) > 46 * M - 1.4, depth = (yy - top) / Math.max(1, base - top);
          if (edge) return p.put(sx, sy, a > 0.6 ? C[7] : C[6], a);
          // sườn đón sáng (dốc lên về phải) sáng, sườn khuất tối; gần đỉnh sáng hơn, chân núi sẫm; ngọn cao phủ tuyết
          const c = yy - top < 9 && top < -84 ? C[7] : lit ? (depth < 0.3 ? C[6] : depth < 0.7 ? C[5] : C[4]) : depth < 0.35 ? C[4] : depth < 0.75 ? C[3] : C[2];
          p.blendPx(sx, sy, c, a * (0.66 - 0.18 * depth));
        });
        // gờ núi: nét sáng chạy từ mỗi đỉnh xuống; vài khe nứt sẫm trên vách
        for (const [x, y, len] of [[-20, -58, 34], [-4, -92, 56], [12, -78, 42]]) p.line(x * M, (y * M + 2) * squash + dy, x * M - 7, (y * M + len) * squash + dy, C[7], a * 0.9);
        for (const [x0, y0, x1, y1] of [[-30, -20, -24, -6], [22, -34, 28, -14], [4, -52, 9, -36]]) p.line(x0 * M, y0 * M * squash + dy, x1 * M, y1 * M * squash + dy, C[1], a * 0.8);
        // chữ ấn trên vách: khung vuông và nét, rực lên theo nhịp
        const g = t < LAND ? 0 : (0.6 + 0.4 * Math.sin((t - LAND) * 9)) * a, cy = -34 * squash + dy;
        if (g > 0.05) { for (const [x0, y0, x1, y1] of [[-9, -10, 9, -10], [-9, 10, 9, 10], [-9, -10, -9, 10], [9, -10, 9, 10], [-5, -4, 5, -4], [0, -10, 0, 10], [-5, 4, 5, 4]]) p.line(x0, cy + y0, x1, cy + y1, g > 0.7 ? WHITE : C[7], g * 1.2); p.glow(0, cy, 26, C[6], 0.45 * g); }
        if (t < LAND) for (let i = 0; i < 11; i++) { const x = -58 + i * 11.6 + rand(i, 5) * 4, [ty] = topAt(x); p.line(x, ty + dy - 6, x, ty + dy - 30 - 30 * rand(i, 9), C[6], 0.7); }   // vệt rơi
        p.glow(0, -56 + dy, 96, C[5], 0.3 * a);
      }
      bits.draw(p);
      ps.draw(p);
      if (t >= LAND && t < LAND + 0.14) p.glow(0, -6, 70, WHITE, 0.6 * (1 - (t - LAND) / 0.14));
      lights.draw(p);
    },
  };
}
