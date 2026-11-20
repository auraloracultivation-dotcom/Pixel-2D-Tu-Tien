// Khẩu quyết lúc tung pháp bảo (data/tran-ma-ky.json → kq.doan, kq_bubble; docs/14-TRAN-MA-KY.md phần 2; chủ dự án 21/11/2026 03:16: "khẩu quyết triệu
// hồi… tôi rất thích cái cách họ chiến đấu"). Người tu ở Thiên Kiếm Tinh Hệ ra chiêu là hô quyết: mỗi loại pháp bảo một câu đoản quyết, hiện thành bong
// bóng trên đầu ngay nhịp tụ linh (src/game/tu-linh.js). Gọi trong phần hình dùng chung của tụ linh (dien.js) nên mình và người cùng tinh cầu đều thấy,
// không thêm tin mạng nào. Chỉ là hình: không đổi luật chơi. Bong bóng trò chuyện của người chơi (social.js) không bị đè.
import { tmkOn } from './tran-ma-ky.js';

export function hoQuyet(game, e, type) {
  const C = game.data['tran-ma-ky'], B = C?.kq_bubble, q = C?.kq?.doan?.[type];
  if (!q?.ho || !B?.on || !e || !tmkOn(game)) return;
  if (e.bubble && !e.bubble.kq) return;
  const now = game.time || 0;
  if (now - (e.kqAt ?? -99) < (B.gap ?? 0) || Math.random() >= (B.rate ?? 1)) return;
  e.kqAt = now;
  e.bubble = { text: q.ho, t: 0, sec: B.sec || 1.6, kq: 1 };
}
