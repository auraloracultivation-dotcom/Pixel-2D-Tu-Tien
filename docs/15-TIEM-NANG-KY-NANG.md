# Tiềm năng và Kỹ năng

Chủ dự án 21/11/2026 17:23: "trc mắt là kỹ năng và tiềm năng". Làm trên nhánh `tran-ma-ky`, máy tạm, **chưa đẩy lên GitHub, chưa đổi máy chủ**.
Phần này nói thiết kế đã chốt, số đang dùng, chỗ code, việc còn chờ chủ dự án. Quyết định và lời gốc ghi ở `CLAUDE.md`.

## 1. Lời chủ dự án

- 17:23: "Tiềm năng là có thể lựa chọn khởi đầu random vài chỉ số cơ bản, mà trong đó random sẽ có ngẫu nhiên chọn đc tộc. Linh tộc, cổ tộc. Thần tộc yêu tộc hư tộc, nhân tộc, tiên tộc vân vân, và mỗi tộc sẽ có chỉ số random khác nhau lợi thế sức mạnh khác nhau, và sau này muốn đổi tộc sẽ phải làm 1 số nghi lễ phức tạp, hiện tại thì chưa đổi được. Và mỗi khi đột phá một đại cảnh giới đều có điểm tiềm năng để cộng thêm cho nhân vật."
- 17:23: "kỹ năng, cách chiến đấu và skill thì sẽ mở thêm 1 ô bên cạnh ô công pháp, mà ở đây, b sẽ tự code ra kỹ năng phù hợp vs các tình huống, và giai đoạn truyện hợp lý để mở khoá kỹ năng, kỹ năng cũng có thể nâng cấp và mở rộng giống như khảm thêm tính chất cho pháp bảo."
- 17:23: "Tiềm năng cùng hàng với kho, trang bị, linh thú.. nằm ngay dưới ô trang bị. Còn kỹ năng thì nằm trong phần công pháp."
- Bảng câu hỏi 21/11 tối: nút kỹ năng "3 ô hàng dọc sát mép phải phía dưới bên trên khung dưới"; các tộc "khác hướng, ngang sức"; quay "1 lượt duy nhất"; truyện "chờ xong cả ba" rồi đẩy một lần.
- Bảng câu hỏi 22/11 rạng sáng: kỹ năng là "bộ mới theo truyện" (48 chiêu cũ vẫn xoá như đã bảo 13/11 và 21/11 00:10); nâng cấp: "Merger 2 cuốn thành 1 cuốn cấp 2, cứ gấp đôi lên".

## 2. Tiềm năng

**Huyết mạch.** Lúc Cây Thế Giới nhận linh căn, Cây gọi luôn tên tộc. Một đời một lượt, quay xong ghi vào bản lưu rồi mới mở màn lễ (thoát giữa lễ cũng không quay lại được).
Người mới: lệnh truyện `{ "le_toc": "truong-thon" }` ngay sau lễ linh căn ở Thanh Khê, trưởng thôn đứng lễ. Người đang chơi (đã thức tỉnh trước khi có Tiềm năng): lúc màn hình yên đủ 4 giây (không thoại, không bảng, không quái đang đuổi), Hệ Thống báo rồi mở lễ, đúng một lần.

| Tộc | Tỉ lệ | Hướng chỉ số | Thiên phú |
|---|---|---|---|
| Nhân tộc | 34% | Công, Sinh lực, Thủ đều nhau | |
| Linh tộc | 22% | Hồi chiêu, Công, Bạo kích | |
| Yêu tộc | 20% | Hút máu, Bạo kích, Công | |
| Cổ tộc | 12% | Sinh lực, Thủ, Phản đòn | Thân Thượng Cổ: tự hồi 0,25% Sinh lực mỗi giây |
| Hư tộc | 8% | ST bạo, Bạo kích, Hồi chiêu | Hư Bộ: Lướt hồi nhanh hơn 20% |
| Thần tộc | 3% | Công, ST bạo, Sinh lực | Thần Huyết: máu dưới 30% thì hồi ngay 20%, 120 giây một lần |
| Tiên tộc | 1% | Hồi chiêu, Sinh lực, Công | Tiên Cốt: tốc tu +6%, Linh lực tối đa +10% |

**Ngang sức.** Mọi tộc quay chung một khoảng 6–10 điểm, chỉ khác chia vào chỉ số nào (mỗi phần lệch ngẫu nhiên ±25%). Một điểm đổi ra % bằng tỷ giá riêng `quy` (Công 1%, Sinh lực 1,9%, Thủ 3,6%, Bạo kích 0,6%, ST bạo 5,5%, Hồi chiêu 1,25%, Hút máu 1,25%, Phản đòn 1,3%), chọn sao cho một điểm vào chỉ số nào cũng thêm chừng 0,43–0,46% lực chiến trên tu sĩ chuẩn. Đo 21/11: huyết mạch thêm 2,5–4,5% lực chiến; người hên nhất của tộc này hơn người xui nhất của tộc kia 2,5%. Không dùng thẳng tỷ giá dòng `line_f` của `data/he-chien.json` vì theo công thức lực chiến 20/11 nó không còn ngang nhau (thử ra 8,8% lệch, tộc thiên về bạo kích hơn hẳn).

**Điểm tiềm năng.** 5 điểm mỗi lần đột phá đại cảnh giới, tính thẳng từ cảnh giới đang ở (người chơi cũ tự có đủ, không cần phát bù). Mỗi điểm cộng 0,6 điểm quy vào một trong 6 chỉ số (Công, Sinh lực, Thủ, Bạo kích, ST bạo, Hồi chiêu), mỗi chỉ số tối đa 20 lần (Hồi chiêu 10). Tẩy điểm: lần đầu miễn phí, sau đó 3 000 × 1,6^cảnh giới Linh Thạch. Lễ đột phá có dòng "Điểm tiềm năng +5", ra khỏi lễ nhắc nếu còn điểm chưa dùng.

**Trần.** Cộng vào chỉ số như một nguồn thưởng nhỏ có trần (`data/he-chien.json → extra_cap.tiem` 24, theo Công % tương đương, mỗi chỉ số). Bản lưu sửa tay: chỉ nhận chỉ số thuộc hướng của tộc, tổng gốc không quá 10, điểm cộng không quá số có và trần (`tools/tiem-nang.test.mjs` thử).

**Giao diện.** Bảng Nhân vật, mục **Tiềm năng** ngay dưới Trang bị: ấn tộc, tên, độ hiếm, lai lịch, chỉ số trời cho, thiên phú; điểm còn / có; mỗi chỉ số một dòng "đang có → cộng thêm thì thành", nút +; nút tẩy điểm chạm hai lần.

## 3. Kỹ năng

**Vị trí trong lối đánh.** Đánh thường liên tục; kỹ năng hồi 9–14 giây, mỗi phát bằng khoảng 2–3 nhát chém; pháp bảo hồi 60–150 giây là đòn lớn. Ba ô kỹ năng tròn xếp dọc sát mép phải, ngay trên khung dưới; có kỹ năng thì Lướt, Tự đánh, nút việc lùi sang trái nhường chỗ. Chạm: tự ngắm; vuốt: chọn hướng. Tự đánh tự ra kỹ năng đã hồi. Vào được Sắp xếp giao diện (nhóm "Kỹ năng").

**Bộ kỹ năng theo truyện** (`data/ky-nang.json → chieu`). Mỗi kỹ năng do một người trong truyện dạy. Bộ máy ra chiêu và hiệu ứng dùng lại của game; kỹ năng nào cũng mượn hiệu ứng, biểu tượng, tiếng của một chiêu có sẵn (`hinh`). Không ghi vào `data/skills.json`: lúc nạp game `knNap` đưa vào bảng chiêu, nên bảng cấu hình máy chủ không đổi và đợt xoá 48 chiêu cũ chỉ cần giữ lại phần bộ máy.

| Nhiệm vụ | Ai dạy | Kỹ năng |
|---|---|---|
| 18 Dấu vết | Trưởng lão Vân Hạc, ngay sau câu hỏi "Ngươi đứng đây vì ai?" | Phá Vân Thức: kiếm khí xuyên thẳng |
| 22 Thẻ tên (cảnh tôi lưỡi) | Lão Thiết: linh căn theo lửa lò vào lưỡi thép | theo hệ: Viêm Nhận (lửa nổ lan), Hàn Nhận (băng làm chậm), Đằng Nhận (dây trói), Kim Nhận (ba lưỡi quạt), Thạch Nhận (choáng quanh mình) |
| 26 Người ở lại | Lão Thiết chỉ bước chân của A Lực | Liệp Phong Bộ: lao tới chém xuyên |

**Sách, ghép sách.** Mỗi kỹ năng là những cuốn sách có cấp (`save.knSach { mã: [số cuốn cấp 1, cấp 2, ...] }`). Truyện phát cuốn đầu. Hai cuốn cùng cấp ghép thành một cuốn cấp trên ("cứ gấp đôi lên": cấp n cần 2^(n−1) cuốn cấp 1), tối đa cấp 10. Mỗi cấp trên 1: sát thương +8%.

**Khảm tính chất** (như khảm chiêu vào pháp bảo). Ô thứ 1, 2, 3 mở khi sách đạt cấp 2, 4, 6. Khảm, tháo tự do; không khảm trùng; mỗi tính chất hợp vài kiểu kỹ năng:

| Tính chất | Tác dụng | Mở ở |
|---|---|---|
| Tốc Kích | hồi chiêu nhanh hơn 12% | ngay |
| Tiết Linh | tốn ít linh lực hơn 30% | ngay |
| Trọng Kích | sát thương +15%, hồi chiêu chậm hơn 10% | Trúc Cơ 1 |
| Khoáng Vực | vùng trúng rộng thêm 20% | Trúc Cơ 1 |
| Hàn Ý | trúng thì chậm 1,5 giây | Trúc Cơ 5 |
| Xuyên Thấu | đạn xuyên quái, sát thương còn 85% | Trúc Cơ 5 |
| Tỏa Nhánh | tách 3 hướng, mỗi nhánh 55% | Kim Đan 1 |
| Chấn Ý | trúng thì choáng 0,4 giây, hồi chậm hơn 15% | Kim Đan 5 |

**Giao diện.** Bảng Nhân vật → Công pháp → mục **Kỹ năng** (mục này mở lại khi có Kỹ năng; trước đó ẩn từ 12/11): ba ô đang mang, các kỹ năng của người chơi (chưa học thì mờ, "mở theo nhiệm vụ chính"), chạm một kỹ năng: mô tả, mang vào ô, sách đang có và nút ghép, khảm tính chất.

## 4. Chỗ code

- Tiềm năng: `data/tiem-nang.json`; `src/game/tiem-nang.js` (quay, kẹp, điểm, thiên phú), `src/game/le-toc.js` (lễ), `src/ui/le-toc.js` + `.css` (màn lễ), `src/ui/tiem-nang-view.js` + `tiem-nang.css` (mục Tiềm năng); nối vào `stats.js` / `he-chien.js` (`ext.tiem`), `player.js` (Lướt, thiên phú), `len-tang.js` (dòng điểm khi đột phá).
- Kỹ năng: `data/ky-nang.json`; `src/game/ky-nang.js` (nạp, sách, khảm, số liệu ra chiêu); `src/ui/ky-nang-hud.js` + `ky-nang-hud.css` (ba nút, mục Kỹ năng), `src/ui/ky-nang-view.js` (mục Kỹ năng); nối vào `player.js` (lệnh `sk0–sk2`, `player.knCd`), `auto.js`, `draw-aim.js`, `skills.js castSkill(game, id, def)`, `mana.js`, `index.html` (`#btn-k0..2`), `self-panel.js`, `self-bag.js`, `story.js` (lệnh `ky_nang`).
- Bài thử: `tools/tiem-nang.test.mjs`, phần Kỹ năng trong `tools/truyen.test.mjs`; cả hai chạy trong `tools/check.mjs`.

## 5. Còn chờ chủ dự án

1. **Máy chủ** (cần migration, chủ dự án duyệt): quay huyết mạch trên máy chủ và khoá kết quả (hiện quay trên máy người chơi như linh căn; game đã chừa `game.quayTocMayChu`); kiểm số sách kỹ năng và điểm tiềm năng khi lưu. Chưa có thì người sửa bản lưu tự cho mình sách cấp cao được: không đưa Kỹ năng lên game thật trước khi có phần này.
2. **Nguồn sách thêm**: truyện mới phát cuốn đầu; sách rơi ở đâu, bao nhiêu thì chủ dự án chọn.
3. **Đo lại quái**: ba kỹ năng dùng đều tay thêm khoảng 40% sát thương so với chỉ đánh thường; đo bằng Tự đánh thật như đợt 16/11 rồi trình số.
4. **Nghi lễ đổi tộc**, hình nhân vật riêng từng tộc: để sau.
