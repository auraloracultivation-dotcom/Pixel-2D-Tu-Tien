// Càn quét ra đồ như đánh thật (góp ý #127, chủ dự án 04/11/2026 18:14: "càn quét với khi farm tỉ lệ ra như nhau"):
// mỗi quái trong các phòng của bí cảnh (kể cả boss) được tung đồ rơi như lúc hạ thật ở đúng bậc L: trang bị (màu dòng như trong
// bí cảnh), ngọc, đá tẩy luyện, Linh Thạch, nguyên liệu. Đồ vào thẳng túi (loot.js, game.sweeping). Không tính linh khí, nhiệm vụ,
// thành tựu (những thứ đó chỉ có khi đánh thật). Thưởng cố định của bậc vẫn phát như cũ (dun-run.js sweep).
import { dropLoot } from './loot.js';
import { coinDrop } from './shop.js';
import { matDrop } from './cave.js';
import { scaleMob } from './dun-mode.js';

export function sweepKills(game, id, L) {
  const rooms = game.data.maps[id]?.rooms || [], p = game.player, keep = game.dunMode;
  game.dunMode = L; game.sweeping = true;
  try {
    for (const room of rooms) for (const { mob, n = 1 } of room.mobs || []) {
      const def = game.data.mobs[mob];
      if (!def) continue;
      for (let i = 0; i < n; i++) {
        const m = { id: mob, def, x: p.x, y: p.y, r: 6, hp: def.hp, maxHp: def.hp };
        scaleMob(game, m);
        dropLoot(game, m); coinDrop(game, m); matDrop(game, m);
      }
    }
  } finally { game.dunMode = keep; game.sweeping = false; }
}
