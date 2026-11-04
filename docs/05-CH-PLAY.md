# 05. Chuẩn bị lên CH Play

Soạn 28/10/2026 theo yêu cầu chủ dự án ("chuẩn bị CH Play"). Phần đã làm sẵn ở repo, phần chủ dự án phải tự làm (cần tài khoản, tiền, giấy tờ, quyết định không đổi được) ghi rõ ở mục 4.

## 1. Đã có sẵn

| Mục | Ở đâu | Ghi chú |
| --- | --- | --- |
| Biểu tượng 512×512 (PNG 32 bit, vuông kín) | `store/icon-512.png` | Vẽ bằng code (`tools/art/store.py`): đảo bay, nhà mái ngói, hoa đào, kiếm bay. Phương án thay biểu tượng hiện tại `assets/icon/icon-512.png`, ảnh đó trông như ảnh tạo bằng AI, không rõ nguồn: chủ dự án chọn dùng cái nào (xem mục 4). |
| Ảnh bìa 1024×500 (PNG 24 bit) | `store/feature-1024x500.png` | Vẽ bằng code từ chính hình trong game, chữ tên game. |
| 6 ảnh chụp màn hình 1080×1920 (dọc 9:16) | `store/screens/` | Thiên Kiếm Phong, đánh quái ở Xích Diễm, Hàn Băng, Làng Tinh Linh, Động phủ, Tinh đồ. Đủ điều kiện quảng bá khổ lớn (game cần ít nhất 3 ảnh 1080×1920). |
| Chính sách quyền riêng tư | `privacy.html` → https://auraloracultivation-dotcom.github.io/Pixel-2D-Tu-Tien/privacy.html | |
| Điều khoản | `terms.html` | |
| Xoá tài khoản (CH Play bắt buộc có đường link) | `xoa-tai-khoan.html` → https://auraloracultivation-dotcom.github.io/Pixel-2D-Tu-Tien/xoa-tai-khoan.html | |
| Ứng dụng web cài được (PWA) | `manifest.webmanifest`, `sw.js` | Dọc, toàn màn hình, có biểu tượng 192/512 và bản maskable. |
| Nạp tiền | `data/topup.json` | Đang khoá (`open: false`). Khi mở phải dùng Google Play Billing, máy chủ xác minh hoá đơn; không thu tiền ngoài CH Play cho đồ trong game. |

Chạy lại ảnh: `python3 -I tools/art/build.py && python3 -I tools/art/store.py`; ảnh chụp màn hình chụp bằng Playwright ở khung 360×640, tỉ lệ điểm ảnh 3.

## 2. Nội dung trang cửa hàng (dán vào Play Console)

Game có ba ngôn ngữ (05/11/2026): tiếng Việt (gốc), English, 繁體中文. Trong Play Console thêm bản dịch trang cửa hàng cho `en-US` và `zh-TW` (dán phần tương ứng bên dưới); tên trong game cũng đổi theo ngôn ngữ (`data/i18n/`).

**Tên ứng dụng** (tối đa 30 ký tự): `Pixel 2D Tu Tiên` · English: `Pixel 2D Cultivation` · 繁體中文: `像素2D修仙`

**Mô tả ngắn** (tối đa 80 ký tự)
- Tiếng Việt: `Tu tiên pixel ấm: đánh quái, độ kiếp, tự hành, đạo lữ, động phủ yên bình.`
- English: `Cozy pixel cultivation RPG: fight, ascend, auto-play and find a Dao partner.`
- 繁體中文: `溫馨像素修仙RPG：打怪、渡劫、自動修煉、結道侶、經營洞府。`

**Mô tả đầy đủ** (tiếng Việt)

> Bước vào Thiên Kiếm Tinh Hệ, một thế giới tu tiên vẽ bằng pixel ấm áp. Từ một đệ tử ngoại môn ở Thanh Khê, bạn tu từ Luyện Khí tới Độ Kiếp, bay qua tám tinh cầu: núi lửa Xích Diễm, băng nguyên Hàn Băng, rừng già Thanh Mộc, bãi mộ kiếm Thiên Kim…
>
> ⚔️ Đánh quái, mở bí cảnh, hạ boss, leo tháp, luận võ.
> ⚡ Độ thiên kiếp: né sét, chém tâm ma để đột phá cảnh giới.
> 🤖 Tự hành: bận thì bật, nhân vật tự làm việc, đánh quái, đả tọa, câu cá.
> 💞 Đạo lữ đi cùng, trò chuyện, khen bạn khi đánh; kết đạo lữ, song tu, nấu ăn, ngắm hoàng hôn.
> 🏡 Động phủ của riêng bạn: dược viên, luyện đan, rèn đồ, linh thú, linh cầm.
> 🏮 Mỗi tối một tinh cầu mở hội đèn, gặp đạo hữu khác, lập tông môn, trò chuyện.
> 🎒 Trang bị, ngọc, cường hoá, tẩy luyện, bộ Đạo Vận theo ngũ hành.
>
> Toàn bộ hình, nhạc, tiếng trong game đều vẽ và tổng hợp bằng code. Chơi thử không cần tài khoản; đăng ký để lưu tiến trình và chơi cùng người khác.

**Full description** (English)

> Step into the Heavenly Sword Star System, a warm pixel-art cultivation world. Starting as a young disciple from Clearbrook, you cultivate from Qi Refining to Tribulation Transcendence and fly across eight planets: the volcanoes of Crimson Flame, the ice plains of Frost Star, the ancient forest of Verdant Wood, the sword tomb of Heavenly Gold…
>
> ⚔️ Fight monsters, clear secret realms, defeat bosses, climb the tower, spar in the arena.
> ⚡ Face the heavenly tribulation: dodge lightning and slay your heart demon to break through.
> 🤖 Auto-Quest: busy? Turn it on and your character quests, fights, meditates and fishes on their own.
> 💞 Companions travel with you, chat and cheer you on; become Dao Companions, dual cultivate, cook together, watch the sunset.
> 🏡 Your own cave abode: herb garden, alchemy, forging, spirit beasts.
> 🏮 Lantern festivals each night on a different planet: meet fellow Daoists, found a sect, chat.
> 🎒 Gear, gems, enhancement, rerolling, and Five Elements Dao Rhyme sets.
>
> All art, music and sound in the game are drawn and synthesized with code. Play as a guest without an account; sign up to save progress and play with others. Available in English, 繁體中文 and Tiếng Việt.

**完整說明**（繁體中文）

> 踏入天劍星系，一個溫暖的像素修仙世界。你從清溪村的少年弟子出發，由練氣一路修到渡劫，御劍飛越八顆星球：赤焰的火山、寒冰的冰原、青木的古林、天金的劍塚……
>
> ⚔️ 打怪、闖秘境、擊敗首領、爬塔、論武切磋。
> ⚡ 渡天劫：閃避雷擊、斬殺心魔，突破境界。
> 🤖 自動任務：忙的時候打開，角色自己做任務、打怪、打坐、釣魚。
> 💞 同伴隨行、聊天、為你喝采；結為道侶、雙修、一起做飯、看夕陽。
> 🏡 專屬洞府：藥園、煉丹、鍛造、靈獸。
> 🏮 每晚一顆星球舉辦燈會：結識道友、創立宗門、聊天交流。
> 🎒 裝備、寶石、強化、洗煉，以及依五行配套的道韻套裝。
>
> 遊戲中所有圖像、音樂與音效皆以程式繪製與合成。不需帳號即可試玩；註冊後可保存進度並與他人同玩。支援繁體中文、English、越南語。

**Thể loại**: Trò chơi → Nhập vai (Role Playing). Thẻ gợi ý: pixel, tu tiên, nhập vai, nhàn rỗi/tự động.

## 3. Bản nháp các bảng khai bắt buộc

**Xếp hạng nội dung (IARC)**: bạo lực kiểu giả tưởng nhẹ (đánh quái hoạt hình, không máu me); người dùng tương tác với nhau (trò chuyện, nhắn riêng, tông môn); không cờ bạc ăn tiền thật; mua đồ trong ứng dụng: chưa (khi mở nạp thì khai "có").

**Đối tượng**: 13 tuổi trở lên. Không chọn nhóm dưới 13 (game có trò chuyện giữa người lạ và sẽ có nạp tiền), tránh phải theo chương trình Gia đình.

**An toàn dữ liệu (Data safety)**:
| Loại dữ liệu | Thu thập | Mục đích | Bắt buộc |
| --- | --- | --- | --- |
| Địa chỉ email | Có (khi đăng ký) | Quản lý tài khoản, khôi phục | Không (chơi thử không cần) |
| ID người dùng | Có | Lưu tiến trình, chơi trực tuyến | Có khi đăng ký |
| Tin nhắn trong ứng dụng (trò chuyện, truyền âm) | Có | Tính năng xã hội, chặn và báo cáo | Không |
| Hoạt động trong ứng dụng (tiến trình chơi) | Có | Lưu, xếp hạng, chống gian lận | Có khi đăng ký |
| Nhật ký lỗi | Có | Sửa lỗi (`src/core/catch-errors.js`) | Không |

Không chia sẻ cho bên thứ ba (Supabase là đơn vị xử lý dữ liệu thay mình, không tính là chia sẻ). Mã hoá khi truyền (HTTPS). Người dùng xin xoá được (trang xoá tài khoản). Không quảng cáo.

## 4. Chủ dự án cần làm (theo thứ tự)

1. **Tạo tài khoản Google Play Console** (phí một lần 25 USD, xác minh danh tính). Tài khoản cá nhân tạo sau 13/11/2023 phải **chạy thử kín với ít nhất 12 người thử, liên tục 14 ngày** rồi mới xin lên bản chính thức. Nên gom sẵn 12 người (bạn bè, người chơi thử) có Gmail.
2. **Chọn tên gói** (không đổi được sau khi đăng), đề xuất: `com.auralora.tutien`.
3. **Chọn cách đóng gói** (đổi kiến trúc, cần chủ dự án chốt):
   - **TWA (Bubblewrap), đề xuất**: ứng dụng Android mở thẳng trang game, cập nhật web là người chơi có ngay, không phải đăng bản mới. Cần đặt file `/.well-known/assetlinks.json` ở gốc tên miền: tạo thêm repo `auraloracultivation-dotcom.github.io` (trang GitHub Pages của tài khoản) hoặc dùng tên miền riêng.
   - **Capacitor**: gói sẵn file game trong ứng dụng, không cần tên miền; mỗi lần sửa game phải đăng bản mới lên CH Play.
4. **Khoá ký ứng dụng**: dùng Play App Signing (Google giữ khoá chính). Khoá tải lên tạo một lần, cất kỹ; nếu build trên GitHub Actions thì chủ dự án tự thêm khoá vào GitHub Secrets (không đưa vào repo).
5. **Chọn biểu tượng**: `store/icon-512.png` (vẽ bằng code) hay ảnh hiện tại `assets/icon/icon-512.png`.
6. Mở game trên điện thoại thật một lượt: đăng ký, khôi phục mã, nút di chuyển, tiếng.

Nguồn: [Yêu cầu thử nghiệm cho tài khoản cá nhân mới](https://support.google.com/googleplay/android-developer/answer/14151465), [Yêu cầu hình ảnh trang cửa hàng](https://support.google.com/googleplay/android-developer/answer/9866151).

## 5. Đóng gói Android (TWA)

Đã chốt: **Trusted Web Activity bằng Bubblewrap**, nhắm **API 36** (CH Play bắt buộc cho ứng dụng mới từ 31/08/2026), dọc, toàn màn hình. Ứng dụng mở thẳng trang game trên GitHub Pages, sửa web là người chơi có ngay, chỉ phải đăng bản mới khi đổi biểu tượng, tên, màu hoặc tên gói.

| Tệp | Việc |
| --- | --- |
| `android/twa-manifest.json` | Cấu hình duy nhất: **tên gói** (`packageId`, đang là `com.auralora.tutien`, đổi được tới trước lần tải lên đầu tiên), tên, biểu tượng, màu, số phiên bản (`appVersionCode`, `appVersion`). |
| `.github/workflows/android.yml` | Sinh dự án Android và build AAB + APK trên GitHub Actions (không lưu dự án Gradle trong repo). |
| `android/assetlinks.template.json`, `tools/assetlinks.mjs` | Tạo tệp `assetlinks.json` chứng minh ứng dụng và trang game cùng một chủ. |

### Build

Trên điện thoại: GitHub → repo → **Actions** → **Đóng gói Android** → **Run workflow** → chọn `main` → **Run workflow**. Chờ khoảng 5–10 phút, mở lượt chạy, kéo xuống **Artifacts**, tải tệp `tu-tien-android-…` (có `.aab` để tải lên CH Play, `.apk` để cài thử, `fingerprint.txt`). Hoặc gắn thẻ `android-vX.Y.Z` để tự chạy.

- Tên tệp có chữ **`unsigned-test`**: chưa có khoá thật, ký bằng khoá dùng một lần, chỉ để cài thử, **không tải lên CH Play**.
- Tên tệp có chữ **`signed`**: ký bằng khoá tải lên của chủ dự án, tải lên CH Play được.
- Mỗi lần đăng bản mới phải tăng `appVersionCode` (1 → 2 → 3…) và `appVersion` trong `android/twa-manifest.json`.

### Thêm khoá ký vào GitHub (làm một lần, từ điện thoại)

Khoá tải lên (upload key) là tệp `.keystore`; Google giữ khoá chính qua Play App Signing. Mất khoá tải lên thì xin Google đổi được, nhưng vẫn phải cất kỹ.

1. **Tạo khoá** (chỉ làm một lần). Không có máy tính thì dùng app **Termux** trên Android (cài từ F-Droid), gõ `pkg install openjdk-17`; có máy tính có Java thì dùng luôn. Chạy:
   `keytool -genkeypair -v -keystore upload.keystore -storetype PKCS12 -alias upload -keyalg RSA -keysize 2048 -validity 10000`
   Đặt mật khẩu chỉ gồm chữ và số (không dùng dấu nháy, `$`, khoảng trắng). Cất tệp và mật khẩu ở chỗ an toàn (Google Drive riêng, trình quản lý mật khẩu).
2. **Đổi tệp khoá thành chữ (base64)**: trên máy đó chạy `base64 -w0 upload.keystore > upload.txt` (macOS: `base64 -i upload.keystore -o upload.txt`), mở `upload.txt`, sao chép toàn bộ.
3. Trên điện thoại mở trình duyệt (bật "Trang web cho máy tính" nếu app GitHub không có mục này): github.com → repo **Pixel-2D-Tu-Tien** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
4. Tạo lần lượt 4 secret (tên gõ đúng chữ hoa):
   - `ANDROID_KEYSTORE_BASE64`: dán nội dung `upload.txt`.
   - `ANDROID_KEYSTORE_PASSWORD`: mật khẩu kho khoá.
   - `ANDROID_KEY_ALIAS`: `upload` (bí danh đã đặt ở bước 1).
   - `ANDROID_KEY_PASSWORD`: mật khẩu khoá (PKCS12 thì giống mật khẩu kho).
5. Chạy lại **Đóng gói Android**: tệp giờ có chữ `signed`. Không bao giờ đưa tệp khoá hay mật khẩu vào repo.

### Lấy dấu vân tay SHA-256

Cần hai dấu vân tay:
- **Khoá tải lên**: mở lượt chạy Actions đã `signed`, phần Summary (hoặc tệp `fingerprint.txt`) có dòng `SHA256: AA:BB:…`.
- **Khoá Play App Signing** (Google giữ, máy người chơi thấy khoá này): sau khi tải AAB đầu tiên lên Play Console → **Kiểm thử và phát hành** → **Thiết lập** → **Toàn vẹn ứng dụng** → **Ký ứng dụng** → sao chép "Dấu vân tay chứng chỉ SHA-256". Trang này cũng có sẵn đoạn Digital Asset Links JSON để chép.

Tạo tệp: `node tools/assetlinks.mjs <SHA256 khoá tải lên> <SHA256 khoá Play> > assetlinks.json` (tên gói lấy từ `android/twa-manifest.json`).

### Đặt `assetlinks.json` ở đâu

TWA đòi tệp ở **gốc tên miền**: `https://<tên miền>/.well-known/assetlinks.json`. Thiếu tệp này ứng dụng vẫn chạy nhưng hiện thanh địa chỉ trình duyệt ở trên (không toàn màn hình). Gốc của `auraloracultivation-dotcom.github.io` không thuộc repo game, nên chọn một trong hai:

1. **Repo trang tài khoản** (miễn phí, không cần tên miền): tạo repo công khai tên đúng `auraloracultivation-dotcom.github.io`, thêm tệp `.well-known/assetlinks.json` và một tệp rỗng `.nojekyll` (để GitHub Pages không bỏ thư mục bắt đầu bằng dấu chấm), bật Pages từ nhánh `main`. Kiểm tra mở được `https://auraloracultivation-dotcom.github.io/.well-known/assetlinks.json`. Không phải đổi gì trong repo game.
2. **Tên miền riêng** (mua tên miền, ví dụ `tutien.vn`): trỏ tên miền vào GitHub Pages của repo game (Settings → Pages → Custom domain). Game lúc đó nằm ở gốc tên miền nên tệp để luôn trong repo game ở `.well-known/assetlinks.json`; cần thêm `.well-known` vào dòng `cp -r` của `.github/workflows/pages.yml` (cách đưa lên hiện tại dùng artifact, không qua Jekyll, nên thư mục dấu chấm vẫn được đăng). Đổi `host`, `startUrl` (`/`), `fullScopeUrl`, `webManifestUrl`, `iconUrl` trong `android/twa-manifest.json` theo tên miền mới rồi build lại.

Nguồn: [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), [Yêu cầu API đích của CH Play](https://support.google.com/googleplay/android-developer/answer/11926878), [Digital Asset Links cho TWA](https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs#digital-asset-links).
