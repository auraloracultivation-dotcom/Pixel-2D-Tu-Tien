// Tự dùng đan khi đang tự hành (tùy chọn "dan"): đan tăng máu tối đa, tẩy tủy dùng ngay; đan linh khí, canh cá dùng khi
// chưa đầy tới đỉnh (không phí); đan tĩnh tâm dùng ngay trước khi độ kiếp. Đan hồi máu do player.js lo.
import { qiNeed } from './stats.js';
import { atPeak } from './tribulation.js';
import { usePill } from './cave.js';

export function autoPills(game) {
  const s = game.save, d = game.data, P = d.cave.pills;
  for (const [id, n] of Object.entries(s.pills || {})) {
    const u = P[id]?.use;
    if (!u || !(n > 0) || u.heal || u.x2) continue;   // Thăng Linh Đan: để người chơi tự chọn lúc uống
    if (u.qi) {
      const need = qiNeed(s, d.realms);
      if (s.layer >= d.realms.layers && s.qi + need * u.qi > need) continue;   // sắp đầy tới đỉnh: để dành
    }
    if (u.trib && !atPeak(game)) continue;
    const msg = usePill(game, id);
    if (msg) { game.toast(`Tự dùng ${P[id].name}: ${msg}`, 2.2); return; }
  }
}
