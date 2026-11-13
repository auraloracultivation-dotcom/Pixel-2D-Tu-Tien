import { fit, WHITE } from "../../core/index.js";

// Người chơi bị đánh trúng (docs/10-CAI-HON.md việc 3). Khác hẳn tia lửa vàng lúc mình đánh trúng quái: đây là vết đau màu đỏ, hình gai lởm chởm rồi ba
// vết cào quét qua người theo hướng đòn. Điểm neo (0, 0) = chỗ đòn chạm vào người, +x = hướng đòn (từ kẻ đánh xuyên qua người mình).
// Sáu khung, mốc theo giây kể từ lúc trúng (khung 0 đứng yên suốt lúc game khựng hình):
//   0  0,000  chùm gai tám mũi không đều (mũi theo hướng đòn dài nhất): viền đỏ sẫm, thân hồng, lõi trắng
//   1  0,033  chùm gai rỗng lõi (chỉ còn viền), ba vết cào ngắn bắt đầu quét
//   2  0,067  ba vết cào dài, lõi trắng viền đỏ, bốn giọt đỏ văng theo hướng đòn
//   3  0,100  vết cào mảnh lại còn màu đỏ, giọt văng xa hơn
//   4  0,150  vết cào đứt thành chấm, giọt chỉ còn một điểm
//   5  0,217  vài chấm cuối
// kind "to" (đòn nặng): to gấp rưỡi, thêm hai vết cào ngoài và một cung chấn phía trước ở khung 1–3.
export const meta = {
  name: "Bị đánh",
  desc: "Vết đau lúc người chơi trúng đòn, hướng đòn là +x: chùm gai đỏ lõi trắng loé lên, ba vết cào quét qua người, giọt đỏ văng ra rồi tan thành chấm.",
  tags: ["p2d", "impact", "directional"],
  size: [120, 96],
  origin: [48, 48],
  duration: 0.36,
  loop: false,
  fps: 60,
  bg: "dark",
  options: { palette: ["#3a0810", "#7a1018", "#b81a22", "#e03030", "#ff5a4a", "#ff9a84", "#ffe0d6", "#ffffff"], kind: "thuong" },
};

// Tám mũi gai: [góc (độ), dài]. Mũi 0 độ (hướng đòn) dài nhất, phía sau ngắn: nhìn là biết đòn tới từ đâu.
const GAI = [[0, 15], [46, 9], [90, 11], [136, 7], [180, 8], [226, 7], [270, 11], [314, 9]];
const VANG = [-0.95, -0.4, 0.45, 1.0];   // bốn giọt văng về phía trước (radian quanh hướng đòn)

// Đa giác chùm gai: mũi ngoài bán kính dài × k, hõm trong bán kính inR × k, xen kẽ
function gai(k, inR) {
  const pts = [];
  for (let i = 0; i < GAI.length; i++) {
    const [d0, len] = GAI[i], d1 = GAI[(i + 1) % GAI.length][0] + (i === GAI.length - 1 ? 360 : 0), a = d0 * Math.PI / 180, b = ((d0 + d1) / 2) * Math.PI / 180;
    pts.push([Math.round(Math.cos(a) * len * k), Math.round(Math.sin(a) * len * k)], [Math.round(Math.cos(b) * inR * k), Math.round(Math.sin(b) * inR * k)]);
  }
  return pts;
}

// Một vết cào: hình kim nhọn hai đầu từ (x0, y0) tới (x1, y1), lệch dọc dy, bụng dày w điểm ở giữa; thân màu c1, sống màu c0 (w ≤ 1: chỉ còn một nét màu c1)
function cao(p, x0, y0, x1, y1, dy, w, c0, c1) {
  y0 += dy; y1 += dy;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, h = w / 2;
  if (w > 1) p.poly([[x0, y0], [mx + nx * h, my + ny * h], [x1, y1], [mx - nx * h, my - ny * h]], c1);
  p.line(x0, y0, x1, y1, w > 1 ? c0 : c1);
}

// Vết cào đang tan: chỉ còn điểm thưa (mỗi every điểm một chấm) màu c
function caoThua(p, x0, y0, x1, y1, dy, every, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i += every) p.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n + dy), c);
}

const cham = (p, x, y, c, s = 2) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) p.px(Math.round(x) + i, Math.round(y) + j, c); };

export function draw(p, t, o) {
  // Cỡ: 1 điểm hình = 2/3 điểm màn hình điện thoại, nét chính dày từ 3 điểm; chùm gai to cỡ nửa thân người (48 điểm), bản nặng gần bằng thân người
  const C = fit(o.palette, 8), to = o.kind === "to", K = to ? 2.2 : 1.5, R = (v) => Math.round(v * K);
  const n = Math.round(t * 60), f = n < 2 ? 0 : n < 4 ? 1 : n < 6 ? 2 : n < 9 ? 3 : n < 13 ? 4 : 5;   // khung theo lưới 1/60 giây (mốc lấy mẫu HIT_T ở sprites.mjs)
  const rows = to ? [-2, -1, 0, 1, 2] : [-1, 0, 1], gap = to ? 8 : 7, len = (r) => (Math.abs(r) === 2 ? 0.7 : 1);   // các vết cào song song cách nhau gap điểm; hai vết ngoài cùng ngắn hơn
  if (f === 0) {
    p.poly(gai(K, 3.6), C[1]);
    p.poly(gai(K * 0.86, 3.4), C[3]);
    p.poly(gai(K * 0.66, 3.2), C[5]);
    p.poly(gai(K * 0.42, 3.2), WHITE);
    p.glow(0, 0, R(9), C[4], 0.4);
    return;
  }
  if (f === 1) {
    const g = gai(K * 1.1, 4.2);   // chùm gai nở thêm một chút, chỉ còn viền (thấy người qua giữa)
    for (let i = 0; i < g.length; i++) { const a = g[i], b = g[(i + 1) % g.length]; p.line(a[0], a[1], b[0], b[1], C[4]); p.line(a[0], a[1] + 1, b[0], b[1] + 1, C[2]); }
    for (const [d, l] of GAI) { const a = d * Math.PI / 180; cham(p, Math.cos(a) * l * K * 1.1 - 1, Math.sin(a) * l * K * 1.1 - 1, C[6]); }
    for (const r of rows) cao(p, R(-6 * len(r)), R(-3 * len(r)), R(8 * len(r)), R(3 * len(r)), r * gap, 4, WHITE, C[3]);
    if (to) p.arc(R(3), 0, R(12), 2, -0.9, 0.9, C[5]);
    return;
  }
  if (f === 2) {
    for (const r of rows) cao(p, R(-10 * len(r)), R(-5 * len(r)), R(18 * len(r)), R(6 * len(r)), r * gap, 5, WHITE, C[3]);
    for (const a of VANG) { cham(p, Math.cos(a) * R(15), Math.sin(a) * R(15), C[3], 3); cham(p, Math.cos(a) * R(15), Math.sin(a) * R(15), C[5], 1); }
    if (to) p.arc(R(3), 0, R(17), 2, -0.8, 0.8, C[4]);
    return;
  }
  if (f === 3) {
    for (const r of rows) cao(p, R(-3 * len(r)), R(-2 * len(r)), R(21 * len(r)), R(7 * len(r)), r * gap, 3, C[5], C[3]);
    for (const a of VANG) { cham(p, Math.cos(a) * R(21), Math.sin(a) * R(21) + 1, C[3]); p.px(Math.cos(a) * R(18), Math.sin(a) * R(18), C[2]); }
    if (to) for (let i = 0; i <= 24; i += 2) { const a = -0.75 + 1.5 * i / 24; p.px(R(3) + Math.cos(a) * R(21), Math.sin(a) * R(21), C[3]); }
    return;
  }
  if (f === 4) {
    for (const r of rows) { caoThua(p, R(6), R(1), R(23), R(8), r * gap, 2, C[3]); caoThua(p, R(6), R(1) + 1, R(23), R(8) + 1, r * gap, 4, C[2]); }
    for (const a of VANG) p.px(Math.cos(a) * R(26), Math.sin(a) * R(26) + 2, C[3]);
    return;
  }
  for (const r of rows) cham(p, R(23), R(8) + r * gap, C[2], 1);
}
