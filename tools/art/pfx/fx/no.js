// Nổ / trúng đòn theo hệ. Công thức lửa cuộn thành khói, tia lửa, mảnh vụn theo bộ đồ nghề của PixelFX (src/core/sim.js,
// vốn phỏng theo hiệu ứng mã mở của Sprite Fusion, MIT, Copyright (c) 2026 Hugo Duprez).
import { Particles, Bits, Lights, P, PF, B, Rng, fit, flare, sparkle, band, clamp, ease, TAU, WHITE, hex, mix } from "../../core/index.js";
import { SY } from "./_td.js";

export const meta = {
  name: "Nổ theo hệ",
  desc: "Chớp trắng một khung, tia toả tám hướng, vòng xung kích nở trên mặt đất, tia lửa bắn ra rồi rơi; mỗi hệ một kiểu vụn: lửa cuộn thành khói, băng vỡ thành mảnh, đá văng cục, lá bay, nước tóe giọt, kim quang lấp lánh, âm ba lan vòng.",
  tags: ["p2d", "impact", "one-shot"],
  size: [176, 160],
  origin: [88, 92],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], kind: "lua", size: 1, seed: 3 },
};

export function create(o) {
  const C = fit(o.palette, 8), K = o.kind, S = o.size, q = Math.sqrt(S) * 0.58, R = new Rng(o.seed);   // q: hệ số tốc độ văng (nổ nhỏ văng gần)
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[3]], haze: K === "bang" || K === "nuoc" || K === "am" ? C[5] : undefined });
  const bits = new Bits(), lights = new Lights(), Y = -3, RAD = 9 * S;
  const rad = (n, fn) => { for (let i = 0; i < n; i++) { const a = R.range(0, TAU); fn(Math.cos(a), Math.sin(a), a); } };
  lights.add(0, Y, 20 + 14 * S, C[5], 0.85, 0.45);
  lights.add(0, Y, 9 + 7 * S, WHITE, 0.8, 0.1);
  if (K !== "am") rad(Math.round(8 + 12 * S), (cx, cy) => { const sp = R.range(110, 300) * q; ps.spawn(P.SPARK, cx * 2, Y + cy * 2, cx * sp, cy * sp - 50, R.range(0.14, 0.42)); });
  if (K === "lua") {
    for (let i = 0; i < 3 + S; i++) ps.spawn(P.FIRE, R.range(-2, 2), Y + R.range(-2, 2), R.range(-15, 15), R.range(-30, -8), R.range(0.16, 0.28), 0, R.range(RAD * 0.5, RAD * 0.7));
    rad(Math.round(7 + 9 * S), (cx, cy) => { const sp = R.range(30, 130) * Math.sqrt(S), d = R.range(0, RAD * 0.5); ps.spawn(P.FIRE, cx * d, Y + cy * d, cx * sp, cy * sp * 0.8 - 30, R.range(0.32, 0.7), 0, R.range(RAD * 0.26, RAD * 0.5), 0, R.chance(0.5) ? PF.SMOKES : 0); });
    rad(Math.round(5 + 6 * S), (cx, cy) => { const sp = R.range(30, 120); ps.spawn(P.EMBER, cx * RAD * 0.4, Y + cy * RAD * 0.4, cx * sp, cy * sp - 60, R.range(0.45, 0.85), C[4]); });
  } else if (K === "bang") {
    rad(Math.round(9 + 8 * S), (cx, cy) => { const sp = R.range(90, 250) * q; bits.add({ kind: B.SHARD, x: cx * 3, y: Y + cy * 3, vx: cx * sp, vy: cy * sp - 40, g: 0.55, drag: 1.4, life: R.range(0.35, 0.7), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.2 + S * 0.5), c: R.pick([C[7], C[6], C[5]]) }); });
    rad(Math.round(6 + 5 * S), (cx, cy) => { const sp = R.range(30, 110); ps.spawn(P.FLAKE, cx * 4, Y + cy * 4, cx * sp, cy * sp - 20, R.range(0.5, 0.85), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.6)); });
    rad(Math.round(3 + 3 * S), (cx, cy) => ps.spawn(P.VAPOUR, cx * RAD * 0.5, Y + cy * RAD * 0.4, cx * 40, cy * 30 - 8, R.range(0.4, 0.7), C[6], R.range(2.6, 4) * Math.sqrt(S)));
  } else if (K === "da") {
    const ramp = [C[0], C[2], C[4], C[5], C[6]];
    rad(Math.round(5 + 5 * S), (cx, cy) => { const sp = R.range(70, 200) * q; bits.add({ kind: B.CHUNK, x: cx * 3, y: Y + cy * 3, vx: cx * sp, vy: cy * sp - 90, g: 0.75, drag: 0.9, life: R.range(0.45, 0.8), a: R.range(0, TAU), va: R.range(-16, 16), s: R.range(1.2, 2.4 + S * 0.4), ramp }); });
    rad(Math.round(10 + 10 * S), (cx, cy) => { const sp = R.range(60, 190) * q; ps.spawn(P.GRIT, cx * 2, Y + cy * 2, cx * sp, cy * sp - 110, R.range(0.4, 0.75), R.pick([C[6], C[5], C[4], C[3]]), R.chance(0.4) ? 2 : 1); });
    rad(Math.round(4 + 4 * S), (cx, cy) => ps.spawn(P.DUST, cx * RAD * 0.5, Y + cy * RAD * 0.4, cx * 55, cy * 40 - 6, R.range(0.45, 0.8), mix(C[5], hex("#9a9088"), 0.5), R.range(2.6, 4.4) * Math.sqrt(S)));
  } else if (K === "la") {
    rad(Math.round(8 + 7 * S), (cx, cy) => { const sp = R.range(60, 170) * q; bits.add({ kind: B.SHARD, x: cx * 3, y: Y + cy * 3, vx: cx * sp, vy: cy * sp - 50, g: 0.22, drag: 2.4, life: R.range(0.5, 0.85), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(2, 3.6), c: R.pick([C[6], C[5], C[4]]) }); });
    rad(Math.round(6 + 5 * S), (cx, cy) => { const sp = R.range(40, 130); ps.spawn(P.MOTE, cx * 3, Y + cy * 3, cx * sp, cy * sp - 20, R.range(0.25, 0.5), R.chance(0.5) ? C[7] : C[6], 0.6); });
    rad(Math.round(3 + 3 * S), () => ps.spawn(P.STAR, R.range(-RAD, RAD), Y + R.range(-RAD, RAD), 0, -6, R.range(0.3, 0.6), C[7], R.range(0.8, 2)));
  } else if (K === "nuoc") {
    rad(Math.round(10 + 9 * S), (cx, cy) => { const sp = R.range(70, 210) * q; bits.add({ kind: B.DRIP, x: cx * 3, y: Y + cy * 3, vx: cx * sp, vy: cy * sp - 120, g: 0.6, drag: 0.8, life: R.range(0.35, 0.65), c: R.pick([C[7], C[6], C[5]]) }); });
    rad(Math.round(4 + 4 * S), (cx, cy) => ps.spawn(P.VAPOUR, cx * RAD * 0.5, Y + cy * RAD * 0.4, cx * 45, cy * 35 - 10, R.range(0.4, 0.7), C[6], R.range(2.6, 4) * Math.sqrt(S)));
  } else if (K === "kim") {
    rad(Math.round(5 + 4 * S), (cx, cy) => { const d = R.range(RAD * 0.5, RAD * 1.6); ps.spawn(P.STAR, cx * d, Y + cy * d, cx * 14, cy * 14, R.range(0.3, 0.65), R.chance(0.5) ? C[7] : C[6], R.range(1, 3), R.range(0, 0.12)); });
    rad(Math.round(6 + 5 * S), (cx, cy) => { const sp = R.range(120, 260) * q; ps.spawn(P.MOTE, cx * 3, Y + cy * 3, cx * sp, cy * sp, R.range(0.16, 0.34), C[6], 0.7); });
  } else {
    rad(Math.round(5 + 4 * S), (cx, cy) => { const d = R.range(RAD * 0.6, RAD * 1.8); ps.spawn(P.STAR, cx * d, Y + cy * d, cx * 10, cy * 10 - 8, R.range(0.3, 0.6), R.chance(0.5) ? C[7] : C[6], R.range(0.8, 2.4), R.range(0, 0.15)); });
    rad(Math.round(4 + 3 * S), (cx, cy) => ps.spawn(P.VAPOUR, cx * RAD * 0.6, Y + cy * RAD * 0.5, cx * 50, cy * 40 - 6, R.range(0.4, 0.75), C[5], R.range(2.6, 4) * Math.sqrt(S)));
  }
  const RING = (K === "am" ? 30 : 22) * (0.5 + S * 0.55), slash = K === "kim" ? R.range(0.3, 1.2) : 0;
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); bits.update(dt); lights.update(dt); },
    drawBack(p) {
      // vòng xung kích nằm trên mặt đất, nửa xa
      const k = t / 0.32;
      if (k < 1) band(p, 0, Y + 3, RING * ease.outCubic(k), SY, Math.max(1, (1.6 + S) * (1 - k)), 1.2 - k, C, (g) => Math.sin(g) < 0, k < 0.3);
      ps.draw(p, "back");
    },
    draw(p) {
      const k = t / 0.32;
      if (k < 1) band(p, 0, Y + 3, RING * ease.outCubic(k), SY, Math.max(1, (1.6 + S) * (1 - k)), 1.2 - k, C, (g) => Math.sin(g) >= 0, k < 0.3);
      if (K === "am") for (const d of [0.1, 0.22]) { const u = (t - d) / 0.36; if (u > 0 && u < 1) band(p, 0, Y + 3, RING * 0.75 * ease.outCubic(u), SY, 1, 1.1 - u, C.slice(0, 7), () => true); }
      if (K === "bang" && t < 0.3) {   // sao băng sáu cánh: cánh nhọn mọc ra rồi vỡ
        const g = ease.outBack(clamp(t / 0.07), 2.2) * (1 - clamp((t - 0.16) / 0.14)), L = (8 + 6 * S) * g;
        for (let i = 0; i < 6; i++) { const a = 0.3 + (i * TAU) / 6, ca = Math.cos(a), sa = Math.sin(a); p.line(ca * 2, Y + sa * 2, ca * L, Y + sa * L, (u) => (u < 0.5 ? WHITE : C[6])); p.line(ca * 2 - sa, Y + sa * 2 + ca, ca * L * 0.6 - sa, Y + sa * L * 0.6 + ca, C[5]); }
      }
      if (K === "kim" && t < 0.22) {   // hai nhát chém chéo lóe lên
        const g = 1 - t / 0.22, L = (13 + 7 * S) * (0.5 + 0.5 * ease.outCubic(clamp(t / 0.06)));
        for (const s of [slash, slash + 1.75]) { const ca = Math.cos(s), sa = Math.sin(s); p.line(-ca * L, Y - sa * L, ca * L, Y + sa * L, (u) => (Math.abs(u - 0.5) < 0.28 ? WHITE : C[6]), g * 1.3); p.glowLine(-ca * L, Y - sa * L, ca * L, Y + sa * L, 5, C[5], 0.3 * g); }
      }
      bits.draw(p);
      ps.draw(p, "front");
      // chớp: đĩa trắng hai khung rồi co lại thành màu hệ; tia toả tám hướng
      if (t < 0.11) {
        const u = t / 0.11, r = RAD * (0.75 + 0.5 * u) * (1 - u * 0.4);
        p.circle(0, Y, r + 1, C[4]); p.circle(0, Y, r, u < 0.5 ? WHITE : C[6]); if (u >= 0.5) p.circle(0, Y, r * 0.55, WHITE);
      }
      if (t < 0.2) flare(p, 0, Y, (15 + 9 * S) * Math.pow(1 - t / 0.2, 1.4), 1 - t / 0.2, C);
      if (t > 0.05 && t < 0.3 && K !== "bang") sparkle(p, 0, Y, (4 + 2 * S) * (1 - (t - 0.05) / 0.25), C[6], C[5], 0.5);
      lights.draw(p);
    },
  };
}
