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
- **13/11 07:23–08:04, chủ dự án xem lần 1 rồi chốt:** "hiệu ứng tốt, hình ảnh chưa tốt lắm, Hồ Lô chưa có hồn"; "không thích ảnh GPT làm HIỆU ỨNG
  chứ không phải không thích ảnh GPT; icon cũ giữ nguyên; tận dụng ảnh GPT để biến nó thành đồ của bạn"; "đừng râu ông nọ cắm cằm bà kia";
  thứ chuyển động + âm thanh: Claude; ảnh tĩnh, biểu tượng, công trình, đồ vật: GPT; vật sống: SpriteCook; bản đồ: Claude code. Rồi bảo đẩy lên game.
  → gỡ bộ 8 biểu tượng pháp bảo điểm ảnh vừa vẽ (hình trên nút giữ hình cũ); 19 biểu tượng chiêu khảm (`fx/icon-ck.js`, `_ck-grids.js`,
  `pxi.ck-*`) còn trong kho nhưng KHÔNG dùng. `px_on: true` từ 08:04.
- **Lần 1 đo nhầm cỡ điểm:** nhân vật vẽ 1 điểm hình = 1 điểm khung vẽ (thân 42–45 điểm cho 24 đơn vị), chỉ ô đất / cây mới thô gấp đôi. Món
  pháp bảo lần 1 vẽ `k: 2` nên thô gấp đôi nhân vật đứng cạnh → một phần lý do "hình ảnh chưa tốt". Món làm lại vẽ `k: 1`.
- **Hồ Lô lần 2 (mẫu cho bảy món còn lại):** `tools/art/pb_vat.py` lấy tranh gốc `nguon/ai/phap-bao/goc/hu-ho-lo.png` (hồ lô đã bật nút đang
  phun): gỡ nước theo màu (xanh trội + trắng dính liền, chừa hạt ngọc), vá chỗ nước đè lên thân, vẽ lại miệng (elip), tách nút gỗ + dây ra
  để đung đưa quanh điểm buộc khuất sau vành miệng, rồi với mỗi khung: phồng bụng / co giãn / xoay ở cỡ tranh gốc → thu 2,7 lần bằng màu
  đa số từng ô → một bảng 30 màu chung → viền mực. `pb-holo` (hít, dáng như tranh: miệng chếch −40°, quay trái thì lật), `pb-holo-phun`
  (9 hướng 0..90°, game lật cho đủ vòng). Hiệu ứng: `fx/ho-lo.js` (phễu xoáy, dựng sẵn góc −40°), `fx/ho-lo-nuoc.js` (luồng, sóng; game xoay).
  Trong game hồ lô lơ lửng trên đầu cả lúc hít lẫn lúc phun (chúc miệng dội xuống vùng trước mặt, không che nhân vật), có giật lùi (`rc`).
- **08:17 chủ dự án đổi cách: KHÔNG cho tranh GPT cử động nữa**, tranh chỉ làm mẫu để đồ ("sao chép điểm ảnh rồi biến nó thành của bạn tự vẽ ra thì
  được, ảnh GPT nhìn không hợp chuyển động"). `pb_vat.py` viết lại: dọn tranh như cũ → `Bang` (chia chất liệu theo sắc, mỗi chất liệu một dải
  sắc độ khai tay `'màu trong tranh>màu vẽ ra'`; `--xem` in dải tự tìm để dò) → `lop()` đồ ra bản vẽ phẳng ở cỡ tranh → `ve()` dựng từng dáng
  bằng bỏ phiếu 4 × 4 mẫu mỗi điểm hình (nét tối nặng phiếu hơn để nét mảnh không bị nuốt) → `loang()` vệt sáng = đẩy sắc độ → `vien()` → `xuat()`.
  Thân chỉ dựng vài dáng rồi dùng lại (Hồ Lô: 4 mức phồng theo ba hơi hít) nên điểm ảnh đứng yên giữa các khung; nút gỗ dựng riêng từng góc.
  Hồ Lô 16 màu (k 2,7), Đại Ấn 12 màu (k 3,6). Tên hình, điểm neo, cách game vẽ giữ như lần 2.
- **Đại Ấn:** khối ấn đồ theo `pb-dai-an.png` (`pb-an` treo / rơi có vệt sáng lướt, `pb-an-dap` bẹp rồi nảy lúc nện); hiệu ứng riêng
  `fx/an-giang.js` (lớp đất: đất sém, khe nứt có linh quang, DẤU TRIỆN khung vuông hồi văn đặt chéo + thái cực, to hơn chân ấn, nằm lại sau khi
  khối ấn tan; lớp nổi: tia sáng dựng đứng, bụi, đá vụn) thay cho `dia-chan` đi mượn; đổi màu theo hệ khảm; game phóng theo tầm đòn, tối đa 3.
  Bỏ `fx/an.js` (khối ấn vẽ bằng code của lần 1).
- Tranh gốc của các món khác: `pb-dai-an.png` + `hu-dai-an.png`, `pb-linh-chau.png` + `hu-linh-chau.png`, `pb-ho-thuan.png`, `pb-tran-ky.png`;
  Phi Kiếm: `nguon/ai/kiem/kiem.png` (kiếm số 3 đang làm hình trên nút); Bảo Phiến: `gear.ba-tieu-phien`; Đồng Chung: ô chuông trong `nguon/ai/chieu/chieu-3.png`.
- `export.mjs --icons [tên…]`, `PFX_OUT=<thư mục>` (dựng thử ra chỗ khác), `vfx_pfx.py` đọc cỡ biểu tượng từ file.
- Phòng thử: `<scratchpad>/pfx/pblab.mjs <ra> <loại[:phẩm[:cấp[:chiêu+chiêu]]]…> --q pfx=1 [--times …] [--dir x,y] [--mobs n]`, `pbplay.mjs` (ghi tiếng đã phát),
  `play.mjs` (bấm nút thật), `perf.mjs` (đo khung).

## Việc còn lại

- Sáu món còn lại đồ lại theo tranh mẫu như Hồ Lô, Đại Ấn (thứ tự đề nghị: Hộ Thuẫn, Linh Châu, Trận Kỳ, Phi Kiếm, Bảo Phiến, Đồng Chung),
  mỗi món hiệu ứng riêng, không mượn hình của món khác.
- Món phẩm cao: dựng thêm cỡ 1,5 lần ngay từ bản vẽ phẳng (`ve()` với k nhỏ hơn; đừng phóng điểm ảnh).
- Điện thoại thật có giật không: chờ chủ dự án và người chơi báo; giật thì tắt lại bằng `px_on: false`.
- Người khác chưa thấy đòn pháp bảo của nhau (bộ cũ cũng chưa có).
- 48 chiêu cũ: chủ dự án muốn xoá (13/11 07:17). Chưa đụng; So tài còn dùng, phải hỏi lại trước khi gỡ.
