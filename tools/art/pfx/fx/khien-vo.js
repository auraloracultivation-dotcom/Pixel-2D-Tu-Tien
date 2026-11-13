import { fit, clamp, TAU, WHITE } from "../../core/index.js";
import { VIEW } from "./mai-rua.js";

export const meta = {
  name: "Mai rùa vỡ (Hộ Thuẫn phản kích)",
  desc: "Hiệu ứng riêng lúc vòm Hộ Thuẫn vỡ (hết giờ hoặc bị đánh vỡ), vẽ theo cỡ điểm của nhân vật: vòm loé trắng một nhịp, rồi từng mảnh mai rùa bung ra theo đúng hướng chỗ nó nằm trên vòm, vừa bay vừa nhỏ dần và rơi xuống, mảnh mặt sau mờ hơn; một vành sáng quét ra, vụn sáng li ti bay theo.",
  tags: ["p2d", "self", "one-shot"],
  size: [240, 220],
  origin: [120, 110],
  duration: 0.6,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"], radius: 40 },
};
const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, q = R / 40, u = clamp(t / meta.duration), out = 1 - Math.pow(1 - u, 2.6), fade = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
  if (t < 0.09) {   // vòm loé trắng trước khi vỡ
    const k = 1 - t / 0.09;
    for (let a = 0; a < TAU; a += 0.5 / R) p.dot(Math.cos(a) * R, Math.sin(a) * R, WHITE, k);
    p.glow(0, 0, R * 1.5, WHITE, 0.7 * k); p.glow(0, 0, R * 0.9, C[6], 0.6 * k);
  }
  // vành sáng quét ra
  const rr = R * (1 + 1.7 * out), th = u < 0.25 ? 3 : u < 0.55 ? 2 : 1;
  for (let a = 0; a < TAU; a += 0.6 / rr) for (let j = 0; j < th; j++) p.dot(Math.cos(a) * (rr - j), Math.sin(a) * (rr - j) * 0.9, u < 0.2 ? WHITE : C[5], fade * 0.85);
  // vụn nhỏ bắn ra giữa các mảnh lớn
  for (let i = 0; i < 18; i++) {
    const a = rnd(i, 20) * TAU, sp = 1.2 + 2 * rnd(i, 21), x = Math.cos(a) * R * (0.8 + sp * out), y = Math.sin(a) * R * (0.8 + sp * out) * 0.9 + 30 * q * u * u, s = u < 0.4 ? 2 : 1;
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) p.dot(x + xx, y + yy, u < 0.2 ? WHITE : i % 2 ? C[6] : C[5], fade);
  }
  // mảnh mai: mặt sau vẽ trước (mờ), mặt trước vẽ sau
  for (const front of [false, true]) VIEW.forEach(([vx, vy, vz], i) => {
    if ((vz >= 0) !== front) return;
    let dx = vx, dy = vy; const d = Math.hypot(dx, dy);
    if (d < 0.25) { const a = rnd(i, 1) * TAU; dx = Math.cos(a) * 0.3; dy = Math.sin(a) * 0.3 - 0.2; }       // mảnh nhìn thẳng vào: bung lệch ra một hướng
    const sp = 1.5 + 1.3 * rnd(i, 2), x = vx * R + dx * R * sp * out, y = vy * R + dy * R * sp * out + 46 * q * u * u;
    const s = Math.max(1, Math.round((front ? 8 : 5.5) * q * (1 - 0.55 * u))), al = fade * (front ? 1 : 0.55), flat = 0.55 + 0.45 * Math.abs(Math.cos(rnd(i, 3) * TAU + u * (5 + 6 * rnd(i, 4))));   // mảnh lật khi bay
    for (let yy = -s; yy <= s; yy++) {
      const half = Math.round((s - Math.abs(yy) * 0.5) * flat);
      for (let xx = -half; xx <= half; xx++) {
        const edge = Math.abs(xx) === half || Math.abs(yy) === s;
        p.dot(x + xx, y + yy, edge ? (u < 0.15 ? WHITE : front ? C[6] : C[4]) : u < 0.12 ? C[6] : front ? C[4] : C[3], al * (edge ? 1 : 0.6));
      }
    }
    if (front) p.light(x, y, C[5], 0.5 * fade);
    // vụn sáng bay theo sau mảnh
    for (let j = 1; j <= 2; j++) { const k = out - j * 0.07; if (k > 0) p.px(vx * R + dx * R * sp * k + (rnd(i, 5 + j) - 0.5) * 6, vy * R + dy * R * sp * k + 46 * q * u * u * 0.6 + (rnd(i, 8 + j) - 0.5) * 6, j === 1 ? C[6] : C[4]); }
  });
}
