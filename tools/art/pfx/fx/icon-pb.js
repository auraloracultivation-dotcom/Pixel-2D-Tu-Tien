import { fit, WHITE, hex, sparkle, smooth } from "../../core/index.js";

export const meta = {
  name: "Biểu tượng pháp bảo (ô 34 điểm)",
  desc: "Hình pháp bảo vẽ gọn cho vừa ô biểu tượng 34 × 34 điểm (nút pháp bảo trên màn chơi, lưới Pháp bảo trong Trang bị), cùng dải màu với hình của đòn. kind: an (ấn ngọc nẹp vàng, triện đỏ, núm thú vàng), khien (tấm thuẫn viền vàng, mặt ngọc chia đôi sáng tối, núm ngọc giữa), chuong (chuông đồng có đai, quai, quả lắc, sóng âm tím hai bên), co (cờ trận đuôi én vàng viền đỏ có ấn đỏ, cán mũi giáo vàng, vòng trận dưới gốc), holo (hồ lô hai bầu hổ phách, dây lụa đỏ, nút gỗ, linh khí cuộn ở miệng).",
  tags: ["p2d", "icon", "loop"],
  size: [34, 34],
  origin: [17, 17],
  duration: 0.4,
  loop: true,
  fps: 10,
  bg: "dark",
  options: { palette: ["#0a1a3a", "#12357a", "#1f62c8", "#3f9cff", "#7fd8ff", "#c8f4ff", "#ffffff"], kind: "an" },
};
const J = ["#04201c", "#0a4038", "#12705c", "#22a884", "#5fe0bc", "#b4ffe8"].map(hex);                 // ngọc bích
const G = ["#2a1806", "#6a400a", "#b07a10", "#e8b020", "#ffe066", "#fff6c4"].map(hex);                 // vàng
const RED = ["#4a0a10", "#a01c1c", "#e8442c", "#ff8a5c"].map(hex);
const BR = ["#1a0e06", "#3e2410", "#6e4418", "#a06a22", "#d09a3a", "#f4cc6a", "#fff0b8"].map(hex);     // đồng
const AM = ["#2a1206", "#5e2c0c", "#964c14", "#c8782a", "#eaa850", "#ffd88a", "#fff4d0"].map(hex);     // hổ phách
const WOOD = ["#1c0e06", "#3e2410", "#6a421e", "#96683a"].map(hex);
const TE = ["#04161e", "#0a3442", "#10606e", "#1c98a4", "#52d8d4", "#a8fff0"].map(hex);                // ngọc lam của thuẫn
const fl = Math.floor;

function an(p) {
  const BW = 11, Y0 = -3, Y1 = 12;
  for (let x = -BW + 1; x < BW; x += 2) p.px(x, Y1 + 1 + ((x * 5) & 1), G[4], 0.9);                 // linh quang dưới đáy ấn
  p.rect(-BW - 1, Y0 - 1, BW * 2 + 2, Y1 - Y0 + 2, J[0]);
  p.shade(-BW, Y0, BW, Y1, (x, y, out) => {
    const u = (x + BW) / (BW * 2), v = (y - Y0) / (Y1 - Y0);
    out.c = J[Math.max(1, Math.min(5, 2 + (u < 0.14 ? 2 : u < 0.36 ? 1 : u > 0.84 ? -1 : 0) + (v < 0.2 ? 1 : 0)))];
  });
  for (const y of [Y0, Y1 - 2]) { p.rect(-BW, y, BW * 2, 2, G[2]); p.line(-BW, y, BW - 1, y, G[4]); p.px(-BW + 1, y, G[5]); p.px(BW - 2, y, G[5]); }   // nẹp vàng
  p.rect(-6, Y0 + 3, 12, 9, G[3]); p.rect(-5, Y0 + 4, 10, 7, RED[0]);                                   // triện đỏ viền vàng
  for (const [x0, y0, x1, y1] of [[-4, 2, 3, 2], [-4, 2, -4, 6], [3, 2, 3, 4], [-4, 4, 3, 4], [0, 4, 0, 6], [-2, 6, 3, 6]]) p.line(x0, y0, x1, y1, RED[2]);
  p.px(-4, 2, RED[3]); p.px(3, 6, RED[3]);
  p.poly([[-BW - 1, Y0 - 1], [-BW + 3, Y0 - 5], [BW - 3, Y0 - 5], [BW + 1, Y0 - 1]], J[0]);             // mặt trên vát
  p.poly([[-BW, Y0 - 1], [-BW + 3.6, Y0 - 4], [BW - 3.6, Y0 - 4], [BW, Y0 - 1]], J[4]);
  p.line(-BW + 4, Y0 - 4, BW - 5, Y0 - 4, J[5]);
  const ky = Y0 - 5;                                                                                   // núm ấn: thú vàng nằm
  p.ellipse(-1, ky - 3, 7.5, 4, G[0]); p.ellipse(-1, ky - 3, 6.5, 3, G[2]); p.ellipse(-2, ky - 4, 4.5, 1.8, G[3]);
  p.circle(6, ky - 6, 3.2, G[0]); p.circle(6, ky - 6, 2.2, G[3]); p.px(5, ky - 7, G[5]); p.px(7, ky - 6, G[0]);
  p.px(4, ky - 9, G[4]); p.px(8, ky - 9, G[4]); p.px(4, ky - 8, G[0]); p.px(8, ky - 8, G[0]);
  p.line(-7, ky - 4, -9, ky - 7, G[3]); p.px(-9, ky - 8, G[5]); p.px(-10, ky - 7, G[0]);
  p.line(-5, ky - 5, 1, ky - 5, G[5]); p.line(-6, ky - 1, 5, ky - 1, G[1]);
  sparkle(p, -14, -8, 2.2, WHITE, G[4], 0.5); sparkle(p, 14, 4, 1.6, WHITE, G[4], 0.4);
  p.glow(0, 13, 12, G[4], 0.4); p.glow(0, 3, 15, J[4], 0.22);
}

function khien(p) {
  const hw = (y) => (y < -11 ? 9.5 + (y + 13) : y <= 2 ? 11.5 : 11.5 * Math.pow(Math.max(0, 1 - (y - 2) / 12.5), 0.62));
  p.shade(-13, -14, 13, 15, (x, y, out) => {
    const yi = fl(y), xi = fl(x), h = hw(yi + 0.5), ax = Math.abs(xi + 0.5), e = h - ax;
    if (yi < -13 || e < 0) return;
    const top = yi + 13, rim = Math.min(e, top + 0.5, yi > 2 ? e * 0.8 : 99), left = xi < 0;
    if (rim < 1) { out.c = TE[0]; return; }
    if (rim < 3.2) { out.c = top < 3 ? (rim < 2 ? G[4] : G[3]) : left ? (rim < 2 ? G[4] : G[3]) : rim < 2 ? G[2] : G[1]; return; }   // viền vàng: sáng trên trái, tối dưới phải
    if (rim < 4.2) { out.c = TE[0]; return; }
    let i = left ? 3 : 2;
    if (xi === -1 || xi === 0) i = left ? 4 : 1;                 // sống giữa
    const d = xi + yi * 0.8;                                     // vệt phản quang chéo
    if (d > -9.5 && d < -6.5) i = Math.min(5, i + 2); else if (d >= -6.5 && d < -5) i += 1;
    if (yi > 7) i = Math.max(1, i - 1);
    out.c = TE[i];
  });
  p.circle(0, -3, 4.6, TE[0]); p.circle(0, -3, 3.6, G[3]); p.circle(0, -3, 2.4, G[1]); p.circle(0, -3, 1.9, TE[4]);   // núm ngọc giữa
  p.px(-1, -4, WHITE); p.px(0, -4, TE[5]); p.px(-3, -5, G[5]); p.px(-2, -6, G[5]); p.px(2, 0, G[1]);
  for (const [x, y] of [[-9, -11], [8, -11], [-9, 0], [8, 0]]) { p.px(x, y, G[5]); p.px(x, y + 1, G[1]); }   // đinh tán
  for (let a = -2.5; a < -1.2; a += 0.09) p.px(Math.cos(a) * 16.2, Math.sin(a) * 16.2 + 1, TE[4], 0.7);   // vệt màn chắn hai bên
  for (let a = 0.35; a < 1.25; a += 0.09) p.px(Math.cos(a) * 16.2, Math.sin(a) * 16.2 + 1, TE[4], 0.7);
  sparkle(p, -13, -12, 2.4, WHITE, TE[5], 0.5); sparkle(p, 13, 9, 1.8, WHITE, TE[5], 0.45);
  p.glow(0, 0, 17, TE[4], 0.3);
}

function chuong(p, C) {
  const W = 10.5, TOP = -10, H = 22;
  const half = (u) => W * ((u < 0.28 ? 0.6 * Math.sqrt(1 - (1 - u / 0.28) ** 2) : 0.6 + 0.24 * ((u - 0.28) / 0.72) ** 1.3) + 0.16 * smooth(0.82, 1, u));
  for (const sd of [-1, 1]) for (const [r, a] of [[13.5, 1], [16.2, 0.6]]) for (let t = -0.42; t <= 0.42; t += 0.07) p.px(sd * Math.cos(t) * r, 5 + Math.sin(t) * r, a === 1 ? C[5] : C[4], a);   // sóng âm hai bên
  p.shade(-W - 1, TOP, W + 1, TOP + H + 1, (x, y, out) => {
    const u = (fl(y) + 0.5 - TOP) / H;
    if (u < 0 || u > 1) return;
    const hwd = half(u), e = hwd - Math.abs(fl(x) + 0.5);
    if (e < 0) return;
    if (e < 1 || u > 0.97) { out.c = BR[0]; return; }
    const side = (fl(x) + 0.5) / hwd, band = (u > 0.3 && u < 0.37) || (u > 0.6 && u < 0.67);
    let i = 3 + (side < -0.5 ? 2 : side < -0.1 ? 1 : side > 0.6 ? -2 : side > 0.25 ? -1 : 0);
    if (band) i = Math.min(6, i + 2); if (u > 0.88) i = Math.min(6, i + 1);
    if (side > -0.66 && side < -0.4 && u > 0.1 && u < 0.86 && !band) i = 6;   // vệt phản quang dọc thân
    out.c = BR[i];
  });
  p.ring(0, TOP - 2.5, 2.6, 1.3, BR[5], 1); p.px(-2, TOP - 4, BR[6]); p.px(0, TOP - 1, BR[0]);          // quai treo
  p.line(-3, TOP + H + 1, 3, TOP + H + 1, BR[0]); p.circle(0, TOP + H + 2.5, 2.2, BR[0]); p.circle(0, TOP + H + 2.5, 1.3, BR[5]); p.px(-1, TOP + H + 2, BR[6]);   // quả lắc
  sparkle(p, -8, -9, 2, WHITE, BR[6], 0.5);
  p.glow(0, 3, 17, C[4], 0.34); p.glow(0, 2, 9, BR[5], 0.2);
}

function co(p, C) {
  const PX = -9, Y0 = -11, LEN = 20, HGT = 14;
  for (let a = 0; a < 6.283; a += 0.12) p.px(PX + 2 + Math.cos(a) * 9, 13.5 + Math.sin(a) * 2.6, (a * 3 | 0) % 3 ? C[4] : C[6], 0.85);   // vòng trận dưới gốc cờ
  p.glow(PX + 2, 13, 11, C[4], 0.4);
  p.rect(PX - 1, Y0, 3, 26, WOOD[0]); p.rect(PX, Y0, 1, 25, WOOD[2]); for (const y of [-2, 7]) { p.rect(PX - 1, y, 3, 2, G[1]); p.px(PX, y, G[4]); }   // cán
  p.poly([[PX + 0.5, Y0 - 6.5], [PX + 3.5, Y0 - 1.5], [PX + 0.5, Y0 + 0.5], [PX - 2.5, Y0 - 1.5]], G[0]);   // mũi giáo vàng
  p.poly([[PX + 0.5, Y0 - 5.2], [PX + 2.4, Y0 - 1.6], [PX + 0.5, Y0 - 0.4], [PX - 1.4, Y0 - 1.6]], G[3]); p.line(PX, Y0 - 5, PX, Y0 - 1, G[5]);
  p.rect(PX - 2, Y0, 5, 2, G[2]); p.line(PX - 2, Y0, PX + 2, Y0, G[4]);
  p.line(PX - 2, Y0 + 2, PX - 4, Y0 + 7, RED[1]); p.line(PX - 3, Y0 + 2, PX - 5, Y0 + 6, RED[2]); p.px(PX - 4, Y0 + 8, RED[3]);   // tua đỏ
  for (let i = 0; i < LEN; i++) {                                                                      // lá cờ đuôi én
    const a = i * 0.46 + 0.9, dy = Math.sin(a) * (0.3 + i * 0.085), slope = Math.cos(a), top = Y0 + 2 + dy + i * 0.1, hh = HGT - i * 0.2;
    const notch = i > LEN - 7 ? (i - (LEN - 7)) * 1.05 : 0, x = PX + 2 + i;
    for (let r = 0; r < hh; r++) {
      const mid = Math.abs(r - hh / 2 + 0.5);
      if (mid < notch) continue;
      const edge = r < 1 || r > hh - 2 || i === LEN - 1 || (notch && mid < notch + 1.1), inner = r < 2.6 || r > hh - 3.6;
      let c;
      if (edge) c = RED[0];
      else if (inner) c = slope > 0.2 ? RED[2] : RED[1];
      else c = slope > 0.55 ? G[5] : slope > 0 ? G[4] : slope > -0.55 ? G[3] : G[2];
      const d = Math.hypot(i - 8, (r - hh / 2 + 0.5) * 1.05);
      if (!edge && !inner && ((d > 2.4 && d < 3.7) || d < 1)) c = slope > 0 ? RED[2] : RED[1];          // ấn đỏ giữa lá
      p.px(x, top + r, c);
    }
  }
  sparkle(p, 12, -13, 1.8, WHITE, G[5], 0.45);
  p.glow(2, -3, 14, C[4], 0.2);
}

function bulb(p, cx, cy, R) {
  p.shade(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y, out) => {
    const dx = fl(x) + 0.5 - cx, dy = fl(y) + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > R + 0.35) return;
    if (d > R - 0.75) { out.c = AM[0]; return; }
    const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lam = nx * -0.52 + ny * -0.6 + nz * 0.6;
    out.c = AM[lam > 0.86 ? 6 : lam > 0.62 ? 5 : lam > 0.34 ? 4 : lam > 0.04 ? 3 : lam > -0.3 ? 2 : 1];
  });
}
function holo(p, C) {
  const Y = 6;
  for (const [x, y, c, a] of [[1, -17, 6, 1], [2, -16, 5, 1], [4, -17, 5, 0.9], [5, -15, 4, 0.9], [7, -16, 5, 0.8], [8, -14, 4, 0.7], [-2, -17, 4, 0.7], [10, -15, 4, 0.5]]) p.px(x, y, C[c], a);   // linh khí cuộn ở miệng
  bulb(p, 0, Y, 8.6); bulb(p, 0, Y - 12.5, 5.6);
  p.rect(-2, Y - 20, 4, 3, AM[0]); p.rect(-1, Y - 20, 2, 3, AM[3]); p.px(-1, Y - 19, AM[5]);              // cổ
  p.rect(-3, Y - 23, 6, 3, WOOD[0]); p.rect(-2, Y - 22, 4, 2, WOOD[2]); p.px(-2, Y - 22, WOOD[3]);        // nút gỗ
  p.line(-5, Y - 3, -3, Y - 6, WHITE); p.px(-6, Y - 1, AM[6]); p.px(-3, Y - 15, WHITE); p.px(-4, Y - 14, AM[6]);   // vệt phản quang
  p.rect(-6, Y - 9, 12, 3, RED[0]); p.rect(-5, Y - 9, 10, 2, RED[1]); p.line(-5, Y - 9, 2, Y - 9, RED[2]);   // dây lụa đỏ thắt eo
  for (const [k, len] of [[0, 8], [1, 6]]) {
    let x = 5, y = Y - 7 + k;
    for (let i = 0; i < len; i++) { const nx = x + 1, ny = y + 0.75 + Math.sin(i * 0.9 + k * 1.4) * 0.7; p.line(x, y, nx, ny, i > len - 3 ? RED[3] : RED[2 - k]); x = nx; y = ny; }
  }
  sparkle(p, -12, -8, 1.6, WHITE, C[5], 0.45); sparkle(p, 13, 12, 1.4, WHITE, C[5], 0.4);
  p.glow(0, Y - 4, 16, C[3], 0.3); p.glow(1, Y - 22, 6, C[5], 0.45);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), K = o.kind;
  if (K === "an") an(p); else if (K === "khien") khien(p); else if (K === "chuong") chuong(p, C); else if (K === "co") co(p, C); else holo(p, C);
}
