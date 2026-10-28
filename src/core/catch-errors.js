// Bắt lỗi JavaScript trên máy người chơi và gửi về máy chủ qua net/errlog.js (chỉ khi đã đăng nhập).
// Mỗi lỗi gửi một lần mỗi phiên, tối đa 10 lỗi; bỏ qua lỗi mạng và lỗi không có thông tin (tiện ích trình duyệt, khác nguồn).
const SKIP = ['Script error', 'ResizeObserver', 'Failed to fetch', 'NetworkError', 'Load failed', 'network', 'AbortError'];
const seen = new Set();
const recent = [];   // lỗi gần nhất (kể cả khi chưa đăng nhập), gắn vào báo lỗi của người chơi (src/ui/feedback-shot.js)
export const recentErrors = () => recent.slice();

export function catchErrors() {
  const send = (msg, stack) => {
    const tin = String(msg || '').slice(0, 300);
    if (tin) { recent.push(`${new Date().toISOString().slice(11, 19)} ${tin} @ ${String(stack || '').split('\n').slice(0, 2).join(' | ').slice(0, 200)}`); if (recent.length > 8) recent.shift(); }
    if (!tin || seen.has(tin) || seen.size >= 10 || SKIP.some(s => tin.includes(s))) return;
    seen.add(tin);
    const ban = `${location.pathname} ${innerWidth}x${innerHeight}`;
    import('../net/errlog.js').then(m => m.sendError(tin, String(stack || '').slice(0, 1500), ban)).catch(() => {});
  };
  window.addEventListener('error', e => send(e.message, e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`));
  window.addEventListener('unhandledrejection', e => send('Promise: ' + (e.reason?.message || e.reason), e.reason?.stack));
}
