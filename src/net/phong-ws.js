// Kết nối tới máy chủ phòng trên Cloudflare (thư mục cloud/; chủ dự án 06/11/2026 chuyển phần "thấy nhau" khỏi Supabase Realtime).
// Vé đăng nhập Supabase gửi trong Sec-WebSocket-Protocol ["p2d", <jwt>]. Phòng đầy: máy chủ đóng mã 4009 → thử tuyến kế tiếp.
// Rớt mạng: tự nối lại (1, 2, 4… tối đa 30 giây). "ping" 25 giây một lần (Cloudflare tự trả "pong", không đánh thức phòng).
import { supabase } from './client.js';

const LINES_MAX = 60;

export function openPhong({ url, room, line = 1, onOpen, onMsg, onDown, onLine }) {
  let ws = null, alive = true, tries = 0, timer = null, ping = null, cur = line, hops = 0;

  async function connect() {
    if (!alive) return;
    let token = '';
    try { token = (await supabase.auth.getSession()).data.session?.access_token || ''; } catch { /* mạng lỗi */ }
    if (!alive) return;
    if (!token) { retry(); return; }
    let s;
    try { s = new WebSocket(`${url}?r=${encodeURIComponent(room)}&l=${cur}`, ['p2d', token]); } catch { retry(); return; }
    ws = s;
    s.onopen = () => {
      if (ws !== s) return;
      tries = 0;
      clearInterval(ping); ping = setInterval(() => { if (s.readyState === 1) s.send('ping'); }, 25000);
    };
    s.onmessage = e => {
      if (ws !== s || e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m?.t === 'w') { hops = 0; onLine?.(cur); onOpen?.(m); } else onMsg?.(m);
    };
    s.onclose = e => {
      if (ws !== s) return;
      ws = null; clearInterval(ping);
      onDown?.();
      if (!alive) return;
      if (e.code === 4009 && hops < LINES_MAX) { hops++; cur = cur % LINES_MAX + 1; connect(); return; }   // tuyến đầy
      if (e.code === 4000) return;   // cùng tài khoản đã vào lại ở chỗ khác (thẻ khác)
      retry();
    };
  }

  function retry() {
    if (!alive) return;
    clearTimeout(timer);
    timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(tries++, 5)));
  }

  connect();
  return {
    send(obj) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; } return false; },
    ready: () => !!ws && ws.readyState === 1,
    line: () => cur,
    close() { alive = false; clearTimeout(timer); clearInterval(ping); const s = ws; ws = null; try { s?.close(1000, 'roi'); } catch { /* đã đóng */ } },
  };
}
