# Hóa ma (chủ dự án 22/11/2026 01:54 – 02:21)

## Lời chủ dự án

- 01:54: "Tắt khiên thêm 1 nút bên cạnh nữa, hoá ma! Lúc này có thể đồ sát mọi người, 2 người hoá ma thì sẽ k đồ sát nhau vì cùng loại. Mỗi lần hoá ma, sẽ tích 1 điểm, khi bị giết sẽ trở thành người thường. Khi hoá ma giết 1 người thì sẽ tích 3 điểm ma hoá, phải chết 3 lần mới hoá thành người bình thường. Có thể giết cả người đang bật hoặc tắt khiên trừ người bật ma hoá. Và sẽ có thêm bảng xếp hạng ma hoá và công đức. Mỗi người giết 1 người bị ma hoá sẽ tích 1 điểm công đức, điểm sẽ ghi trên bxh, và ngược lại, ai giết càng nhiều người, điểm ma hoá càng cao, điểm sẽ dựa trên số liệu thật, nếu họ có 189 điểm, họ chết 1 lần, bxh sẽ trừ 1 còn 188."
- Bảng câu hỏi 02:0x:
  - "Điểm = số lần phải chết".
  - "Người diệt ma thì ma mất 1% linh thạch và 1% tu vi, ma diệt người thì người mất 2% linh thạch nhưng k mất tu vi, nếu tu vi k đủ thì sẽ tụt rank nhưng lần sau tăng lại sẽ k đc thêm điểm tiềm năng nữa vì đã từng cộng ở rank đó".
  - "Che dưới Luyện Khí tầng 5".
  - "Ma nhân 1 ngày giới hạn số lượt đồ sát người, khoảng 10 người".
- 02:04: "người số 11 thì sẽ không còn nhận được linh thạch nữa".
- 02:20 – 02:21: "cái khiên sẽ đổi thành hình dạng đầu lâu", "thanh máu sẽ thành màu đen".

## Luật (số ở `data/pvp.json` → `ma`, `server.ma`; ghi chú `_ma`)

| | |
|---|---|
| Điểm ma | Số lần còn phải chết. Hóa ma +1 (`diem.hoa`), mỗi người mình hạ +3 (`diem.giet`), mỗi lần bị hạ −1 (`diem.chet`). Về 0 là người thường, khiên bật lại. |
| Ai đánh ai | Ma đánh mọi người không phải ma, còn khiên hay không. Người thường, còn khiên hay không, đánh được ma. Hai ma không đánh nhau. Hai người thường: luật PvP cũ (cùng tắt khiên). |
| Người mới | Tổng tầng tu dưới `server.ma.min_tl` (4 = Luyện Khí tầng 5): ma không đánh được, không đánh được ma, không hóa ma được. Máy chủ phòng đọc tầng từ Supabase (không tin máy khách); chưa đọc được thì coi như người mới. |
| Chỗ an toàn | Vòng pháp trận Thiên Kiếm Tinh như PvP cũ. Vừa hồi sinh `immune_s` giây không ai đánh được và không ra đòn được, kể cả ma. |
| Khiên | Hóa ma là tắt khiên luôn; đang là ma không bật lại được, Tự hồi khiên sau 10 phút không áp dụng. |
| Mất khi ma bị diệt | `mat.ma_lt` (1%) Linh Thạch về Hòm thư người diệt (lý do `ma_diet`) và `mat.ma_tu_vi` (1%) tu vi = phần đó của thanh linh khí tầng đang ở (đúng thanh máy khách thấy, `qiNeed`). Linh khí không đủ thì tụt một tầng (có thể tụt cảnh giới), linh khí = thanh tầng dưới trừ phần còn thiếu. Luyện Khí tầng 1 thì về 0, không tụt. |
| Mất khi ma hạ người | Người đó mất `mat.nguoi_lt` (2%) Linh Thạch về Hòm thư ma (lý do `ma_ha`), không mất tu vi, không mất món. Mỗi ngày (giờ Việt Nam) chỉ `lt_ngay` (10) lượt đồ sát đầu có nợ; từ lượt 11 không ai mất gì, ma vẫn +3 điểm. |
| Công đức | Mỗi lần diệt một ma +1. |
| Tụt cảnh giới | Điểm tiềm năng tính theo cảnh giới cao nhất từng đạt (`p2d_nhan_vat.canh_max`, `save.tiem.max`): không mất điểm đã có, lên lại không được thêm; màn đột phá không báo "+5 điểm" khi lên lại; quà mỗi 10% tầng không tặng lại cho tầng đã qua. |
| Soát | Cùng một cặp, cùng kiểu, quá `nghi_cap` (5) lần một ngày: một dòng `p2d_nghi_van` lý do `ma_cap` (tối đa mỗi 10 phút), chỉ để soát, không chặn, không cộng điểm nghi vấn. |
| Bảng xếp hạng | Ma hóa (điểm ma hiện tại, chỉ người đang là ma) và Công đức, trong Xếp hạng. |

Cách hiểu AI tự chọn, đã báo chủ dự án lúc bắt đầu (02:0x), chờ chỉnh nếu khác ý: "1% tu vi" là 1% thanh linh khí của tầng đang ở; từ lượt đồ sát thứ 11 trong ngày người bị hạ cũng không mất gì; người mới không đánh được ma; vừa hồi sinh thì ma cũng không ra đòn được; diệt ma hiện chữ "Trấn Ma Kỷ chép" cho người diệt.

## Ai làm gì

- **Máy chủ phòng Cloudflare** (`cloud/src/ma.js`, `pvp.js`, `phong.js`, `mang.js`) là trọng tài:
  - `quyen(a, b)` quyết đánh được không và kiểu trận: `giet` / `diet` / `pvp`.
  - Tin `mh` (bấm Hóa ma): lõi Mang hỏi Supabase rồi mới cho thành ma.
  - Gục trong trận có ma (`maGuc`): lõi Mang báo Supabase, phòng đổi điểm ma, báo cả phòng (`pd` có `k`, `ma`, `cd`; `pk` có `ma`).
  - Lõi Mang giữ điểm ma theo tài khoản cùng khiên (`pk`, có lưu), nên đổi tuyến, vào lại vẫn là ma.
  - Hồ sơ phát cho người khác có `ma` (chữ số) và `bm` (người mới), do phòng gắn (`data/dong-bo.json`, `ai: may-chu`).
  - Tầng tu đọc từ `p2d_nhan_vat` qua `profileOf` (header `x-tl`; máy khách tự gửi các header `x-name`, `x-power`, `x-co`, `x-tl`, `x-map` thì bị xoá).
- **Supabase** (migration `20261122040000_p2d_hoa_ma.sql`):
  - Giữ điểm: bảng `p2d_ma_hoa` (điểm ma, công đức, đếm); nhật ký `p2d_ma_tran` (chống gửi trùng, soát cặp).
  - `p2d_ma_ghi` có ký bằng khoá `cf_mang` như `p2d_pvp_ghi`.
  - Trả nợ trong `p2d_pvp_tra` (nơi `ma_giet`, `ma_diet`).
  - Bảng xếp hạng `p2d_bxh2_het('ma' | 'cong_duc')`.
  - Cấu hình dòng `ma` của `p2d_ky_cfg` (`node tools/ky-cfg.mjs ma`, `tools/check.mjs` so).
  - Bộ hãm linh khí bỏ qua lần trừ tu vi do chính máy chủ làm (`p2d.lk_tru`): thanh linh khí máy khách lớn hơn công thức gốc `p2d_lk_can` nhiều, không bỏ qua thì tụt tầng bị đọc thành tăng vọt, bị cắt và cắm cờ oan (tự kiểm tra trong migration bắt được nếu thiếu dòng này).
- **Máy người chơi**:
  - `src/game/pvp-ma.js`: chọn mục tiêu đúng luật trọng tài (`danhDuoc`), nhịp gửi vị trí khi có thể giao chiến (`giaoChien`), bấm Hóa ma, chữ, hàng chữ lớn, sửa bản lưu theo kết quả trả nợ.
  - `src/ui/pvp-btn.js`, `pvp.css`: nút Hóa ma cạnh Tắt khiên, bảng luật, đầu lâu + số điểm ma, thanh máu đen, `body.la-ma`.
  - `src/render/draw-pvp-tag.js`, `draw-ma.js`, `draw-nguoi.js`: người khác thấy đầu lâu, ma khí, thanh máu đen; mình là ma thì người mới tên xám.
  - Đầu lâu vẽ bằng code: `tools/art/dau_lau.py` (`ui.k-dau-lau`). Chủ dự án gửi ảnh GPT thì thay.

## Thứ tự đưa lên

Áp migration TRƯỚC, rồi mới gộp (gộp `main` là Cloudflare tự đưa máy chủ phòng mới lên, GitHub Pages đưa máy khách mới). Phòng mới mà Supabase chưa có `p2d_ma_ghi` thì bấm Hóa ma chỉ báo "Ma khí chưa nhập được", không hỏng gì; máy khách mới gửi `tiem.max` mà trigger cũ chưa biết thì mỗi lần lưu bị sửa lại `tiem` (không cắm cờ), nên vẫn phải áp trước.

## Bài thử

- `node tools/cloud/pvp.test.mjs`: phần 6 hóa ma (12 kiểu sửa hỏng luật đều bị bắt).
- `node tools/cloud/phong.test.mjs`: lõi Mang ký `p2d_ma_ghi`, giữ, lưu, đọc lại điểm ma.
- `tools/hai-may.mjs` mục 5b: hai trình duyệt qua phòng giả. B bấm Hóa ma thật; A, C thấy điểm ma và đầu lâu; C còn khiên gửi vị trí theo nhịp giao chiến; ma đánh người còn khiên được.
- Migration có tự kiểm tra (15 nhóm, hoàn tác sau khi chạy). Đã chạy tại chỗ trên PGlite với bản đang chạy của các hàm liên quan: đạt. Sáu kiểu sửa hỏng (bỏ trần mỗi ngày, bỏ `p2d.lk_tru`, bỏ `canh_max`, bỏ bảng Ma hóa, cho người mới diệt ma, tụt tầng về 0) đều bị bắt.

## Còn chờ

- Ảnh GPT đầu lâu (nếu chủ dự án muốn thay bản vẽ bằng code).
- Danh hiệu tuần cho hai bảng mới (`social.json → rank.titles`), cùng các danh hiệu tuần khác đang chờ.
