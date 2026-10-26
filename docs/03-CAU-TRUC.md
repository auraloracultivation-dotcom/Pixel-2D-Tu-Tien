# 03. Cấu trúc code

HTML Canvas + JavaScript ES module, không cần build. Chạy thử: `python3 -m http.server` rồi mở `index.html`.

| Thư mục | Việc |
|---|---|
| `data/` | Toàn bộ số liệu và nội dung: `config` (số chung), `tiles` (chú giải ô bản đồ), `elements` (5 hệ), `weapons`, `skills`, `mobs`, `npcs`, `realms` (9 cảnh giới), `story` (kịch bản), `maps/*` (bản đồ dạng lưới ký tự). |
| `src/core/` | Nạp dữ liệu, khung vẽ và máy quay, điều khiển (cần gạt, nút, bàn phím), lưu tiến trình trong máy. |
| `src/world/` | Bản đồ: tra ô, va chạm, vẽ nền. |
| `src/game/` | Vòng chơi (`game.js`), người chơi, quái và boss, trúng đòn và đạn, chiêu, cảnh giới, kịch bản, bí cảnh. |
| `src/render/` | Vẽ người, quái, hiệu ứng, chỉ đường, cần gạt. |
| `src/ui/` | Thanh máu và linh khí, nút chiêu, hộp thoại, màn bay, menu (DOM trong `index.html`). |
| `src/net/` | Nơi duy nhất gọi Supabase: `client` (khoá publishable, dùng chung dự án với Auralora), `auth` (đăng nhập bằng tên tài khoản như game cũ, đăng ký qua hàm `dang-ky`), `online` (kênh Realtime `p2d:<đảo>`: presence + vị trí, không ghi cơ sở dữ liệu; bí cảnh chơi riêng). Nạp lười: mất mạng vẫn chơi thử được. |
| `tools/` | `check.mjs` kiểm tra tự động; `art/` vẽ hình pixel bằng code. |

## Kịch bản (`data/story.json`)

Mỗi bước có `do` (danh sách việc: `say`, `choose_element`, `pickups`, `spawn`, `dark`, `nodeath`, `flash`, `kill_all`, `npc_add`, `npc_remove`, `flag`, `shake`, `weapon`, `item`, `fly`) và `until` (điều kiện qua bước: `reach`, `collect`, `kill_all`, `hp_below`, `talk`, `layer`, `map`, `boss_dead`, `any`, `never`). Thêm truyện = thêm bước, không sửa code.

## Bản đồ (`data/maps/*.json`)

`grid` là các dòng ký tự (xem `data/tiles.json`). `spawns` là điểm vào, `portals` là cổng (có thể cần cờ `need`), `npcs`, `spawners` (quái hồi sinh), `rooms` (phòng bí cảnh, cửa `D` mở khi dọn sạch).

## Điều khiển chiêu

Chạm nút chiêu: tự ngắm quái gần nhất trong tầm (không có thì bắn theo hướng đang nhìn). Kéo nút chiêu: hiện vạch ngắm, thả tay mới ra chiêu theo hướng kéo.

## Lưu tiến trình

Tạm lưu trong máy theo từng tài khoản (`p2d.save.v1:<id>`, khách là `:guest`). Sẽ chuyển lên máy chủ qua RPC.
