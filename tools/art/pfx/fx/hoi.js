import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, TAU, WHITE, sparkle } from "../../core/index.js";
import { SY, gp } from "./_td.js";

export const meta = {
  name: "Hồi xuân (hồi máu)",
  desc: "Dưới chân nở một đoá sen ánh sáng, hai vòng sáng lần lượt dâng từ chân lên quá đầu để lại sao lấp lánh, cột sáng xanh dịu bao quanh người, đốm sinh khí và dấu cộng bay lên.",
  tags: ["p2d", "self", "heal", "one-shot"],
  size: [96, 132],
  origin: [48, 108],
  duration: 1.3,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"], power: 1, seed: 5 },
};

export function create(o) {
  const C = fit(o.palette, 8), K = o.power, R = new Rng(o.seed), ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]] }), lights = new Lights();
  lights.add(0, -22, 46 * K, C[5], 0.6, 0.9);
  lights.add(0, -4, 26, WHITE, 0.6, 0.15);
  let t = 0;
  const hoop = (p, y, r, k, back) => {   // vòng sáng nằm ngang quanh người, nửa xa mờ hơn
    for (let a = 0; a < TAU; a += 0.5 / r) { const far = Math.sin(a) < 0; if (far !== back) continue; const x = Math.cos(a) * r, yy = y + Math.sin(a) * r * 0.34; p.dot(x, yy, far ? C[5] : Math.cos(a - 2.2) > 0.6 ? WHITE : C[6], k * (far ? 0.75 : 1.2)); if (!far) p.dot(x, yy + 1, C[4], k * 0.6); }
    if (!back) p.glow(0, y, r * 1.4, C[5], 0.3 * k);
  };
  const hoops = [{ t0: 0.06, r: 15 * K }, { t0: 0.34, r: 13 * K }];
  return {
    update(dt) {
      t += dt;
      for (const h of hoops) { const u = (t - h.t0) / 0.5; if (u > 0 && u < 1 && R.chance(0.7)) { const a = R.range(0, TAU); ps.spawn(P.STAR, Math.cos(a) * h.r, -2 - 50 * ease.outQuad(u) + Math.sin(a) * h.r * 0.34, 0, -4, R.range(0.3, 0.6), R.chance(0.5) ? WHITE : C[6], R.range(0.7, 2.2)); } }
      if (t < 0.9 && R.chance(0.5 * K)) { const a = R.range(0, TAU), d = R.range(4, 20) * K; ps.spawn(P.MOTE, Math.cos(a) * d, -2 + Math.sin(a) * d * 0.4, R.range(-4, 4), -R.range(30, 70), R.range(0.4, 0.8), R.chance(0.5) ? C[7] : C[6], 0.5); }
      ps.update(dt); lights.update(dt);
    },
    // lớp đất: đoá sen ánh sáng nở dưới chân
    drawBack(p) {
      const g = ease.outBack(clamp(t / 0.22), 1.8), out = 1 - smooth(0.85, 1.25, t), N = 8, L = 17 * K * g;
      if (out <= 0) return;
      for (let i = 0; i < N; i++) {   // cánh sen: hình thoi nhọn toả tròn trên mặt đất, lớp trong lệch nửa cánh
        for (const [len, off, c] of [[L, 0, C[5]], [L * 0.62, 0.5, C[6]]]) {
          const a = ((i + off) * TAU) / N + t * 0.5, [tx, ty] = gp(a, len), [lx, ly] = gp(a - 0.3, len * 0.55), [rx, ry] = gp(a + 0.3, len * 0.55);
          p.line(0, 0, lx, ly, c, out); p.line(lx, ly, tx, ty, c, out); p.line(tx, ty, rx, ry, c, out); p.line(rx, ry, 0, 0, c, out);
          p.blend((lx + rx + tx) / 3, (ly + ry + ty) / 3, c, 0.5 * out); p.dot(tx, ty, WHITE, out);
        }
      }
      for (let a = 0; a < TAU; a += 0.4 / (L + 3)) { const [x, y] = gp(a, L + 3); p.dot(x, y, C[4], out * 0.8); }
      p.glow(0, 0, 28 * K, C[5], 0.3 * out);
      for (const h of hoops) { const u = (t - h.t0) / 0.5; if (u > 0 && u < 1) hoop(p, -2 - 50 * ease.outQuad(u), h.r * (1 - 0.25 * u), Math.sin(Math.PI * Math.min(1, u * 1.15)), true); }
    },
    // lớp nổi: vòng sáng dâng lên, cột sáng, sao và dấu cộng
    draw(p) {
      const col = Math.sin(Math.PI * clamp(t / 1.0)) * 0.5;
      if (col > 0.02) { p.glowLine(0, -2, 0, -52, 16 * K, C[4], col * 0.5); p.glowLine(0, -2, 0, -44, 7, C[6], col * 0.35); }
      for (const h of hoops) { const u = (t - h.t0) / 0.5; if (u > 0 && u < 1) hoop(p, -2 - 50 * ease.outQuad(u), h.r * (1 - 0.25 * u), Math.sin(Math.PI * Math.min(1, u * 1.15)), false); }
      for (let i = 0; i < Math.round(3 * K); i++) {   // dấu cộng hồi phục bay lên, lớn rồi tan
        const u = (t - 0.15 - i * 0.2) / 0.7; if (u <= 0 || u >= 1) continue;
        const x = (i % 2 ? 1 : -1) * (9 + i * 3) * K, y = -18 - 30 * u, k = Math.sin(Math.PI * u), s = k > 0.5 ? 2 : 1;
        for (let d = -s; d <= s; d++) { p.dot(x + d, y, d === 0 ? WHITE : C[6], k * 1.3); p.dot(x, y + d, d === 0 ? WHITE : C[6], k * 1.3); }
        p.glow(x, y, 6, C[5], 0.4 * k);
      }
      ps.draw(p);
      if (t < 0.16) sparkle(p, 0, -4, 7 * (1 - t / 0.16), WHITE, C[6], 0.6);
      lights.draw(p);
    },
  };
}
