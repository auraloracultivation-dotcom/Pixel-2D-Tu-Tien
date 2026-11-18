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
- **Che khuất:** không đặt vật cao trùm lên NPC, cổng, lối đi (game chưa làm mờ vật khi người đứng sau).
- **Bố cục lối chơi:** giữa là vùng an toàn, ra ngoài quái mạnh dần; bãi quái cách phố ít nhất 4 ô và đủ trống cho Tự đánh; có chỗ rộng cho boss thế giới, bang chiến.
- **Định hướng:** mỗi hướng một cảnh lớn nhìn thấy từ xa. Biển chỉ lối ở ngã rẽ.
- **Bản sắc tinh cầu:** một bộ chữ ký gồm màu, cây, nước, đèn, quái, nhạc, thú hoang, thời tiết.
- **Sức máy:** tối đa 24 đèn một màn. Nền 32 điểm mỗi ô vẽ theo mảng 8×8 ô, không dựng một tấm cả bản đồ.
- **Dữ liệu bền:** truyện trỏ theo tên mốc (khoá `moc` của bản đồ), không trỏ toạ độ số.

## Ai làm hình gì (đè lên luật 13/11/2026 phần bản đồ)

Chủ dự án 18/11/2026 11:03: **sông hồ, đất đá, cây cỏ của bản đồ do SpriteCook làm**; vẫn hỏi trước kèm số credit dự tính. Nhà cửa, công trình mặc định giữ ảnh của chủ dự án. Sổ việc SpriteCook: `tools/art/nguon/ai/the-gioi/spritecook-assets.json`.

## Đồ nghề

| Tệp | Việc |
|---|---|
| `tools/the-gioi/ban_do.py` | Lưới ô, đĩa tinh cầu, chân món (chép `src/world/hoi-foot.js`), đường ngắn nhất, đường cong |
| `tools/the-gioi/tk_moi.py`, `tk_moi_canh.py` | Máy sinh Thiên Kiếm Tinh: ghi bản đồ thật, vùng phố và lối khách hội (`data/le-hoi.json`), chỗ NPC đồ cũ (`data/do-cu.json`); thêm `--nhap` thì chỉ ghi bản nháp `tools/the-gioi/nhap/` để xem trước |
| `tools/the-gioi/toan_canh.py` | Ảnh toàn cảnh để duyệt bố cục |
| `tools/the-gioi/soat.py` | Bộ soát luật cho mọi tinh cầu |
| `tools/art/sc_tk.py` | Máy lọc hình SpriteCook: bộ nền 15 mảnh (cỏ–nước, đường đất), cắt tấm đồ vật; sân lát đá và phố gạch TẠM suy từ dáng bộ đường đất, mặt lát vẽ bằng code |
| `src/world/draw-nen.js` | Vẽ nền bộ 15 mảnh lưới đôi trong game cho bản đồ có khoá `nen` |

Bản đồ theo luật mới thêm các khoá: `planet.luat`, `nen` (mã hình bộ nền: nuoc, dat, san, gach), `moc` (tên mốc → ô, truyện trỏ theo tên), `hoi.bay_tu` (bố cục Bày cảnh cũ trên máy chủ bị bỏ qua tới bản đó).

## Thiên Kiếm Tinh (đưa lên game 18/11/2026, chủ dự án 12:02 "Đẩy lên game đi")

Đĩa 92 ô, tâm 46. Giữa: quảng trường, một Pháp Trận Truyền Tống (mọi lối sang tinh cầu khác tụ quanh đó), Nhiệm Vụ Đường. Bắc: Thiên Kiếm Tông dưới dãy núi (điện chính, Luyện Võ Đường, Truyền Công Đường, Tàng Kinh Các, tháp canh, bồ đoàn đả toạ trong sân). Đông: chợ (Vạn Bảo Lâu, Chợ Phiên, Binh Khố, hai dãy sạp), cổng Bí cảnh Huyết Nha sau chợ. Nam: xóm dân, Suối Vọng Nguyệt, cuối lối là Tiên Đài ngắm sao ở mép. Tây: Nguyệt Môn, Cầu Vọng Tiên qua sông sang cổng động phủ. Sông từ Thác Kiếm Tuyền chảy xuống hồ Bích Thủy, có bến câu. Vòng ngoài: rừng theo vùng, 5 bãi quái vòng trong và 5 bãi vòng ngoài (quái gấp đôi), Kiếm Trủng, Cổ Thụ Ngàn Năm.

Còn tạm, chờ làm tiếp: núi (hình cũ, cỡ điểm cũ), sân lát và phố gạch (suy từ bộ đường đất), mép tinh cầu (chưa có dạng đất vỡ), game chưa làm mờ vật cao khi người đứng sau.
