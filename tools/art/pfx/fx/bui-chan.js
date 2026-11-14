import { fit } from "../../core/index.js";

// Bụi dưới chân lúc quái bị đánh bật lùi (docs/10-CAI-HON.md việc 2). Vẽ nổi trên con quái (không nằm dưới đất: bản đầu nhỏ và nằm dưới thân
// quái nên soi khung hình không thấy). Điểm neo (0, 0) = chân con quái. Năm khung, mốc theo giây kể từ lúc trúng đòn (khung 0 đứng yên lúc khựng hình):
//   0  0,000  hai vệt bụi mảnh quét sát đất hai bên chân
//   1  0,033  hai cụm tròn bật ra hai bên, nhô lên 2 điểm
//   2  0,100  hai cụm nở to và dạt ra, thêm một cụm nhỏ giữa; đáy cụm sẫm, đỉnh sáng
//   3  0,167  cụm bay lên, thủng lỗ theo mẫu Bayer (còn nửa số điểm)
//   4  0,250  chỉ còn lấm tấm
export const meta = {
  name: "Bụi chân",
  desc: "Bụi bật ra hai bên chân khi bị đánh bật lùi: hai vệt sát đất, hai cụm tròn nở ra và bay lên, tan bằng điểm thưa.",
  tags: ["p2d", "impact", "ground"],
  size: [56, 32],
  origin: [28, 24],
  duration: 0.34,
  loop: false,
  fps: 60,
  bg: "dark",
  options: { palette: ["#5c5340", "#7d7258", "#a39878", "#c4ba98", "#ddd4b6", "#eee8d2", "#f8f4e6", "#ffffff"] },
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Một cụm bụi tròn dẹt tâm (cx, cy), bán kính r: đỉnh sáng, thân kem, vài điểm sẫm dưới bụng; keep = tỉ lệ điểm còn lại (tan theo mẫu Bayer cố định)
function cum(p, C, cx, cy, r, keep) {
  for (let y = -r; y <= r; y++) for (let x = -r - 1; x <= r + 1; x++) {
    if ((x * x) / ((r + 1.5) * (r + 1.5)) + (y * y) / ((r + 0.5) * (r + 0.5)) > 1) continue;   // nửa điểm thêm: đỉnh và đáy cụm tròn chứ không nhọn
    const X = Math.round(cx + x), Y = Math.round(cy + y);
    if (BAYER[(X & 3) + (Y & 3) * 4] / 16 >= keep) continue;
    p.px(X, Y, y <= -r * 0.4 ? C[6] : y >= r * 0.55 && Math.abs(x) <= r * 0.6 ? C[3] : C[4]);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), n = Math.round(t * 60), f = n < 2 ? 0 : n < 5 ? 1 : n < 9 ? 2 : n < 14 ? 3 : 4;   // khung theo lưới 1/60 giây (mốc lấy mẫu ở sprites.mjs: n = 1, 3, 7, 11, 16)
  if (f === 0) { for (const s of [-1, 1]) { p.line(s * 3, 0, s * 9, 0, C[4]); p.line(s * 4, -1, s * 7, -1, C[6]); p.px(s * 11, 0, C[5]); } return; }
  const out = [0, 7, 11, 14, 16][f], up = [0, 2, 4, 7, 10][f], r = [0, 3, 4, 4, 3][f], keep = [1, 1, 1, 0.5, 0.2][f];
  cum(p, C, -out, -up, r, keep);
  cum(p, C, out, -up, r, keep);
  if (f >= 2) cum(p, C, 0, -up - 3, r - 2, keep);
  if (f === 1) for (const s of [-1, 1]) p.line(s * 2, 0, s * (out - r - 2), 0, C[4]);   // vệt bụi còn bám sát đất nối từ chân ra cụm
}
