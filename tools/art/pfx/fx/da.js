import { fit, WHITE, TAU, cycle, hex, mix, scale, rand } from "../../core/index.js";

export const meta = {
  name: "Thạch chùy",
  desc: "Một tảng đá nhọn lao tới, xoay lộn: mặt sáng, mặt tối, viền mực, vân nứt phát sáng màu đất; bụi và sỏi văng phía sau.",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [84, 48],
  origin: [60, 24],
  duration: 0.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c", "#fff0c8"], radius: 9, seed: 8 },
};
const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, S = o.seed, rot = (t / D) * TAU, INK = C[0];
  // bụi phía sau: đốm tròn mềm trôi lùi, nở ra, nhạt dần
  cycle(t, D, 9, S + 5, (r) => 0.3 + 0.2 * r.next(), (age, life, r) => {
    const k = 1 - age / life, x = -R - r.range(0, 6) - 80 * age, y = r.range(-R * 0.7, R * 0.7) - 6 * age;
    p.disc(x, y, 2 + 3.5 * (1 - k), mix(C[4], hex("#8a8078"), 0.5), 0.5 * k);
  });
  cycle(t, D, 7, S + 15, (r) => 0.2 + 0.2 * r.next(), (age, life, r) => {
    const k = 1 - age / life, x = -R * 0.6 - 60 * age + r.range(-3, 3), y = r.range(-R, R) + r.range(-20, 30) * age + 60 * age * age;
    p.px(x, y, k > 0.5 ? C[5] : C[3]); if (r.chance(0.4)) p.px(x + 1, y, C[2]);
  });
  // tảng đá: đa giác lồi 7 cạnh méo, xoay; tô theo hướng sáng cố định (trên trái) nên khi xoay thấy các mặt đổi sáng tối
  const N = 7, pts = [];
  for (let i = 0; i < N; i++) { const a = rot + (i * TAU) / N, r = R * (0.78 + 0.34 * rand(S, i, 3)); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const inside = (x, y, grow = 0) => {
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % N], nx = by - ay, ny = ax - bx, l = Math.hypot(nx, ny) || 1;
      if (((x - ax) * nx + (y - ay) * ny) / l > grow) return false;
    }
    return true;
  };
  p.shade(-R - 3, -R - 3, R + 3, R + 3, (x, y, out) => {
    if (!inside(x, y, 1)) return;
    if (!inside(x, y, 0)) { out.c = INK; return; }
    // mặt: chia theo góc so với tâm (xoay theo đá) để có các "mặt cắt"; sáng theo hướng trên trái
    const a = Math.atan2(y, x) - rot, face = Math.floor((((a / TAU) % 1) + 1) % 1 * N), fa = rot + ((face + 0.5) * TAU) / N;
    const lit = -Math.cos(fa) * 0.55 - Math.sin(fa) * 0.83, d = Math.hypot(x, y) / R;
    out.c = d < 0.34 ? C[5] : lit > 0.5 ? C[6] : lit > 0 ? C[5] : lit > -0.5 ? C[4] : C[3];
  });
  // vân nứt phát sáng: hai đường từ tâm ra, xoay theo đá
  for (let i = 0; i < 2; i++) {
    const a = rot + 1.1 + i * 2.6, r1 = R * 0.62;
    p.line(Math.cos(a) * 1.5, Math.sin(a) * 1.5, Math.cos(a + 0.25) * r1, Math.sin(a + 0.25) * r1, C[7]);
  }
  p.px(-R * 0.3, -R * 0.4, WHITE);
  // vệt lao: ba nét ngang phía sau
  for (const [dy, len] of [[-R * 0.7, 16], [0, 26], [R * 0.7, 14]]) p.line(-R - 3 - len, dy, -R - 3, dy, C[5], (u) => u * 0.9);
  p.glow(0, 0, R + 12, C[5], 0.26);
  p.glow(-R - 8, 0, 12, C[4], 0.14);
}
