// Tự mặc đồ khi đang tự hành: món mới nhặt được mà mặc vào lực chiến cao hơn thì thay luôn.
// Vũ khí chỉ thay bằng cùng loại đang dùng; pháp bảo đổi chiêu nên để người chơi tự chọn.
import { playerStats } from './stats.js';
import { power } from './achieve.js';
import { equip, itemName, rarityOf } from './items.js';

const trial = (game, slot, uid) => {
  const s = game.save, old = s.equip[slot];
  s.equip[slot] = uid;
  const v = power(game, playerStats(s, game.data));
  if (old === undefined) delete s.equip[slot]; else s.equip[slot] = old;
  return v;
};

export function autoEquip(game) {
  const s = game.save, d = game.data, B = d.items.bases;
  if (!s.bag?.length || (s.aeUid ?? 0) >= s.nextUid - 1) return;
  const fresh = s.bag.filter(i => i.uid > (s.aeUid ?? 0));
  s.aeUid = s.nextUid - 1;
  for (const it of fresh) {
    const b = B[it.base], slot = b.slot;
    if (b.art || (b.weapon && b.weapon !== s.weapon)) continue;
    const now = power(game, playerStats(s, d)), v = trial(game, slot, it.uid);
    if (v <= now) continue;
    equip(s, d, it.uid);
    game.refreshStats(); game.persist();
    game.toast(`Tự mặc [${rarityOf(d.items, it.rarity).name}] ${itemName(d, it)}: lực chiến +${(v - now).toLocaleString('vi-VN')}`, 2.4);
  }
}
