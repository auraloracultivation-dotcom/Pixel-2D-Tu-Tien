// Động phủ (data/cave.json): nguyên liệu, luyện đan, dùng đan, rèn đồ, linh điền mọc theo giờ thật.
import { rollItem, addItem } from './items.js';
import { totalLayer, qiNeed, weaponId } from './stats.js';
import { dailyEvent } from './daily.js';

export function ensureCave(save) { save.mats ??= {}; save.pills ??= {}; save.garden ??= {}; save.flags ??= {}; }

export const matInfo = (data, id) => data.cave.materials[id] || data.items.materials[id];
const has = (save, cost) => Object.entries(cost).every(([k, n]) => (save.mats[k] || 0) >= n);
const pay = (save, cost) => { for (const [k, n] of Object.entries(cost)) save.mats[k] -= n; };
export const costText = (data, cost) => Object.entries(cost).map(([k, n]) => `${matInfo(data, k).name} ${n}`).join(', ');
export const canPay = (game, cost) => has(game.save, cost);

export function addMat(save, id, n = 1) { save.mats[id] = (save.mats[id] || 0) + n; }

// Quái rơi nguyên liệu: [loại, xác suất, số lượng]
export function matDrop(game, m) {
  if (m.noQi) return;
  for (const [id, p, n = 1] of game.data.cave.mat_drops[m.id] || []) {
    if (Math.random() >= p) continue;
    addMat(game.save, id, n);
    game.number(m.x, m.y - 24, `+${n} ${matInfo(game.data, id).name}`, matInfo(game.data, id).color);
  }
}

export function salvageIron(game, rarity) {
  const n = game.data.cave.salvage_iron[rarity] || 0;
  if (n) addMat(game.save, 'tinh-thiet', n);
  return n;
}

// Tỉ lệ luyện thành: theo đan, cộng thêm nếu linh căn hợp (Hỏa)
export function brewRate(game, id) {
  const b = game.data.cave.brew, pill = game.data.cave.pills[id];
  return Math.min(1, (pill.rate ?? b.default) + (b.element_bonus[game.save.element] || 0));
}

// Trả về số viên luyện được, 'fail' nếu lò hỏng (mất nguyên liệu), false nếu không đủ nguyên liệu
export function brew(game, id, rnd = Math.random) {
  const pill = game.data.cave.pills[id], s = game.save;
  if (!pill || !has(s, pill.recipe)) return false;
  pay(s, pill.recipe);
  dailyEvent(game, 'brew');
  if (rnd() >= brewRate(game, id)) { game.persist(); return 'fail'; }
  const n = Math.round(pill.make * game.eventMul('brew'));
  s.pills[id] = (s.pills[id] || 0) + n;
  game.persist();
  return n;
}

// Dùng một viên; trả về chữ báo hoặc null nếu không dùng được
export function usePill(game, id) {
  const { data, save, player: p } = game, pill = data.cave.pills[id], u = pill?.use;
  if (!u || !(save.pills[id] > 0)) return null;
  let msg;
  if (u.heal) {
    if (p.hp >= p.maxHp) return null;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * u.heal);
    msg = `+${Math.round(p.maxHp * u.heal)} máu`;
  } else if (u.qi) {
    save.pills[id]--;
    game.gainQi(qiNeed(save, data.realms) * u.qi, p.x, p.y);
    game.persist();
    return 'Linh khí tràn vào kinh mạch';
  } else if (u.hp) {
    save.flags.boiNguyen = save.flags.boiNguyen || 0;
    if (save.flags.boiNguyen >= u.cap) return null;
    save.flags.boiNguyen++;
    msg = `Máu tối đa +${u.hp} (${save.flags.boiNguyen}/${u.cap})`;
  } else if (u.root) {
    const list = data.realms.roots.list, i = list.findIndex(r => r.id === save.root);
    if (i < 0 || i >= list.length - 1) return null;
    save.root = list[Math.min(list.length - 1, i + u.root)].id;
    msg = `Linh căn lên phẩm ${list.find(r => r.id === save.root).name}! Tu luyện nhanh hơn`;
  } else if (u.trib) {
    if (save.flags.thanhTam) return null;
    save.flags.thanhTam = u.trib;
    msg = 'Tâm tĩnh như nước. Thiên kiếp tới sẽ nhẹ hơn';
  }
  save.pills[id]--;
  game.refreshStats(); game.persist();
  return msg;
}

// Máu cộng thêm vĩnh viễn từ Bồi Nguyên Đan
export function pillHp(save, data) {
  const u = data.cave.pills['boi-nguyen-dan']?.use;
  return u ? (save.flags?.boiNguyen || 0) * u.hp : 0;
}

// Rèn một món theo ô; ô vũ khí thì rèn đúng loại vũ khí đang dùng
export function forge(game, recipeId, slot) {
  const { data, save } = game, r = data.cave.forge.find(x => x.id === recipeId);
  if (!r || !has(save, r.cost)) return null;
  const wt = weaponId(save, data);
  let bases = Object.entries(data.items.bases).filter(([, b]) => b.slot === slot && !b.set);
  if (slot === 'vu-khi') bases = bases.filter(([, b]) => b.weapon === wt).concat(bases.filter(([, b]) => !b.weapon && wt === 'kiem'));
  if (!bases.length) return null;
  const base = bases[Math.floor(Math.random() * bases.length)][0];
  const it = rollItem(data, save, { base, minRarity: r.min_rarity, lvl: totalLayer(save, data.realms) });
  if (!addItem(data, save, it)) return 'full';
  pay(save, r.cost);
  dailyEvent(game, 'forge');
  game.newItems = (game.newItems || 0) + 1;
  game.persist();
  return it;
}

// Linh điền: mỗi ô G một luống. Lưu thời điểm gieo, đủ giờ thì chín.
const now = () => Date.now();
export function plotKey(x, y) { return x + ',' + y; }
export function plotGrowth(game, x, y) {
  const g = game.save.garden, k = plotKey(x, y), ms = game.data.cave.garden.grow_min * 60000;
  if (!g[k]) g[k] = now();
  return Math.min(1, (now() - g[k]) / ms);
}

export function harvest(game) {
  const { map, data, save } = game, cfg = data.cave.garden;
  let n = 0;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (map.at(x, y) !== 'G' || plotGrowth(game, x, y) < 1) continue;
    n += cfg.yield; save.garden[plotKey(x, y)] = now();
  }
  if (n) { addMat(save, cfg.herb, n); dailyEvent(game, 'harvest'); game.persist(); }
  return n;
}

// Phút còn lại tới luống chín sớm nhất
export function nextRipe(game) {
  const { map, data } = game;
  let best = Infinity;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (map.at(x, y) !== 'G') continue;
    best = Math.min(best, (1 - plotGrowth(game, x, y)) * data.cave.garden.grow_min);
  }
  return Math.ceil(best);
}
