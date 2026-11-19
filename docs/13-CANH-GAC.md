# Canh gác máy chủ và quy trình áp migration

Chủ dự án chốt 20/11/2026 00:12 ("Làm đi"), sau vụ 19/11/2026: thêm phẩm Tiên / Thượng Cổ nhưng hàm lưu `p2d_luu` vẫn chỉ nhận 5 phẩm cũ,
người cầm món phẩm mới không lưu được suốt 8 tiếng (~7 100 lần lưu bị từ chối), không ai hay tới khi người chơi kêu.

## 1. Máy chủ tự canh (không dùng Claude)

`pg_cron` chạy `p2d_canh_gac()` mỗi 5 phút (migration `20261120001500_p2d_canh_gac.sql`). Bình thường không làm gì; vượt ngưỡng thì
ghi một dòng vào `p2d_bao_dong` (`loai`, `so`, `chi_tiet`, `xem_luc` để trống tới khi đã xem):

| loai | Ngưỡng |
|---|---|
| `luu_hong` | ≥ 2 người gặp lỗi "luu: ..." (máy chủ chê bản lưu; máy khách gửi vào `p2d_loi` một lần mỗi phiên) trong 3 giờ (thử lại số 19/11: báo lúc ~07:25 UTC, 17 phút sau lỗi đầu, thay vì 8 tiếng; các ngày trước 0 lần) |
| `js_loi` | cùng một lỗi JavaScript ở ≥ 5 người trong 30 phút |
| `khong_ai_luu` | ≥ 5 người online (`p2d_nhip` 5 phút) mà không ai lưu được (`luu_luc`) trong 15 phút |

Một việc theo lịch (phiên Claude riêng, mỗi 30 phút) chỉ đọc `p2d_bao_dong` chưa xem: không có thì dừng ngay; có thì báo về điện thoại
chủ dự án, tìm nguyên nhân, chuẩn bị bản sửa, ghi `xem_luc`. Áp lên / đưa lên vẫn chờ lời chủ dự án; riêng lỗi làm mất dữ liệu được lùi
về bản trước ngay (mục 3).

## 2. Bài thử bắt buộc trước khi áp migration

```
node tools/kiem/thu-luu.mjs   # in SQL, dán vào execute_sql
```

SQL chạy trong một giao dịch có ROLLBACK: đóng vai tài khoản thử `claude_kiem` (bảng Người chơi bỏ qua tài khoản `claude_*`), gọi `p2d_luu2`
với túi đồ đủ mọi phẩm trong `data/items.json → rarities`. Đạt khi trả về `{"pb": ...}` (món chưa ký bị gỡ trong `sua.roi` là đúng luật);
lỗi như `do_sai` là trượt, không áp. Không gì được ghi lại. Không gửi món chưa ký qua mạng thật: bộ chống hack khoá tài khoản ngay
(20/11/2026 00:2x tài khoản thử đã bị khoá đúng như vậy, bằng chứng bộ chống hack chạy). Chạy cả TRƯỚC khi áp (máy chủ cũ phải nhận dữ liệu
máy khách mới) và SAU khi áp. Thêm loại dữ liệu mới (phẩm, loại món, khoá trong bản lưu) thì tìm mọi hàm máy chủ còn danh sách cứng loại đó
(`pg_get_functiondef ... like`) trước khi viết migration.

## 3. Áp xong: theo dõi 10 phút, hỏng thì lùi

- Trước khi áp: chép định nghĩa cũ của mọi hàm migration thay (`select pg_get_functiondef('public.<hàm>'::regproc)`) vào nháp.
- Áp xong: chạy lại bài thử mục 2, thử đăng ký + đăng nhập tài khoản mới, xem `p2d_bao_dong` và `p2d_loi` 10 phút.
- Lưu hỏng tăng vọt (mất dữ liệu): áp lại định nghĩa cũ ngay, rồi báo chủ dự án.

## 4. Người chơi không thoát game khi chưa lưu được

Máy chủ chê bản lưu thì máy khách hiện băng đỏ đứng yên "Chưa lưu được lên máy chủ. Đừng thoát game…" tới khi lưu lại được
(`src/game/cloud-guard.js` stuck, chữ ở `data/config.json → guard.texts.stuck`); trên máy tính, tắt trang lúc đó trình duyệt hỏi lại.

## 5. Số "người vào" đọc từ `luu_luc`

`updated_at` đổi cả khi máy chủ sửa hàng loạt (migration), nên mọi bảng đếm người chơi đọc `luu_luc` (lần máy người chơi tự lưu).

## 6. Giờ chơi

Từ 20/11/2026 (`20261120011000_p2d_gio_choi.sql`): giờ chơi = `p2d_nhan_vat.choi_giay` (mốc nền, đã bù số quái ÷ 6 cho tài khoản không cờ đỏ)
+ `p2d_nhip.tong` (giây còn liên lạc theo nhịp sống). Mọi chỗ đọc gọi `p2d_choi_giay(uid)`; trigger `p2d_dem_choi` không cộng nữa.
