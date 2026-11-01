// Nhóm E trong Động phủ (chủ dự án gom 02/11/2026): việc bấm từ bảng Động phủ (data/menu.json → hubs.home) mà không phải mở bảng cũ:
// bế quan (tới bồ đoàn ngồi đả tọa), đạo lữ, khách, trang trí (nói chuyện với người đang ở nhà), hồ cá. Trả về câu báo nếu không làm được.
import { talkTo } from './interact.js';
import { hasDecor } from './decor.js';

export function homeAct(game, act) {
  const H = game.data.home, here = game.map.id === H.map, npcs = game.npcs || [];
  if (!here) return 'Về động phủ rồi mới làm được.';
  if (act === 'be-quan') {
    const m = game.map.findTiles('M')[0], p = game.player;
    if (!m) return 'Động phủ chưa có bồ đoàn.';
    const c = game.map.center(m[0], m[1]);
    p.x = c.x; p.y = c.y; p.meditating = true;
    game.toast('Bế quan trên bồ đoàn động phủ… chạm Đả tọa để dừng.', 2.2);
    return null;
  }
  if (act === 'ho-ca') {
    if (hasDecor(game, 'ho-ca')) { game.toast(`${H.decor.items['ho-ca'].name}: ${H.decor.items['ho-ca'].desc}`, 2.4); return null; }
    act = 'decor';
  }
  const n = act === 'dao-lu' ? npcs.find(x => x.home) : act === 'khach' ? npcs.find(x => x.visit) : act === 'decor' ? npcs.find(x => x.id === H.decor.npc) : null;
  if (!n) return act === 'dao-lu' ? 'Đạo lữ không ở nhà (chưa có đạo lữ, hoặc đang đi cùng).' : act === 'khach' ? 'Hôm nay chưa có khách.' : 'Không thấy ai ở đây.';
  talkTo(game, n);
  return null;
}
