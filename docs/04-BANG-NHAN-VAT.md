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
| Vũ khí (nhân vật chính: không cầm tay, vũ khí bay sau lưng; chỉ ghi loại để chọn hình bay) | |
| Hệ / linh căn | |
| Màu chủ đạo (tóc, áo) | |
| Tính cách, câu nói đặc trưng | |
| Ảnh mẫu (nếu có) | |
| Số động tác cần (đứng, đi, vận lực: vung tay, chỉ kiếm, kết ấn...) | |

Sau khi điền: chiều cao, cân nặng vào `data/heroes.json` (`cm`, `kg`), đo `body` (số điểm ảnh thân người trong hình). SpriteCook đang tạm dừng (27/10/2026): vẽ và làm chuyển động bằng code trong `tools/art/`.

**Ngự kiếm (chủ dự án chốt 28/10/2026)**: nhân vật chính mới vẽ **tay không**, chỉ vung tay vung chân. Vũ khí luôn bay sau lưng (`data/heroes.json` → `fly`, hình `fw.<loại>` ở `tools/art/flyweapons.py`); khi đánh, người làm động tác vận lực, vũ khí từ sau lưng lao ra đâm, quét, bổ hoặc ra trước mặt bắn. Động tác vận lực khai trong `anims.cast` của nhân vật (chạy một lượt mỗi đòn); không có `cast` thì nhân vật đứng/đi và nhún nhẹ. Hai nhân vật hiện tại (nam kiếm tu, nữ liềm tím) còn cầm vũ khí trong hình, giữ tạm tới khi có nhân vật mới.
