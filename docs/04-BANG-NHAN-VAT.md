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

**Ngự kiếm (chủ dự án chốt 28/10/2026)**: nhân vật chính mới vẽ **tay không**, chỉ vung tay vung chân. Vũ khí luôn bay sau lưng (`data/heroes.json` → `fly`, hình `fw.<loại>` ở `tools/art/flyweapons.py`); khi đánh, người làm động tác vận lực, vũ khí từ sau lưng lao ra đâm, quét, bổ hoặc ra trước mặt bắn. Nhân vật có chuỗi động tác đánh (`attacks`) thì mỗi đòn chạy một động tác, vũ khí bay theo đường khớp động tác đó (`fly.moves`: tên động tác → đường bay); động tác mới nhớ khai thêm vào `fly.moves`, không khai thì vũ khí đâm/quét/bổ xoay vòng. Không có `attacks` thì chạy `anims.cast` (vận lực, một lượt mỗi đòn); không có cả hai thì đứng/đi và nhún nhẹ. Hai nhân vật hiện tại (nam kiếm tu, nữ liềm tím) còn cầm vũ khí trong hình và giữ nguyên động tác chém của mình, chạy cùng lúc với vũ khí bay (chủ dự án chốt 28/10/2026, 15:32).

**Hướng nhìn và hướng đánh (chủ dự án chốt 04/11/2026 14:01, rút từ lỗi Thần Nguyên Y):** game nhìn từ trên xuống, nhân vật chỉ có hai hướng trái / phải, hình gốc **nhìn nghiêng sang phải** (chéo 3/4 hoặc nghiêng hẳn), quay trái thì game lật gương. Không bao giờ làm nhân vật nhìn thẳng ra màn hình rồi cho đánh "về phía trước": máy hiểu phía trước là phía người xem, đòn đánh thành đấm vào màn hình.
- Hình gốc nhìn thẳng (như ảnh chủ dự án gửi): trước khi làm động tác, tạo bản **nhìn nghiêng sang phải** từ hình đó (giữ tóc, áo, cánh, phụ kiện), động tác làm từ bản nghiêng.
- Câu lệnh động tác ghi rõ: "side view facing right; attack moves horizontally to the RIGHT of the frame, never toward the camera / viewer"; đòn đánh ra xong **thu về đúng dáng đứng** ở khung cuối để chuỗi đòn liền mạch.
- Chạy: "side view running to the right, arms swing back and forth, legs stride", không chạy tại chỗ nhìn thẳng.
- Làm động tác đầu (thường là đứng) xong gửi chủ dự án xem rồi mới làm tiếp, mỗi lần tốn credit báo trước số credit.
