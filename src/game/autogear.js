// Nút "Mặc đồ tốt nhất" ở Túi đồ (góp ý #58, chủ dự án đồng ý 02/11/2026 19:56): mỗi ô chọn món cho lực chiến cao nhất (tính đủ
// hệ, đồ bộ, ngọc khảm theo đồ, như số "Lực chiến ±" trên ô túi). Lặp vài lượt vì đồ bộ của ô này đổi giá trị ô khác.
import { playerStats } from './stats.js';
import { power } from './achieve.js';

export function bestGear(game) {
  const s = game.save, d = game.data, B = d.items.bases, before = power(game, playerStats(s, d));
  let n = 0;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const slot of Object.keys(d.items.slots)) {
      const cur = s.equip[slot], list = s.bag.filter(it => B[it.base]?.slot === slot);
      let best = cur, top = power(game, playerStats(s, d));
      for (const it of list) {
        if (it.uid === cur) continue;
        s.equip[slot] = it.uid;
        const v = power(game, playerStats(s, d));
        if (v > top) { top = v; best = it.uid; }
      }
      if (best === undefined) delete s.equip[slot]; else s.equip[slot] = best;
      if (best !== cur) { n++; moved = true; }
    }
    if (!moved) break;
  }
  const gain = Math.round(power(game, playerStats(s, d)) - before);
  if (n) { game.refreshStats(); game.persist(); }
  return { n, gain };
}
