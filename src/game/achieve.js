// Lực chiến, thành tựu và danh hiệu (data/status.json). Đếm hạ quái ở save.stats; thành tựu xét mỗi 2 giây.
import { grant } from './daily.js';

const C = game => game.data.status;

export function power(game) {
  const st = game.player?.st, w = C(game).power;
  if (!st) return 0;
  let n = 0;
  for (const [k, v] of Object.entries(w)) n += (k === 'critMult' || k === 'speedMul' ? (st[k] || 1) - 1 : st[k] || 0) * v;
  return Math.round(n);
}

export function ensureStats(save) { save.stats ??= { kills: 0, bosses: 0, rares: 0, coins: 0 }; save.achv ??= {}; }

export function countKill(game, m) {
  const s = game.save.stats;
  s.kills++;
  if (m.def.ai === 'boss') s.bosses++;
  if (m.rare) s.rares++;
}

export function progress(game, need) {
  const s = game.save;
  switch (need.type) {
    case 'realm': return s.realm;
    case 'kills': case 'bosses': case 'rares': case 'coins': return s.stats[need.type] || 0;
    case 'tower': return s.tower?.best || 0;
    case 'arena': return s.arena?.best && s.arena.best <= need.n ? need.n : 0;   // hạng: số nhỏ là cao
    case 'pets': return Object.keys(s.pets || {}).length;
    case 'techs': return Object.keys(s.techs || {}).length;
    case 'comps': return Object.keys(s.comps || {}).length;
    case 'power': return power(game);
    case 'flag': return s.flags[need.flag] ? 1 : 0;
  }
  return 0;
}
const target = need => need.n ?? 1;

// achv[id]: 1 = xong chưa nhận, 2 = đã nhận
export function checkAchv(game) {
  const s = game.save;
  for (const a of C(game).achievements) {
    if (s.achv[a.id] || progress(game, a.need) < target(a.need)) continue;
    s.achv[a.id] = 1; game.newAchv = true;
    game.toast(`Thành tựu: ${a.name}!${a.title ? ` Mở danh hiệu ${C(game).titles[a.title].name}.` : ''}`, 2.6);
    game.sfx('levelup');
  }
}

export function claimAchv(game, id) {
  const a = C(game).achievements.find(x => x.id === id), s = game.save;
  if (!a || s.achv[id] !== 1) return null;
  s.achv[id] = 2;
  return grant(game, a.give);
}

export const titles = game => C(game).achievements.filter(a => a.title && game.save.achv[a.id]).map(a => a.title);
export const titleOf = game => C(game).titles[game.save.title] || null;
export function setTitle(game, id) { game.save.title = game.save.title === id ? null : id; game.persist(); }
export const achvText = (game, a) => `${a.text} (${Math.min(progress(game, a.need), target(a.need))}/${target(a.need)})`;
