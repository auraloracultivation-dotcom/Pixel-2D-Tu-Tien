// Bản game mới thì tự tải lại (mảng C, 06/11/2026). Thẻ trình duyệt để mở lâu vẫn chạy code cũ, không hiểu luật máy chủ mới:
// máy chủ sửa linh thú / đồ (sua.thu, sua.mon) mỗi lần lưu mà máy cũ không nhận, tiến độ trong máy lệch dần và bị gắn cờ
// nghi vấn liên tục (namtran92 để một thẻ mở 50 giờ, từ trước khi có giai đoạn 2–4 chữ ký món).
// Cứ check_s giây đọc lại index.html (không qua bộ nhớ đệm). Mã phiên bản ở đó khác bản đang chạy thì báo, đẩy bản lưu lên
// máy chủ rồi tải lại trang. Mỗi mã chỉ tải lại một lần mỗi thẻ (khỏi tải lại mãi nếu máy vẫn nhận file cũ).
// Mã phiên bản: quy trình đưa lên (tools/goi.mjs) ghi vào src/core/build.js và gắn ?v=<8 ký tự> sau src/main.js trong index.html;
// chạy ở máy (bản 'dev') thì không làm gì.
// Số và chữ: data/config.json → guard.ban_moi. Không gọi Supabase.
import { BUILD } from '../core/build.js';
const CUR = BUILD === 'dev' ? null : BUILD;
const KEY = 'p2d_ban_moi';
let started = false;

async function latest() {
  const u = new URL('index.html', document.baseURI);
  u.searchParams.set('t', Date.now());
  const r = await fetch(u, { cache: 'no-store' });
  if (!r.ok) return null;
  return (await r.text()).match(/src\/main\.js\?v=([0-9a-zA-Z]{6,40})/)?.[1] || null;
}

function tried(v) {
  try { if (sessionStorage.getItem(KEY) === v) return true; sessionStorage.setItem(KEY, v); } catch { /* không có kho: vẫn tải lại */ }
  return false;
}

// c: { check_s, wait_s, text }; toast(chữ, giây); flush(): đẩy bản lưu đang chờ lên máy chủ
export function watchBuild(c, { toast, flush }) {
  if (started || !CUR || !c || !(c.check_s > 0)) return;
  started = true;
  let busy = false, timer = null;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const v = await latest();
      if (!v || v === CUR || tried(v)) return;
      clearInterval(timer);
      const wait = Math.max(1, c.wait_s || 8);
      try { toast?.(String(c.text || '').replace('{n}', wait), wait); } catch { /* chưa có giao diện */ }
      setTimeout(async () => {
        try { await flush?.(); } catch { /* mạng hỏng: bản trong máy vẫn còn */ }
        dispatchEvent(new Event('p2d-tai-lai'));   // src/ui/tu-vao.js: tải lại xong tự vào game
        location.reload();
      }, wait * 1000);
    } catch { /* mất mạng: lần sau thử lại */ }
    finally { busy = false; }
  };
  timer = setInterval(tick, c.check_s * 1000);
}
