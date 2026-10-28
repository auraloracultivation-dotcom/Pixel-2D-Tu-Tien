// Nối đồng hồ tin được (src/core/clock.js) với giờ máy chủ (src/net/time.js): gọi lúc vào game,
// và mỗi lần mở lại game sau khi ẩn. Mất mạng thì đồng hồ tự xoay xở (chỉ cho tiến, không lùi).
import { onResync, setFloor } from '../core/clock.js';

export { setFloor };

export async function syncClock() {
  try {
    const { syncServerTime } = await import('../net/time.js');
    onResync(() => syncServerTime());
    return await syncServerTime();
  } catch { return false; }
}
