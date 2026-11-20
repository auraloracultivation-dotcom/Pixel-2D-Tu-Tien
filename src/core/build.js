// Số phiên bản và đường dẫn của bản đang chạy (đợt làm nhẹ 20/11/2026). Bản đưa lên mạng được gói lại (tools/goi.mjs): nhiều tệp code nhập
// thành vài tệp, nên code không còn nằm đúng chỗ như trong kho. Vì vậy không tệp nào được tự suy đường dẫn hay số phiên bản từ vị trí của
// chính nó (import.meta.url) nữa: mọi đường dẫn tính từ gốc trang (thư mục chứa index.html), số phiên bản lấy ở đây.
// BUILD: 'dev' khi chạy ở máy; tools/goi.mjs thay bằng 8 ký tự mã bản lúc đưa lên.
export const BUILD = 'dev';

// Đường dẫn đầy đủ tới một tệp của game, path tính từ gốc trang ("src/ui/mung.css", "assets/art/x.png", "data/record.json").
// ver: kèm ?v=<bản> để máy không dùng tệp cũ trong bộ nhớ đệm sau khi có bản mới
export function goc(path, ver = true) {
  const u = new URL(path, document.baseURI);
  if (ver) u.searchParams.set('v', BUILD);
  return u.href;
}
