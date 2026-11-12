// Chỉ chơi, đăng nhập ở tên miền chính (chủ dự án 12/11/2026 16:32: "gỡ toàn bộ link đăng nhập ngoại trừ pixel2dtutien.com").
// Mở game ở địa chỉ khác (*.vercel.app, bản GitHub Pages cũ, bản đưa lên riêng lẻ của Vercel) thì chuyển ngay về www.pixel2dtutien.com,
// giữ nguyên đường dẫn và tham số. localhost / 127.0.0.1 để chạy thử trong máy làm việc. Tên miền Vercel cũng tự chuyển hướng (308).
const MAIN = 'www.pixel2dtutien.com';
const OK = [MAIN, 'pixel2dtutien.com', 'localhost', '127.0.0.1'];

const h = location.hostname;
if (h && !OK.includes(h) && location.protocol.startsWith('http')) {
  location.replace('https://' + MAIN + location.pathname.replace(/^\/pixel-2d-tu-tien(?=\/|$)/, '') + location.search + location.hash);
  throw new Error('chuyen_ten_mien');   // dừng nạp game ở địa chỉ cũ
}
