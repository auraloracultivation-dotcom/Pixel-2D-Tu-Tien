// Tự khảm ngọc khi đang tự hành: mỗi lần một viên vào lỗ trống hoặc thay viên yếu hơn, chọn viên tăng lực chiến nhiều nhất.
// Hết lỗ trống thì ghép ngọc dư (đủ số viên cùng loại cùng cấp) lên cấp trên để lần sau thay vào.
import { playerStats } from './stats.js';
import { power } from './achieve.js';
import { equipped, socket, mergeGems, gemInfo, itemName } from './items.js';

// Tìm một lần khảm / thay tăng lực chiến nhiều nhất (null nếu không còn cách nào mạnh hơn)
function bestStep(game) {
  const s = game.save, d = game.data, keys = Object.keys(s.gems || {}).filter(k => s.gems[k] > 0);
  if (!keys.length) return null;
  const now = power(game, playerStats(s, d));
  let best = null;
  for (const it of equipped(s)) it.sockets.forEach((old, i) => {
    for (const k of keys) {
      if (k === old) continue;
      it.sockets[i] = k;
      const v = power(game, playerStats(s, d)) - now;
      if (v > 0 && (!best || v > best.v)) best = { it, i, k, v };
    }
    it.sockets[i] = old;
  });
  return best;
}

// Nút "Khảm ngọc tốt nhất" ở Túi → Ngọc (đề xuất #33): lặp từng bước cho tới khi không còn viên nào làm mạnh hơn. Không ghép ngọc.
export function bestGems(game) {
  let n = 0, gain = 0, b;
  while (n < 200 && (b = bestStep(game))) { socket(game.save, b.it.uid, b.i, b.k); n++; gain += b.v; }
  if (n) { game.refreshStats(); game.persist(); }
  return { n, gain };
}

export function autoGem(game) {
  const s = game.save, d = game.data, keys = Object.keys(s.gems || {}).filter(k => s.gems[k] > 0);
  if (!keys.length) return;
  const best = bestStep(game);
  if (best) {
    socket(s, best.it.uid, best.i, best.k);
    game.refreshStats(); game.persist();
    game.toast(`Tự khảm ${gemInfo(d, best.k).name} vào ${itemName(d, best.it)}: lực chiến +${best.v.toLocaleString('vi-VN')}`, 2.2);
    return;
  }
  if (equipped(s).some(it => it.sockets.includes(null))) return;
  const k = keys.find(x => mergeGems(d, s, x, d.config.pilot.garden_keep));   // luôn chừa lại một ít Linh Thạch
  if (k) { game.persist(); game.toast(`Tự ghép ngọc: ${gemInfo(d, k).name} thành cấp ${gemInfo(d, k).lv + 1}`, 1.8); }
}
