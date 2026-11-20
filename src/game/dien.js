// Hiệu ứng "chỉ để nhìn" viết MỘT lần cho cả mình lẫn người khác (đợt dọn 20/11/2026). Trước đây hiệu ứng nào cũng viết bản của mình
// trước, rồi mới nhớ viết thêm tin báo và bản cho máy người xem; quên là "quay video mà lúc người ta đột phá lại không xem được".
//   hieuUng('tu-linh', { gap: 0.15, ve(game, e, h, a, b) { … } })   khai một hiệu ứng (lúc nạp tệp). e: thân người đang diễn (chỗ đứng,
//       hướng nhìn), h: hồ sơ ngoại hình của họ (data/dong-bo.json). Mình: game.player và game.hoSo; người khác: bản đang thấy của họ.
//   dien(game, 'tu-linh', a, b)   gọi MỘT lần ở chỗ việc xảy ra: máy mình diễn ngay, người cùng tinh cầu cũng thấy (tin hu-<tên>).
// a, b: hai số -1…1 (làm tròn hai chữ số) mang tham số của hiệu ứng. ve KHÔNG được đổi luật chơi (máu, đồ, hồi chiêu): máy người xem cũng
// chạy đúng hàm đó. gap: máy người xem bỏ tin cùng loại của một người tới dồn nhanh hơn chừng ấy giây (tin là dữ liệu lạ).
import { phat } from './phat.js';

const DS = new Map();
export function hieuUng(ten, d) { DS.set(ten, d); }
export const cacHieuUng = () => [...DS.keys()];

export function dien(game, ten, a = 0, b = 0) {
  const d = DS.get(ten), p = game.player;
  if (!d || !p) return;
  d.ve(game, p, game.hoSo, a, b);
  phat(game, 'hu-' + ten, a, b);
}

// Tin hu-<tên> từ người khác (others-nhan.js): người gửi phải đang thấy trên tinh cầu, chỗ ghi trong tin không lệch xa chỗ đang thấy họ
export function huSeen(game, o, raw) {
  const d = DS.get(String(raw?.k).slice(3)), x = +raw.x, y = +raw.y, now = game.time || 0;
  if (!d || !o || o.x === null || !Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - o.x, y - o.y) > 200) return true;
  const at = (o.huAt ||= {});
  if (now - (at[raw.k] ?? -99) < (d.gap ?? 0.5)) return true;
  at[raw.k] = now;
  d.ve(game, o, o, Math.max(-1, Math.min(1, +raw.fx || 0)), Math.max(-1, Math.min(1, +raw.fy || 0)));
  return true;
}
