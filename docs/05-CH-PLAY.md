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

**Tên ứng dụng** (tối đa 30 ký tự): `Pixel 2D Tu Tiên`

**Mô tả ngắn** (tối đa 80 ký tự)
- Tiếng Việt: `Tu tiên pixel ấm: đánh quái, độ kiếp, tự hành, đạo lữ, động phủ yên bình.`
- English: `Cozy pixel cultivation RPG: fight, ascend, auto-play and find a Dao partner.`

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
