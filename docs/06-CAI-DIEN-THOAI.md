# Cài game lên điện thoại và đưa lên CH Play

## 1. Bản cài thử ngay (không cần CH Play)

Game là trang web cài được (PWA). Mở https://auraloracultivation-dotcom.github.io/Pixel-2D-Tu-Tien/ trên điện thoại:

- Android (Chrome): bấm nút "Cài vào máy" dưới nút Chơi thử, hoặc menu ⋮ rồi "Cài đặt ứng dụng". Game có biểu tượng riêng, mở toàn màn hình.
- iPhone (Safari): bấm nút Chia sẻ, chọn "Thêm vào màn hình chính".

Sau lần mở đầu, game lưu file vào máy (`sw.js`), mất mạng vẫn mở được để chơi thử. Bản mới tự tải khi có mạng.

## 2. Bản thử nội bộ trên CH Play (cần chủ dự án làm)

CH Play nhận gói `.aab`. Cách nhanh nhất là bọc trang web thành ứng dụng Android (TWA) bằng PWABuilder:

1. Đăng ký Google Play Console (phí một lần 25 USD) bằng tài khoản của chủ dự án.
2. Vào https://www.pwabuilder.com, dán địa chỉ game, chọn Package for stores, chọn Android.
3. Đặt tên gói, ví dụ `io.github.auraloracultivation.tutien`. Tải về gói gồm file `.aab`, khoá ký `signing.keystore` và `assetlinks.json`.
4. **Giữ khoá ký ở chỗ an toàn, không đưa vào repo.** Mất khoá là không cập nhật được ứng dụng.
5. Play Console: tạo ứng dụng, vào Kiểm thử nội bộ, tải `.aab` lên, thêm email người thử.
6. Muốn ứng dụng mở không có thanh địa chỉ: `assetlinks.json` phải nằm ở `https://auraloracultivation-dotcom.github.io/.well-known/assetlinks.json`. Với trang con như hiện nay, cần tạo thêm repo `auraloracultivation-dotcom.github.io` chứa file đó, hoặc dùng tên miền riêng. Chưa làm bước này thì ứng dụng vẫn chạy, chỉ hiện thanh địa chỉ mỏng ở trên.

Ảnh chụp màn hình và trang giới thiệu nên chờ có hình pixel thật (bước 3 của lộ trình).
