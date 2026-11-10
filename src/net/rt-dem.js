// Đếm tin Supabase Realtime máy này gửi và nhận (chủ dự án 10/11/2026 12:36: muốn thấy mức dùng Realtime mà không vào Supabase).
// Supabase tính mỗi tin Broadcast = 1 gửi + 1 cho mỗi máy nhận; tin đẩy từ máy chủ (chat, truyền âm) tính 1 cho mỗi máy nghe kênh.
// Cộng số đếm của mọi máy là ra gần đúng tổng Supabase tính. src/game/analytics-hook.js gửi số này lên PostHog (sự kiện rt_tin).
let sent = 0, got = 0;

export const rtSent = (n = 1) => { sent += n; };
export const rtGot = (n = 1) => { got += n; };

// Lấy số đã đếm từ lần lấy trước rồi đếm lại từ 0
export function rtTake() {
  const r = { gui: sent, nhan: got };
  sent = 0; got = 0;
  return r;
}
