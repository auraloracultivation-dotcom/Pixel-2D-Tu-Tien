// Nhóm A Túi đồ (chủ dự án 02/11/2026 04:03): ngoài Trang bị / Ngọc / Nguyên liệu, túi có nút mở nhanh Linh thú, Thú cưỡi,
// Đồng hành, Thời trang, Luyện khí (data/menu.json → hubs.bag_links), bấm hộ như ô Menu.
import { itemLock } from '../game/menu-acts.js';

export function createBagLinks(game) {
  const L = game.data.menu?.hubs?.bag_links, tabs = document.querySelector('#bag .bag-tabs');
  if (!L || !tabs) return;
  const row = document.createElement('div');
  row.className = 'bag-tabs bag-links';
  for (const it of L) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.onclick = () => {
      const lock = itemLock(game, it);
      if (lock) { game.toast(lock, 2); return; }
      document.getElementById('bag-close')?.click();
      if (it.cave) game.openCave?.(it.cave); else game.openOldPanel?.(it);
    };
    row.append(b);
  }
  tabs.after(row);
}
