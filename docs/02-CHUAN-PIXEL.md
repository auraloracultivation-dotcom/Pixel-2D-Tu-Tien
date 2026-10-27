# 02. Chuẩn hình pixel (dùng ở bước 3)

Bản chơi tạm hiện vẽ hình khối đơn giản. Khi sang bước 3, hình thay theo chuẩn này.

- Pixel thật: vẽ thế giới ra khung độ phân giải gốc, phóng nguyên lần bằng nearest neighbor, không làm mịn. 1 điểm ảnh hình = 2 đơn vị thế giới.
- Viền 1 px tối cùng tông (hoặc mực #1b1830), bóng 3 tông đổi sắc, sáng từ trên trái, không khử răng cưa.
- Hiệu ứng: không viền, lõi trắng, quầng sáng cộng; tan bằng dither Bayer 4×4.
- Nhịp đánh: lấy đà → vệt chém nhanh (40 ms) → giữ đỉnh (70 ms) → tan. Trúng: khung chớp trắng, ám đỏ, đẩy lùi. Đứng yên: nhún 1 px.
- Ánh sáng: hạ nền tối, dải sáng theo bậc, nhân màu ấm, viền sáng, bóng đổ.
- Hình vẽ bằng code ở `tools/art/` (Python), xuất `assets/art/*.png` và `data/art.json`. Chạy: `python3 -I tools/art/build.py`. Bản nháp hiện có: 4 NPC + nhân vật chính chibi 22×26, 2 quái giọt, cỏ, cây, đá, vệt chém, số sát thương. Chưa dùng trong game.
- Nhân vật chính dùng tạm ảnh có sẵn: dải khung đặt ở `tools/art/nguon/` (nền hồng tím), `tools/art/heroes.py` tách nền và chia khung, `build.py` xuất `hero.*`. Game vẽ bằng `src/render/draw-hero.js`: hình gốc nhìn phải, quay trái lật gương; khung từng động tác ở `data/heroes.json`. Bản nữ hiện lấy từ dải 6 khung chủ dự án gửi; chuyển động SpriteCook (nam: đứng, đi, chém; nữ: đứng, đi, đâm, chém) chờ tải về khi dự án chạy trên môi trường có mạng.
