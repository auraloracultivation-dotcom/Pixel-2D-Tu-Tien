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

## Đòn pháp bảo (13/11/2026 sáng)

Từ Mùa 2 (12/11/2026 04:07, `data/phap-bao.json → all: true`) 3 nút chiêu + nút pháp bảo cũ là 4 ô **pháp bảo**; 48 chiêu cũ ẩn với mọi người (chỉ còn ở So tài).
Thứ người chơi thấy mỗi lần bấm là đòn pháp bảo → làm lại toàn bộ phần hình + tiếng của 8 pháp bảo và 19 chiêu khảm (bộ cũ: ảnh GPT `vfx.vk-kiem`, `vfx.am`,
`vfx.tran-kim`, chuyển động SpriteCook `pbfx.*`, hình `pb.*` phóng to, nét vectơ mảnh).

- Hình: `pb-kiem` (+ `pb-kiem-khi`), `pb-chau`, `pb-manh`, `pb-quat`, `pb-phong`, `pb-an`, `pb-khien`, `pb-chuong`, `pb-co`, `pb-tran`, `pb-tran-mo`, `pb-holo`,
  `pb-no`, `pb-trung`, `pb-set`, `tt-lua / bang / lanh / re / pha` (dấu hệ trên quái). Nguồn mới: `fx/chau.js`, `manh.js`, `quat.js`, `an.js`, `co.js`, `ho-lo.js`,
  `chuong.js`, `tt.js`; `van-kiem.js` thêm kiếm mảnh (`slim`) và tô lưỡi bằng `p.shade` (trước chấm từng điểm: rỗ ở góc 45°).
- Cỡ: vật vẽ `k: 2` (cùng cỡ điểm nhân vật), nhân theo `vis` của món (phẩm × cấp), làm tròn nửa điểm; tia trúng `k: 1`. Hình vùng (`pb-tran` bán kính 96 điểm)
  dựng đúng bán kính đòn. Nổ không to quá 3 (Đánh Lan 2,5).
- Ghép: hình dựng sẵn + nét điểm ảnh vẽ thẳng (`pfx-shape.js`) + hạt. Đổi màu theo hệ: `pfx-pal.js`, dải ở `data/vfx.json → pb.ramps`.
- Đo (máy giả, vẽ bằng phần mềm, 7 đòn phẩm cao cùng lúc mỗi 0,75 giây): bộ cũ 21 ms / khung, bộ mới 29–32 ms; phần nặng là lớp sáng cộng và quầng lớn
  → đã bỏ lớp sáng của tấm phù văn lớn, bóng mờ, quầng phủ cả vùng; máy ở mức nhẹ nhất bỏ hẳn lớp sáng. Điện thoại thật vẽ bằng GPU, cần chủ dự án thử.
- Biểu tượng (13/11 sáng, đợt 2): hình cắt từ hình của đòn bị nhoè trên nút (ô 48 thu phóng lẻ) và bốn món cao quá ô → vẽ riêng bộ biểu tượng:
  8 pháp bảo ô 34 điểm (`fx/icon-pb.js`: ấn, thuẫn, chuông, cờ, hồ lô vẽ gọn; kiếm, châu, quạt dựng từ hình của đòn qua `ICON_SRC`) và 19 chiêu khảm
  ô 18 điểm (`fx/icon-ck.js` + lưới vẽ tay `fx/_ck-grids.js`; ô khảm trong trang Pháp bảo đúng 18 điểm nên 1 điểm hình = 3 điểm màn hình iPhone).
  `export.mjs --icons [tên…]` → `nguon/pfx/ic/` → `vfx_pfx.py` khai `pxi.pb-*`, `pxi.ck-*` (cỡ đọc từ file). Dựng thử ra chỗ khác: `PFX_OUT=<thư mục>`.
  Xem thử: `<scratchpad>/ic/view.py`, `viewck.py`, `<scratchpad>/pfx/pbpage.mjs` (chụp trang Pháp bảo), `hud.mjs` (chụp nút).
- Phòng thử: `<scratchpad>/pfx/pblab.mjs <ra> <loại[:phẩm[:cấp[:chiêu+chiêu]]]…> --q pfx=1 [--times …] [--dir x,y] [--mobs n]`, `pbplay.mjs` (ghi tiếng đã phát),
  `play.mjs` (bấm nút thật), `perf.mjs` (đo khung).

## Việc còn lại

- Chủ dự án xem trước → duyệt → `px_on: true`.
- Người khác chưa thấy đòn pháp bảo của nhau (bộ cũ cũng chưa có).
- 48 chiêu cũ: chủ dự án chưa trả lời có mở lại không; nếu có thì rà thêm biểu tượng và cỡ điểm cho cùng chuẩn với pháp bảo.
