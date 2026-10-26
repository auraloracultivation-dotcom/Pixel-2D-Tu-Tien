// Việc hằng ngày, lượt treo thưởng mỗi ngày, cống hiến tông môn, chức vị và đổi thưởng (data/daily.json).
import { rollItem, addItem, rollGem, gemInfo, rarityOf, itemName } from './items.js';
import { totalLayer } from './stats.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// Bốc việc theo ngày: cùng ngày thì cùng bộ việc (hạt giống từ ngày)
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export function ensureDaily(game) {
  const s = game.save, cfg = game.data.daily, d = today();
  s.contrib ??= 0; s.rank ??= cfg.ranks[0].id;
  if (s.daily?.day === d) return s.daily;
  const pool = cfg.pool.filter(t => !t.need || s.flags[t.need]), rnd = seeded(d + (game.owner || ''));
  const tasks = [];
  while (tasks.length < cfg.per_day && pool.length) tasks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
  s.daily = { day: d, tasks: tasks.map(id => ({ id, n: 0, got: false })), chest: false, bounties: 0 };
  return s.daily;
}

export const taskDef = (game, id) => game.data.daily.pool.find(t => t.id === id);
export const taskText = (t, n) => t.text.replace('{n}', t.n) + ` (${Math.floor(Math.min(n, t.n))}/${t.n})`;

// Ghi tiến độ: type theo pool (kill, rare, meditate, bounty, brew, forge, harvest, salvage)
export function dailyEvent(game, type, id, amount = 1) {
  if (!game.save) return;
  const dl = ensureDaily(game);
  for (const t of dl.tasks) {
    const d = taskDef(game, t.id);
    if (!d || d.type !== type || (d.mob && d.mob !== id) || t.n >= d.n) continue;
    t.n = Math.min(d.n, t.n + amount);
    if (t.n >= d.n) game.toast(`Xong việc hằng ngày: ${d.text.replace('{n}', d.n)}. Mở bảng Việc để nhận thưởng.`, 2.2);
    game.newDaily = true;
  }
}

// Phát thưởng chung: stones, qi, gem (số viên), item (độ hiếm thấp nhất), mats, pills, contrib
export function grant(game, r) {
  const { data, save } = game, got = [];
  if (r.contrib) { addContrib(game, r.contrib); got.push(`${r.contrib} cống hiến`); }
  if (r.stones) { save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + r.stones; got.push(`${r.stones} Tẩy Luyện Thạch`); }
  for (let i = 0; i < (r.gem || 0); i++) { const g = rollGem(data); save.gems[g] = (save.gems[g] || 0) + 1; got.push(gemInfo(data, g).name); }
  for (const [k, n] of Object.entries(r.mats || {})) { save.mats[k] = (save.mats[k] || 0) + n; got.push(`${n} ${data.cave.materials[k]?.name || k}`); }
  for (const [k, n] of Object.entries(r.pills || {})) { save.pills[k] = (save.pills[k] || 0) + n; got.push(`${n} ${data.cave.pills[k].name}`); }
  if (r.item) {
    const it = rollItem(data, save, { lvl: totalLayer(save, data.realms), minRarity: r.item });
    if (addItem(data, save, it)) { got.push(`[${rarityOf(data.items, it.rarity).name}] ${itemName(data, it)}`); game.newItems = (game.newItems || 0) + 1; }
    else got.push('(túi đầy, mất trang bị)');
  }
  if (r.qi) { game.gainQi(r.qi, game.player.x, game.player.y); got.push(`${r.qi} linh khí`); }
  game.refreshStats(); game.persist();
  return got;
}

export function claimTask(game, idx) {
  const t = ensureDaily(game).tasks[idx], d = t && taskDef(game, t.id);
  if (!d || t.got || t.n < d.n) return null;
  t.got = true;
  return grant(game, d.reward);
}

export function claimChest(game) {
  const dl = ensureDaily(game);
  if (dl.chest || !dl.tasks.every(t => t.got)) return null;
  dl.chest = true;
  return grant(game, game.data.daily.chest);
}

// Treo thưởng: chỉ bounty_per_day lần có thưởng mỗi ngày
export const bountyLeft = game => game.data.daily.bounty_per_day - ensureDaily(game).bounties;
export function useBounty(game) { ensureDaily(game).bounties++; dailyEvent(game, 'bounty'); }

export const rankOf = (game, id = game.save.rank) => game.data.daily.ranks.find(r => r.id === id);
export const rankIdx = (game, id = game.save.rank) => game.data.daily.ranks.findIndex(r => r.id === id);

// Cống hiến cộng dồn trọn đời quyết định chức vị; cống hiến tiêu được là save.contrib
export function addContrib(game, n) {
  const s = game.save, ranks = game.data.daily.ranks;
  s.contrib += n; s.contribTotal = (s.contribTotal || 0) + n;
  let i = rankIdx(game);
  while (ranks[i + 1] && s.contribTotal >= ranks[i + 1].need) {
    i++; s.rank = ranks[i].id;
    game.toast(`Thăng chức: ${ranks[i].name}!`, 3); game.sfx('levelup');
    if (ranks[i].gift) setTimeout(() => game.dialog.say([['', `Tông môn ban thưởng cho ${ranks[i].name}: ${grant(game, ranks[i].gift).join(', ')}.`]]), 50);
  }
}

export function buy(game, id) {
  const it = game.data.daily.shop.find(x => x.id === id), s = game.save;
  if (!it || s.contrib < it.cost || (it.rank && rankIdx(game) < rankIdx(game, it.rank))) return null;
  s.contrib -= it.cost;
  return grant(game, it.give);
}
