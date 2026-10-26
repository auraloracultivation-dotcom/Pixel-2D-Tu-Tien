// Dược viên (data/garden.json): các luống linh điền trong động phủ. Khai hoang thêm luống, nâng cấp từng luống,
// chọn cây để gieo. Luống chín theo giờ thật; có đạo lữ thì đạo lữ thu hoạch giúp.
import { caveLevel } from './evolve.js';
import { dailyEvent } from './daily.js';
import { addCoins, coins } from './shop.js';
import { daoLuHere } from './affinity.js';

const C = game => game.data.garden;
const now = () => Date.now();
const key = ([x, y]) => x + ',' + y;

// herbs: { n: số luống đã có, lv: {chỉ số: cấp}, crop: {chỉ số: cây} }; garden[x,y]: lúc gieo
export function herbs(game) {
  const s = game.save;
  s.garden ??= {};
  return s.herbs ??= { n: C(game).start, lv: {}, crop: {} };
}

export const plotIndex = (game, x, y) => C(game).plots.findIndex(p => p[0] === x && p[1] === y);
export const owned = (game, i) => i >= 0 && i < herbs(game).n;
export const cropOf = (game, i) => { const id = herbs(game).crop[i] || 'linh-thao'; return { id, ...C(game).crops[id] }; };
export const plotLv = (game, i) => herbs(game).lv[i] || 0;

// Phút để chín: theo cây, cấp động phủ, cấp luống
export const growMin = (game, i) => cropOf(game, i).min * caveLevel(game).grow_min / 15 * C(game).levels[plotLv(game, i)].grow_mul;

// 0..1, -1 là đất hoang chưa khai
export function plotGrowth(game, x, y) {
  const i = plotIndex(game, x, y);
  if (!owned(game, i)) return -1;
  const g = game.save.garden, k = x + ',' + y;
  if (!g[k]) g[k] = now();
  return Math.min(1, (now() - g[k]) / (growMin(game, i) * 60000));
}

const add = (s, id, n) => { s.mats[id] = (s.mats[id] || 0) + n; };
const has = (s, cost) => Object.entries(cost || {}).every(([k, n]) => (s.mats[k] || 0) >= n);
const pay = (s, cost) => { for (const [k, n] of Object.entries(cost || {})) s.mats[k] -= n; };

// Thu mọi luống chín; trả về { tên cây: số }
export function harvestAll(game) {
  const s = game.save, got = {};
  herbs(game).n && C(game).plots.forEach((p, i) => {
    if (!owned(game, i) || plotGrowth(game, p[0], p[1]) < 1) return;
    const c = cropOf(game, i), n = c.n * caveLevel(game).yield + C(game).levels[plotLv(game, i)].bonus;
    add(s, c.id, n); got[c.name] = (got[c.name] || 0) + n;
    s.garden[key(p)] = now();
  });
  if (Object.keys(got).length) { dailyEvent(game, 'harvest'); game.persist(); }
  return got;
}
export const gotText = got => Object.entries(got).map(([k, n]) => `${n} ${k}`).join(', ');

// Phút tới luống chín sớm nhất
export function nextRipe(game) {
  let best = Infinity;
  C(game).plots.forEach((p, i) => { if (owned(game, i)) best = Math.min(best, (1 - plotGrowth(game, p[0], p[1])) * growMin(game, i)); });
  return Math.ceil(best);
}

export const openCost = game => C(game).open_cost[herbs(game).n - C(game).start];
export function openPlot(game) {
  const c = openCost(game);
  if (c == null || coins(game.save) < c) return false;
  addCoins(game, -c);
  const h = herbs(game);
  game.save.garden[key(C(game).plots[h.n])] = now();
  h.n++; game.persist();
  return true;
}

export const nextLv = (game, i) => C(game).levels[plotLv(game, i) + 1] || null;
export function upgradePlot(game, i) {
  const n = nextLv(game, i), s = game.save;
  if (!n || coins(s) < n.cost.coins || !has(s, n.cost.mats)) return false;
  addCoins(game, -n.cost.coins); pay(s, n.cost.mats);
  herbs(game).lv[i] = plotLv(game, i) + 1; game.persist();
  return true;
}

export const cropOk = (game, id) => game.save.realm >= (C(game).crops[id].realm || 0);
// Đổi cây: bỏ hạt, gieo lại từ đầu
export function plant(game, i, id) {
  const c = C(game).crops[id], s = game.save;
  if (!cropOk(game, id) || !has(s, c.seed)) return false;
  pay(s, c.seed);
  herbs(game).crop[i] = id; s.garden[key(C(game).plots[i])] = now(); game.persist();
  return true;
}

// Đạo lữ thu hoạch giúp (mỗi helper_sec giây, ở đâu cũng được)
export function updateGarden(game, dt) {
  if (!daoLuHere(game) || !game.save.flags['dong-phu'] || (game.gardenT = (game.gardenT ?? 5) - dt) > 0) return;
  game.gardenT = C(game).helper_sec;
  const got = harvestAll(game);
  if (Object.keys(got).length) game.say(game.data.npcs[daoLuHere(game)].name, `Ta thu hoạch dược viên giúp rồi nhé: ${gotText(got)}.`, 3);
}
