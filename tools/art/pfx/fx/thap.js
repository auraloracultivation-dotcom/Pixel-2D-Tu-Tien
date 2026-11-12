import { Particles, Lights, P, Rng, fit, band, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";
import { SY, gp, runeCircle } from "./_td.js";

export const meta = {
  name: "Trấn yêu tháp",
  desc: "Bóng một ngọn bảo tháp chín tầng bằng kim quang từ trên trời giáng xuống chụp lấy người, chạm đất thì vòng kim quang toả ra, chuông gió trên mái rung sáng; tháp trong mờ đứng một lúc rồi tan thành sao vàng.",
  tags: ["p2d", "self", "shield", "one-shot"],
  size: [132, 190],
  origin: [66, 146],
  duration: 1.25,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"], tiers: 5, seed: 23 },
};
const LAND = 0.16, STAY = 0.8, FADE = 0.4;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), ps = new Particles({ rng: R, sparks: [C[7], C[6], C[5], C[4]] }), lights = new Lights(), N = o.tiers;
  let t = 0, landed = false;
  return {
    update(dt) {
      t += dt;
      if (!landed && t >= LAND) { landed = true; lights.add(0, -20, 70, C[5], 0.8, 0.5); lights.add(0, -6, 36, WHITE, 0.8, 0.12); for (let i = 0; i < 18; i++) { const a = R.range(0, TAU), sp = R.range(60, 180); ps.spawn(P.SPARK, Math.cos(a) * 14, Math.sin(a) * 6 - 3, Math.cos(a) * sp, Math.sin(a) * sp * SY - 40, R.range(0.2, 0.45)); } }
      if (t > STAY && t < STAY + FADE && R.chance(0.8)) ps.spawn(P.STAR, R.range(-16, 16), -R.range(4, 84), R.range(-6, 6), -R.range(8, 24), R.range(0.3, 0.55), R.chance(0.5) ? WHITE : C[6], R.range(0.8, 2.2));
      ps.update(dt); lights.update(dt);
    },
    drawBack(p) {
      if (t < LAND) return;
      const out = 1 - smooth(STAY, STAY + FADE, t);
      runeCircle(p, 26 * ease.outBack(clamp((t - LAND) / 0.12), 2), t * 0.8, C, out, "kim", 6);
      const u = (t - LAND) / 0.34; if (u < 1) band(p, 0, 0, 14 + 40 * ease.outCubic(u), SY, Math.max(1.5, 6 * (1 - u)), 1.1 - u, C, () => true, u < 0.25);
    },
    draw(p) {
      const fall = t < LAND ? 1 - Math.pow(t / LAND, 2) : 0, dy = -150 * fall, a = t < LAND ? 0.55 + 0.45 * (t / LAND) : 1 - smooth(STAY, STAY + FADE, t), sq = t >= LAND ? 1 - 0.08 * Math.exp(-(t - LAND) * 24) : 1;
      if (a > 0.02) {
        // tháp: các tầng thu nhỏ dần lên trên; mỗi tầng một thân vuông trong mờ và một mái cong hất hai đầu
        let y = 0;
        for (let i = 0; i < N; i++) {
          const w = 20 - i * 2.6, h = 13 - i * 1.1, top = (y - h) * sq + dy, bot = y * sq + dy;
          p.each(-w, top, w, bot, (x, yy, sx, sy) => { const edge = Math.abs(x) > w - 1.2; if (edge) p.put(sx, sy, C[6], a); else p.blendPx(sx, sy, Math.abs(x) < w * 0.3 && bot - yy < h * 0.7 ? C[2] : (x < 0 ? C[5] : C[4]), a * (Math.abs(x) < w * 0.3 && bot - yy < h * 0.7 ? 0.5 : 0.46)); });
          const ry = top, ew = w + 5;   // mái: nét sáng, hai đầu cong lên, dưới mái một nét sẫm
          for (let x = -ew; x <= ew; x++) { const lift = Math.pow(Math.abs(x) / ew, 3) * 3.4; p.dot(x, ry - lift, Math.abs(x) > ew - 2 ? WHITE : C[7], a * 1.2); p.dot(x, ry + 1 - lift, C[5], a); if (Math.abs(x) < ew - 2) p.dot(x, ry + 2 - lift * 0.5, C[3], a * 0.8); }
          const bell = 0.5 + 0.5 * Math.sin(t * 22 + i * 1.7);   // chuông gió hai đầu mái
          for (const s of [-1, 1]) { p.dot(s * ew, ry - 1, bell > 0.5 ? WHITE : C[6], a * 1.3); if (t >= LAND) p.light(s * ew, ry - 1, C[6], 0.8 * a * bell); }
          y -= h;
        }
        const tip = y * sq + dy; p.line(0, tip, 0, tip - 9, C[7], a * 1.2); p.dot(0, tip - 10, WHITE, a * 1.3); p.dot(-1, tip - 4, C[6], a); p.dot(1, tip - 4, C[6], a);
        if (t < LAND) for (const x of [-18, -8, 4, 14]) p.line(x, tip + 20 - 8, x, tip - 30 - (x & 7) * 3, C[6], 0.6);
        p.glowLine(0, dy - 2, 0, tip, 26, C[4], 0.3 * a); p.glow(0, tip - 8, 10, WHITE, 0.4 * a);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
