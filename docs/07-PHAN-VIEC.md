# Phân việc giữa các tab AI

Chủ dự án chốt 29/10/2026. Mỗi tab Claude giữ một mảng. Trước khi làm, đọc file này để biết phần nào của mình, phần nào phải hỏi tab khác. Mục đích: không sửa đè lên nhau (đã xảy ra: chip sự kiện đè cột nhận đồ, suýt ghi đè file trang trí động phủ).

## Bốn mảng

### A. Hình ảnh và giao diện
Nhân vật, quái, bản đồ, khung, icon, chữ pixel, hiệu ứng, ánh sáng, giao diện lễ hội.
- Giữ: `tools/art/**`, `assets/**`, `src/render/**`, `style.css`, `style-khung.css`, `docs/02-CHUAN-PIXEL.md`.
- Hình chuẩn: `docs/02-CHUAN-PIXEL.md`.

### B. Nội dung và cách chơi
Cốt truyện, nhiệm vụ, NPC, chỉ số, rơi đồ, chiêu, tu luyện, động phủ, bí cảnh, các bảng chức năng.
- Giữ: `data/**` (trừ các file mảng C, D giữ bên dưới), `src/game/**`, `src/ui/**` (trừ file mảng D giữ), `docs/01`, `docs/03`, `docs/04`.

### C. Máy chủ và kinh tế
Supabase, RPC, Edge Function, lưu máy chủ, chống gian lận, Linh Thạch, Tiên Ngọc, nạp, chợ, phần thưởng có giá trị.
- Giữ: `src/net/**`, `supabase/**`, `src/game/cloud-guard.js`, phần máy chủ của sự kiện giới thiệu và thưởng góp ý.
- Mọi thay đổi cơ sở dữ liệu thật: chủ dự án duyệt trước (luật trong `CLAUDE.md`).

### D. Vận hành và sửa lỗi
Nhận báo lỗi, đề xuất, lỗi JavaScript máy người chơi, cờ gian lận; sàng lọc; sửa lỗi nhanh; email tổng hợp mỗi giờ; thông báo, sự kiện theo mùa, lời đáp người chơi; trả lời "có chạy trên máy X không" (CH Play, cài điện thoại).
- Giữ: `src/ui/feedback-panel.js`, `src/ui/feedback-shot.js`, `src/ui/fame-panel.js`, `src/ui/notice-panel.js`, `src/ui/event.css`, `src/net/feedback.js`, `src/net/errlog.js`, `data/community.json`, `data/notice.json`, `data/inbox.json`, khoảng ngày lễ `le` trong `data/light.json`, `tools/gop-y/**`, `docs/05-CH-PLAY.md`, `docs/06-CAI-DIEN-THOAI.md`.
- Việc định kỳ mỗi giờ: theo mục "Báo lỗi, đề xuất của người chơi" trong `docs/03-CAU-TRUC.md`.

## Mảng D được sửa ở đâu

Lỗi người chơi báo thường nằm trong file của mảng khác. Mảng D **được sửa thẳng** khi đủ cả ba điều:
1. Lỗi rõ, có báo cáo hoặc lỗi JavaScript làm bằng chứng.
2. Sửa nhỏ: vài chục dòng, không đổi hình dáng, lối chơi, số kinh tế.
3. Không đụng cơ sở dữ liệu thật.

Khi đó tên Pull Request ghi mảng bị đụng, ví dụ `Sửa lỗi #9 [đụng A: style.css]`, để tab chủ biết mà kéo về.

Lỗi lớn hơn, hoặc phải đổi thiết kế: mảng D không tự làm. Mở GitHub issue, tên bắt đầu bằng mảng giữ file (`[A]`, `[B]`, `[C]`), dán số báo cáo, ảnh, cách tái hiện. Tab chủ mảng nhận và sửa. Mảng D đáp người chơi "đang sửa" (`dang_xem`).

## File dùng chung

`index.html`, `src/main.js`, `data/config.json`, `CLAUDE.md`, `docs/03-CAU-TRUC.md`: tab nào cũng có thể phải sửa. Sửa ít nhất có thể, mỗi PR một việc, ghi rõ trong mô tả PR.

Thêm phần tử vào bảng điều khiển (nút, chip, dòng chữ trên màn chơi): báo mảng A trong mô tả PR, vì mảng A giữ bố cục màn hình.

## Nếp làm chung

- Trước khi bắt đầu: kéo `main` mới nhất. Làm xong: PR nhỏ, gộp sớm, đừng để nhánh sống lâu.
- Chạy `node tools/check.mjs` trước khi đẩy (luật trong `CLAUDE.md`).
- Thấy việc thuộc mảng khác: ghi issue cho mảng đó, không tự làm.
- Kiểm thử: việc chạy theo lịch mỗi đêm (chơi thử tự động, chụp ảnh), không cần tab riêng.

## Giao việc (chủ dự án chốt 29/10/2026 21:17)

Mảng D là người giao việc. Mọi việc mới (báo lỗi, đề xuất, việc chủ dự án nhờ) thành một GitHub issue, gắn đúng **một** nhãn mảng: `mang-A`, `mang-B`, `mang-C`, `mang-D`.

- Việc rõ thuộc mảng nào thì giao mảng đó.
- Việc không thuộc mảng nào, hoặc thuộc nhiều mảng ("việc thứ 5"): mảng D vẫn phải giao cho một tab cụ thể, chọn tab đang ít việc nhất, ghi lý do trong issue. Không để issue nào không có nhãn.
- Giữ đều: số issue đang mở của mỗi mảng chênh nhau không quá 1–2. Mảng nào dồn nhiều thì mảng D chuyển bớt việc nhỏ (vẫn theo luật sửa thẳng ở trên) sang mảng ít việc, đổi nhãn và ghi lý do.
- **Đầu mỗi phiên, mỗi tab mở danh sách issue mang nhãn mảng mình** (`gh issue list --label mang-X`) và làm từ việc cũ nhất. Làm xong: PR ghi `Sửa #số`, gộp thì issue tự đóng; mảng D theo dõi để báo người chơi và thưởng.
- Bảng việc hiện tại: https://github.com/auraloracultivation-dotcom/Pixel-2D-Tu-Tien/issues
