# 03. Cấu trúc code

HTML Canvas + JavaScript ES module, không cần build. Chạy thử: `python3 -m http.server` rồi mở `index.html`.

| Thư mục | Việc |
|---|---|
| `data/` | Toàn bộ số liệu và nội dung: `config` (số chung), `tiles` (chú giải ô bản đồ), `elements` (5 hệ), `weapons`, `skills`, `mobs`, `npcs`, `realms` (9 cảnh giới), `story` (kịch bản), `items` (trang bị, ngọc, vật nhặt nhiệm vụ), `quests` (treo thưởng), `sounds`, `maps/*` (bản đồ dạng lưới ký tự). |
| `src/core/` | Nạp dữ liệu, khung vẽ và máy quay, điều khiển (cần gạt, nút, bàn phím), lưu tiến trình trong máy. |
| `src/world/` | Bản đồ: tra ô, va chạm, vẽ nền. |
| `src/game/` | Vòng chơi (`game.js`), người chơi, quái và boss, trúng đòn và đạn, chiêu, cảnh giới, kịch bản, bí cảnh, đi đường (`travel`), tương tác (`interact`), đòn từ trời (`strikes`), thiên kiếp (`tribulation`), treo thưởng (`bounty`), trang bị (`items`, `loot`). |
| `src/render/` | Vẽ người, quái, hiệu ứng, chỉ đường, cần gạt; `flight.js` vẽ cảnh ngự kiếm bay qua biển mây và xoáy truyền tống. |
| `src/ui/` | Thanh máu và linh khí, nút chiêu, hộp thoại, màn bay, menu (DOM trong `index.html`). |
| `src/net/` | Nơi duy nhất gọi Supabase: `client` (khoá publishable, dự án Supabase Pixel2DTuTien), `auth` (đăng nhập bằng tên tài khoản, đăng ký qua hàm `dang-ky` trong `supabase/functions/`), `online` (kênh Realtime `p2d:<đảo>`: presence + vị trí, không ghi cơ sở dữ liệu; bí cảnh chơi riêng). Nạp lười: mất mạng vẫn chơi thử được. |
| `tools/` | `check.mjs` kiểm tra tự động; `art/` vẽ hình pixel bằng code. |

## Kịch bản (`data/story.json`)

Mỗi bước có `do` (danh sách việc: `say`, `choose_element`, `pickups`, `spawn`, `dark`, `nodeath`, `flash`, `kill_all`, `npc_add`, `npc_remove`, `flag`, `shake`, `weapon`, `item`, `gear`, `reward`, `fly` (kèm `with` để NPC chở, `kind` để ép cảnh bay)) và `until` (điều kiện qua bước: `reach`, `collect`, `kill`, `kill_all`, `hp_below`, `talk`, `layer`, `realm`, `map`, `boss_dead`, `any`, `never`). Bước có `once` không phát lại khi mở lại game (dùng cho bước có thưởng). Thêm truyện = thêm bước, không sửa code.

## Bản đồ (`data/maps/*.json`)

`grid` là các dòng ký tự (xem `data/tiles.json`). `spawns` là điểm vào, `portals` là cổng (có thể cần cờ `need`), `npcs`, `spawners` (quái hồi sinh), `rooms` (phòng bí cảnh, cửa `D` mở khi dọn sạch), `island` (màu đảo trong cảnh bay), `ground` (màu đất dưới cây, đá, nhà).

## Đi đường

Đảo sang đảo: cảnh ngự kiếm 4 giây (bay lên, mây và đảo trôi qua, đảo đích lớn dần, đáp xuống). Ra vào bí cảnh: xoáy truyền tống. Chạm màn hình sau 1 giây để bỏ qua. Số giây ở `config.travel`.

## Thiên kiếp

Đầy linh khí ở tầng 9, nút ngữ cảnh hiện "Độ thiên kiếp". Sét giáng từng đợt (vòng báo trước), chạy né cho hết `realms.tribulation.waves` đợt thì lên cảnh giới mới; gục thì mất một phần linh khí.

## Điều khiển chiêu

Chạm nút chiêu: tự ngắm quái gần nhất trong tầm (không có thì bắn theo hướng đang nhìn). Kéo nút chiêu: hiện vạch ngắm, thả tay mới ra chiêu theo hướng kéo.

## Lưu tiến trình

Tạm lưu trong máy theo từng tài khoản (`p2d.save.v1:<id>`, khách là `:guest`).

Lưu máy chủ đã viết sẵn nhưng **chưa đẩy lên Supabase** (chủ dự án duyệt mới áp dụng):

- `supabase/migrations/20261026000000_p2d_luu_nhan_vat.sql`: bảng `p2d_nhan_vat` (RLS chỉ đọc dòng của mình, không ai ghi thẳng), hàm `p2d_tai()` và `p2d_luu(data, phien_ban)`. Hàm lưu kiểm tra kích thước, khung dữ liệu, cảnh giới hợp lệ và không nhảy quá 3 tầng mỗi lần lưu, túi tối đa 40 món, độ hiếm hợp lệ, và số phiên bản để hai máy cùng tài khoản không ghi đè nhau.
- `src/net/profile.js`: gọi hai hàm trên, gom lưu 4 giây một lần, lỗi mạng thì thử lại.
- Bật bằng `"server_save": true` trong `data/config.json`. Máy mới chưa có bản lưu sẽ tự lấy bản trên máy chủ.
- Còn tin máy khách: dòng chỉ số đồ rơi và tẩy luyện vẫn tung ở máy. Muốn chống gian lận đồ thật thì bước sau chuyển việc tung đồ vào hàm máy chủ.

Các bước áp dụng khi được duyệt: chạy migration trên dự án Supabase, đổi `server_save` thành `true`, mở PR.
