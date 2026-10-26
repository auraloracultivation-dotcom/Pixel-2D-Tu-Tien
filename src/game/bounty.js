// Nhiệm vụ treo thưởng lặp lại (data/quests.json): nhận ở Chấp sự, hạ đủ quái rồi quay lại lãnh thưởng.
import { rollItem, addItem, rollGem, gemInfo, rarityOf, itemName } from './items.js';
import { totalLayer } from './stats.js';
import { bountyLeft, useBounty } from './daily.js';
import { outdoorMob } from './chores.js';
import { pilotOpt, nightRest } from './pilotopt.js';

export const BOUNTY_NPC = 'chap-su';

function list(game) {
  return game.data.quests.bounties.filter(b => !b.need || game.save.flags[b.need]);
}
const def = (game, id) => game.data.quests.bounties.find(b => b.id === id);
const text = (b, n) => b.text.replace('{n}', b.n) + (b.n > 1 ? ` (${Math.min(n, b.n)}/${b.n})` : '');

export function bountyGoal(game) {
  const cur = game.save.bounty, b = cur && def(game, cur.id);
  if (!b) return null;
  return cur.n >= b.n ? 'Treo thưởng xong: về gặp Chấp sự lãnh thưởng' : 'Treo thưởng: ' + text(b, cur.n);
}

export function bountyKill(game, m) {
  const cur = game.save.bounty, b = cur && def(game, cur.id);
  if (!b || b.mob !== m.id || cur.n >= b.n) return;
  cur.n++;
  if (cur.n >= b.n) game.toast('Xong nhiệm vụ treo thưởng! Về Thiên Kiếm Phong lãnh thưởng.', 2);
}

function give(game, r) {
  const { data, save } = game, got = [];
  if (r.stones) { save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + r.stones; got.push(`${r.stones} Tẩy Luyện Thạch`); }
  if (r.gem && Math.random() < r.gem) { const g = rollGem(data); save.gems[g] = (save.gems[g] || 0) + 1; got.push(gemInfo(data, g).name); }
  if (r.item) {
    const it = rollItem(data, save, { lvl: totalLayer(save, data.realms), minRarity: r.item });
    if (addItem(data, save, it)) { got.push(`[${rarityOf(data.items, it.rarity).name}] ${itemName(data, it)}`); game.newItems = (game.newItems || 0) + 1; }
  }
  if (r.qi) { game.gainQi(r.qi, game.player.x, game.player.y); got.push(`${r.qi} linh khí`); }
  return got;
}

// Nói chuyện với Chấp sự: lãnh thưởng nếu xong, nhắc nếu đang làm, giao việc mới nếu rảnh
export async function talkBounty(game, npc) {
  const name = npc.def.name, save = game.save, cur = save.bounty, b = cur && def(game, cur.id);
  if (b && cur.n < b.n) { await game.dialog.say([[name, `Việc của ngươi: ${text(b, cur.n)}. Làm xong rồi hẵng quay lại.`]]); return; }
  if (b) {
    const left = bountyLeft(game);
    save.bounty = null; save.bountyDone = (save.bountyDone || 0) + 1;
    if (left > 0) {
      const got = give(game, b.reward);
      useBounty(game);
      game.sfx('levelup'); game.refreshStats(); game.persist();
      await game.dialog.say([[name, `Tốt lắm. Thưởng cho ngươi: ${got.join(', ')}. Hôm nay còn ${left - 1} lượt thưởng.`]]);
    } else await game.dialog.say([[name, 'Làm tốt, nhưng hôm nay Nhiệm Vụ Đường đã hết ngân khố thưởng cho ngươi. Mai quay lại.']]);
  }
  if (bountyLeft(game) <= 0) { if (!b) await game.dialog.say([[name, 'Hôm nay ngươi đã lãnh đủ thưởng. Mai quay lại nhận việc mới.']]); game.persist(); return; }
  const pool = list(game).filter(x => x.id !== b?.id && (!game.pilot || outdoorMob(game, x.mob)));   // tự hành chỉ nhận việc đánh được ngoài trời
  const near = pool.filter(x => game.map.def.spawners.some(s => s.mob === x.mob));   // tự hành: thường chọn việc ngay trên đảo này cho đỡ bay
  const from = game.pilot && near.length && Math.random() < 0.7 ? near : pool, pick = from[Math.floor(Math.random() * from.length)];
  if (!pick || (game.pilot && (!pilotOpt(game, 'viec') || nightRest(game)))) return;
  if (game.pilot) { save.bounty = { id: pick.id, n: 0 }; game.persist(); await game.dialog.say([[name, `Có việc mới: ${pick.text.replace('{n}', pick.n)}. Đi đi.`]]); return; }   // tự hành tự nhận
  const ok = await game.dialog.choose(`${name}: Có việc mới: ${pick.text.replace('{n}', pick.n)}. Nhận không?`, [
    { id: 'yes', label: 'Nhận việc', desc: 'Hiện ở góc phải màn hình' },
    { id: 'no', label: 'Để sau', desc: '' },
  ]);
  if (ok === 'yes') { save.bounty = { id: pick.id, n: 0 }; game.persist(); }
}
