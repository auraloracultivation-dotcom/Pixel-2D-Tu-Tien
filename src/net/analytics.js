// Gửi sự kiện đo lường tới PostHog (chủ dự án 10/11/2026 01:56: "liên kết PostHog"), không dùng thư viện posthog-js: gom sự kiện vào
// hàng chờ, gửi một gói POST {host}/batch/ mỗi flush_s giây hoặc khi đủ max_batch, rời trang thì gửi nốt bằng sendBeacon.
// Số và khoá ở data/config.json → analytics (key là khoá công khai phc_ của dự án PostHog, ai mở trang cũng thấy, không phải bí mật).
// Chỉ gửi tên sự kiện, mã người chơi (mã Supabase, không phải tên hay tên đăng nhập), số liệu game; không gửi chat, tên tài khoản.
// Trình duyệt bật "Do Not Track" thì không gửi gì. Ghi ở privacy.html.
let C = null, queue = [], id = '', anon = '', sid = '', timer = 0;

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
// UUID v7 (48 bit thời gian ms đầu chuỗi): PostHog dùng làm mã phiên ($session_id) để tính thời lượng phiên
function uuid7() {
  const t = Date.now().toString(16).padStart(12, '0'), r = hex(10);
  return `${t.slice(0, 8)}-${t.slice(8)}-7${r.slice(0, 3)}-${((parseInt(r[3], 16) & 3) | 8).toString(16)}${r.slice(4, 7)}-${r.slice(7, 19)}`;
}

function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* chế độ riêng tư: dùng mã tạm */ }
  return null;
}

export function startAnalytics(cfg) {
  if (C || !cfg?.on || !cfg.key || navigator.doNotTrack === '1') return false;
  C = cfg;
  anon = store('p2d-ph-anon') || ''; if (!anon) { anon = uuid7(); store('p2d-ph-anon', anon); }
  id = anon; sid = uuid7();
  timer = setInterval(flush, (C.flush_s || 10) * 1000);
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  return true;
}

// Đăng nhập xong: gộp mã ẩn danh trước đó vào mã người chơi (PostHog $identify), từ đó mọi sự kiện theo mã người chơi
export function identify(userId, props = {}) {
  if (!C || !userId || userId === id) return;
  const prev = id; id = userId;
  track('$identify', { $anon_distinct_id: prev, $set: props });
}

export function track(event, props = {}) {
  if (!C) return;
  queue.push({ event, timestamp: new Date().toISOString(), properties: {
    ...props, distinct_id: id, $session_id: sid, $lib: 'p2d', $lib_version: C.build || 'dev',
    $current_url: location.origin + location.pathname, $host: location.host, $pathname: location.pathname,
    $screen_width: screen.width, $screen_height: screen.height, $viewport_width: innerWidth, $viewport_height: innerHeight,
    $device_type: matchMedia('(pointer: coarse)').matches ? 'Mobile' : 'Desktop', ngon_ngu: navigator.language,
  } });
  if (queue.length >= (C.max_batch || 20)) flush();
}

// Gửi hàng chờ. leaving: trang sắp đóng, dùng sendBeacon (trình duyệt gửi hộ cả khi trang đã tắt)
export function flush(leaving = false) {
  if (!C || !queue.length) return;
  const body = JSON.stringify({ api_key: C.key, batch: queue.splice(0, 100) }), url = C.host.replace(/\/$/, '') + '/batch/';
  const blob = new Blob([body], { type: 'text/plain' });   // text/plain: không cần hỏi trước (CORS preflight), giống posthog-js
  if (leaving && navigator.sendBeacon?.(url, blob)) return;
  fetch(url, { method: 'POST', body: blob, keepalive: body.length < 60000, credentials: 'omit' }).catch(() => {});   // lỗi mạng: bỏ, không làm phiền game
}

export function stopAnalytics() { clearInterval(timer); flush(true); C = null; }
