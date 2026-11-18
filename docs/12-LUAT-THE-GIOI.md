# Luật thế giới: bản đồ và hình pixel

Chủ dự án chốt 18/11/2026 10:35–11:03 ("tôi muốn map là một nơi sinh ra tự nhiên có quy tắc"). Mọi tinh cầu dựng mới hoặc dựng lại phải theo bộ luật này. Bộ soát tự động: `python3 tools/the-gioi/soat.py`.

## Luật gốc hình pixel

1. **Một cỡ điểm cho cả thế giới:** 1 điểm hình = 0,5 đơn vị bản đồ (như nhân vật). Ô nền 16 đơn vị = 32 điểm.
   Nền cũ (`src/world/draw-ground.js`) vẽ 16 điểm mỗi ô là sai luật; nền mới vẽ ở `src/world/draw-nen.js`.
2. Không làm mịn, không xoay lẻ góc. Phóng to thì nhân nguyên lần.
3. Viền mực cho vật cần nổi (nhân vật, quái, NPC, đồ rơi). Nền không viền.
4. Bảng màu chung, mỗi chất liệu 3–5 sắc độ; mỗi tinh cầu chỉ ngả tông.
5. Mặt sáng mọi vật cùng một phía, khớp hướng bóng đổ.
6. Chi tiết theo tầm quan trọng: nhân vật > quái, NPC > nhà, cây > nền.
7. Chuyển động ít khung, rõ dáng. Hiệu ứng là khối màu phẳng, lõi trắng.
8. Ảnh từ ngoài (GPT, SpriteCook) phải qua máy lọc về đúng cỡ điểm, bảng màu, viền (`tools/art/sc_tk.py`).

Ngoại lệ: khung giao diện của chủ dự án được dùng ảnh mịn.

## Luật bản đồ

- **Nước:** chảy từ cao xuống thấp, nguồn ở núi hoặc thác. Không đứt quãng, không vòng kín. Hồ ở chỗ trũng, bờ cong, có dải chuyển tiếp (bờ cát). Nước theo hệ tinh cầu.
- **Cầu:** chỉ ở chỗ đường gặp sông, vuông góc dòng chảy, ở khúc hẹp. Đường không cắt nước nếu không có cầu.
- **Cây:** trong phố thành hàng lối; ven làng thưa dần; ngoài hoang thành cụm có khoảng trống. Cây ưa nước (liễu, trúc, lau) ở ven bờ. Không mọc trên đường. Loài theo khí hậu, theo vùng.
- **Đường:** là vết chân người, dẫn tới đích cụ thể, các lối nhập vào nhau. Nền gạch chỉ ở khu đông nhà.
- **Trang trí:** mỗi món phải có lý do tồn tại. Đèn theo đường và cửa nhà, ngoài hoang không có. Lửa ở chỗ có người. Thạch anh ở nơi linh khí, mọc thành cụm. Di tích ở cuối đường mòn.
- **Ánh sáng:** đêm trăng lạnh. Nguồn ấm phải có vật phát sáng thật. Ánh lạnh xanh tím là linh khí. Phố sáng, hoang tối.
- **Bóng:** một hướng theo trăng, dài theo chiều cao vật. Đồ phẳng không bóng.
- **Tầng nổi chìm:** (1) nhân vật, đòn đánh; (2) quái, NPC nhiệm vụ, đồ rơi, cổng; (3) công trình, cây, trang trí; (4) nền.
- **Pháp trận truyền tống:** một cái mỗi tinh cầu, ở quảng trường trung tâm. Đường lớn toả ra từ đó. Bí cảnh, hang, động phủ dùng cổng riêng ngoài phố.
- **Rìa tinh cầu:** đất mỏng dần thành vách vỡ rơi ra trời sao. Không nhà, đèn, đường lát. Có đài ngắm sao.
- **Câu cá:** chỉ ở nước thật (sông, hồ, hồ băng, hồ dung nham, khe hư không), **không câu ở mép tinh cầu**. Mỗi tinh cầu có 1–2 bến câu gần đường. Bản đồ có `planet.luat` thì game đã bỏ câu mép (`src/game/fishing.js`); tinh cầu cũ chưa có nước còn giữ câu mép tới khi dựng lại.

## Luật bổ sung

- **Liên thông:** mọi chỗ đi được phải nối liền. NPC, cổng, bãi quái không kẹt trong vật cản. Chỗ chỉ bay tới được phải có thưởng, không đặt nhiệm vụ.
- **Che khuất:** không đặt vật cao trùm lên NPC, cổng, lối đi. Nhân vật của mình đứng sau phần đặc của một vật cao (nhà, cổng, cây, núi rời) thì vật đó tự mờ đi còn 42% (`src/render/hoi-fade.js`, soi theo điểm ảnh thật của hình, không theo khung chữ nhật); cầu, bến, trận pháp nằm dưới chân nên vẽ dưới người (`foot.walk`, `foot.flat`).
- **Bố cục lối chơi:** giữa là vùng an toàn, ra ngoài quái mạnh dần; bãi quái cách phố ít nhất 4 ô và đủ trống cho Tự đánh; có chỗ rộng cho boss thế giới, bang chiến.
- **Định hướng:** mỗi hướng một cảnh lớn nhìn thấy từ xa. Biển chỉ lối ở ngã rẽ.
- **Bản sắc tinh cầu:** một bộ chữ ký gồm màu, cây, nước, đèn, quái, nhạc, thú hoang, thời tiết.
- **Sức máy:** tối đa 24 đèn một màn. Nền 32 điểm mỗi ô vẽ theo mảng 8×8 ô (giữ 48 mảng gần nhất, khoảng 13 MB), không dựng một tấm cả bản đồ. Dãy núi (món có chân `bake`, đứng trên ô chắn nên không ai ra sau lưng được) in thẳng vào mảng nền, không vẽ lại mỗi khung. Đo 18/11 (máy hãm 4 lần): bản đĩa 128 ô, 679 món không chậm hơn bản đĩa 92 ô, 326 món.
- **Dữ liệu bền:** truyện trỏ theo tên mốc (khoá `moc` của bản đồ), không trỏ toạ độ số.

## Ai làm hình gì (đè lên luật 13/11/2026 phần bản đồ)

Chủ dự án 18/11/2026 11:03: **sông hồ, đất đá, cây cỏ của bản đồ do SpriteCook làm**; vẫn hỏi trước kèm số credit dự tính. Nhà cửa, công trình mặc định giữ ảnh của chủ dự án. Sổ việc SpriteCook: `tools/art/nguon/ai/the-gioi/spritecook-assets.json`.

13:23 cùng ngày ("giúp tui làm lại toàn bộ", đã nạp): riêng Thiên Kiếm Tinh, **nhà cửa, cổng, núi, cầu, pháp trận cũng làm lại bằng SpriteCook** cho cùng cỡ điểm với nền (hình `tk.*-sc`, 1 điểm = 0,5 đơn vị). Ảnh của chủ dự án làm ảnh mẫu (tải lên làm ảnh tham chiếu, ghép tấm theo bố cục và cỡ muốn có), nên dáng nhà giữ như cũ. Cây, đèn, tượng, sạp hàng, cờ, vạc lửa còn dùng hình cũ (`tk.*-m`): làm lại thì hỏi trước kèm credit. Hình cũ không xoá (tinh cầu khai hoang còn dùng).

Kinh nghiệm SpriteCook (đợt 18/11): cỡ điểm do máy tự chọn, không theo số ghi trong câu lệnh (ảnh vuông 2K ra lưới khoảng 400 hoặc 200 điểm); ảnh mẫu lưới nào thì ra lưới đó, nên luôn kèm ảnh mẫu lưới 400. Bộ dò lưới của SpriteCook có lúc hỏng (ảnh trả về bị bóp méo): lấy ảnh thô 2048² rồi đưa về điểm ảnh thật bằng `tools/art/sc_luoi.py`. Muốn nhà vẽ chính diện phải ghi rõ "mặt đứng chính diện, không thấy tường bên" hoặc kèm ảnh mẫu chính diện.

## Đồ nghề

| Tệp | Việc |
|---|---|
| `tools/the-gioi/ban_do.py` | Lưới ô, đĩa tinh cầu, chân món (chép `src/world/hoi-foot.js`), đường ngắn nhất, đường cong |
| `tools/the-gioi/tk_moi.py`, `tk_moi_canh.py` | Máy sinh Thiên Kiếm Tinh: ghi bản đồ thật, vùng phố và lối khách hội (`data/le-hoi.json`), chỗ NPC đồ cũ (`data/do-cu.json`); thêm `--nhap` thì chỉ ghi bản nháp `tools/the-gioi/nhap/` để xem trước |
| `tools/the-gioi/toan_canh.py` | Ảnh toàn cảnh để duyệt bố cục |
| `tools/the-gioi/soat.py` | Bộ soát luật cho mọi tinh cầu |
| `tools/art/sc_tk.py` | Máy lọc hình SpriteCook, phần nền: sáu bộ 15 mảnh (cỏ–nước, đường đất, sân lát, phố gạch, nền đá chân núi, mép tinh cầu), dải vách đá, tấm hoa cỏ in nền; và tấm đồ ven sông của bản thử |
| `tools/art/sc_tk2.py` | Phần đồ đứng: cắt các tấm núi, cầu bến, đá, hoa bụi, hòn đất nổi, pháp trận, thác, nhà cửa thành hình `tk.*-sc`; ghi `data/art.json` (đèn, khói, biển tên, điểm nước lấp lánh) và kiểu chân, kiểu chuyển động trong `data/le-hoi.json`. Chạy `sc_tk.py` rồi `sc_tk2.py` |
| `tools/art/sc_luoi.py` | Đưa ảnh thô SpriteCook (2048², nền trắng) về điểm ảnh thật: dò số ô lưới, lấy màu giữa ô, bỏ nền |
| `src/world/draw-nen.js` | Vẽ nền bộ 15 mảnh lưới đôi trong game cho bản đồ có khoá `nen`; `toan_canh.py` vẽ lại đúng các bước này (cùng hàm băm), sửa một bên thì sửa cả bên kia |
| `src/render/hoi-fade.js` | Làm mờ vật cao khi nhân vật của mình đứng sau |

Bản đồ theo luật mới thêm các khoá: `planet.luat`, `nen` (mã hình bộ nền: nuoc, dat, san, gach, nui, mep, vach, hoa; thiếu lớp nào thì game vẽ kiểu cũ cho lớp đó), `moc` (tên mốc → ô, truyện trỏ theo tên), `hoi.bay_tu` (bố cục Bày cảnh cũ trên máy chủ bị bỏ qua tới bản đó), `prop_hide` (ô có hình cũ đã thay bằng đồ mới, vd. `^` vì núi là món `tk.nui-*-sc`). Kiểu chân trong `data/le-hoi.json → foot`: thêm `bake` (núi: in vào nền) và các loại `cong-to`, `cong-tron`, `cau-vom`, `cau-day`, `nui`, `noi` cho hình mới; món `walk` (cầu, bến: đi được trên mặt) từ nay vẽ dưới người như món `flat`, điểm neo của cầu đặt ở mép gần của mặt cầu. Kiểu chuyển động mới `bob` (hòn đất nổi trôi lên xuống).

## Thiên Kiếm Tinh

Bản đầu (đĩa 92 ô) đưa lên game 18/11/2026 12:17 (chủ dự án 12:02 "Đẩy lên game đi"). 13:23 chủ dự án: "đẹp nhưng tinh cầu chưa đủ rộng, nên hơi chật… giúp tui làm lại toàn bộ" → bản hai:

**Đĩa 128 ô, tâm 64** (rộng gần gấp đôi). Giữa: quảng trường lát đá, Pháp Trận Truyền Tống ở (64, 76) (mọi lối sang tinh cầu khác tụ quanh đó, vào game cũng ở đây), Nhiệm Vụ Đường bên tây bắc. Ba đại lộ gạch rộng 4 ô và một lối vườn. Bắc: cổng Thiên Kiếm Tông, sân tông môn (Luyện Võ Đường, Truyền Công Đường, hàng cờ, bồ đoàn đả toạ), Thiên Kiếm Điện tựa vào Thiên Kiếm Phong (ngọn núi hình thanh kiếm) giữa dãy núi; Tàng Kinh Các bên đông, tháp canh bên tây. Đông: phường chợ (Vạn Bảo Lâu, Chợ Phiên, Binh Khố, Đan Dược Phường, hai dãy sạp, quầy Ngự Thú và Khôi Lỗi), cổng Bí cảnh Huyết Nha ở đông nam sau chợ, Cổ Thụ Ngàn Năm cuối phố. Nam: xóm dân quanh Suối Vọng Nguyệt, Trà Quán, Thổ Địa Miếu, cuối lối là Tiên Đài Ngắm Sao sát mép. Tây: Nguyệt Môn vào vườn, Cầu Vọng Tiên qua sông sang cổng động phủ. Sông từ Thác Kiếm Tuyền dưới núi tây bắc chảy xuôi nam vào hồ Bích Thủy (bến câu, thuyền, Vọng Nguyệt Đình); ba chỗ qua sông: Cầu Dây, cầu đá, đá bước. Vòng ngoài: rừng theo vùng, 1 bãi quái tập đánh gần xóm, 4 bãi treo máy vòng trong, 5 bãi vòng ngoài (quái gấp đôi), Kiếm Trủng ở đông bắc. Ngoài mép: vách đá rủ xuống, các hòn đất nổi trôi ở bốn góc.

Hình: nền, núi, cầu, đá, hoa bụi, mép, pháp trận, thác và toàn bộ nhà cửa là hình SpriteCook mới (`tk.*-sc`, 75 hình + 6 lớp nền), 402 credit đợt hai, cả tinh cầu 468 credit. Số món: 679 (117 loại).

Còn dùng hình cũ, chờ chủ dự án quyết: cây, đèn đá, tượng, cờ, vạc lửa, sạp hàng (`tk.*-m`, cỡ điểm cũ); thác mới có vệt nước chảy vẽ bằng code, chưa có chuyển động SpriteCook (26 credit, theo luật 04/11 chủ dự án xem ảnh tĩnh trước). Cổng bí cảnh và cổng động phủ vẫn là vòng xoáy nhỏ cạnh bia đá, chưa có công trình riêng.
