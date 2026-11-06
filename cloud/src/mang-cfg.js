// Bản sao từ data/thien-mang.json (tools/cloud/phong.test.mjs so khớp): Linh Thạch farm thường mỗi giây theo tinh cầu có đầu boss,
// và hệ số thưởng khi chém Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: gấp 10 lần farm thường).
export const LT_MULT = 30;   // chủ dự án 06/11/2026 11:39: ×3 (trước 10)
// Thưởng thêm theo sát thương (chủ dự án 06/11/2026 10:10): tối đa +LT_BONUS × căn(sát thương mình / người mạnh nhất cùng tuyến)
export const LT_BONUS = 0.5;
export const FARM_LT_S = {"thon-thien-mang": 2.67, "thanh-khe": 0.07, "thien-kiem-phong": 0.09, "dao-xich-dien": 0.17, "dao-han-bang": 0.32, "hac-phong-dao": 0.69, "dao-moc": 1.24, "dao-thien-kim": 2.13, "dao-hau-tho": 2.89, "vet-nut-ngoai": 3.76};
// Chỗ đầu boss mỗi tinh cầu (đơn vị bản đồ, ô 16): giữa mép trên, như src/game/thien-mang.js spawnMang. Chỉ tính giây chém khi
// vị trí cuối người đó gửi lên phòng nằm trong NEAR (near 22 ô của data/thien-mang.json + 4 ô dư cho trễ mạng).
export const HEAD = {"thon-thien-mang": [[1422.8, 1343.6], [1435.9, 1503.6], [1658.3, 1203.6], [1985.4, 1273.6], [2181.7, 1193.6], [2364.8, 1313.6], [2377.9, 1453.6], [2364.8, 1603.6], [1579.8, 1673.6]], "thanh-khe": [312.0, 8.0], "thien-kiem-phong": [376.0, 8.0], "dao-xich-dien": [376.0, 8.0], "dao-han-bang": [392.0, 8.0], "hac-phong-dao": [408.0, 8.0], "dao-moc": [440.0, 8.0], "dao-thien-kim": [472.0, 8.0], "dao-hau-tho": [488.0, 8.0], "vet-nut-ngoai": [504.0, 8.0]};
export const NEAR = 26 * 16;
// Vùng không gian Thôn Thiên Mãng (chủ dự án 06/11/2026 15:03): HEAD là danh sách chín đầu (data/thien-mang.json → arena, sky.mouths,
// cỡ hình boss.mang), đứng gần đầu nào cũng tính; FARM_LT_S như nhau cho mọi người (arena.farm_lt_s).
// PvP Ngoại Vực (bản sao data/pvp.json → server; chủ dự án 06/11/2026)
export const PVP = {"map": "vet-nut-ngoai", "range": 160, "gap_s": 0.5, "dt_max": 1.5, "dps_k": 0.1, "hp_k": 2, "pw_min": 100, "regen_s": 10, "immune_s": 10};
// Lịch boss (bản sao data/thien-mang.json → lich; chủ dự án 06/11/2026 20:59): mở nhận sát thương từ phút from tới to mỗi ngày theo giờ
// múi tz (giờ VN = +7). Hết giờ thì worker tự tổng kết (index.js scheduled → mang.js tongKet).
export const LICH = { tz: 7, from: 20 * 60 + 30, to: 21 * 60 };
