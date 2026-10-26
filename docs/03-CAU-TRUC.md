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
| `src/net/` | (chưa có) Nơi duy nhất gọi Supabase. |
| `tools/` | `check.mjs` kiểm tra tự động; `art/` vẽ hình pixel bằng code. |

## Kịch bản (`data/story.json`)

Mỗi bước có `do` (danh sách việc: `say`, `choose_element`, `pickups`, `spawn`, `dark`, `nodeath`, `flash`, `kill_all`, `npc_add`, `npc_remove`, `flag`, `shake`, `weapon`, `item`, `fly`) và `until` (điều kiện qua bước: `reach`, `collect`, `kill_all`, `hp_below`, `talk`, `layer`, `map`, `boss_dead`, `any`, `never`). Thêm truyện = thêm bước, không sửa code.

## Bản đồ (`data/maps/*.json`)

`grid` là các dòng ký tự (xem `data/tiles.json`). `spawns` là điểm vào, `portals` là cổng (có thể cần cờ `need`), `npcs`, `spawners` (quái hồi sinh), `rooms` (phòng bí cảnh, cửa `D` mở khi dọn sạch).
