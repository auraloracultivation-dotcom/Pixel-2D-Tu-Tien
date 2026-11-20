# Máy chủ phòng Cloudflare (p2d-phong)

Chủ dự án chốt 06/11/2026: phần "thấy nhau" (vị trí, chào hỏi, hiệu ứng chiêu, thú cưỡi, tổ đội bí cảnh, sau này boss thế giới) chạy trên
Cloudflare Workers + Durable Objects thay Supabase Realtime. Lý do: Supabase đếm mỗi tin phát cho từng người nhận (tuần 29/10–05/11 dùng
gần 20 triệu tin / 5 triệu gói Pro), còn Cloudflare không tính tin phát xuống, chỉ tính tin gửi lên (20 tin = 1 yêu cầu) và thời gian phòng thức.
Supabase vẫn giữ tài khoản, lưu game, chống hack, chat, truyền âm.

## Cách chạy

- `src/index.js`: cổng `GET /ws?r=<phòng>&l=<tuyến>` (WebSocket). Vé đăng nhập Supabase trong `Sec-WebSocket-Protocol: p2d, <jwt>`,
  kiểm chữ ký ES256 bằng khoá công khai JWKS của Supabase (`src/auth.js`), không gọi về Supabase mỗi lần.
- `src/phong.js`: Durable Object `Phong`, một phòng = một tuyến bản đồ `dao:<map>#<tuyến>` (tối đa 40 người) hoặc một tổ đội `to:<mã>` (6).
  Phòng đầy đóng mã 4009, máy khách tự sang tuyến kế (tối đa 60 tuyến = 2.400 người một bản đồ).
  Vị trí, chào hỏi, chiêu gom 200 ms một gói. Tổ đội chuyển tiếp ngay. Giới hạn tốc độ mỗi kết nối (phòng bản đồ 15 tin mỗi giây: đủ cho người đang giao chiến gửi vị trí 5 lần mỗi giây cùng đòn và chiêu), vượt thì bỏ tin, gửi dồn dập kéo dài bị đóng 4008. Thử tải trận đông người: `node tools/cloud/tai-chien.mjs` (đồng hồ giả, có đòn PvP).
  WebSocket Hibernation: không ai gửi gì thì phòng ngủ, không tính thời gian chạy; "ping" → "pong" Cloudflare tự trả.
- `src/proto.js`: phần thuần (kiểm phòng, làm sạch tin, thùng token, gói lô). Bài thử: `node tools/cloud/phong.test.mjs`.
- `src/ho-so-truong.js`: TỆP SINH RA từ `data/dong-bo.json` → `ho_so` (bảng "người khác thấy gì"), không sửa tay. `proto.js` `cleanProf` chỉ giữ các trường trong đó. Sửa bảng xong chạy `node tools/dong-bo.mjs --ghi`; `tools/check.mjs` báo đỏ nếu bản sao lệch bảng. Cloudflare đóng gói riêng thư mục `cloud/` nên máy chủ phòng không đọc thẳng `data/` (cùng cách `mang-cfg.js` là bản sao của `data/thien-mang.json`).
- Bài thử hai máy `node tools/hai-may.mjs` chạy đúng `src/phong.js` trong Node (`tools/cloud/phong-gia.mjs`) nối với hai trình duyệt thật: mỗi trường hồ sơ, mỗi nhóm tin hiệu ứng phải tới máy bên kia.

Máy khách: `src/net/phong-ws.js`, `online-cf.js`, `party-cf.js`; bật bằng `data/config.json` → `realtime.backend = "cf"` và `cf_url`.

## Đưa lên

Cloudflare Workers Builds nối với kho GitHub này, thư mục gốc `cloud`: mỗi lần gộp vào `main`, Cloudflare tự chạy `npx wrangler deploy`.
Không có khoá bí mật nào trong kho (Supabase chỉ cần địa chỉ công khai để lấy JWKS).

## Chi phí ước tính (gói Workers Paid 5 đô/tháng)

Mỗi phòng thức cả ngày ≈ 324.000 GB-giây ≈ 4 đô/tháng sau phần miễn phí 400.000 GB-giây. 1.000 người online giờ cao điểm (khoảng 25 tuyến)
+ ~200 người các giờ khác: ≈ 2,7 triệu GB-giây + ~20 triệu yêu cầu ≈ 35–40 đô/tháng tổng. Vài chục người: gần như chỉ 5 đô.
