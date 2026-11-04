// Đồng hồ tin được (28/10/2026, người chơi báo chỉnh giờ điện thoại là game tua theo): mọi Date.now() / new Date()
// trong game đi qua đây, nên không phải sửa từng chỗ dùng giờ (hằng ngày, bế quan, vườn, linh thú, thẻ tháng...).
// - Trong một lần chơi: giờ = mốc lúc mở game + thời gian thật đã trôi (performance.now), chỉnh giờ máy giữa chừng không ăn.
// - Có mạng: lấy giờ máy chủ (src/net/time.js) làm mốc, chỉnh giờ máy trước khi mở game cũng không ăn.
// - Không bao giờ lùi dưới mốc lớn nhất đã thấy (bản lưu, lưu riêng trong máy): lùi giờ để nhận lại quà ngày không được.
// - Mở lại game sau khi ẩn (điện thoại ngủ, performance.now có thể đứng): hỏi lại máy chủ; mất mạng thì chỉ cho tiến.
// Phải được nạp đầu tiên (dòng import đầu của src/main.js).
const Real = globalThis.Date;
const KEY = 'p2d-gio-max';
const perf = () => performance.now();

let base = Real.now(), basePerf = perf(), floor = 0, server = false, resync = null;
try { floor = Number(localStorage.getItem(KEY)) || 0; } catch { /* trình duyệt chặn lưu: bỏ qua */ }

const raw = () => base + (perf() - basePerf);
// Số nguyên như Date.now() thật: performance.now có phần lẻ, mã phiên p2d_phien_dat ghép Date.now().toString(36) bị dấu chấm
// nên máy chủ từ chối (phien_sai, khoảng 3/4 lần vào game), "một tài khoản một máy" không chạy
export const trustedNow = () => Math.floor(Math.max(raw(), floor));

class TrustedDate extends Real {
  constructor(...a) { if (a.length) super(...a); else super(trustedNow()); }
  static now() { return trustedNow(); }
}
globalThis.Date = TrustedDate;

// Giờ máy chủ (ms) đo ở giữa lượt hỏi
export function setServerTime(ms) {
  if (!Number.isFinite(ms)) return;
  base = ms; basePerf = perf(); server = true;
}

// Mốc không được lùi dưới (lastSeen trong bản lưu)
export function setFloor(ms) { if (ms > floor) floor = ms; }

// Hàm hỏi lại giờ máy chủ khi mở lại game (game.js gắn vào)
export function onResync(fn) { resync = fn; }

function remember() {
  const now = trustedNow();
  if (now > floor) floor = now;
  try { localStorage.setItem(KEY, String(Math.round(floor))); } catch { /* bỏ qua */ }
}
setInterval(remember, 30000);

const forward = () => { base = Math.max(raw(), Real.now()); basePerf = perf(); };   // không hỏi được máy chủ: chỉ cho tiến
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { remember(); return; }
  if (!resync) { forward(); return; }
  Promise.resolve(resync()).then(ok => { if (!ok) forward(); }, forward);
});
