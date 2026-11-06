// Bản sao từ data/thien-mang.json (tools/cloud/phong.test.mjs so khớp): Linh Thạch farm thường mỗi giây theo tinh cầu có đầu boss,
// và hệ số thưởng khi chém Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: gấp 10 lần farm thường).
export const LT_MULT = 10;
export const FARM_LT_S = {"thanh-khe": 0.07, "thien-kiem-phong": 0.09, "dao-xich-dien": 0.17, "dao-han-bang": 0.32, "hac-phong-dao": 0.69, "dao-moc": 1.24, "dao-thien-kim": 2.13, "dao-hau-tho": 2.89, "vet-nut-ngoai": 3.76};
// Chỗ đầu boss mỗi tinh cầu (đơn vị bản đồ, ô 16): giữa mép trên, như src/game/thien-mang.js spawnMang. Chỉ tính giây chém khi
// vị trí cuối người đó gửi lên phòng nằm trong NEAR (near 22 ô của data/thien-mang.json + 4 ô dư cho trễ mạng).
export const HEAD = {"thanh-khe": [312.0, 8.0], "thien-kiem-phong": [376.0, 8.0], "dao-xich-dien": [376.0, 8.0], "dao-han-bang": [392.0, 8.0], "hac-phong-dao": [408.0, 8.0], "dao-moc": [440.0, 8.0], "dao-thien-kim": [472.0, 8.0], "dao-hau-tho": [488.0, 8.0], "vet-nut-ngoai": [504.0, 8.0]};
export const NEAR = 26 * 16;
