# Bảng chỉ số nhân vật

Mỗi khi chủ dự án nhờ tạo nhân vật mới (nhân vật chính, NPC, bạn đồng hành, boss hình người), Claude gửi bảng này **trước khi làm**, chờ chủ dự án điền. Ô bỏ trống thì Claude đề xuất và hỏi lại.

Người chuẩn để so: **NPC cao 1m80, nặng 70kg** (trong game ~24 đơn vị bản đồ từ đỉnh đầu đến chân). Nhân vật 1m75 thấp hơn NPC một xíu; nặng hơn so với chiều cao thì bè hơn.

| Mục | Điền |
|---|---|
| Tên | |
| Vai trò (nhân vật chính / NPC / bạn đồng hành / boss) | |
| Giới tính, tuổi trông | |
| Chiều cao (cm) | |
| Cân nặng (kg) | |
| Dáng người (gầy, cân đối, vạm vỡ, béo...) | |
| Vũ khí | |
| Hệ / linh căn | |
| Màu chủ đạo (tóc, áo) | |
| Tính cách, câu nói đặc trưng | |
| Ảnh mẫu (nếu có) | |
| Số động tác cần (đứng, đi, mấy nhát đánh...) | |

Sau khi điền: chiều cao, cân nặng vào `data/heroes.json` (`cm`, `kg`), đo `body` (số điểm ảnh thân người trong hình). SpriteCook đang tạm dừng (27/10/2026): vẽ và làm chuyển động bằng code trong `tools/art/`.
