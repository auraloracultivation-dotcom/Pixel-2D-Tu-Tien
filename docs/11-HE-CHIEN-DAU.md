# Hệ chiến đấu mới: cân 14 món đang có

Bản đề xuất 16/11/2026. Chủ dự án 12:51: "xây lại hệ thống chiến đấu… chỉ số nhân vật từ a-z, chỉ số trang bị và tiến hoá sao cho hợp lý"; 13:35: "đã có 14 trang bị cộng thêm chỉ số rồi, không cần thêm ô nào cả, bây giờ cân bằng 14 trang bị này"; 13:50: "trang bị ai mà chả kiếm được, nó dễ mà, nâng cũng rẻ nữa, chưa thấy cân bằng"; 14:08: "cái chính là dòng được tẩy luyện thì bạn chưa thử". Chưa vào game. Số thử ở trang **Thí Luyện Đài** (artifact của chủ dự án, bản 8): đổi luật, xem mỗi món góp bao nhiêu, cho tu sĩ đấu quái hàng nghìn trận. Các câu cần chủ dự án chốt ở mục 13.

## 1. Bốn điều phải giữ

1. **Sức mạnh nằm trong đồ, nhưng đồ mạnh tới đâu do cảnh giới lúc nhặt.** Phẩm và cấp ai cũng kiếm được, nâng rẻ, nên chỉ cộng ít; người cùng cảnh giới không lệch xa nhau.
2. **Ít chỉ số, mỗi món cộng vài điểm**, nhìn là hiểu (16/11 04:50). Hiện lực chiến người chơi cùng Luyện Khí lệch 150 lần vì chục nguồn nhân chồng lên nhau.
3. **Quái lâu chết hơn, xem được cả trận**; cùng sức thì xêm xêm, không một đòn chết.
4. **Cân ở một chỗ:** quái mặc bộ đồ y như người (16/11 11:07), theo đúng đồ người chơi thật sự có.

## 2. Vì sao phẩm không làm thang chính được

Số thật 16/11 (đồ đang mặc, mọi người chơi):

- Luyện Khí: 229 trên 481 món là Địa hoặc Thiên, hai bậc cao nhất hiện nay.
- Kim Đan: 25 trên 36 món là Địa hoặc Thiên; cường hoá trung bình +9,7.

Bản trước cho mỗi phẩm × 1,6: người Kim Đan mặc Thiên mạnh gấp 4–5 lần tu sĩ chuẩn, quái cùng cảnh giới thành bao cát. Vì phẩm và cấp dễ có, thang chính phải là thứ khó có: **cảnh giới**.

## 3. Chỉ số: giữ đúng các chỉ số trên thẻ nhân vật

Máu, Công, Thủ, Bạo kích, ST bạo, Hồi chiêu, Hút máu (thẻ nhân vật) và Phản đòn (bảng đủ chỉ số). Tốc chạy giữ nhưng chỉ để đi lại. Bỏ khỏi đồ: Giảm sát thương, Hồi máu, Hấp thu linh khí (tốc tu để cho linh căn, công pháp, động phủ).

- **Sát thương mỗi đòn** = Công × Công / (Công + Thủ đối thủ). Công gấp đôi Thủ thì ăn khoảng 2/3 Công; không bao giờ ra 0.
- Bạo kích nhân 200% + ST bạo (như plunworld). Hút máu hồi theo sát thương vừa gây. Phản đòn trả lại một phần sát thương nhận.
- **Hồi chiêu** làm chiêu (pháp bảo) ra dày hơn. Chiêu chiếm khoảng 40% sát thương; Hồi chiêu 20% thì sức đánh tăng khoảng 10%.
- Chỉ số % cộng chung rồi nhân một lần: Công cuối = (Công gốc + Công phẳng của đồ) × (1 + tổng % Công).
- **Lực chiến** = căn bậc hai của (máu hiệu dụng × sát thương mỗi giây) × 10. Cùng lực chiến thì gần 50/50; quái tính cùng công thức.

## 3b. Cân từng chỉ số theo plunworld (16/11 14:55)

Chủ dự án 14:55: "các chỉ số đã được cân bằng chưa? … tham khảo thêm một lượt" plunworld.com/plunlab/combat-sim. Đọc thẳng số và công thức trên trang đó: 8 chỉ số (Máu, Công, Giáp, Tốc đánh, Xuyên giáp, Bạo kích, Hút máu, Phản đòn); chỉ số phụ đổi ra % bằng hàm càng dồn càng ít thêm x / (x + K) (Bạo kích K 200, Hút máu 290, Phản đòn 140, giáp 400); giáp hai lớp (trừ thẳng nửa giáp, còn ít nhất 20%, rồi giảm theo %); bạo kích × 2; trận tối đa 60 giây; 5 món × 4 dòng, thú cưỡi 12 dòng, bộ thời trang 5 dòng; mỗi chỉ số một khoảng số riêng theo độ hiếm (Máu 100–2 400, Bạo kích 2–40…).

Đo luật của mình trước khi sửa: một dòng Công % hay Máu % đáng gấp 2–5 lần một dòng Thủ, Bạo kích, ST bạo, Hồi chiêu, Hút máu, Phản đòn cùng màu; người chơi sẽ chỉ săn Công, Máu. Sửa theo cách plunworld:

1. **Tỷ giá dòng** (`line_f`): mỗi chỉ số một hệ số, sao cho thêm một dòng cam của chỉ số nào cũng tăng lực chiến như nhau (khoảng 2,2–2,6% ở mọi cảnh giới). Dòng cam: Công +5,5% · Máu +8,4% · Thủ +21% · Bạo kích +4,4% · ST bạo +66% · Hồi chiêu +11% · Hút máu +11,6% · Phản đòn +10,5%. Mỗi chỉ số một khoảng số riêng, như plunworld.
2. **Càng dồn càng ít thêm** (`soft`): x × M / (x + M) như hàm của plunworld, rồi kẹp trần cứng khoảng 1,75 lần mức dòng trung bình (`cap`).
3. Bạo kích × 2 như plunworld; mỗi món 3 dòng (Thượng Cổ 4).

Kết quả (Kim Đan, người chuẩn):

- Hai người cùng thêm hai dòng cam, khác chỉ số, đấu nhau: thắng 33–57%, gần ngang.
- Bộ phủ đều 8 chỉ số mạnh nhất; bộ dồn lệch khắc nhau: Thủ, Phản đòn thắng Công, Bạo gần như tuyệt đối; Hút máu thắng Máu, Công, Bạo; Máu thắng Công, Bạo.
- Tẩy luyện: tẩy kỹ (mọi dòng cam) × 1,2; tẩy tới đen × 1,5–1,7; cộng ngọc tới trần × 1,5–2,1; vẫn thua người chuẩn cảnh giới trên (0–2%).
- Quái, boss chỉnh lại theo luật này (mục 9), bài thử từng loài vẫn đạt.

## 4. Thang sức mạnh

- **Cảnh giới của món:** mỗi trang bị mang tầng tu lúc nhặt (game đã ghi sẵn `lvl` trên món). Chỉ số phẳng × 1,45 mỗi cảnh giới (khoảng 4% mỗi tầng). Không mặc được món cảnh giới cao hơn mình (đồ mua chợ, đồ tặng).
- **Phẩm:** +6% chỉ số chính mỗi bậc; mỗi món 3 dòng phụ, riêng Thượng Cổ 4. Thượng Cổ so với Phàm cùng cảnh giới khoảng 1,86 lần; Thiên so với Địa khoảng 1,08 lần.
- **Cấp (cường hoá):** +3% chỉ số phẳng mỗi cấp, trần theo cảnh giới người mặc: Luyện Khí +5, mỗi cảnh giới thêm 5, Độ Kiếp +45. Nâng rẻ nên coi như ai cũng chạm trần; trần là thứ giữ người cùng cảnh giới ngang nhau. Không thất bại, không rớt cấp.
- **Pháp bảo, linh thú, thú cưỡi, khôi lỗi** lớn theo cảnh giới của chủ (cùng tu luyện), lên cảnh giới không phải thay; sức của chúng theo phẩm (sao, tiến hoá) và cấp.

**Lực chiến thật (20/11/2026 18:2x, thay cách "so với tu sĩ chuẩn"):** chủ dự án: "sao không dùng lực chiến thật, có bao nhiêu hiện bấy nhiêu". Lực chiến tính thẳng từ chỉ số của chính nhân vật hay con quái (`he-chien.js` `powerOf`), không so với ai, không theo cảnh giới:

- sức chịu đòn = (Sinh lực + `power_def` 25 × Thủ) × (1 + hút máu % + phản đòn %)
- sức đánh = Công × số đòn mỗi giây (đã tính giảm hồi chiêu) × (1 + tỉ lệ bạo kích × (sát thương bạo − 1))
- lực chiến = căn(sức chịu đòn × sức đánh) × `power_k` 42

Hai bên đánh nhau, bên nào tích (chịu đòn × đánh) lớn hơn thì thắng, nên người và quái bằng lực chiến là ngang ngửa. Tăng chỉ số nào lực chiến cũng tăng; đột phá giữ nguyên đồ thì hơi tăng, không bao giờ tụt; một con quái ai nhìn cũng thấy cùng một số. Trước đó lực chiến so với tu sĩ chuẩn giữa cảnh giới của chính mình: vừa đột phá mốc so nhảy lên một cảnh giới nên tụt 18–35% (người chơi báo "40k xuống 25k"), cùng một con quái mỗi người thấy một số khác. Tu sĩ chuẩn giữa cảnh giới theo cách mới: Luyện Khí 7 235 · Trúc Cơ 30 125 · Kim Đan 57 070 · Nguyên Anh 109 987 · Hóa Thần 174 733 · Luyện Hư 275 664 · Hợp Thể 458 209 · Đại Thừa 713 617 · Độ Kiếp 1 315 804. `power_k` 42 chọn sao cho lúc đổi gần như không ai đang chơi bị giảm số (thử trên 90 nhân vật có lưu trong 3 ngày và 13 bộ đồ thật: người mạnh nhất mỗi cảnh giới +2–4%, người tầm giữa +25–40%, người mới 936 → 2 236). Nhãn quái: quái thường quanh tầng mình bằng khoảng 0,35–0,6 lần mình (trước 0,2–0,45) nên ngưỡng chữ xám `mob_cp.bar.weak` 0,5 → 0,6. **Khai Hoang không đổi:** mức đặt sẵn (boss_cp, mức quái tinh cầu) vẫn đo bằng cách cũ (`powerRef`, `mob-power.js` cpRef) nên trùm Khai Tinh và quái tinh cầu giữ đúng máu, công (thử 420 trường hợp, không lệch); vì thế nhãn trên đầu trùm không còn bằng đúng boss_cp (trùm đặt 96 000 hiện khoảng 107 000). Việc để sau: đo lại Khai Hoang theo đơn vị mới. PK (máy chủ phòng tính theo lực chiến) nhờ đó chênh giữa người mạnh nhất và người tầm giữa cùng cảnh giới hẹp lại (ví dụ Trúc Cơ 60k / 21k = 2,9 lần thành 61k / 30k = 2 lần).

| Cảnh giới | Đồ thường gặp | Lực chiến tu sĩ chuẩn | Giữ trang bị cảnh giới trước | Lên cảnh giới, đổi đồ mới |
|---|---|---|---|---|
| Luyện Khí | Địa +5 | 3 500 | | × 1,64 |
| Trúc Cơ | Địa +10 | 5 300 | 82% | × 1,82 |
| Kim Đan | Thiên +15 | 8 600 | 82% | × 1,81 |
| Nguyên Anh | Thiên +20 | 14 300 | 83% | × 1,72 |
| Hóa Thần | Thiên +25 | 22 300 | 82% | × 1,73 |
| Luyện Hư | Thiên +30 | 34 900 | 82% | × 1,81 |
| Hợp Thể | Tiên +35 | 56 900 | 82% | × 1,71 |
| Đại Thừa | Tiên +40 | 88 200 | 81% | × 1,95 |
| Độ Kiếp | Thượng Cổ +45 | 153 700 | 81% | |

Gốc của cảnh giới nhỏ: Máu 100 × 1,1^i, Công 10 × 1,1^i, Thủ 5 × 1,1^i. Bộ dòng phụ hên nhất chỉ hơn bộ trung bình 1,4–1,6 lần.

## 5. Mười bốn món và phần góp

Số ở đồ Luyện Khí, phẩm Phàm, cấp 0. "Góp": tháo món đó thì lực chiến tu sĩ chuẩn Kim Đan tụt bao nhiêu (kể cả dòng phụ của nó).

| Món | Chỉ số chính | Khác hiện nay | Góp |
|---|---|---|---|
| Bản mệnh (vũ khí) | Công 6 | | 11% |
| Mũ | Thủ 8 | trước là Máu | 9% |
| Giáp | Máu 175 | | 13% |
| Giày | Thủ 6, Tốc chạy | trước chỉ Tốc chạy | 7% |
| Ngọc bội | Máu 100, Hồi chiêu 3% (+1 mỗi phẩm) | trước là Bạo kích | 9% |
| Nhẫn | Công 4, Bạo kích 3% (+1 mỗi phẩm) | thêm Công | 9% |
| Linh thú | Máu 75, Hút máu 1% (+0,5 mỗi phẩm); vẫn tự đánh | cộng thật vào nhân vật | 7% |
| Thú cưỡi | Máu 80, Tốc chạy | dòng % theo luật chung | 6% |
| Pháp bảo 1, 3 (hệ Công) | Công 3 + chiêu | | 5% mỗi món |
| Pháp bảo 2, 4 (hệ Thủ) | Máu 90 + chiêu | | 6% mỗi món |
| Khôi lỗi 1, 2 | Công 3, Máu 30; vẫn tự đánh | cộng thật vào nhân vật | 8% mỗi món |

Tổng: 6 trang bị 56%, 4 pháp bảo 15–18%, linh thú và thú cưỡi 13%, 2 khôi lỗi 15%; không món nào quá 13%. Pháp bảo ô 4 vẫn mở ở Nguyên Anh; các món khác mở như bây giờ (đang có người Luyện Khí mang đủ 2 khôi lỗi).

**Linh thú, khôi lỗi:** hiện chỉ số của chúng chỉ cộng vào con số lực chiến, nhân vật không đánh mạnh hơn (lực chiến "ảo"). Luật mới cộng thật vào nhân vật, nên lực chiến khớp sức thật.

## 6. Dòng phụ và tẩy luyện

- 10 món có dòng phụ (pháp bảo không có, chiêu là chính). Số dòng theo phẩm như mục 4.
- Mỗi dòng bốc một trong 8 chỉ số và một màu (lục … đen như hiện nay). Giá trị = số theo màu (lục 2,5 · lam 3,5 · tím 4,5 · cam 5,5 · vàng 7 · đỏ 9 · đen 11) × tỷ giá của chỉ số (mục 3b).
- Tổng dòng + chỉ số chính % đi qua đường cong càng dồn càng ít thêm rồi kẹp trần (mục 3b). Trần: Công % 24, Máu % 35, Thủ % 92, Bạo kích 18 (cộng gốc 5), ST bạo 205, Hồi chiêu 41, Hút máu 40, Phản đòn 38.
- **Tẩy luyện:** chọn một dòng quay lại (chỉ số và độ hiếm mới), dòng khác giữ; giá tăng theo số lần đã tẩy món đó. Thay cho tẩy luyện mở tới 10 dòng hiện nay.

**Hôm nay dòng tẩy luyện là chỗ lệch lớn nhất** (đồ đang mặc, bỏ 2 tài khoản hack cũ và tài khoản của chủ dự án): số dòng không giới hạn, Công %, Máu %, ST bạo không có trần. Luyện Khí: người giữa 6 dòng, người nhiều nhất 40 dòng. Trúc Cơ trở lên: người giữa +28% Công, +47% Máu, +48% ST bạo từ dòng; người cao nhất +121% Công, +160% Máu, +174% ST bạo.

**Tẩy luyện tới đâu với luật mới** (Kim Đan, đồ Thiên +15; Thí Luyện Đài mục "Tẩy luyện tới đâu"):

| Dòng phụ | Lực chiến | Đánh thủ lĩnh | Đấu tu sĩ chuẩn cùng cảnh giới | Đấu tu sĩ chuẩn Nguyên Anh | Một mình đánh boss |
|---|---|---|---|---|---|
| Trung bình, không tẩy | 8 600 | thắng, còn 23% máu | thắng 50% | thua | sống 10 giây |
| Đồ rơi hên 1/100, không tẩy | 9 000 (× 1,05) | thắng, còn 33% | thắng 92% | thua | sống 10 giây |
| Tẩy kỹ: mọi dòng Sử thi | 11 200 (× 1,3) | thắng, còn 56% | thắng 100% | thua | sống 12 giây |
| Tẩy tới trần: mọi dòng chạm trần | 13 500 (× 1,56) | thắng, còn 75% | thắng 100% | thua | sống 14 giây |

Tẩy luyện là thứ phân hơn thua lớn nhất giữa người cùng cảnh giới (lớn hơn phẩm và cấp), nhưng tẩy tới trần vẫn thua người cảnh giới trên và không một mình hạ được boss. Cảnh giới Luyện Khí, Luyện Hư cho cùng tỉ lệ. Nới trần lên 60%: tẩy tới trần × 1,89, thắng người Nguyên Anh chuẩn 90%; trần 80%: × 2,05.

## 7. Tiến hoá

- **Nâng phẩm:** lên phẩm kế, +6% chỉ số chính, **giữ dòng phụ đã có**, tới Địa và Thượng Cổ thì mở thêm một dòng. Nguyên liệu: món trùng cùng loại cùng phẩm + đá tiến hoá + Linh Thạch. Linh thú, khôi lỗi: sao và tiến hoá hiện có thành bước lên phẩm.
- **Luyện lại theo cảnh giới mới:** đưa món cũ lên cảnh giới hiện tại của mình, giữ phẩm, cấp và dòng phụ, tốn Linh Thạch. Món có dòng đẹp không bị bỏ phí khi lên cảnh giới.
- Từ Thiên trở lên làm thành nghi lễ (thiên kiếp nhỏ) để có khoảnh khắc khoe.

## 8. Thử bằng số (Kim Đan, thủ lĩnh, tu sĩ đánh một mình)

(Số ở mục này và bảng tẩy luyện mục 6, thử đổi dữ liệu thật mục 11 đo trước khi cân tỷ giá dòng lúc 14:55; đo lại khi nối vào trận.)

| Bộ đồ người chơi | Lực chiến | Kết quả |
|---|---|---|
| Chuẩn: đồ Kim Đan, Thiên +15 | 8 600 | Thắng, còn 23% máu |
| Đồ Kim Đan, Thượng Cổ +15 | 10 500 | Thắng, còn 53% |
| Đồ Kim Đan, Phàm +15 | 6 100 | Thua |
| Đồ Kim Đan, Thiên +0 | 5 900 | Thua |
| Trang bị Trúc Cơ, Thiên +15 | 7 100 | Thua |
| Trang bị Luyện Khí, Thượng Cổ +15 | 7 300 | Thua (thắng 15%) |

Phẩm cao nhưng trang bị cảnh giới thấp vẫn thua: phẩm dễ kiếm không vượt được cảnh giới.

## 9. Quái mặc đồ

Mỗi quái = **tu sĩ chuẩn cùng cảnh giới** (đủ món, đồ thường gặp ở bảng mục 4, dòng phụ trung bình) + **vai trò**. Làm quái mới chỉ cần chọn cảnh giới và vai trò, số tự ra.

| Vai trò | Cấp thêm | Máu × | Công × | Thủ × | Tốc × | Thêm | Nhịp (tu sĩ chuẩn, cả 9 cảnh giới) |
|---|---|---|---|---|---|---|---|
| Thường | +0 | 0,24 | 0,96 | 0,6 | 0,8 | | 6–9 đòn, 5–7 giây, còn 85% máu |
| Tinh anh | +1 | 0,68 | 0,94 | 0,8 | 0,9 | Bạo +5 | 19–27 đòn, 15–23 giây, còn 45% |
| Thủ lĩnh | +2 | 1,41 | 1,38 | 0,9 | 0,33 | Bạo +8, Hút 3 | 41–61 đòn, 33–49 giây, thắng còn ~23% |
| Boss đảo (đánh một mình) | +2 | 2,48 | 0,82 | 1,0 | 0,4 | Bạo +10, ST bạo +20 | 90–110 đòn, 70–90 giây, thắng còn 12–16% máu |
| Boss nhóm | +2 | 11,5 | 2,85 | 1,0 | 0,6 | Bạo +10, ST bạo +30, Phản 5 | 4,6–6,7 người chuẩn hạ trong 60 giây; một mình sống 9–14 giây |

Thủ lĩnh đánh chậm mà đau để người chơi thấy đòn tới mà né. Nhịp đo bằng đòn thường; dùng chiêu thì nhanh hơn chừng 30%. Boss đảo đánh nhẹ hơn thủ lĩnh mỗi đòn vì còn gọi đệ tử và mưa thiên thạch.

**Cân cả quái và boss đang có** (chủ dự án 16/11/2026 14:44: "cân bằng cả quái vật và boss, không thì chưa vô game đã bị boss vả"): `data/he-chien.json` → `mobs` ghi mỗi loài một tầng quái và vai trò, `tools/he-chien.test.mjs` thử từng loài.

- Tầng quái theo đảo người chơi thật đang đánh: Thiên Kiếm Tinh và bí cảnh Huyết Nha tầng 1–2; Xích Diễm 5–7; Hàn Băng 10–12; Hắc Phong 14–16; Thanh Mộc, Làng Tinh Linh 19–24; Thiên Kim 27–29; Hậu Thổ 32–34; Ngoại Vực 37–41; Ma Tôn 44.
- Vai trò: quái bãi thường; các "Vệ" và Ma binh, Ma thám tử tinh anh; các "Vương" thủ lĩnh; Ma Tướng, Ma Quân, Ma Hậu, Ma Chủng, Ngục Chủ, Huyết Nha, bốn Tàn hồn boss đảo; Ma Tôn boss nhóm. Phân thân Huyết Nha (boss cốt truyện đầu tiên) là tinh anh.
- Mốc để làm quái theo người chơi thật sau khi đổi: người mới (tầng 0–1) 4 trang bị Phàm chưa cường hoá và một pháp bảo; Luyện Khí 6 trang bị, linh thú, thú cưỡi, một pháp bảo, phẩm Linh +1; Trúc Cơ thêm 3 pháp bảo, một khôi lỗi, Huyền +5; Kim Đan thêm khôi lỗi thứ hai, Địa +10; từ Nguyên Anh đủ 14 món.
- Người mới đánh Phân thân Huyết Nha: 18 đòn, 15 giây, còn 46% máu. Người chuẩn mỗi đảo đánh boss đảo của đảo đó: thắng 97–100%, 70–90 giây, còn 12–16% máu. Ma Tôn không đánh một mình được.
- Chưa đổi: Mộc Nhân, đầu boss thế giới (đếm sát thương), bản sao Luận Võ Đài và Tâm Ma (theo chỉ số người chơi nên tự theo luật mới). Bí cảnh đang nhân mỗi bậc × 2 (`data/dungeon.json` step_mul): với luật mới một cảnh giới chỉ mạnh × 1,8, nên phải hạ còn khoảng × 1,15 mỗi bậc; làm khi nối vào trận.

**Rơi đồ:** quái rơi trang bị cảnh giới của nó: thường ít rơi; tinh anh rơi nhiều hơn, có cơ hội phẩm cao; thủ lĩnh chắc rơi một món; boss chắc rơi, phẩm cao (tỉ lệ chốt ở phần kinh tế).

**Giao diện cho bên làm quái** (tab đang thiết kế lại quái): mỗi quái trong `data/mobs.json` khai `canh_gioi` (0–8), `vai_tro` (thuong / tinh_anh / thu_linh / boss), tuỳ chọn `net` (đặc điểm, lệch tối đa ±25% một chỉ số: "nhanh" tốc × 1,25 máu × 0,85; "giáp dày" thủ × 1,25 tốc × 0,85…), `bo_do` (món có thể rơi). Hình, chiêu, cách di chuyển do bên đó quyết; máu, công do luật này tính. Quái ít mà chắc (16/11 11:07): mỗi bãi ít con hơn, mỗi con lâu chết hơn, hợp máy chủ Cloudflare.

## 10. Các nguồn sức mạnh khác

| Nguồn | Đề xuất |
|---|---|
| Công pháp | Bị động nhỏ có trần (mỗi bộ 1 chỉ số, tối đa 10%) |
| Ngọc khảm | Giữ, đổi số (dưới bảng) |
| Bộ đồ, Đạo Vận | Thưởng bộ nhỏ: đủ 2 món +3% một chỉ số, đủ 4 món +6% |
| Thời trang | Chỉ để đẹp |
| Đan dược | Chỉ tăng tạm thời khi uống, không cộng vĩnh viễn |
| Cảnh giới gia trì (× % mỗi lần đột phá) | Bỏ; thay bằng gốc nhỏ + trần cấp |

**Ngọc khảm** (chủ dự án 14:44: "cân bằng cả ngọc khảm"): giữ bốn loại ngọc, giữ cấp 1–20, giữ ghép 3 viên thành 1 viên cấp trên (chi cấp số nhân, mạnh cấp số cộng). Số mới tính theo %:

| Ngọc | Mỗi cấp | Trần tổng từ ngọc |
|---|---|---|
| Hồng Ngọc | +0,5% Công | 15% |
| Lam Ngọc | +0,5% Máu | 15% |
| Lục Ngọc | +0,5% Thủ | 15% |
| Hoàng Ngọc | +0,25% Bạo kích | 5% |

Số lỗ khảm theo phẩm: Phàm 0, Linh 1, Huyền 1, Địa 2, Thiên / Tiên / Thượng Cổ 3. Trần ngọc tính riêng, cộng ngoài trần dòng. Ở Kim Đan: ngọc như người Luyện Khí đang có (7 viên cấp 4) thêm 4% lực chiến; như người Trúc Cơ trở lên (13 viên cấp 5) thêm 7%; chạm trần ngọc thêm 17,5%. Tẩy tới trần cộng ngọc tới trần mạnh hơn tu sĩ chuẩn khoảng 1,7 lần, ngang người cảnh giới trên mới vào.

## 11. Đổi đồ cũ, không ai mất

Chạy một lần trên máy chủ (migration, sao lưu `p2d_xu_ly` trước, thử trên bản sao), đọc lại từng món theo luật mới; không xoá món nào. Chủ dự án 14:36 hỏi "tỷ lệ chuyển đổi sẽ như nào… có thể sửa cho đồng bộ không".

| Đang có | Sau khi đổi |
|---|---|
| Món đồ | Giữ nguyên món, chỗ mặc, cảnh giới lúc nhặt (`lvl`), phẩm (màu dòng trung bình như đang hiện) |
| Cấp cường hoá | Giữ nguyên số; chỉ tính tới trần cảnh giới (Luyện Khí +5, Trúc Cơ +10…); phần vượt trần tự có tác dụng khi lên cảnh giới |
| Dòng tẩy luyện | Giữ màu và loại chỉ số; số mới theo màu: lục 2,5% · lam 3,5% · tím 4,5% · cam 5,5% · vàng 7% · đỏ 9% · đen 11% (Bạo kích × 0,6, Hồi chiêu × 0,5, Hút máu và Phản đòn × 0,4, ST bạo × 1,5) |
| Dòng Công / Máu / Thủ cộng thẳng | Thành Công % / Máu % / Thủ % cùng màu |
| Dòng tốc chạy, hấp thu linh khí | Giữ tác dụng cũ (đi lại, tu luyện), không tính vào số dòng |
| Số dòng mỗi món | **Giữ đủ** (chủ dự án 16/11 16:20 "giữ hên xui"): trần ẩn 1–10 dòng của tẩy luyện giữ nguyên, mọi dòng đều tính (`lines_all`, tối đa `lines_max` 10); trần từng chỉ số chặn lố. Không cắt, không hoàn |
| Thời trang | Giữ dòng của bộ đang mặc, tính như một dòng tẩy luyện cùng màu (16:20) |
| Công pháp, bộ đồ, Đạo Vận, đan Bồi Nguyên | Đổi ra % (số phẳng theo tổng luật cũ), mỗi nguồn mỗi chỉ số tối đa `extra_cap` (công pháp 10, bộ đồ 6, Đạo Vận 6, đan 5; tính theo Công % tương đương × tỷ giá dòng). Cảnh giới gia trì máu, công bỏ (16:20) |
| Linh thú, khôi lỗi | Sao + tiến hoá thành phẩm; cấp giữ, tính tới trần |
| Pháp bảo | Giữ phẩm, giữ cấp (trần cấp pháp bảo vốn trùng trần mới) |
| Ngọc khảm | Giữ nguyên ngọc đang khảm và cấp ngọc, chỉ đổi số theo bảng ngọc ở mục 10 |

**Thử đổi trên dữ liệu thật** (16/11 14:4x, chỉ đọc; bỏ 2 tài khoản hack cũ và tài khoản của chủ dự án):

| | Lực chiến trước: người giữa / mạnh nhất | Sau: người giữa / mạnh nhất |
|---|---|---|
| Luyện Khí (123 người) | 2 835 / 87 510 (31 lần) | 1 310 / 3 224 (2,5 lần) |
| Trúc Cơ trở lên (20 người) | 27 122 / 153 467 (5,7 lần) | 6 488 / 12 296 (1,9 lần) |

- Thứ tự mạnh yếu gần như giữ nguyên (tương quan thứ hạng 0,93 và 0,91); 9 trong 10 người mạnh nhất Trúc Cơ trở lên vẫn trong 10 người đầu.
- Dòng được tính: Luyện Khí 1 164 → 762, Trúc Cơ trở lên 771 → 356; phần thừa hoàn trả.
- Cấp vượt trần (chờ lên cảnh giới): 2 387 cấp ở Luyện Khí, 994 cấp ở Trúc Cơ trở lên.
- Số lực chiến của mọi người đều nhỏ đi vì đổi thang; quái đổi cùng lúc nên đánh vẫn như cũ. Bảng xếp hạng làm lại.
- Người Luyện Khí trung bình mới mang 5 trang bị, hiếm pháp bảo, khôi lỗi (lực chiến người giữa đủ 6 trang bị: 1 911), nên quái Luyện Khí cân theo đồ người chơi thật có, không theo bộ đủ 14 món.

## 12. Thứ tự làm

1. Chốt luật (mục 13). Chủ dự án 14:26 "thấy cũng ổn rồi": duyệt hướng; phần đụng đồ đã mua hỏi lại lúc chuyển đổi. **16:04–16:20:** "đẩy hệ thống sức mạnh mới lên game", bật cho mọi người luôn, giữ hên xui số dòng, thời trang giữ dòng, nguồn khác thành thưởng nhỏ có trần.
2. Viết luật vào `data/he-chien.json` và `src/game/he-chien.js` (thuần tính toán, chạy được cả máy khách lẫn máy chủ). **Xong 16/11 (máy làm việc, chưa đưa lên):** bài thử `tools/he-chien.test.mjs` (chạy trong `node tools/check.mjs`) khớp Thí Luyện Đài bản 8: lực chiến tu sĩ chuẩn 3 456 → 158 199, phẩm Thượng Cổ / Phàm dưới 1,85 lần, đồ cũ 10 dòng chỉ tính số dòng của phẩm, dòng hack số triệu không nổ, nhịp quái thường / tinh anh / thủ lĩnh đúng mục tiêu, boss không đánh một mình được. `on: false`, chỉ `test_uid` sẽ thấy khi nối xong.
   Còn lại của bước này: nối vào trận khi bật (`stats.js` playerStats → `playerStatsHC`; `achieve.js` lực chiến → `powerOf`, bỏ cộng riêng linh thú / khôi lỗi; quái mọc theo cảnh giới của đảo × vai trò (`mobStats`); `combat.js` đòn nhân `takeK` thay cho trừ thẳng phòng ngự; tắt áp chế lực chiến `cp_press` khi bật; quy đổi nhịp đánh thật của quái và chiêu cho khớp sát thương mỗi giây), rồi đo nhịp thật bằng Mộc Nhân trong động phủ.
3. ~~Bản chơi tạm sau cờ~~: chủ dự án 16:20 chọn bật cho mọi người luôn. **Đã nối vào trận (16/11):** `src/main.js` gọi `hcData` (đổi bảng quái: máu, công mỗi đòn theo cảnh giới × vai trò × nhịp đánh thật của con quái; tắt `cp_press`, `mob_cp` hệ số đảo; bí cảnh mỗi bậc × `dun_step_mul` 1,15; Ma Vương tuần theo boss đảo); `stats.js` → `playerStatsHC`; `combat.js`, `duel-cast.js` Công đọ Thủ (`takeK`) thay cho trừ thẳng; `achieve.js`, `mob-power.js` lực chiến bằng `powerOf` (`power_k` 40: số cỡ như luật cũ); máu quái trong trận `hp_game` (thường × 0,7, tinh anh × 0,85) cho quái thường chết sau 5–6 nhát đánh thường; nhãn loại quái `nhan` (`src/render/draw-mob-bar.js`). **Đo trong game (17:30):** bài chơi thử Tự hành 150 giây của khách mới chỉ qua 6 bước truyện (luật cũ 10) vì quái đầu game cân theo bộ 4 món; đổi tầng 0–1 cân theo người vừa vào chưa có món nào (Sinh lực 100, Công 10, Thủ 5) và Luyện Khí giữa theo 4 món Phàm cấp 1: qua 10 bước, hạ 24 quái (luật cũ 30), không gục lần nào.
   **Trận thật (16/11 17:40–18:10, chủ dự án 17:29: "Kim Đan mà 40k lực chiến, tất cả đảo tới được đều dễ farm kể cả boss"):** đo bằng Playwright, nhân vật đủ bộ như tu sĩ chuẩn (pháp bảo, linh thú, thú cưỡi, khôi lỗi, ngọc), dùng chiêu pháp bảo, không né, không uống đan: người chơi gây sát thương gấp khoảng 5 lần mô hình, gần hết là pháp bảo hồi 2,5–12 giây (Kim Đan hạ boss đảo 20–26 giây còn 60–80% máu, tinh anh 3–6 giây). Thêm `game_k` (máu, công quái trong trận thật theo vai trò và tầng).

   **Đo lại 18:20–19:10, sau khi chủ dự án chọn pháp bảo hồi 2–5 phút và Tự đánh giữ khoảng cách (18:1x):** đo bằng Tự đánh thật (`src/game/auto.js`), nhân vật đủ bộ như tu sĩ chuẩn tầng 5 của cảnh giới; quái thường, tinh anh đánh lúc pháp bảo đang hồi; thủ lĩnh, boss có pháp bảo mở màn một lượt; không né, không uống đan. Người chơi mất gần hết sát thương pháp bảo nên `game_k` hạ còn khoảng 1/3 máu, 1/2 công so với lần trên, mốc tầng 4 / 9 / 17 / 22 / 33; tầng 0–4 máu × 0,5 cho người mới (mất Phi Kiếm hồi 2,5 giây); đệ tử boss × 0,5 máu, × 0,3 công (`summon_k`: sáu Độc Đằng bắn xa nguyên sức làm tu sĩ Kim Đan gục trước Cổ Thụ Yêu Vương). Mỗi ô 2–4 trận (lệch nhau vì chí mạng, đường lao của boss):

   | Đảo (người chuẩn) | Quái thường | Tinh anh | Thủ lĩnh | Boss đảo |
   |---|---|---|---|---|
   | Trúc Cơ (tầng 13, 21,6k) | 3–4 giây, còn 92% máu | 11–14 giây, còn 41–51% | 23–32 giây, còn 21–56% | 82–84 giây, còn 42–43% |
   | Kim Đan (tầng 22, 37k) | 3–5 giây, còn 77–89% | 14–17 giây, còn 42–55% | 33–46 giây, còn 26–51% | 81–97 giây, còn 16–49% |
   | Nguyên Anh (tầng 31, 64,5k) | 4–5 giây, còn 86% | 15 giây, còn 65% | 26–32 giây, còn 43–46% | 83–91 giây, còn 20–26% |

   Khoảng cách lúc đánh (tâm tới tâm): tinh anh 29 → 38 đơn vị, thủ lĩnh / boss 18 (đè lên người) → 37–41. Người bị dồn vào ngõ cụt một ô thì boss đứng lấn vào hình người cả trận: thêm `boss_back` (boss lùi ra, mỗi lượt tối đa 0,6 giây) và Tự đánh lùi chếch, trượt dọc vật cản. Bài chơi thử Tự hành của khách mới: pháp bảo hồi 2–5 phút với máu đầu game như cũ chỉ qua 7–8 bước (Bí cảnh Huyết Nha 39 giây thay vì 26), máu tầng 0–4 × 0,5 thì qua 10 bước, 30 quái, không gục.
4. ~~Chuyển đổi + hoàn trả~~: không cần, đồ cũ đọc thẳng theo luật mới lúc tính chỉ số (không ghi gì vào cơ sở dữ liệu), không cắt dòng nên không hoàn.
5. Chủ dự án nói "đưa lên" và "áp lên": bật cho mọi người cùng lúc, thư báo trong game.
6. Sau cùng mới làm hiệu ứng tiến hoá.

Rung và khựng mỗi đòn đã giảm còn khoảng hai phần ba (`data/juice.json`, 16/11), chờ đưa lên cùng đợt sau.

## 13. Chủ dự án chốt

1. Thang chính là cảnh giới của món (mỗi cảnh giới × 1,45); phẩm chỉ +6% mỗi bậc và thêm dòng; cấp +3% mỗi cấp, trần theo cảnh giới, không thất bại.
2. Trần dòng phụ: 40% (tẩy tới trần × 1,56, vẫn thua người cảnh giới trên) hay nới 60% (× 1,89, thắng người cảnh giới trên).
3. Linh thú, khôi lỗi cộng chỉ số thật vào nhân vật (hiện chỉ cộng vào con số lực chiến).
4. Đổi chỉ số chính của Mũ (Máu → Thủ), Giày (thêm Thủ), Ngọc bội (Bạo kích → Máu + Hồi chiêu), Nhẫn (thêm Công) như bảng mục 5.
5. Thời trang chỉ để đẹp. (Ngọc khảm: chủ dự án 14:44 chọn giữ và cân lại, xem mục 10.)
6. Có "luyện lại theo cảnh giới mới" cho trang bị cũ (giữ phẩm, cấp, dòng; tốn Linh Thạch).
7. Chủ dự án 16/11/2026 16:20: bật cho mọi người luôn; giữ hên xui số dòng (mọi dòng đều tính, không cắt, không hoàn); thời trang giữ dòng, đổi theo màu; công pháp, bộ đồ, Đạo Vận, đan dược thành thưởng nhỏ có trần. Lực chiến nhân 40 thay cho 10 (số trong mục 8, 11 là thang × 10 cũ, nhân 4 để ra số trong game).
