import { fit, clamp, TAU, WHITE, cycle } from "../../core/index.js";

export const meta = {
  name: "Hồ lô phun (luồng linh tuyền, con sóng)",
  desc: "Phần nước của Hồ Lô, chảy sang phải, lặp liền mạch, vẽ theo cỡ điểm của nhân vật. kind 'tia': luồng linh tuyền vọt ra từ miệng hồ lô (gốc = miệng): lõi trắng thon, thân nhiều dòng chảy có vệt sáng chạy ra ngoài, hai mép sủi bọt gợn sóng có viền sẫm, cuối luồng vỡ thành giọt tan qua lưới chấm; loe theo hình nón của đòn. kind 'song': một con sóng đầu luồng lao tới (cung cong, mặt trước bọt trắng lượn sóng, thân chuyển sẫm dần về sau, đuôi kéo vệt, giọt nước văng phía trước).",
  tags: ["p2d", "projectile", "loop", "directional"],
  size: [260, 220],
  origin: [20, 110],
  duration: 0.4,
  loop: true,
  fps: 20,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], kind: "tia", scale: 1, seed: 21 },
};
const D = meta.duration, TAN = Math.tan((20.5 * Math.PI) / 180);
const h1 = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

function tia(p, t, C, s, S) {
  const ph = (t / D) % 1, LEN = 112 * s;
  p.each(-1, -LEN * TAN - 10 * s, LEN + 2, LEN * TAN + 10 * s, (x, y, sx, sy) => {
    if (x < 0) return;
    const u = x / LEN;
    if (u > 1) return;
    const X = x / s, side = y < 0 ? -1 : 1, w0 = (4.6 + X * TAN) * s;
    const edge = 1 + 0.15 * Math.sin(X * 0.2 - ph * TAU * 3 + side * 1.3) + 0.09 * Math.sin(X * 0.46 - ph * TAU * 5 + side * 2.9) + 0.05 * Math.sin(X * 0.9 - ph * TAU * 7 + side);
    const q = Math.abs(y) / (w0 * edge);
    if (q > 1) return;
    // cuối luồng: vỡ thành từng cụm nước tách dần rồi thành giọt (cụm đặc, không rải chấm đều)
    const Yn = y / s, blob = 0.5 + 0.25 * Math.sin(X * 0.3 - ph * TAU * 3 + Math.sin(Yn * 0.42 + X * 0.05) * 2.4) + 0.25 * Math.sin(Yn * 0.6 + X * 0.17 - ph * TAU * 2 + 1.7);
    if (u > 0.5 && blob < (u - 0.5) / 0.5 * 0.92 + 0.06) return;
    const a = u > 0.93 ? (1 - u) / 0.07 : 1;
    const lane = Math.floor((y / w0 * 0.5 + 0.5) * 11), dash = (X * 0.036 - ph * 3 + h1(lane + S) * 3) % 1, dd = dash < 0 ? dash + 1 : dash;
    let c;
    if (q > 0.9 && u < 0.72) c = C[2];                                                           // viền sẫm hai mép
    else if (q > 0.66) c = Math.sin(X * 0.52 - ph * TAU * 4 + side * 0.7) > 0.15 ? WHITE : C[5];   // bọt sủi ở mép
    else if (q < 0.15 * (1 - u * 0.8)) c = WHITE;                                                // lõi trắng
    else if (q < 0.36 * (1 - u * 0.6)) c = dd < 0.45 ? WHITE : C[5];
    else c = dd < 0.1 ? WHITE : dd < 0.34 ? C[5] : lane & 1 ? C[4] : C[3];                        // các dòng chảy, vệt sáng chạy ra
    p.put(sx, sy, c, a);
    if (q < 0.6) p.add(sx, sy, C[4], 0.3 * (1 - u) * a);
  });
  // giọt nước văng dọc hai mép và ở cuối luồng
  cycle(t, D, 16, S, (g) => 0.14 + 0.12 * g.next(), (age, L, r) => {
    const k = age / L, X = r.range(20, 110) + 70 * age, sd = r.sign(), y = sd * (4.6 + X * TAN) * (1.02 + 0.5 * k) * s + sd * 6 * k * k * s, x = X * s;
    if (X > 124) return;
    p.px(x, y, k < 0.5 ? WHITE : C[5]); if (r.chance(0.5)) p.px(x - 1, y, C[4]);
    if (k < 0.4 && r.chance(0.4)) { p.px(x, y + 1, C[5]); p.px(x + 1, y, WHITE); }
    p.light(x, y, C[4], 0.5 * (1 - k));
  });
  p.glowLine(2 * s, 0, 46 * s, 0, 22 * s, C[4], 0.42); p.glowLine(0, 0, 22 * s, 0, 10 * s, WHITE, 0.35);
}

function song(p, t, C, s, S) {
  const ph = (t / D) % 1, RC = 66 * s, cx = -RC + 12 * s, TH = 0.5;
  p.each(-30 * s, -40 * s, 22 * s, 40 * s, (x, y, sx, sy) => {
    const rho = Math.hypot(x - cx, y), th = Math.atan2(y, x - cx), at = Math.abs(th) / TH;
    if (at > 1) return;
    const taper = Math.pow(Math.cos((at * Math.PI) / 2), 0.62), T = 19 * s * taper + 1;
    const front = RC + (1.6 * Math.sin(th * 21 - ph * TAU * 2) + 1.1 * Math.sin(th * 38 + ph * TAU * 3)) * s * taper, d = front - rho;
    if (d < 0) return;
    const lane = Math.floor(th * 30 + 40), tail = (h1(lane + S) > 0.62 ? 1.75 : 1) * T;   // vài dòng kéo đuôi dài hơn
    if (d > tail) return;
    const v = d / T;
    let c, a = 1;
    if (d < 1.15) c = C[2];                                                              // viền mặt sóng
    else if (v < 0.3) c = Math.sin(th * 26 + ph * TAU * 2 + d * 0.5) > -0.2 ? WHITE : C[6] ?? WHITE;   // bọt trắng mặt trước
    else if (v < 0.5) c = (sx + sy) & 1 && v > 0.42 ? C[4] : C[5];
    else if (v < 0.78) c = lane & 1 ? C[4] : C[3];
    else { c = v < 1 ? C[3] : C[4]; a = v < 1 ? 1 - (v - 0.78) / 0.5 : 0.5 * (1 - (v - 1) / 0.75); }
    p.put(sx, sy, c, a);
    if (v < 0.6) p.add(sx, sy, C[4], 0.3 * taper);
  });
  cycle(t, D, 9, S + 3, (g) => 0.16 + 0.12 * g.next(), (age, L, r) => {   // giọt văng trước mặt sóng
    const k = age / L, th = r.range(-TH, TH) * 0.9, d = RC + (3 + 60 * age) * s, x = cx + Math.cos(th) * d, y = Math.sin(th) * d;
    p.px(x, y, k < 0.5 ? WHITE : C[5]); if (r.chance(0.5)) p.px(x + 1, y, C[5]);
    p.light(x, y, C[4], 0.6 * (1 - k));
  });
  p.glow(4 * s, 0, 30 * s, C[4], 0.3);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), s = o.scale;
  if (o.kind === "song") song(p, t, C, s, o.seed); else tia(p, t, C, s, o.seed);
  void clamp;
}
