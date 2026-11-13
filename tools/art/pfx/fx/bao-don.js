import { fit, WHITE } from "../../core/index.js";

// Dấu báo đòn (docs/10-CAI-HON.md việc 3): quái vừa lấy đà đánh thì ba vạch nhọn bật ra bên đầu nó, chĩa về phía người chơi, như nét giật mình trong
// truyện tranh. Nhìn thấy là biết sắp ăn đòn, kịp lùi ra. Điểm neo (0, 0) = cạnh đầu con quái, +x = hướng về phía người sắp bị đánh.
// Bốn khung, mốc theo giây kể từ lúc lấy đà:  0  0,000  ba vạch ngắn trắng   1  0,05  ba vạch dài, lõi trắng viền đỏ cam   2  0,13  vạch trôi ra, còn đỏ   3  0,23  ba chấm
export const meta = {
  name: "Báo đòn",
  desc: "Ba vạch nhọn bật ra chĩa về phía người chơi lúc quái lấy đà đánh: vạch ngắn trắng, dài ra có viền đỏ cam, trôi xa rồi còn ba chấm.",
  tags: ["p2d", "telegraph", "directional"],
  size: [64, 64],
  origin: [24, 32],
  duration: 0.32,
  loop: false,
  fps: 60,
  bg: "dark",
  options: { palette: ["#3a0810", "#7a1018", "#b81a22", "#e03030", "#ff6a3a", "#ffb070", "#ffe8c8", "#ffffff"] },
};

const TIA = [-0.62, 0, 0.62];   // ba vạch xoè quanh hướng người chơi (radian)

// Vạch nhọn từ bán kính r0 tới r1 theo góc a, bụng dày w điểm ở 1/3 phía trong; thân màu c1, sống màu c0
function vach(p, a, r0, r1, w, c0, c1) {
  const ca = Math.cos(a), sa = Math.sin(a), at = (d, s = 0) => [ca * d - sa * s, sa * d + ca * s], m = r0 + (r1 - r0) * 0.35;
  if (w > 0) p.poly([at(r0), at(m, w), at(r1), at(m, -w)], c1);
  p.line(...at(r0), ...at(r1), c0);
}

export function draw(p, t, o) {
  // Cỡ: phải thấy được ở khoé mắt trên điện thoại: vạch giữa dài 18 điểm, bụng dày 4 điểm, lõi trắng
  const C = fit(o.palette, 8), n = Math.round(t * 60), f = n < 3 ? 0 : n < 8 ? 1 : n < 14 ? 2 : 3;   // khung theo lưới 1/60 giây (mốc lấy mẫu ở sprites.mjs: n = 1, 4, 9, 15)
  if (f === 0) { for (const a of TIA) vach(p, a, 3, a ? 9 : 11, 2, WHITE, C[6]); return; }
  if (f === 1) { for (const a of TIA) { vach(p, a, 4, a ? 17 : 21, 5, C[2], C[2]); vach(p, a, 5, a ? 16 : 20, 3, WHITE, C[4]); } return; }   // viền đỏ sẫm bọc ngoài, thân đỏ cam, sống trắng
  if (f === 2) { for (const a of TIA) vach(p, a, 12, a ? 20 : 24, 2, C[6], C[3]); return; }
  for (const a of TIA) { const r = a ? 21 : 25; p.px(Math.cos(a) * r, Math.sin(a) * r, C[4]); p.px(Math.cos(a) * r + 1, Math.sin(a) * r, C[4]); p.px(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3), C[3]); }
}
