# Các phần của game (đánh số để chủ dự án gọi tên)

Chủ dự án chốt 13/11/2026 12:02: chia game thành các phần có số cố định. Sau này chủ dự án chỉ cần nói "nâng cấp phần 1",
"thay đổi phần 5", "thêm phần 24" là AI (đời nào cũng vậy) biết ngay phần đó gồm những gì, nằm ở đâu, luật nào phải giữ.
**Số không bao giờ đổi, không đánh lại.** Thêm phần mới thì lấy số kế tiếp. Bỏ một phần thì ghi "(đã bỏ)", giữ số.

Khi nhận việc theo số phần: đọc dòng của phần đó ở đây, mở các file liệt kê, đọc thêm `CLAUDE.md` và tài liệu ghi kèm, rồi mới làm.
Phần nào chạm tiền, cơ sở dữ liệu, xoá nội dung thì vẫn hỏi chủ dự án trước như luật trong `CLAUDE.md`.

Bảy phần đầu theo thứ tự chủ dự án để ý nhất.

| Số | Phần | Gồm | Nằm ở đâu |
|---|---|---|---|
| 1 | **Máy chủ** | Lưu tiến độ, đăng nhập, thời gian thực, phòng Cloudflare, đưa bản lên Vercel | `supabase/` (migration, Edge Function), `src/net/`, `tools/deploy-vercel.sh`, worker Cloudflare `p2d-phong`; `docs/03` mục máy chủ |
| 2 | **Chống hack** | Kiểm bản lưu ở máy chủ, nghi vấn, cờ đỏ, một tài khoản một máy, khoá đồng hồ | `src/game/cloud-guard.js`, `src/core/guard.js`, `src/game/net-watch.js`, migration `p2d_kiem_*`, bảng `p2d_nghi_van`, `p2d_co_do` |
| 3 | **Pháp bảo** | 8 loại pháp bảo, phẩm, cấp, đục ô, chiêu khảm, rơi đồ, bán / rã, đòn đánh và hiệu ứng của chúng | `data/phap-bao.json`, `src/game/phap-bao*.js`, `src/game/pb-px.js`, `src/render/draw-pb-px.js`, `src/ui/self-pb*.js`, `src/ui/phap-bao*`; hình món: `tools/art/pb_vat.py`; `tools/art/pfx/GHI-CHU.md` |
| 4 | **Xây tinh cầu** (khai hoang) | Tinh cầu riêng, mở đất, đường, công trình trên tinh cầu, bản đồ sao, bay giữa tinh cầu | `data/khai-hoang.json`, `data/planets.json`, `data/starmap.json`, `src/game/khai-hoang.js`, `src/game/kh-*.js`, `src/game/starmap.js`, `src/game/space-trip.js`, `src/ui/kh-*.js` |
| 5 | **Đồ hoạ công trình, trang trí** | Nhà, động phủ, đồ bày, cây cảnh, biểu tượng, nút (ảnh tĩnh: GPT của chủ dự án) | `data/home.json`, `data/cave.json`, `src/game/decor.js`, `src/game/home*.js`, `src/game/cave.js`, `tools/art/nguon/ai/`, `tools/art/ai_import.py`, `assets/art/`; `docs/02-CHUAN-PIXEL.md`, `docs/09-HINH-CAN-LAM.md` |
| 6 | **Vật sống**: nhân vật, NPC, quái, thú | Hình và cử động nhân vật, NPC, quái, linh thú, thú cưỡi, thú hoang (SpriteCook) | `data/heroes.json`, `data/npcs.json`, `data/mobs.json`, `data/pets.json`, `data/wildlife.json`, `src/render/draw-hero.js`, `draw-npc-sprite.js`, `draw-mob-sprite.js`, `draw-pet.js`; `docs/04-BANG-NHAN-VAT.md` |
| 7 | **Âm thanh** | Tiếng đòn, tiếng giao diện, nhạc nền | `data/sounds.json`, `data/tieng-chieu.json`, `src/core/audio.js`, `src/core/music*.js`, `src/core/synth.js`, `tools/sfx_chieu.py` |
| 8 | **Hiệu ứng chiêu thức** | Hiệu ứng điểm ảnh của chiêu, đòn, nổ, ánh sáng | `data/vfx.json`, `tools/art/pfx/` (PixelFX), `src/game/pfx.js`, `src/render/vfx/`, `src/game/skill-fx.js` |
| 9 | **Bản đồ, cảnh vật** | Đất, cây, sông hồ, thời tiết, ngày đêm, mùa | `data/maps/`, `data/tiles.json`, `data/weather.json`, `data/daynight.json`, `src/world/`, `src/render/draw-sky.js`, `draw-weather.js` |
| 10 | **Cốt truyện, nhiệm vụ** | Truyện chính, thoại NPC, nhật ký, nhiệm vụ | `data/story.json`, `data/journal.json`, `data/daily.json`, `src/game/story.js`, `src/game/journal.js`; `docs/01-HUONG-DI.md` |
| 11 | **Hệ Thống Tu Tiên** | Nhân vật Hệ Thống, nhiệm vụ hệ thống, triệu hồi, hỏi đáp | `data/he-thong.json`, `src/game/he-thong.js`, `src/ui/he-thong*.js`, `src/net/he-thong.js` |
| 12 | **Chiến đấu, chiêu, công pháp** | Đánh thường, chiêu, nộ, công pháp, chỉ số, lực chiến | `data/skills.json`, `data/techniques.json`, `src/game/combat.js`, `src/game/skill*.js`, `src/game/stats.js`, `src/game/power-pop.js` |
| 13 | **Tu luyện** | Cảnh giới, đả tọa, linh khí, độ kiếp, linh căn | `data/realms.json`, `data/elements.json`, `src/game/mana.js`, `src/game/tribulation.js`, `src/game/reroot.js`, `src/game/retreat.js` |
| 14 | **Trang bị, đồ, đan dược** | Túi đồ, trang bị, cường hoá, tẩy luyện, ngọc khảm, luyện đan | `data/items.json`, `data/gear.json`, `src/game/items.js`, `enhance.js`, `refine.js`, `special-pills.js`, `src/ui/bag*.js`, `src/ui/self-*.js` |
| 15 | **Kinh tế** | Linh Thạch, Tiên Ngọc, cửa hàng, chợ, nạp tiền | `data/shop.json`, `data/market.json`, `data/topup.json`, `src/game/shop.js`, `market.js`, `topup.js`, `src/net/market.js` (đụng là hỏi chủ dự án) |
| 16 | **Bí cảnh, boss** | Bí cảnh, tháp, boss thế giới, Thôn Thiên Mãng, Thiên Ma, vùng ma khí Ngoại Vực | `data/dungeon.json`, `data/worldboss.json`, `data/thien-mang.json`, `data/demon.json`, `src/game/dun*.js`, `worldboss.js`, `thien-mang.js`, `thienma.js` |
| 17 | **Xã hội, PvP** | Trò chuyện, bạn bè, tông môn, đạo lữ, tổ đội, so tài, PvP | `data/social.json`, `data/guild.json`, `data/party.json`, `data/pvp.json`, `data/duel.json`, `src/game/guild.js`, `friends.js`, `party*.js`, `daolu.js`, `pvp.js`, `duel*.js`, `src/ui/chat-*.js` |
| 18 | **Giao diện** | Nút trên màn hình, bảng, khung, chữ, bố cục điện thoại | `src/ui/`, `style*.css`, `data/menu.json`, `index.html` (không logic) |
| 19 | **Tự động, treo game** | Tự đánh, tự hành, tự mặc đồ, tắt màn, nhận thưởng lúc vắng, tự vào lại | `src/game/auto*.js`, `pilot*.js`, `offline.js`, `src/ui/man-toi.js`, `src/ui/tu-vao.js` |
| 20 | **Sự kiện, lễ hội** | Điểm danh, lễ hội, giới thiệu bạn, mùa giải, thông báo | `data/events.json`, `data/le-hoi.json`, `data/checkin.json`, `data/referral.json`, `data/notice.json`, `src/game/season.js`, `events.js`, `checkin.js` |
| 21 | **Ngôn ngữ** | Tiếng Việt gốc, tiếng Anh, tiếng Trung phồn thể | `data/i18n/`, `src/core/i18n.js` |
| 22 | **Nhẹ máy** | Khung hình, độ phân giải, máy nóng, pin | `src/core/perf.js`, `data/config.json → perf`, `src/game/fx-budget.js` |
| 23 | **Vận hành** | Báo lỗi, đề xuất, lỗi máy người chơi, đo người chơi (PostHog), báo cáo hằng ngày | `src/ui/feedback*.js`, `src/net/feedback.js`, `src/net/errlog.js`, `src/net/analytics.js`, `p2d_gop_y`, `p2d_loi`; `docs/07-PHAN-VIEC.md` |
| 24 | **Động phủ** (cách chơi) | Nhà riêng: bày đồ, bể cá, khách ghé thăm, thăm nhà bạn (hình đồ vật thuộc phần 5) | `data/home.json`, `data/cave.json`, `data/visitors.json`, `src/game/home*.js`, `cave.js`, `be-ca.js`, `visitors.js`, `src/ui/cave-panel.js` |
| 25 | **Bạn đồng hành, đạo lữ NPC** | Thiện cảm, tặng quà, đi cùng, khen, cổ vũ lúc đánh, kỷ niệm | `data/affinity.json`, `data/praise.json`, `src/game/affinity.js`, `praise.js`, `cheer.js`, `anniv.js` |
| 26 | **Câu cá, vườn** | Câu cá, trồng cây, thu hoạch | `data/fishing.json`, `data/garden.json`, `src/game/fishing.js`, `garden.js`, `src/ui/garden-tab.js` |
| 27 | **Linh thú, thú cưỡi, khôi lỗi** (cách chơi) | Bắt, nuôi, tiến hoá, chiêu linh thú, cưỡi (hình thuộc phần 6) | `data/pets.json`, `src/game/pets.js`, `beast*.js`, `evolve.js`, `home-pets.js`, `src/ui/pets-panel.js` |
| 28 | **Thành tựu, xếp hạng, Đạo Vận, thời trang** | Thành tựu, bảng xếp hạng, bộ Đạo Vận, áo thời trang | `data/daovan.json`, `data/fashion.json`, `src/game/achieve.js`, `rank.js`, `daovan.js`, `fashion.js`, `src/net/rank.js` |
| 29 | **Quay clip, chia sẻ** | Nút quay video trong game, xem lại, chia sẻ TikTok, nhóm Zalo | `data/record.json`, `data/community.json`, `src/game/record*.js`, `src/core/recorder*.js`, `src/ui/record-panel.js`, `src/ui/zalo.js` |
| 30 | **Người mới** | Màn mở đầu, chọn giới tính, hướng dẫn, mũi tên chỉ việc, mẹo | `data/man-dau.json`, `data/gender.json`, `data/hints.json`, `src/ui/man-dau.js`, `src/game/guide.js`, `src/ui/hints.js`, `src/ui/login.js` |
