# 03. Cấu trúc code

HTML Canvas + JavaScript ES module, không cần build. Chạy thử: `python3 -m http.server` rồi mở `index.html`.

| Thư mục | Việc |
|---|---|
| `data/` | Toàn bộ số liệu và nội dung: `config` (số chung), `tiles` (chú giải ô bản đồ), `elements` (5 hệ), `weapons`, `skills`, `mobs`, `npcs`, `realms` (9 cảnh giới), `story` (kịch bản), `items` (trang bị, ngọc, vật nhặt nhiệm vụ), `quests` (treo thưởng), `sounds`, `heroes` (hình nhân vật chính), `art` (do `tools/art/build.py` sinh), `maps/*` (bản đồ dạng lưới ký tự). |
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

Lưu máy chủ đang bật (`"server_save": true`): `src/net/profile.js` gọi `p2d_tai()` / `p2d_luu(data, phien_ban)`, gom lưu 4 giây một lần, lỗi mạng thì thử lại; máy mới chưa có bản lưu tự lấy bản trên máy chủ.

**Chống gian lận** (`supabase/migrations/20261027140000_p2d_chong_gian_lan.sql`, chủ dự án duyệt 27/10/2026). Game vẫn tính ở máy người chơi (tự hành, đánh quái, rơi đồ), nên máy chủ không tính lại được mọi thứ; máy chủ chặn những chỗ ảnh hưởng người khác và những cú gian lận lộ liễu:

- `p2d_luu`: Linh Thạch và nguyên liệu chỉ tăng trong "thùng hạn mức" đầy dần theo thời gian thật và cảnh giới (rộng gấp nhiều lần tốc độ đánh nhanh nhất); vượt thì cắt về mức cho phép. Lực chiến có trần theo cảnh giới (6000 × 1,6^cảnh giới), tầng tháp mỗi tầng ít nhất 5 giây. Món đã đem rao không quay lại túi được. Món mới quá hiếm hoặc chỉ số vượt mức tung được (`p2d_mon_hop_le`, ngưỡng ở bảng `p2d_chi_so`, `p2d_pham`) thì ghi nghi vấn.
- Mọi lần cắt, mọi điều lạ ghi vào `p2d_nghi_van` và cộng `p2d_nhan_vat.nghi_van`; từ 10 trở lên thì không lên bảng xếp hạng, không vào chợ. Chủ dự án xem bảng `p2d_nghi_van` trong Supabase.
- Tiên Ngọc, quà ra mắt, thẻ tháng do máy chủ giữ (cột `tien_ngoc`, `tn_qua`, `the_den`, `the_nhan`; hàm `p2d_qua_tn`, `p2d_doi_tn`, `p2d_nhan_the`; giá ở bảng `p2d_tn_gia`).
- Chợ (`p2d_rao_ban`, `p2d_mua_hang`, `p2d_nhan_thu_moi`; hàm cũ `p2d_dang_ban`, `p2d_mua`, `p2d_nhan_thu` đã khoá): rao bán chỉ gửi mã số món, máy chủ tự lấy món trong bản lưu trên máy chủ và kiểm tra chỉ số; rao, mua trừ đồ và tiền ngay trên máy chủ; nhận thư máy chủ tự cộng vào bản lưu. Khoá dòng nhân vật nên bấm dồn không lách được.
- Lệnh nào sửa bản lưu ở máy chủ thì tăng `phien_ban` và trả về; máy khách gọi qua `cloud.run()` (đợi lần lưu đang gửi, đẩy bản mới nhất, gọi lệnh, làm theo kết quả) để không bao giờ gửi bản lưu cũ.
- Lỗi luôn dùng mã thường (22023, 42501, 54000, P0001), **không dùng 40001**: PostgREST tự chạy lại giao dịch khi gặp 40001, sáng 27/10 làm máy chủ treo 5 tiếng.
- Tên hiển thị tách khỏi tên đăng nhập (`p2d_dat_ten`, nút ✎ ở bảng Đạo hữu); người mới tên "Đạo hữu XXXX".
- Kênh online và tổ đội là kênh Realtime riêng tư, chỉ người đã đăng nhập vào được; tin quyết định trong tổ đội chỉ nhận từ đội trưởng, đòn trúng mình bị kẹp tối đa 80% máu.
- Đăng ký (`supabase/functions/dang-ky`): mỗi địa chỉ mạng tối đa 3 tài khoản / giờ, 10 / ngày; chỉ trang game gọi được từ trình duyệt; mật khẩu mới 8–72 ký tự.
- `tools/check.mjs` so số trong migration với `data/` (giá Tiên Ngọc, quà, ngưỡng chỉ số, độ hiếm, thuế chợ): đổi số trong `data/` thì phải thêm migration mới.

Còn tin máy khách: chỉ số đồ rơi, tẩy luyện, cường hóa, linh khí. Muốn chặn hết thì chuyển việc tung đồ và tính linh khí vào hàm máy chủ (việc lớn, làm sau).

## Tông môn người chơi

`supabase/migrations/20261028010000_p2d_tong_mon.sql` (bảng `p2d_bang`, `p2d_bang_tv`, `p2d_bang_xin`, số ở `p2d_bang_cfg` khớp `data/guild.json`). Hàm `p2d_bang_*`: lập (Kim Đan + 20.000 Linh Thạch, trừ trên máy chủ), tìm, xin vào (tông môn mở thì vào thẳng), duyệt, đổi chức (Tông chủ, Phó tông chủ, Trưởng lão, Đệ tử), mời ra, nhường chức, rời, giải tán, điểm danh, góp Linh Thạch, nhận thưởng mốc tuần (mỗi người mỗi mốc một lần mỗi tuần, ghi ở `p2d_nhan_vat.bang_thuong`). Đồng môn được gọi bằng mã băm 12 ký tự, không lộ mã tài khoản. Chat tông môn là kênh `bang:<id>` của `p2d_chat`. Máy khách: `src/net/guild.js`, `src/game/guild.js` (lệnh đụng Linh Thạch chạy qua `cloud.run`), `src/ui/guild-panel.js`, `src/ui/guild-view.js`; chat theo kênh ở `src/game/world-chat.js`.

## Sao lưu hằng đêm

`supabase/migrations/20261028030000_p2d_sao_luu_dem.sql`: pg_cron chạy `p2d_sao_luu_dem()` lúc 2 giờ 17 sáng giờ Việt Nam (job `p2d-sao-luu-dem`), chép nguyên dòng `p2d_nhan_vat` (cột `ban` = `to_jsonb` cả dòng) vào `p2d_sao_luu` theo ngày, giữ 7 ngày gần nhất. Máy khách không đọc, không gọi được. Khôi phục là việc tay, cần chủ dự án đồng ý: đọc `ban` của ngày cần rồi ghi lại vào `p2d_nhan_vat`.

## Nhật ký lỗi máy khách

`src/core/catch-errors.js` bắt lỗi JavaScript (`error`, `unhandledrejection`) trên máy người chơi, bỏ lỗi mạng và lỗi không có thông tin, mỗi lỗi một lần mỗi phiên, tối đa 10; khi đã đăng nhập thì gửi qua `src/net/errlog.js` → `p2d_ghi_loi` (`supabase/migrations/20261028040000_p2d_nhat_ky_loi.sql`). Máy chủ gộp lỗi trùng trong ngày (cột `lan`), mỗi người tối đa 20 dòng mới mỗi giờ, cả máy chủ 5000 dòng mỗi ngày, giữ 14 ngày (job `p2d-don-loi`). Chủ dự án xem bảng `p2d_loi` trong Supabase.
