// Tẩy linh căn (data/elements.json → _reroot): từ Kim Đan, nhờ trưởng lão đổi sang hệ khác, tốn Linh Thạch và nguyên liệu.
// Giữ phẩm linh căn; ô chiêu về mặc định vì chiêu hệ cũ không còn.
import { coins, addCoins } from './shop.js';

const R = game => game.data.elements._reroot;
const pick = a => a[Math.floor(Math.random() * a.length)];

export const rerootNpc = (game, id) => id === R(game).npc && game.save.element && game.save.realm >= R(game).realm;

function costText(game) {
  const c = R(game).cost, M = game.data.cave.materials;
  return [`${c.coins} ${game.data.shop.name}`, ...Object.entries(c.mats).map(([id, n]) => `${n} ${M[id].name}`)].join(', ');
}
function canPay(game) {
  const c = R(game).cost, s = game.save;
  return coins(s) >= c.coins && Object.entries(c.mats).every(([id, n]) => (s.mats[id] || 0) >= n);
}

export async function talkReroot(game, npc) {
  const r = R(game), name = npc.def.name, cost = costText(game);
  const ch = await game.dialog.choose(`${name}: ${pick(r.lines)}`, [
    { id: 'reroot', label: r.label, desc: r.desc.replace('{cost}', cost), color: game.data.elements[game.save.element].color },
    { id: 'talk', label: r.talk, desc: '' },
  ]);
  if (ch === 'talk') { await game.dialog.say([[name, pick(npc.def.lines)]]); return; }
  if (!canPay(game)) { await game.dialog.say([[name, r.short.replace('{cost}', cost)]]); return; }
  const els = Object.entries(game.data.elements).filter(([k]) => !k.startsWith('_') && k !== game.save.element);
  const id = await game.dialog.choose(`${name}: ${r.ask}`, [...els.map(([k, e]) => ({ id: k, label: e.name, desc: e.desc, color: e.color })), { id: 'back', label: r.back, desc: '' }]);
  if (!game.data.elements[id] || id.startsWith('_')) return;
  const s = game.save;
  addCoins(game, -r.cost.coins);
  for (const [m, n] of Object.entries(r.cost.mats)) s.mats[m] -= n;
  s.element = id; s.loadout = null;
  game.refreshStats(); game.checkUnlocks?.(); game.persist();
  game.sfx('levelup');
  await game.dialog.say([[name, r.done.replace('{name}', game.data.elements[id].name)]]);
}
