// Động phủ (data/cave.json): nguyên liệu, luyện đan, dùng đan, rèn đồ, linh điền mọc theo giờ thật.
import { rollItem, addItem } from './items.js';
import { totalLayer, qiNeed, weaponId } from './stats.js';
import { dailyEvent } from './daily.js';
import { caveLevel } from './evolve.js';

export function ensureCave(save, data) {
  save.mats ??= {}; save.pills ??= {}; save.garden ??= {}; save.flags ??= {};
  // Vào game luôn ở động phủ (chủ dự án chốt 02/11/2026), khi đã có động phủ; đang trong bí cảnh, tháp... cũng về nhà
  const H = data?.home;
  if (H?.start_home && save.flags['dong-phu'] && data.maps[H.map]) { save.map = H.map; save.spawn = Object.keys(data.maps[H.map].spawns || {})[0] || 'vao'; }
}

export const matInfo = (data, id) => data.cave.materials[id] || data.items.materials[id];
const has = (save, cost) => Object.entries(cost).every(([k, n]) => (save.mats[k] || 0) >= n);
const pay = (save, cost) => { for (const [k, n] of Object.entries(cost)) save.mats[k] -= n; };
export const costText = (data, cost) => Object.entries(cost).map(([k, n]) => `${matInfo(data, k).name} ${n}`).join(', ');
export const canPay = (game, cost) => has(game.save, cost);

export function addMat(save, id, n = 1) { save.mats[id] = (save.mats[id] || 0) + n; }

// Đan độc: số viên đan linh khí còn được dùng hôm nay (data/cave.json → qi_pill_day)
export function qiPillLeft(game) {
  const L = game.data.cave.qi_pill_day, q = game.save.qiPill;
  if (!L) return Infinity;
  return q?.day === new Date().toDateString() ? Math.max(0, L.n - q.n) : L.n;
}

// Quái rơi nguyên liệu: [loại, xác suất, số lượng]
export function matDrop(game, m) {
  if (m.noQi) return;
  for (const [id, p, n = 1] of game.data.cave.mat_drops[m.id] || []) {
    if (Math.random() >= p * (m.lootMul ?? 1)) continue;
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
  return Math.min(1, (pill.rate ?? b.default) + (b.element_bonus[game.save.element] || 0) + caveLevel(game).brew_bonus);
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
  if (u.x2) return drinkX2Pill(game, id, u);
  if (u.heal) {
    if (p.hp >= p.maxHp) return null;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * u.heal);
    msg = `+${Math.round(p.maxHp * u.heal)} máu`;
  } else if (u.qi) {
    if (qiPillLeft(game) <= 0) return null;
    const day = new Date().toDateString();
    save.qiPill = { day, n: (save.qiPill?.day === day ? save.qiPill.n : 0) + 1 };
    save.pills[id]--;
    game.gainQi(qiNeed(save, data.realms) * u.qi, p.x, p.y, false, true);   // đan linh khí không nhân đôi theo Thăng Linh Đan
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
  let bases = Object.entries(data.items.bases).filter(([, b]) => b.slot === slot && !b.set && !b.dv);   // đồ bộ, đồ Đạo Vận không rèn được
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

// Thăng Linh Đan (đề xuất #39): u.x2 giây linh khí gấp đôi, mỗi ngày u.per_day viên. Đã đăng nhập thì máy chủ ghi giờ hết
// (để hạn mức linh khí không cắt phần nhân đôi); chơi không tài khoản thì chỉ đếm trong máy.
export const x2Left = (game, u) => { const d = new Date().toDateString(), x = game.save.x2Pill; return u.per_day - (x?.day === d ? x.n : 0); };
export const x2Active = game => (game.save.qiX2 || 0) > Date.now();
function drinkX2Pill(game, id, u) {
  const s = game.save;
  if (x2Left(game, u) <= 0 || game.x2Busy) return null;
  const done = het => {
    const d = new Date().toDateString();
    s.x2Pill = { day: d, n: (s.x2Pill?.day === d ? s.x2Pill.n : 0) + 1 };
    s.pills[id]--; s.qiX2 = het; game.persist();
    game.toast(`Linh khí gấp đôi tới ${new Date(het).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`, 2.4);
  };
  if (!game.cloud) { done(Math.max(Date.now(), s.qiX2 || 0) + u.x2 * 1000); return 'Thăng Linh Đan vào bụng, linh khí cuộn trào'; }
  game.x2Busy = true;
  import('../net/danx2.js').then(m => m.drinkX2()).then(r => done(Date.parse(r.het_luc)))
    .catch(e => game.toast(game.data.cave.x2_err[e.message] || game.data.cave.x2_err.net, 2.4))
    .finally(() => { game.x2Busy = false; });
  return 'Đang uống Thăng Linh Đan...';
}
