// Tiến hóa linh thú (data/pets.json → evolve) và nâng cấp động phủ (data/cave.json → levels).
import { addFx } from './combat.js';
import { coins, addCoins } from './shop.js';

const has = (save, cost) => Object.entries(cost || {}).every(([k, n]) => (save.mats[k] || 0) >= n);
const pay = (save, cost) => { for (const [k, n] of Object.entries(cost || {})) save.mats[k] -= n; };

// Chỉ số linh thú sau tiến hóa: tên mới, sát thương và chiêu mạnh hơn
export function petDef(data, save, id) {
  const d = data.pets.pets[id], E = data.pets.evolve;
  if (!save.pets[id]?.evo) return d;
  return { ...d, name: d.evo, mult: d.mult * E.mult, skill: { ...d.skill, cd: d.skill.cd * E.skill_cd }, evo: true };
}
export const petMax = (data, save, id) => save.pets[id]?.evo ? data.pets.evolve.max_level : data.pets.max_level;

// 'ok' | 'level' (chưa đủ cấp) | 'cost' (thiếu nguyên liệu, Linh Thạch) | null
export function canEvolve(game, id) {
  const s = game.save, st = s.pets[id], E = game.data.pets.evolve;
  if (!st || st.evo) return null;
  if (st.lv < E.level) return 'level';
  return has(s, E.cost) && coins(s) >= E.coins ? 'ok' : 'cost';
}

export function evolvePet(game, id) {
  if (canEvolve(game, id) !== 'ok') return false;
  const s = game.save, E = game.data.pets.evolve;
  pay(s, E.cost); addCoins(game, -E.coins);
  s.pets[id].evo = true;
  if (s.pet === id && game.pet) {
    game.pet.def = petDef(game.data, s, id);
    addFx(game, { type: 'ring', x: game.pet.x, y: game.pet.y, r: 30, color: game.pet.def.color, life: 0.9, fill: true });
  }
  game.toast(`${game.data.pets.pets[id].name} tiến hóa thành ${game.data.pets.pets[id].evo}!`, 3);
  game.sfx('levelup'); game.screen.shake(3, 0.4); game.persist();
  return true;
}

// Động phủ: cấp hiện tại (đếm từ 0) và chỉ số theo cấp
export const caveLv = save => save.caveLv || 0;
export const caveLevel = game => game.data.cave.levels[caveLv(game.save)];

export function caveNext(game) {
  const L = game.data.cave.levels, s = game.save, n = L[caveLv(s) + 1];
  if (!n) return null;
  return { ...n, ok: s.realm >= n.realm && has(s, n.cost) && coins(s) >= n.coins };
}

export function upgradeCave(game) {
  const n = caveNext(game), s = game.save;
  if (!n?.ok) return false;
  pay(s, n.cost); addCoins(game, -n.coins);
  s.caveLv = caveLv(s) + 1;
  game.toast(`Động phủ lên cấp: ${n.name}!`, 3);
  game.sfx('levelup'); game.screen.shake(3, 0.4); game.persist();
  return true;
}

// Hệ số đả tọa: trong động phủ theo cấp, nơi khác theo bản đồ
export const meditateMul = game => game.map.id === game.data.cave.map ? caveLevel(game).meditate_mul : (game.map.def.meditate_mul || 1);
