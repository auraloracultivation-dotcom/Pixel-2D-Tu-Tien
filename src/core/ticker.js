// Hẹn giờ lặp chung cho giao diện và các lượt hỏi máy chủ (chủ dự án 04/11/2026: máy nóng, giật).
// Trang đang ẩn (tắt màn hình, chuyển app) thì bỏ lượt: không vẽ lại, không hỏi máy chủ; mở lại thì lượt kế tiếp chạy như cũ.
// Việc phải chạy cả lúc ẩn thì truyền { whenHidden: true }. Không dùng cho nhịp tim chống gian lận (game/net-watch.js),
// đồng hồ (core/clock.js), kiểm tra bản lưu (game/cloud-guard.js): những chỗ đó giữ setInterval riêng.
// Trả về mã hẹn giờ, dừng bằng clearInterval như thường.
export function every(fn, ms, { whenHidden = false } = {}) {
  return setInterval(() => { if (!whenHidden && document.hidden) return; fn(); }, ms);
}
