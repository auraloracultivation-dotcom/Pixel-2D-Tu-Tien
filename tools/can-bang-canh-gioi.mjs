// Tính thời gian tu luyện qua từng cảnh giới với data/realms.json hiện tại (chủ dự án 12/11/2026 01:59: Hóa Thần khoảng nửa năm,
// Độ Kiếp Viên Mãn gần như không chạm tới). Người chơi chăm mẫu: 4 giờ chơi mỗi ngày, treo 40 con/phút ở bản đồ hợp cảnh giới
// hoặc đả tọa trong động phủ (lấy cái nhiều hơn), bế quan khi vắng 8 giờ, 8 viên đan linh khí đủ + 8 viên nửa mỗi ngày.
// Đây là ước lượng để chỉnh need_mul, không thay chơi thử thật (tools/cay-thu.mjs).
// Chạy: node tools/can-bang-canh-gioi.mjs
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(new URL('../data/realms.json', import.meta.url)));
const C = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url)));
const lk = [1, 2.4, 5, 8, 12, 15, 18, 20, 20], cave = [2, 2.4, 2.8, 3.3, 4, 4, 4, 4, 4];   // linh khí mỗi con theo bản đồ, hệ số động phủ
const med = C.meditate.qi_per_sec * R.qi_rate * 60, off = C.meditate.qi_per_sec * C.offline.rate * R.qi_rate * C.offline.max_hours * 3600;
const pills = 8 * 4000 + 8 * 2000;   // Tử Vân Đan 4.000 linh khí: 8 viên đủ, 8 viên nửa
const need = (r, l) => { const n = r * 9 + l - 1, s = R.qi_soft_from; return R.qi_base * R.qi_growth ** Math.min(n, s) * R.qi_soft_growth ** Math.max(0, n - s) * R.need_mul[r]; };
let cum = 0;
for (let r = 0; r < R.names.length; r++) {
  let q = 0; for (let l = 1; l <= R.layers; l++) q += need(r, l);
  const day = 240 * Math.max(40 * lk[r] * R.kill_qi[r], med * cave[r]) + off + pills, d = q / day;
  cum += d;
  console.log(`${R.names[r].padEnd(11)} cần ${Math.round(q).toLocaleString('vi-VN').padStart(13)} linh khí, ~${Math.round(day).toLocaleString('vi-VN')}/ngày → ${d.toFixed(1)} ngày, cộng dồn ${(cum / 365).toFixed(2)} năm`);
}
