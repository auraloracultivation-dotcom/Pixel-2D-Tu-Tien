// Nấu ăn cùng đạo lữ (data/cooking.json): mỗi ngày một bữa từ nguyên liệu trong túi, ăn xong đả tọa nhanh hơn một lúc.
// Khách ghé chơi hôm nay đang ngồi trong nhà thì ăn cùng: thêm phút và thêm thiện cảm.
import { bump } from './achieve.js';
import { addEntry } from './journal.js';
import { isStranger } from './visitors.js';

const C = game => game.data.cooking;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();
const mats = game => game.data.cave.materials;

export const cookedToday = game => game.save.cooked === today();
export const canMake = (game, r) => Object.entries(r.need).every(([id, n]) => (game.save.mats[id] || 0) >= n);
export const needText = (game, r) => Object.entries(r.need).map(([id, n]) => `${n} ${mats(game)[id].name} (có ${game.save.mats[id] || 0})`).join(', ');
const meal = game => (game.save.meal?.until || 0) > Date.now() ? game.save.meal : null;
export const mealMul = game => meal(game)?.qi || 1;
export function mealHud(game) {
  const m = meal(game);
  return m ? C(game).hud.replace('{dish}', C(game).recipes[m.id]?.name || '').replace('{min}', Math.ceil((m.until - Date.now()) / 60000)) : '';
}

// Món tốt nhất nấu được (tự hành dùng): lấy món có tổng hiệu ứng lớn nhất
export function bestRecipe(game) {
  const score = r => (r.buff.qi - 1) * r.buff.min;
  return Object.entries(C(game).recipes).filter(([, r]) => canMake(game, r)).sort((a, b) => score(b[1]) - score(a[1]))[0]?.[0] || null;
}

async function choose(game, npc) {
  const R = C(game).recipes, opts = Object.entries(R).filter(([, r]) => canMake(game, r)).map(([id, r]) => ({
    id, label: r.name, desc: `${needText(game, r)} · +${Math.round((r.buff.qi - 1) * 100)}% ${r.buff.min} phút`, color: '#ffd08a',
  }));
  opts.push({ id: 'back', label: C(game).back, desc: '' });
  const ch = await game.dialog.choose(`${npc.def.name}: ${C(game).pick}`, opts);
  return R[ch] ? ch : null;
}

export async function cook(game, npc) {
  const id = game.pilot ? bestRecipe(game) : bestRecipe(game) && await choose(game, npc);
  if (!id) { if (!bestRecipe(game)) await game.dialog.say([[npc.def.name, C(game).none]]); return; }
  const r = C(game).recipes[id], s = game.save, G = C(game).guest;
  for (const [m, n] of Object.entries(r.need)) s.mats[m] -= n;
  const guest = game.npcs.find(n => n.visit);
  const min = r.buff.min + (guest ? G.min : 0);
  s.cooked = today(); s.meal = { id, qi: r.buff.qi, until: Date.now() + min * 60000 };
  bump(game, 'cook');
  if (!s.cookOnce) { s.cookOnce = true; addEntry(game, game.data.journal.cook.replace('{name}', npc.def.name).replace('{dish}', r.name)); }
  if (guest && !isStranger(game, guest.id)) { s.affinity ??= {}; s.affinity[guest.id] = Math.min(game.data.affinity.max, (s.affinity[guest.id] || 0) + G.pts); }
  game.persist();
  game.sfx('pickup');
  const L = C(game).lines, lines = [[npc.def.name, pick(L[npc.id] || L.default)]];
  if (guest) lines.push([guest.def.name, pick(G.lines[guest.id] || G.lines.default)]);
  await game.dialog.say(lines);
  game.toast(C(game).toast.replace('{dish}', r.name).replace('{pct}', Math.round((r.buff.qi - 1) * 100)).replace('{min}', min), 3);
  if (guest) game.toast(G.toast.replace('{name}', guest.def.name).replace('{min}', G.min), 3);
}
