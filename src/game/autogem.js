// Tự khảm ngọc khi đang tự hành: mỗi lần một viên vào lỗ trống hoặc thay viên yếu hơn, chọn viên tăng lực chiến nhiều nhất.
// Hết lỗ trống thì ghép ngọc dư (đủ số viên cùng loại cùng cấp) lên cấp trên để lần sau thay vào.
// Đã đăng nhập: khảm, ghép qua máy chủ (src/game/ky-ngoc.js), mỗi lần một lệnh; chơi thử thì tính ở máy như cũ.
import { playerStats } from './stats.js';
import { power } from './achieve.js';
import { equipped, canMerge, gemInfo, itemName } from './items.js';
import { kySocket, kyMerge } from './ky-ngoc.js';

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
export async function bestGems(game) {
  let n = 0, gain = 0, b;
  while (n < 200 && (b = bestStep(game))) {
    if (!(await kySocket(game, b.it.uid, b.i, b.k))) break;   // máy chủ từ chối: dừng, giữ những lần đã khảm
    n++; gain += b.v;
  }
  if (n) { game.refreshStats(); game.persist(); }
  return { n, gain };
}

export async function autoGem(game) {
  const s = game.save, d = game.data, keys = Object.keys(s.gems || {}).filter(k => s.gems[k] > 0);
  if (!keys.length || game.kyBusy || performance.now() < (game.agWait || 0)) return;
  const wait = () => { game.agWait = performance.now() + 30000; };   // máy chủ từ chối: 30 giây sau mới thử lại
  const best = bestStep(game);
  if (best) {
    if (!(await kySocket(game, best.it.uid, best.i, best.k, true))) return wait();
    game.refreshStats(); game.persist();
    game.autoNote(`Tự khảm ${gemInfo(d, best.k).name} vào ${itemName(d, best.it)}: lực chiến +${best.v.toLocaleString('vi-VN')}`, 2.2);
    return;
  }
  if (equipped(s).some(it => it.sockets.includes(null))) return;
  const k = keys.find(x => canMerge(d, s, x, d.config.pilot.garden_keep));   // luôn chừa lại một ít Linh Thạch
  if (!k) return;
  if (!(await kyMerge(game, k, d.config.pilot.garden_keep, 1, true))) return wait();
  game.persist(); game.autoNote(`Tự ghép ngọc: ${gemInfo(d, k).name} thành cấp ${gemInfo(d, k).lv + 1}`, 1.8);
}
