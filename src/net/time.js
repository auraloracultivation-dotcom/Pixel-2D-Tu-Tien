// Giờ máy chủ cho đồng hồ tin được (src/core/clock.js): gọi p2d_gio (supabase/migrations/20261028130000_p2d_gio.sql),
// khách chưa đăng nhập cũng gọi được. Trả true nếu đặt được giờ; máy chủ chưa có hàm hoặc mất mạng thì false.
import { supabase } from './client.js';
import { setServerTime } from '../core/clock.js';

export async function syncServerTime(timeoutMs = 4000) {
  try {
    const t0 = performance.now();
    const res = await Promise.race([supabase.rpc('p2d_gio'), new Promise(ok => setTimeout(() => ok(null), timeoutMs))]);
    if (!res || res.error || !res.data) return false;
    const ms = Date.parse(res.data);
    if (!Number.isFinite(ms)) return false;
    setServerTime(ms + (performance.now() - t0) / 2);   // giờ máy chủ lúc trả lời + nửa đường về
    return true;
  } catch { return false; }
}
