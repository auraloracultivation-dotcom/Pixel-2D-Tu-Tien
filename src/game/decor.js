// Trang trí động phủ (data/home.json → decor): mua đồ ở Tiểu Linh bằng Linh Thạch, bày ở chỗ cố định,
// mỗi món cộng chút tốc độ đả tọa khi ở động phủ.
import { coins, addCoins } from './shop.js';
import { praise } from './praise.js';

const C = game => game.data.home.decor;
const pick = a => a[Math.floor(Math.random() * a.length)];

export const hasDecor = (game, id) => !!(game.visiting ? game.visiting.decor : game.save.decor)?.[id];   // đang thăm nhà bạn: đồ nhà bạn (src/game/friends.js)
// Phần trăm đả tọa cộng thêm ở động phủ
export const comfort = game => Object.entries(C(game).items).reduce((a, [id, d]) => a + (hasDecor(game, id) ? d.comfort : 0), 0);

export async function talkDecor(game, npc) {
  const c = C(game), name = npc.def.name;
  const left = Object.entries(c.items).filter(([id]) => !hasDecor(game, id)).sort((a, b) => a[1].cost - b[1].cost);
  if (!left.length) { await game.dialog.say([[name, c.full]]); return; }
  const opts = left.slice(0, 3).map(([id, d]) => ({ id, label: `${d.name} (${d.cost} LT)`, desc: `${d.desc} Đả tọa ở nhà +${d.comfort}%`, color: coins(game.save) >= d.cost ? '#f2c94c' : '#8a8498' }));
  opts.push({ id: 'thoi', label: 'Để sau', desc: `Đang có ${coins(game.save)} Linh Thạch` });
  const ch = await game.dialog.choose(`${name}: ${pick(c.lines)}`, opts);
  const d = c.items[ch];
  if (!d) return;
  if (coins(game.save) < d.cost) { await game.dialog.say([[name, 'Linh Thạch chưa đủ rồi chủ nhân ơi.']]); return; }
  addCoins(game, -d.cost);
  (game.save.decor ??= {})[ch] = 1;
  game.persist(); game.sfx('levelup');
  await game.dialog.say([[name, pick(c.bought)], ['', `Đã bày ${d.name}. Đả tọa ở động phủ nhanh thêm ${comfort(game)}%.`]]);
  praise(game, 'decor', { item: d.name });
}
