import { Particles, Bits, Lights, P, B, Rng, fit, band, clamp, smooth, TAU, WHITE, hex, mix } from "../../core/index.js";
import { SY, gp, groundPatch, groundVeins } from "./_td.js";

export const meta = {
  name: "Đại ấn giáng (dấu triện in xuống đất)",
  desc: "Hiệu ứng riêng của Đại Ấn lúc khối ấn nện xuống, nhìn từ trên xuống (khối ấn là hình riêng, tranh gốc của chủ dự án). Lớp đất: mặt đất sém lại, khe nứt toả ra có linh quang vàng chạy trong khe, giữa là DẤU TRIỆN vừa in (to hơn chân ấn, khối ấn tan rồi vẫn còn nằm lại một nhịp): khung vuông hồi văn đặt chéo và vòng thái cực, lóe trắng rồi rực vàng, mờ dần; hai vành chấn động quét ra. Lớp nổi: chùm tia vàng dựng đứng bật lên quanh chỗ ấn nện, vành bụi đất dựng lên rồi tan, đá vụn và tia lửa vàng văng ra.",
  tags: ["p2d", "aoe", "one-shot"],
  size: [230, 250],
  origin: [115, 170],
  duration: 1.5,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], reach: 80, seed: 31 },
};
const SPREAD = 0.2, ROCK = ["#1a140e", "#3a3026", "#5e5446", "#8a8070", "#b8ae9a"].map(hex);

export function create(o) {
  const C = fit(o.palette, 8), REACH = o.reach, R = new Rng(o.seed), DUST = mix(C[5], hex("#a89c8a"), 0.6), S = REACH * 0.36, M = REACH * 0.52;   // S: chân khối ấn; M: nửa đường chéo dấu triện (to hơn chân ấn nên lộ ra quanh khối ấn)
  const ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]] }), bits = new Bits(), lights = new Lights();
  const front = (t) => REACH * (0.14 + 0.86 * (1 - Math.pow(1 - clamp(t / SPREAD), 3)));
  // chùm tia vàng dựng đứng: rải quanh mép khối ấn, tia giữa cao nhất
  const rays = Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * TAU + R.range(-0.2, 0.2), d = S * R.range(0.5, 1.05); return { x: Math.cos(a) * d, y: Math.sin(a) * d * SY, h: R.range(38, 92), w: R.range(2.2, 4.2), t0: R.range(0, 0.05), life: R.range(0.2, 0.34) }; }).sort((a, b) => a.y - b.y);
  lights.add(0, -6, REACH * 1.2, C[5], 0.6, 0.5); lights.add(0, -6, 40, WHITE, 0.8, 0.12);
  let t = 0, burst = false;
  return {
    update(dt) {
      t += dt;
      if (!burst) {   // lúc nện: đá vụn văng, tia lửa vàng tóe
        burst = true;
        for (let i = 0; i < 16; i++) { const a = R.range(0, TAU), sp = R.range(70, 190); bits.add({ kind: B.CHUNK, x: Math.cos(a) * S * 0.7, y: Math.sin(a) * S * 0.7 * SY - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * SY - R.range(60, 170), g: 0.9, drag: 0.6, life: R.range(0.5, 0.95), a: R.range(0, TAU), va: R.range(-16, 16), s: R.range(1.2, 2.8), ramp: ROCK }); }
        for (let i = 0; i < 26; i++) { const a = R.range(0, TAU), sp = R.range(80, 220); ps.spawn(P.SPARK ?? P.GRIT, Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5 * SY - 4, Math.cos(a) * sp, Math.sin(a) * sp * SY - R.range(40, 150), R.range(0.3, 0.7), R.pick([C[7], C[6], C[5]]), R.chance(0.35) ? 2 : 1); }
      }
      const fr = front(t);
      if (t < SPREAD + 0.08) for (let i = 0; i < 5; i++) { const a = R.range(0, TAU), [x, y] = gp(a, fr); ps.spawn(P.DUST, x, y - 1, Math.cos(a) * R.range(26, 80), Math.sin(a) * R.range(26, 80) * SY - R.range(8, 22), R.range(0.5, 1.0), DUST, R.range(3.2, 6)); }
      ps.update(dt); bits.update(dt); lights.update(dt);
    },
    // lớp đất: đất sém, khe nứt có linh quang, dấu triện, vành chấn động
    drawBack(p) {
      const fr = front(t), out = 1 - smooth(1.0, meta.duration - 0.03, t), hot = 1 - smooth(0.05, 0.55, t);
      if (out <= 0) return;
      groundPatch(p, Math.max(8, fr * 0.8), (d) => [C[0], out * (0.36 - 0.2 * d)], 7);
      groundVeins(p, REACH * 0.92, 12, o.seed, clamp(fr / REACH), () => C[0], out, 0.42, { straight: true, branch: 0.3 });
      p.place(p.tx, p.ty - 1); groundVeins(p, REACH * 0.92, 12, o.seed, clamp(fr / REACH), (u) => (hot > 0.5 ? WHITE : u < 0.5 ? C[6] : C[4]), out * (0.35 + 0.65 * hot), 0.42, { straight: true, branch: 0.3 }); p.place(p.tx, p.ty + 1);
      // dấu triện: khung vuông đặt chéo (hồi văn hai nét) + vòng thái cực; lóe trắng lúc in, rực vàng, mờ dần qua lưới chấm
      const glow = t < 0.08 ? WHITE : hot > 0.4 ? C[6] : C[5], dim = hot > 0.4 ? C[5] : C[4], tr = 16;
      p.each(-M - 3, -M * SY - 3, M + 3, M * SY + 3, (x, y, sx, sy) => {
        const Y = y / SY, m = Math.abs(x) + Math.abs(Y), d = Math.hypot(x, Y);
        let c = 0;
        if (m <= M && m > M - 3.2) c = glow;                                           // nét ngoài của khung
        else if (m <= M - 5.5 && m > M - 7.2) c = dim;                                 // nét trong
        else if (m <= M - 3.2 && m > M - 5.5 && (Math.abs(Math.abs(x) - Math.abs(Y)) < 2.2 || Math.abs(x) < 1.3 || Math.abs(Y) < 1.3)) c = dim;   // mấu hồi văn ở bốn góc và giữa cạnh
        else if (d <= tr + 1.4 && d > tr) c = glow;                                    // vành thái cực
        else if (d <= tr) {
          const up = Math.hypot(x, Y + tr / 2), dn = Math.hypot(x, Y - tr / 2);
          const lit = up < tr / 2 ? true : dn < tr / 2 ? false : x < 0;
          c = up < 2.2 ? 0 : dn < 2.2 ? glow : lit ? glow : 0;                           // hai nửa âm dương, mỗi nửa một chấm
          if (!c && (up < tr / 2 + 0.01 || !lit)) c = hot > 0.6 ? C[2] : 0;
        }
        if (c) p.put(sx, sy, c, out * (c === dim ? 0.85 : 1));
        if (c && hot > 0.1) p.add(sx, sy, C[5], 0.5 * hot);
      });
      for (const [d, th] of [[0, 8], [0.08, 4]]) { const u = clamp((t - d) / (SPREAD + 0.14)); if (u > 0 && u < 1) band(p, 0, 0, front(t - d) + 2, SY, Math.max(1.5, th * Math.pow(1 - u, 0.7)), u < 0.7 ? 1 : (1 - u) / 0.3, C, () => true, t < 0.07); }
    },
    // lớp nổi: tia vàng dựng đứng, bụi, đá vụn
    draw(p) {
      for (const r of rays) {
        const u = (t - r.t0) / r.life;
        if (u <= 0 || u >= 1) continue;
        const h = r.h * (0.35 + 0.65 * Math.min(1, u * 3)), fade = u < 0.5 ? 1 : (1 - u) / 0.5;
        p.each(r.x - r.w - 1, r.y - h - 1, r.x + r.w + 1, r.y + 1, (x, y, sx, sy) => {
          const v = (r.y - y) / h;
          if (v < 0 || v > 1) return;
          const w = r.w * Math.pow(1 - v, 0.7) + 0.4, q = Math.abs(x - r.x) / w;
          if (q > 1) return;
          p.put(sx, sy, q < 0.38 ? WHITE : q < 0.72 ? C[6] : C[5], fade * (v > 0.6 ? (1 - v) / 0.4 + 0.2 : 1));
          p.add(sx, sy, C[5], 0.45 * fade * (1 - v));
        });
      }
      bits.draw(p); ps.draw(p);
      if (t < 0.14) p.glow(0, -8, 46, WHITE, 0.55 * (1 - t / 0.14));
      lights.draw(p);
    },
  };
}
