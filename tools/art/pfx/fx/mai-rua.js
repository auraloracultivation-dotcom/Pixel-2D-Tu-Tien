import { fit, clamp, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Vòm mai rùa (Hộ Thuẫn)",
  desc: "Vòm khiên riêng của Hộ Thuẫn, vẽ theo cỡ điểm của nhân vật: một quả cầu linh quang bọc quanh người, mặt cầu chia thành các mảnh mai rùa (một mảnh đỉnh, ba vòng sáu mảnh so le, một mảnh đáy) như chính tấm thuẫn mai rùa trên nút. Đường nối giữa các mảnh sáng rõ ở mặt trước, mờ ở mặt sau (nhìn xuyên qua); lòng mảnh chỉ phủ lưới chấm thưa, sát mép vòm đặc dần như bong bóng; cả vòm xoay chậm quanh trục đứng (quay 60 độ là trùng lại nên lặp liền mạch 2,4 giây), một vệt sáng lướt chéo qua vòm hai lần mỗi vòng lặp.",
  tags: ["p2d", "self", "loop"],
  size: [88, 88],
  origin: [44, 44],
  duration: 2.4,
  loop: true,
  fps: 10,
  bg: "dark",
  options: { palette: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"], radius: 40 },
};
const TILT = 0.4, CT = Math.cos(TILT), ST = Math.sin(TILT);
// tâm các mảnh mai trên mặt cầu: [góc tính từ đỉnh, góc quanh trục đứng]; đối xứng 6 lần quanh trục đứng
export const SEEDS = [[0, 0]];
for (const [th, off] of [[0.95, 0], [1.7, 0.5], [2.45, 0]]) for (let i = 0; i < 6; i++) SEEDS.push([th, ((i + off) * TAU) / 6]);
SEEDS.push([Math.PI, 0]);
const DIR = SEEDS.map(([th, ph]) => [Math.sin(th) * Math.sin(ph), -Math.cos(th), Math.sin(th) * Math.cos(ph)]);   // x phải, y xuống, z về phía người xem
// tâm mảnh trên màn hình (đã tính góc nhìn chếch từ trên xuống): [x, y, z] theo bán kính 1; hiệu ứng vỡ dùng lại
export const VIEW = DIR.map(([x, y, z]) => [x, y * CT + z * ST, -y * ST + z * CT]);

// điểm trên mặt cầu (toạ độ màn hình, bán kính 1), vòm đã quay góc spin → [mảnh gần nhất, độ lệch khỏi đường nối (radian)]
export function plate(nx, ny, nz, cs, sn) {
  const y1 = ny * CT - nz * ST, z1 = ny * ST + nz * CT;          // bỏ góc nhìn chếch
  const x2 = nx * cs - z1 * sn, z2 = nx * sn + z1 * cs;          // bỏ góc quay của vòm
  let a = -2, b = -2, ia = 0;
  for (let i = 0; i < DIR.length; i++) { const d = x2 * DIR[i][0] + y1 * DIR[i][1] + z2 * DIR[i][2]; if (d > a) { b = a; a = d; ia = i; } else if (d > b) b = d; }
  return [ia, Math.acos(clamp(b, -1, 1)) - Math.acos(clamp(a, -1, 1))];
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.radius, spin = ((t / meta.duration) * TAU) / 6, cs = Math.cos(spin), sn = Math.sin(spin);
  const band = -1.5 + 3 * ((t / 1.2) % 1);
  p.each(-R - 2, -R - 2, R + 2, R + 2, (x, y, sx, sy) => {
    const r2 = (x * x + y * y) / (R * R);
    if (r2 > 1) { if (r2 < (1 + 1.3 / R) ** 2) p.put(sx, sy, C[4], 0.9); return; }      // vành ngoài của vòm
    const nx = x / R, ny = y / R, nz = Math.sqrt(1 - r2), lit = Math.abs((nx + ny) * 0.7 - band) < 0.2;
    const w = 1.75 / (R * Math.max(0.4, nz));                     // đường nối rộng chừng 1 điểm ảnh, kể cả chỗ mặt cầu nghiêng đi
    const [, eb] = plate(nx, ny, -nz, cs, sn), [i, e] = plate(nx, ny, nz, cs, sn);
    if (eb < w * 0.8) p.put(sx, sy, C[3], 0.34);                 // đường nối mặt sau, nhìn xuyên qua
    p.put(sx, sy, lit ? C[4] : C[2 + (i % 2)], 0.06 + 0.3 * r2 * r2 + (lit ? 0.14 : 0));   // lòng mảnh: lưới chấm thưa, sát mép đặc dần
    if (e < w) { p.put(sx, sy, lit ? WHITE : nz > 0.55 ? C[6] : C[5], lit ? 1 : 0.7 + 0.3 * nz); p.add(sx, sy, C[5], lit ? 0.5 : 0.16); }
  });
  p.glow(-R * 0.36, -R * 0.46, R * 0.45, C[6], 0.14);            // ánh loé phía trên trái
}
