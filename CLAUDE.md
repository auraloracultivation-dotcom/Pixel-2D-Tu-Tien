# Hướng dẫn cho AI làm việc trong repo này

Trước mọi thay đổi, đọc `docs/01-HUONG-DI.md` → `docs/03-CAU-TRUC.md`. Việc về hình ảnh, hiệu ứng, cảm giác đánh: đọc thêm `docs/02-CHUAN-PIXEL.md`.

Thứ tự làm việc chủ dự án đã chốt: **cốt truyện và nội dung trước → dựng bản chơi tạm bằng code đơn giản → sau cùng mới làm hình và hiệu ứng mượt.** Đừng vội vẽ khi phần trước chưa xong. Hỏi chủ dự án từng câu một khi cần quyết định.

Luật cứng:

- Máy khách không được ghi trực tiếp vào cơ sở dữ liệu; mọi thao tác ghi qua RPC/Edge Function có kiểm tra.
- Chỉ số và nội dung nằm trong `data/`, code chỉ tham chiếu ID.
- Chỉ `src/net/` được gọi Supabase (dự án Supabase riêng Pixel2DTuTien, chỉ khoá publishable).
- Không gom code vào một file (tối đa 400 dòng). Không có logic trong `index.html`.
- Schema chỉ đổi bằng migration mới trong `supabase/migrations/`.
- Không đưa secret/service_role key vào repo.
- Cỡ nhân vật theo chỉ số, NPC là người chuẩn **1m80, 70kg** (~24 đơn vị bản đồ): nhân vật 1m75 thấp hơn NPC một xíu, nặng hơn thì bè hơn. Mỗi nhân vật bằng hình khai `body` (điểm ảnh thân người), `cm`, `kg` trong `data/heroes.json`, game tự thu phóng. Không chỉnh cỡ bằng mắt.
- Khi chủ dự án nhờ tạo nhân vật mới: **đưa bảng điền chỉ số trước** (mẫu ở `docs/04-BANG-NHAN-VAT.md`), chờ điền xong mới làm.
- **Tạm dừng SpriteCook** (chủ dự án chốt 27/10/2026, vì tạo nhiều bản thừa tốn tiền): không gọi bất kỳ công cụ SpriteCook nào, mọi hình và chuyển động làm bằng code. Chỉ dùng lại khi chủ dự án tự nói mở lại; khi đó mỗi lần tốn credit vẫn phải hỏi trước kèm số credit dự tính.
- Hình nhân vật, quái, nền: mặc định Claude vẽ bằng code (`tools/art/`). **Được dùng ảnh AI** tạo qua kết nối Canva / Hugging Face (chủ dự án mở luật 28/10/2026), nhưng phải đưa qua `tools/art/ai_import.py` (bỏ nền, về điểm ảnh thật, gom màu, viền mực) cho đúng `docs/02-CHUAN-PIXEL.md`, ảnh gốc và ảnh đã xử lý để ở `tools/art/nguon/ai/`. Không lấy hình từ game khác, không mô tả theo nhân vật có bản quyền. SpriteCook vẫn tạm dừng.
- Làm trên nhánh riêng, mở Pull Request, không đẩy thẳng `main`. Chạy `node tools/check.mjs` trước khi đẩy.
- Được tự gộp Pull Request khi kiểm tra xanh, TRỪ thay đổi cơ sở dữ liệu thật, xoá nội dung, đổi kiến trúc: những việc đó phải hỏi chủ dự án.
