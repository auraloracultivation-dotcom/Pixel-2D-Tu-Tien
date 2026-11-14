import { fit, WHITE } from "../../core/index.js";

// Đòn đánh thường trúng quái (docs/10-CAI-HON.md việc 2). Vẽ từng khung có chủ ý, không hạt ngẫu nhiên: hình phải đọc được ở cỡ điện thoại và
// KHÔNG che con quái lúc nó bị đánh (bản cũ: quầng trắng mềm phủ kín con quái suốt 0,3 giây). Điểm neo (0, 0) = chỗ vũ khí chạm, +x = hướng đòn.
// Sáu khung, mốc theo giây kể từ lúc chạm (đồng hồ hình đứng lại lúc game khựng hình: khung 0 đứng yên suốt lúc khựng, hết khựng mới chạy tiếp):
//   0  0,000  ngôi sao bốn cánh dẹt: kim ngang dài theo hướng đòn, kim dọc ngắn, lõi hình thoi trắng viền cam, bốn vạch chéo
//   1  0,033  lõi rỗng (thấy con quái qua giữa), kim tách khỏi lõi, bốn mảnh nhọn ló ra phía trước, hai mảnh nhỏ bật ngược
//   2  0,067  kim đứt thành vạch bay ra, mảnh văng hình quạt, một nét cong mảnh phía trước là sóng chấn
//   3  0,100  mảnh ngắn lại và xa ra, sóng chấn thưa điểm, ba chấm sáng
//   4  0,150  mảnh chỉ còn hai điểm, vài chấm
//   5  0,217  ba chấm cuối
// kind "cm" (chí mạng): to hơn bản thường (2 so với 1,4), thêm hai kim chéo chữ X ở khung 0–1 và vòng chấn tròn nở ra ở khung 1–4.
export const meta = {
  name: "Đòn trúng",
  desc: "Tia lửa lúc vũ khí chạm quái, hướng đòn là +x: ngôi sao bốn cánh dẹt lóe lên, lõi rỗng ra để lộ con quái, mảnh nhọn văng hình quạt về phía trước rồi tan thành chấm.",
  tags: ["p2d", "impact", "directional"],
  size: [140, 112],
  origin: [56, 56],
  duration: 0.36,
  loop: false,
  fps: 60,
  bg: "dark",
  options: { palette: ["#3a1608", "#9c420c", "#d0620e", "#ee8a14", "#fbb934", "#fddc78", "#fff6d0", "#ffffff"], kind: "thuong" },
};

const FW = [-0.9, -0.38, 0.38, 0.9];   // bốn mảnh xoè về phía trước (radian quanh hướng đòn)
const BK = [2.6, -2.6];                 // hai mảnh nhỏ bật ngược về phía người đánh

// Kim nhọn hai đầu từ (x0, y0) tới (x1, y1), chỗ dày nhất w điểm ảnh ở giữa: thân màu cOut, sống màu cIn
function kim(p, x0, y0, x1, y1, w, cIn, cOut) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, h = w / 2;
  if (w > 1) p.poly([[x0, y0], [mx + nx * h, my + ny * h], [x1, y1], [mx - nx * h, my - ny * h]], cOut);
  p.line(x0, y0, x1, y1, w > 1 ? cIn : cOut);
}

// Mảnh nhọn bay ra theo góc a: mũi ở bán kính r, đuôi ở r − L, bụng dày fat điểm ảnh gần mũi; mũi màu c0, đuôi màu c1
function manh(p, a, r, L, c0, c1, fat) {
  const ca = Math.cos(a), sa = Math.sin(a), at = (d, s = 0) => [ca * d - sa * s, sa * d + ca * s];
  if (fat > 0) p.poly([at(r), at(r - L * 0.3, fat), at(r - L), at(r - L * 0.3, -fat)], c1);
  p.line(...at(r - L), ...at(r - L * 0.45), c1);
  p.line(...at(r - L * 0.45), ...at(r), c0);
}

// Cung tròn thưa điểm (dither theo bước): tâm (cx, cy), bán kính r, từ a0 tới a1, chỉ vẽ điểm thứ i khi i % every === 0
function cungThua(p, cx, cy, r, a0, a1, every, c) {
  const n = Math.max(4, Math.round(r * Math.abs(a1 - a0)));
  for (let i = 0; i <= n; i++) if (i % every === 0) { const a = a0 + (a1 - a0) * i / n; p.dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); }
}

// Chấm vuông s × s điểm ảnh (hạt sáng đủ to để thấy trên điện thoại: 1 điểm hình = 2/3 điểm màn hình)
const cham = (p, x, y, c, s = 2) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) p.px(x + i, y + j, c); };

export function draw(p, t, o) {
  // Cỡ: 1 điểm hình chỉ bằng 2/3 điểm màn hình điện thoại nên nét chính phải dày từ 2 điểm trở lên, hình to cỡ 1,5 lần thân người (48 điểm)
  const C = fit(o.palette, 8), cm = o.kind === "cm", K = cm ? 2 : 1.4, R = (v) => Math.round(v * K), W = cm ? 2 : 1;
  const n = Math.round(t * 60), f = n < 2 ? 0 : n < 4 ? 1 : n < 6 ? 2 : n < 9 ? 3 : n < 13 ? 4 : 5;   // khung theo lưới 1/60 giây (mốc lấy mẫu HIT_T ở sprites.mjs: n = 1, 3, 5, 7, 10, 14)
  if (f === 0) {
    kim(p, R(-16), 0, R(28), 0, 5 + W * 2, WHITE, C[5]);
    kim(p, 0, R(-12), 0, R(12), 3 + W * 2, WHITE, C[5]);
    if (cm) { kim(p, R(-11), R(-11), R(13), R(13), 5, WHITE, C[5]); kim(p, R(-11), R(11), R(13), R(-13), 5, WHITE, C[5]); }
    else for (const [sx, sy] of [[1, -1], [1, 1], [-1, -1], [-1, 1]]) { p.line(sx * R(5), sy * R(5), sx * R(9), sy * R(9), C[5]); p.line(sx * R(5) + 1, sy * R(5), sx * R(9) + 1, sy * R(9), C[4]); }
    p.poly([[R(-7), 0], [0, R(-6)], [R(8), 0], [0, R(6)]], C[2]);   // lõi hình thoi: viền cam sẫm, mặt vàng, tâm trắng
    p.poly([[R(-6), 0], [0, R(-5)], [R(7), 0], [0, R(5)]], C[4]);
    p.poly([[R(-5), 0], [0, R(-4)], [R(6), 0], [0, R(4)]], C[6]);
    p.poly([[R(-3), 0], [0, R(-2)], [R(4), 0], [0, R(2)]], WHITE);
    p.glow(0, 0, R(10), C[5], 0.45);
    return;
  }
  if (f === 1) {
    kim(p, R(-20), 0, R(-9), 0, 3, WHITE, C[5]); kim(p, R(10), 0, R(34), 0, 3 + W, WHITE, C[5]);   // kim ngang tách khỏi lõi
    kim(p, 0, R(-15), 0, R(-8), 3, WHITE, C[5]); kim(p, 0, R(8), 0, R(15), 3, WHITE, C[5]);
    if (cm) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) kim(p, sx * R(6), sy * R(6), sx * R(15), sy * R(15), 3, WHITE, C[5]);
    const T = [[R(-7), 0], [0, R(-6)], [R(8), 0], [0, R(6)]], T2 = [[R(-6), 0], [0, R(-5)], [R(7), 0], [0, R(5)]];   // lõi rỗng: hai nét viền hình thoi, bốn góc trắng
    for (let i = 0; i < 4; i++) { p.line(...T[i], ...T[(i + 1) % 4], C[4]); p.line(...T2[i], ...T2[(i + 1) % 4], C[6]); }
    for (const [x, y] of T2) cham(p, x - 1, y - 1, WHITE, 2);
    for (const a of FW) manh(p, a, R(13), R(6), WHITE, C[5], 1.6 + W * 0.6);
    for (const a of BK) manh(p, a, R(11), R(4), C[6], C[4], 1);
    if (cm) p.ring(0, 0, R(10), 2, C[6]);
    p.glow(0, 0, R(8), C[5], 0.25);
    return;
  }
  if (f === 2) {
    kim(p, R(-27), 0, R(-19), 0, 3, WHITE, C[5]);   // kim đứt thành vạch bay ra hai phía
    kim(p, R(28), 0, R(38), 0, 3, WHITE, C[5]);
    kim(p, 0, R(-20), 0, R(-15), 3, C[6], C[4]); kim(p, 0, R(15), 0, R(20), 3, C[6], C[4]);
    for (const a of FW) manh(p, a, R(19), R(7), WHITE, C[4], 1.6 + W * 0.6);
    for (const a of BK) manh(p, a, R(15), R(5), C[5], C[3], 1);
    p.arc(R(2), 0, R(9), 2, -1, 1, C[6]);   // sóng chấn: nét cong phía trước
    if (cm) p.ring(0, 0, R(16), 2, C[5]);
    return;
  }
  if (f === 3) {
    for (const a of FW) manh(p, a + 0.04, R(25), R(5), C[6], C[4], 1);
    for (const a of BK) manh(p, a, R(19), R(3), C[4], C[3], 0);
    cungThua(p, R(2), 0, R(14), -0.95, 0.95, 2, C[5]); cungThua(p, R(2), 0, R(14) + 1, -0.95, 0.95, 2, C[4]);
    cham(p, R(30), R(-3), WHITE); cham(p, R(-23), R(2), C[5]); cham(p, R(6), R(-17), C[5]);
    if (cm) { cungThua(p, 0, 0, R(21), 0, Math.PI * 2, 2, C[4]); cungThua(p, 0, 0, R(21) + 1, 0, Math.PI * 2, 2, C[3]); }
    return;
  }
  if (f === 4) {
    for (const a of FW) { const ca = Math.cos(a + 0.07), sa = Math.sin(a + 0.07); cham(p, Math.round(ca * R(29)), Math.round(sa * R(29)), C[5]); p.px(ca * R(26), sa * R(26), C[4]); }
    for (const a of BK) p.px(Math.cos(a) * R(21), Math.sin(a) * R(21), C[3]);
    cham(p, R(34), R(-4), C[5]); p.px(R(8), R(-19), C[4]); p.px(R(10), R(18), C[4]);
    if (cm) cungThua(p, 0, 0, R(26), 0, Math.PI * 2, 4, C[3]);
    return;
  }
  p.px(Math.cos(FW[0]) * R(32), Math.sin(FW[0]) * R(32), C[4]); p.px(Math.cos(FW[3]) * R(32), Math.sin(FW[3]) * R(32), C[4]); cham(p, R(36), R(-5), C[3], 1);
}
