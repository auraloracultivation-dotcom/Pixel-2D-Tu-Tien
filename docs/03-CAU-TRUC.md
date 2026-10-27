# 03. Cấu trúc code

HTML Canvas + JavaScript ES module, không cần build. Chạy thử: `python3 -m http.server` rồi mở `index.html`.

| Thư mục | Việc |
|---|---|
| `data/` | Toàn bộ số liệu và nội dung: `config` (số chung), `tiles` (chú giải ô bản đồ), `elements` (5 hệ), `weapons`, `skills`, `mobs`, `npcs`, `realms` (9 cảnh giới), `story` (kịch bản), `items` (trang bị, ngọc, vật nhặt nhiệm vụ), `quests` (treo thưởng), `sounds`, `heroes` (hình nhân vật chính), `art` (do `tools/art/build.py` sinh), `maps/*` (bản đồ dạng lưới ký tự). |
| `src/core/` | Nạp dữ liệu, khung vẽ và máy quay, điều khiển (cần gạt, nút, bàn phím), lưu tiến trình trong máy. |
| `src/world/` | Bản đồ: tra ô, va chạm, vẽ nền. |
| `src/game/` | Vòng chơi (`game.js`), người chơi, quái và boss, trúng đòn và đạn, chiêu, cảnh giới, kịch bản, bí cảnh, đi đường (`travel`), tương tác (`interact`), đòn từ trời (`strikes`), thiên kiếp (`tribulation`), treo thưởng (`bounty`), trang bị (`items`, `loot`). |
| `src/render/` | Vẽ người, quái, hiệu ứng, chỉ đường, cần gạt; `flight.js` vẽ người bay và xoáy truyền tống, `draw-space.js` cảnh bay truyền tống giữa các tinh cầu, `draw-starmap.js` tinh đồ. |
| `src/ui/` | Thanh máu và linh khí, nút chiêu, hộp thoại, màn bay, menu (DOM trong `index.html`). |
| `src/net/` | Nơi duy nhất gọi Supabase: `client` (khoá publishable, dự án Supabase Pixel2DTuTien), `auth` (đăng nhập bằng tên tài khoản, đăng ký qua hàm `dang-ky` trong `supabase/functions/`), `online` (kênh Realtime `p2d:<đảo>`: presence + vị trí, không ghi cơ sở dữ liệu; bí cảnh chơi riêng). Nạp lười: mất mạng vẫn chơi thử được. |
| `tools/` | `check.mjs` kiểm tra tự động; `art/` vẽ hình pixel bằng code. |

## Kịch bản (`data/story.json`)

Mỗi bước có `do` (danh sách việc: `say`, `choose_element`, `pickups`, `spawn`, `dark`, `nodeath`, `flash`, `kill_all`, `npc_add`, `npc_remove`, `flag`, `shake`, `weapon`, `item`, `gear`, `reward`, `fly` (kèm `with` để NPC chở, `kind` để ép cảnh bay)) và `until` (điều kiện qua bước: `reach`, `collect`, `kill`, `kill_all`, `hp_below`, `talk`, `layer`, `realm`, `map`, `boss_dead`, `any`, `never`). Bước có `once` không phát lại khi mở lại game (dùng cho bước có thưởng). Thêm truyện = thêm bước, không sửa code.

## Bản đồ (`data/maps/*.json`)

`grid` là các dòng ký tự (xem `data/tiles.json`). `spawns` là điểm vào, `portals` là cổng (có thể cần cờ `need`), `npcs`, `spawners` (quái hồi sinh), `rooms` (phòng bí cảnh, cửa `D` mở khi dọn sạch), `island` (màu đảo trong cảnh bay), `ground` (màu đất dưới cây, đá, nhà), `world: true` (bay tới được từ tinh đồ), `planet` (đã phóng thành tinh cầu tròn: đường kính `d`, gốc đảo cũ `origin`).

**Tinh cầu tròn** (`data/planets.json`, `tools/planetize.py`, chạy một lần: `python3 -I tools/planetize.py`): mỗi đảo ngoài trời thành đĩa tròn đường kính 38–62 ô trôi giữa trời sao (`drawSky` vẽ trời sao khi bản đồ có `planet`). Đảo cũ nằm giữa, vùng mới rải vật cản thành cụm, bốn đường mòn toả từ tâm ra mép, mép đĩa luôn trống để câu cá, đá ngắm cảnh ở mép nam. Bãi quái vòng ngoài: spawner có `mul` thì quái mạnh gấp `mul` lần, không hiện số, có vòng tím "nhiễm ma khí", linh khí chỉ nhích `dungeon.reward_tier` mỗi lần gấp đôi (`scaleMobBy` ở `src/game/mobs.js`). Công cụ đã dịch mọi toạ độ trỏ vào các bản đồ này (story, side, scenic, events); thêm toạ độ mới thì viết theo lưới mới.

**Địa hình** (`tools/terrain.py`, số ở `data/planets.json` → terrain, chạy một lần, bản đồ đã làm có `planet.terrain`): dãy núi `^`, một hồ hoặc biển, hai sông chảy từ chân núi ra mép (cứ vài ô có chỗ lội, qua đường mòn thành cầu); nước theo tinh cầu (`=` nước, `L` dung nham ở Xích Diễm, `O` băng nứt ở Hàn Băng, `f` khe hư không ở Vết Nứt). Không đặt lên đảo cũ, mép đĩa, bãi quái, cổng, NPC. Vẽ ở `src/world/draw-terrain.js`. Câu cá được cả ở bờ sông, hồ. Mây mờ trôi trên tinh cầu, có bóng dưới đất (`src/render/draw-clouds.js`).

**Nhà cửa, cây cối** (`tools/settle.py`, số ở `data/planets.json` → settle, chạy một lần, bản đồ đã làm có `planet.settle`): xóm nhỏ ở vùng mới (sân và một tới ba căn nhà quay cửa ra sân, đường mòn nối về tâm, nhà theo tinh cầu: nhà ngói, nhà cháy, nhà trên cây, nhà rèn, nhà đất) và lùm cây (cây theo tinh cầu: cây xanh, cây khô, tùng tuyết, cổ thụ, tinh thể tím). Vùng mới hẹp vì đảo cũ chiếm giữa nên có tinh cầu chỉ xây được một xóm.

**Người, thú vật**: 12 dân làng mới (`data/npcs.json`, hình chibi do `tools/art/npcs.py` vẽ) đứng đi dạo ở sân các xóm mới (`hamlets` trong bản đồ, `tools/settle.py` ghi), nói chuyện về tinh cầu, ma khí, bãi treo máy. Thú hiền (`data/wildlife.json`, `src/game/wildlife.js`, vẽ bằng `drawWild` ở `src/render/draw-critter.js`): thỏ, nai, chim, hạc, vịt, mèo đi dạo khắp tinh cầu; người chơi đi tới gần thì chạy, chim bay vụt đi rồi đáp chỗ khác; đứng yên một lúc thì con gần nhất lại dụi đầu, hiện tim. Không lưu, không đánh.

**Công cụ, khai linh khoáng** (`data/gather.json`, `src/game/gather.js`, vẽ ở `src/render/draw-vein.js`): mỗi tinh cầu 6 mạch linh khoáng ở vùng mới (chọn cố định theo mã bản đồ). Đứng cạnh bấm "Đào linh khoáng", đứng yên 1,6 giây được 2–4 Tinh Thiết (nhân theo cấp Linh Cuốc), may thì Tẩy Luyện Thạch, Khóa Linh Thạch; mạch cạn 30 phút thật (`save.veins`). Linh Cuốc (`save.tool`, cấp 1–10) nâng ở lò rèn động phủ bằng Linh Thạch, giá nhân 1,6 mỗi cấp; mỗi cấp +15% sản lượng, đào nhanh hơn 6%.

**Tự hành rảnh tay** (`src/game/farmjob.js`): khi truyện chờ tu luyện mà hết việc vặt, tự hành đào mạch linh khoáng còn trên bản đồ (tùy chọn `dao`, đào dở thì đào cho xong rồi mới đánh), rồi tới bãi treo máy vừa sức nhất (tùy chọn `treo`): bãi mạnh nhất mà `foeRatio` (cùng công thức màu gợi ý cổng bí cảnh) vẫn từ mức vừa trở lên; bản đồ không có bãi thì bay tới tinh cầu đã tới có `realm` cao nhất không quá cảnh giới. Khuya (tùy chọn `dem`) thì thôi, về động phủ.

**Thời trang theo tinh cầu** (`data/fashion.json`, nguồn `elite`): mỗi tinh cầu một bộ (Kiếm bào Thiên Kiếm, Hỏa bào Xích Diễm, Băng y Hàn Băng, Phong bào Hắc Phong, Lục bào Thanh Mộc, Kim y Thiên Kim, Thổ bào Hậu Thổ, Hư Không Tử Y), mở khi hạ đủ 300 quái nhiễm ma khí ở bãi vòng ngoài của tinh cầu đó (Thiên Kiếm 200). Đếm ở `save.elite` (`eliteKill` ở `src/game/fashion.js`), bảng Thời trang hiện tiến độ. Mục tiêu dài hạn cho người treo máy.

**Bãi treo máy** (chủ dự án 28/10/2026): spawner có `farm: true` lấy số con, tốc hồi ở `data/planets.json` → farm (5 con, chết hồi sau 2,5 giây) để Tự đánh chém, tung chiêu liên tục; đồ, nguyên liệu, Linh Thạch rơi chỉ bằng `farm.loot` (0,4) lần quái thường (`m.lootMul` ở `loot.js`, `cave.js`, `shop.js`), linh khí giữ nguyên. Mỗi tinh cầu có quái 9 bãi: 4 bãi thường, 5 bãi vòng ngoài nhiễm ma khí.

## Tinh đồ (`data/starmap.json`)

Nút Bản đồ mở tinh đồ Thiên Kiếm Tinh Hệ: Linh Nhật ở giữa, tinh cầu quay chậm trên quỹ đạo theo giờ thật, mặt trăng (bí cảnh, động phủ) quay quanh tinh cầu mẹ, vòng ma khí gợn sóng ở ngoài cùng. Kéo để dời, chụm hai ngón hoặc lăn chuột để phóng (`src/ui/pan-zoom.js`). Chạm thiên thể hiện thẻ: tên, loại, mô tả, màu nguy hiểm so cảnh giới (xanh / vàng / đỏ, màu ở `dungeon.json` → hint, không hiện số), nút Bay tới nếu bản đồ có `world: true` và đã tới. Vị trí và độ nguy hiểm ở `src/game/starmap.js`, vẽ ở `src/render/draw-starmap.js` kiểu pixel ấm (vẽ lên một tấm nhỏ rồi phóng nguyên lần, mỗi điểm ảnh tinh đồ bằng 2–4 điểm ảnh màn hình; tinh cầu ba tông theo hướng Linh Nhật, viền mực, quỹ đạo chấm vàng nhạt; chữ tên vẽ sau ở độ phân giải thật), bảng ở `src/ui/world-map.js`. Thêm tinh cầu mới: thêm vào `bodies` (bản đồ nào có `world` cũng phải có trên tinh đồ, `tools/check.mjs` kiểm).

## Đi đường

Tinh cầu sang tinh cầu: bay truyền tống qua không gian sao (`src/game/space-trip.js`, vẽ ở `src/render/draw-space.js`), dài 5 giây cộng 0,9 giây mỗi vòng quỹ đạo cách nhau trên tinh đồ, tối đa 12 giây. Tinh cầu vừa rời lùi dần, cổng trận pháp lướt qua, tinh cầu đến lớn dần. Kéo nửa trái màn để lượn nhặt sao linh khí (mỗi sao một phần nhỏ linh khí của tầng đang tu, đôi khi có sao vàng cho Linh Thạch); không chạm thì nhân vật tự lượn. Va mảnh vỡ hư không chỉ chậm lại, không bao giờ thua. Chạm nửa phải sau 1 giây để bỏ qua. Ra vào bí cảnh: xoáy truyền tống (chạm đâu cũng bỏ qua được). Số ở `config.travel`.

## Thiên kiếp

Đầy linh khí ở tầng 9, nút ngữ cảnh hiện "Độ thiên kiếp". Sét giáng từng đợt (vòng báo trước), chạy né cho hết `realms.tribulation.waves` đợt thì lên cảnh giới mới; gục thì mất một phần linh khí.

## Điều khiển chiêu

Chạm nút chiêu: tự ngắm quái gần nhất trong tầm (không có thì bắn theo hướng đang nhìn). Kéo nút chiêu: hiện vạch ngắm, thả tay mới ra chiêu theo hướng kéo.

## Lưu tiến trình

Tạm lưu trong máy theo từng tài khoản (`p2d.save.v1:<id>`, khách là `:guest`).

Lưu máy chủ đang bật (`"server_save": true`): `src/net/profile.js` gọi `p2d_tai()` / `p2d_luu(data, phien_ban)`, gom lưu 4 giây một lần, lỗi mạng thì thử lại; máy mới chưa có bản lưu tự lấy bản trên máy chủ.

**Chống gian lận** (`supabase/migrations/20261027140000_p2d_chong_gian_lan.sql`, chủ dự án duyệt 27/10/2026). Game vẫn tính ở máy người chơi (tự hành, đánh quái, rơi đồ), nên máy chủ không tính lại được mọi thứ; máy chủ chặn những chỗ ảnh hưởng người khác và những cú gian lận lộ liễu:

- `p2d_luu`: Linh Thạch và nguyên liệu chỉ tăng trong "thùng hạn mức" đầy dần theo thời gian thật và cảnh giới (rộng gấp nhiều lần tốc độ đánh nhanh nhất); vượt thì cắt về mức cho phép. Lực chiến có trần theo cảnh giới (6000 × 1,6^cảnh giới), tầng tháp mỗi tầng ít nhất 5 giây. Món đã đem rao không quay lại túi được. Món mới quá hiếm hoặc chỉ số vượt mức tung được (`p2d_mon_hop_le`, ngưỡng ở bảng `p2d_chi_so`, `p2d_pham`) thì ghi nghi vấn.
- Linh khí (`supabase/migrations/20261028070000_p2d_han_muc_linh_khi.sql`): trigger `p2d_kiem_linh_khi` trên `p2d_nhan_vat` tính tổng linh khí đã tu (`p2d_tong_lk`, khớp `data/realms.json`, `tools/check.mjs` so) trước và sau mỗi lần đổi; phần tăng phải nằm trong thùng hạn mức (đầy 60 × 1,6^cảnh giới mỗi giây, chứa tối đa max(500.000, 1 giờ)), vượt thì giữ cảnh giới, tầng, linh khí cũ và ghi nghi vấn `linh_khi`.
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

## Chặn và báo cáo chat

`supabase/migrations/20261028050000_p2d_bao_cao_chat.sql`: mỗi tin `p2d_doc_chat` có thêm `k` (mã người gửi, `p2d_chat_key`, băm 12 ký tự). `p2d_bao_cao_chat(tin, lý do)` ghi `p2d_bao_cao` kèm nội dung tin; mỗi người 10 báo cáo mỗi ngày, mỗi tin một lần; 3 người khác nhau báo một người trong 24 giờ thì người đó vào `p2d_cam_chat` 24 giờ và `p2d_gui_chat` trả `bi_cam`. Máy khách: `src/ui/chat-line.js` (chạm tin người khác hiện Chặn, Báo cáo; dùng ở kênh thế giới và tông môn), danh sách chặn ở `save.blocked` (`src/game/world-chat.js`), nút bỏ chặn ở tab Trò chuyện. Chữ ở `data/social.json` → `mod`. Chủ dự án xem `p2d_bao_cao`, gỡ khoá bằng cách sửa `p2d_cam_chat.den` về quá khứ.

## Ma Vương tuần (`data/demon.json`)

Phương Thiên Địa (`data/maps/phuong-thien-dia.json`, có `demon`) ở vòng ma khí trên tinh đồ, mở từ Đại Thừa, vào bằng xoáy truyền tống từ tinh đồ. Hai phòng hộ vệ rồi phòng Ma Vương. Mỗi tuần (tính từ thứ Hai `epoch`) Ma Vương là một boss trong `bosses` (mượn hình và đòn của boss gốc, đổi tên), máu và công lúc đầu ở `base`; mỗi Ma Vương bạn đã hạ thì con sau mạnh gấp `tier_mul` (quái hộ vệ cũng vậy), không hiện số, thưởng chỉ nhích `reward_tier` (Linh Thạch). Hạ xong thì tịnh hoá tới tuần sau. `src/game/demon.js` (`applyDemon` khi quái trong phòng hiện ra, `demonDone` khi hạ boss); lưu `save.demon { lv, week }`.

## Truyền âm (nhắn riêng)

`supabase/migrations/20261028100000_p2d_truyen_am.sql`: bảng `p2d_truyen_am` (người gửi, người nhận, nội dung tối đa 200 ký tự, đã đọc), chỉ đọc ghi qua hàm. `p2d_gui_truyen_am(mã chat, nội dung)`: người nhận gọi bằng mã chat 12 ký tự (`p2d_chat_key`, không lộ mã tài khoản), không tự gửi, người đang bị khoá chat không gửi được, 30 tin mỗi giờ. `p2d_doc_truyen_am(sau id)`: tin gửi và nhận trong 14 ngày, kèm mã và tên người bên kia. `p2d_da_doc_truyen_am(mã chat)`: đánh dấu đã đọc. Job `p2d-don-truyen-am` (2 giờ 47 sáng giờ Việt Nam) xoá tin quá 14 ngày; xoá tài khoản thì tin xoá theo khoá ngoại. Máy khách: `src/net/whisper.js`, `src/game/whisper.js` (gom theo người, đếm chưa đọc, lọc từ bậy, ẩn tin người bị chặn), tab Truyền âm ở bảng Đạo hữu (`src/ui/whisper-view.js`); chạm tin một người ở kênh Thế giới hoặc tông môn → Truyền âm. Có tin mới thì chấm đỏ ở nút Đạo hữu (đọc lại mỗi 30 giây, đang mở tab thì 5 giây). Chữ ở `data/social.json` → whisper.

## Chính sách, điều khoản, xoá tài khoản

Trang tĩnh `privacy.html`, `terms.html`, `xoa-tai-khoan.html` (chung `legal.css`), có đường dẫn ở màn đầu cùng dòng cảnh báo sức khoẻ 180 phút. Đổi cách thu, giữ dữ liệu thì sửa bảng ở `privacy.html` cho khớp.

Xoá tài khoản (`supabase/migrations/20261028060000_p2d_xoa_tai_khoan.sql`): nút "Xoá tài khoản" ở màn đầu (bấm hai lần) gọi `p2d_xin_xoa_tk` rồi đăng xuất; mỗi lần đăng nhập máy khách gọi `p2d_huy_xoa_tk` (đang chờ thì huỷ và báo). Job `p2d-xoa-tai-khoan` (3 giờ 37 sáng giờ Việt Nam) chạy `p2d_xoa_het_han`: quá 7 ngày thì `p2d_xoa_mot` nhường Tông chủ cho người vào lâu nhất (hoặc giải tán), xoá bản sao, nhật ký lỗi, khoá chat, báo cáo về người đó, bỏ tên khỏi báo cáo họ gửi, rồi xoá `auth.users` (bảng khác xoá theo khoá ngoại). Cùng job bỏ mã băm địa chỉ mạng đăng ký cũ hơn 2 ngày.

## Trọng điểm bồi dưỡng, cấp khó (luật 7 → 14 → 28)

- Tẩy luyện tăng giá: `data/items.json` → `reroll_fee`, `rerollFee` ở `src/game/items.js` (món lưu `rr`, `rrDay`).
- Cường hoá tới +20, mở dần theo cảnh giới (`data/gear.json` → `enhance.open`, `enhanceCap`), từ +11 tốn thêm Linh Thạch; máy chủ nhận 0–20 (`p2d_mon_hop_le`, migration 20261028080000).
- Ngọc tới cấp 10, phí ghép: `data/items.json` → `gems.merge_fee`, `gemMergeFee`.
- Ô Mũ (`data/items.json` → slots `mu`): 2 mũ thường (Bố Cân, Thiết Khôi) và 7 mũ bộ (rơi ở boss như các món bộ khác); biểu tượng vẽ ở `tools/art/gear.py` (`mu`). Trang bị giờ 6 ô (vũ khí, mũ, giáp, ngọc bội, giày, nhẫn) cộng ô pháp bảo.
- Luyện pháp bảo (`data/gear.json` → refine, `src/game/refine.js`): phân giải pháp bảo ra Mảnh Pháp Bảo theo độ hiếm (cả lúc tự hành phân giải), Túi → chọn pháp bảo → Luyện: bậc n lên n + 1 tốn ceil(3 × 1,35^n) mảnh, tối đa ★20; mỗi bậc chỉ số chính +6%, chiêu pháp bảo +5%. Bậc lưu ở `it.pb`, không đổi chỉ số đã lưu.
- Cấp chiêu: `data/config.json` → `skill_lv`, `src/game/skill-level.js` (`save.skillLv`), nút luyện ở bảng Chiêu. Bí Kíp Chiêu (`data/cave.json` → materials) rơi từ thưởng bí cảnh và rương việc hằng ngày.
- Đánh thường / chiêu: `data/config.json` → `combat` (`basicMul` ở `src/game/player.js`, hệ số chiêu ở `castSkill`).
- Cấp khó bí cảnh: `data/dungeon.json` (4 cấp × 10 bậc, `tier_mul` 2), `src/game/dun-mode.js` (`save.dunLv`, màu gợi ý `hintOf`). Tháp từ tầng 46: `data/tower.json` → `endless`.

## Mã khôi phục (quên mật khẩu)

Tài khoản dùng email ẩn nên không gửi thư được. Người chơi đã đăng nhập bấm "Mã khôi phục" ở màn đầu: `p2d_tao_ma_khoi_phuc` sinh mã 16 ký tự (bỏ I, O, 0, 1), máy chủ chỉ giữ mã băm (`p2d_khoi_phuc`); tạo mã mới thì mã cũ hết. Quên mật khẩu: nút "Quên mật khẩu?" hỏi tài khoản, mã, mật khẩu mới rồi gọi Edge Function `supabase/functions/khoi-phuc` (verify_jwt tắt, chỉ nhận từ trang game) → `p2d_dung_ma_khoi_phuc` (chỉ service_role; sai quá 5 lần mỗi giờ / 20 lần mỗi ngày trên một địa chỉ mạng thì chặn; đúng thì xoá mã, dùng một lần) → đặt mật khẩu mới. Migration `20261028090000_p2d_ma_khoi_phuc.sql`.
