# Hiệu ứng chiêu điểm ảnh (PixelFX) — ghi chú làm việc

Chủ dự án 13/11/2026: "xây lại toàn bộ hiệu ứng kỹ năng, không dùng ảnh GPT", "đẹp và chất để giữ chân người chơi, tốn bao lâu cũng được,
hiệu ứng đẹp âm thanh tốt là thứ cần nhất". Làm xong phải **gửi xem trước, chủ dự án duyệt rồi mới bật cho người chơi** (cờ `px_on`).

## Đã chốt (kỹ thuật)

- PixelFX ghim `5294518c` (MIT). Máy làm việc: `PIXELFX_DIR=<scratchpad>/ext/pixelfx`. Không có thì `tools/art/vfx_pfx.py --dung` tự tải.
- Dựng sẵn thành tấm lưới (không chạy PixelFX trong trình duyệt, điện thoại không gánh nổi):
  `tools/art/pfx/sprites.mjs` (danh sách) → `export.mjs` → `tools/art/nguon/pfx/<tên>.png` (màu) + `<tên>.l.png` (sáng) + `meta.json`
  → `python3 -I tools/art/vfx_pfx.py` → `assets/art/pfx-*.png` + mục `pfx.<tên>` / `pfx.<tên>.l` trong `data/art.json`.
- Lưới điểm ảnh: 1 điểm hình = 0,5 đơn vị bản đồ = 1 điểm khung vẽ trên điện thoại (Z = 2; iPhone khung vẽ 1,5x). Cùng cỡ điểm ảnh với nhân vật.
  Chiêu bán kính r đơn vị → 2r điểm ảnh. Lớp sáng lưu nửa cỡ (`ls: 2`, nhìn không khác) trừ hình nhỏ.
- Game nhìn thẳng từ trên xuống, ô đất vuông, khung ngắm chiêu là hình tròn thật → mặt đất của hiệu ứng là elip dẹt nhẹ (`SY` trong
  `fx/_td.js`), vật đứng (tinh thể, lửa, cột) vẽ thẳng đứng, xếp trước sau theo y. Hiệu ứng gốc của PixelFX là nhìn ngang → chiêu vùng
  phải viết bản riêng trong `tools/art/pfx/fx/` (chép sang `<PixelFX>/src/fx/p2d/` khi dựng).
- Sát thương chiêu vùng tính ngay lúc tung → hình bắt đầu ngay khung nổ, không có đoạn tụ lực dài.
- Đạn: dựng sẵn 5 góc (0..90°) bằng phép xoay của PixelFX, game lật ngang / dọc + xoay phần lẻ ≤ 11°.
- Game: `src/game/pfx.js` (trạng thái, công thức `data/vfx.json → px`), `src/render/vfx/pfx.js` (vẽ tấm lưới, bám lưới điểm ảnh),
  `src/render/vfx/draw-pfx.js` (lớp dưới chân + lớp trên cùng). `src/game/vfx.js` gọi sang trước; không có công thức px thì hiệu ứng cũ.
  Bật thử: địa chỉ `?pfx=1` (nhớ trên máy), tắt `?pfx=0`; mặc định theo `vfx.json → px_on`.
- Thử trong game: `<scratchpad>/pfx/lab.mjs` (máy giả iPhone, đặt quái, tung chiêu, chép khung vẽ theo từng mốc thời gian) + `sheet.py`.

## Việc còn lại

Xem danh sách việc trong phiên làm việc (đạn + nổ, chiêu vùng + trận + vùng kéo dài, khiên / hồi máu / lướt / chiêu kiếm, âm thanh,
quay đoạn xem trước). Cập nhật mục này mỗi khi xong một cụm.
