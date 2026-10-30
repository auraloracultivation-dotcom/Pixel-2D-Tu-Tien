// Nhắc điểm danh (chủ dự án đồng ý 31/10/2026): vào game có tài khoản mà hôm nay chưa điểm danh thì chấm đỏ trên nút Menu và
// nút Việc (game.newDaily, src/ui/hud.js) kèm một dòng nhắc (data/checkin.json → text.nudge). Xem lại mỗi 30 phút
// (qua 0h là ngày mới); đã điểm danh thì thôi.
import { checkinOn, loadCheckin } from './checkin.js';

export function startCheckinNudge(game) {
  let told = '', next = 0;
  setInterval(async () => {
    if (!checkinOn(game) || Date.now() < next || game.netLost?.()) return;
    next = Date.now() + 30 * 60 * 1000;
    try {
      const r = await loadCheckin(game);
      if (!r.data || r.data.hom_nay) return;
      game.newDaily = true;
      if (told !== r.data.ngay) { told = r.data.ngay; game.toast?.(game.data.checkin.text.nudge, 3.5); }
    } catch { next = Date.now() + 60 * 1000; }   // mạng chập chờn: một phút sau xem lại
  }, 5000);
}
