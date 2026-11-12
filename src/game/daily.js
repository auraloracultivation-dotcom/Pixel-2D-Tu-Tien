// Việc hằng ngày, lượt treo thưởng mỗi ngày, cống hiến tông môn, chức vị và đổi thưởng (data/daily.json).
import { rollItem, addItem, rollGem, gemInfo, rarityOf, itemName, baseForSlot } from './items.js';
import { totalLayer, weaponId } from './stats.js';
import { addCoins } from './shop.js';
import { praise } from './praise.js';
import { mapGate } from './map-gate.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// Bốc việc theo ngày: cùng ngày thì cùng bộ việc (hạt giống từ ngày)
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export function ensureDaily(game) {
  const s = game.save, cfg = game.data.daily, d = today();
  if (s.daily?.day === d) {   // việc đã bỏ (tháp, luận võ, bí cảnh tài nguyên, treo thưởng: 02/11/2026) thì gỡ khỏi việc hôm nay
    if (s.daily.tasks.some(t => !taskDef(game, t.id) || (!t.n && !reach(game, taskDef(game, t.id))))) s.daily.tasks = s.daily.tasks.filter(t => taskDef(game, t.id) && (t.n || reach(game, taskDef(game, t.id))));   // việc hạ quái ở bản đồ chưa đủ tu vi (chưa làm) thì đổi việc khác
    if (s.daily.tasks.length < cfg.per_day) addTasks(game, s.daily, d);   // per_day tăng giữa ngày (5 → 20, chủ dự án 10/11/2026 13:15): bốc thêm cho đủ
    return s.daily;
  }
  s.daily = { day: d, tasks: [], chest: false };
  addTasks(game, s.daily, d);
  return s.daily;
}

// Bốc việc cho đủ per_day (cùng ngày thì cùng bộ việc; việc đã có giữ nguyên)
function addTasks(game, dl, d) {
  const s = game.save, cfg = game.data.daily, have = new Set(dl.tasks.map(t => t.id)), rnd = seeded(d + (game.owner || ''));
  const pool = cfg.pool.filter(t => (!t.need || s.flags[t.need]) && !(game.data.dungeon.closed || []).includes(t.id) && reach(game, t));
  while (dl.tasks.length < cfg.per_day && pool.length) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0].id;
    if (!have.has(id)) dl.tasks.push({ id, n: 0, got: false });
  }
}

// Hạ quái làm được không (chủ dự án 12/11/2026 10:57: nhiệm vụ hạ quái ở tinh cầu chưa đủ tu vi tới thì sao làm): quái có ở bản đồ thường
// thì phải có ít nhất một bản đồ đó mở theo tu vi (src/game/map-gate.js); quái chỉ có trong bí cảnh, việc khác: giữ như cũ (need lo).
function reach(game, t) {
  if (t.type !== 'kill' || !t.mob) return true;
  const maps = Object.entries(game.data.maps).filter(([, m]) => (m.spawners || []).some(x => x.mob === t.mob));
  return !maps.length || maps.some(([id]) => !mapGate(game, id));
}

export const taskDef = (game, id) => game.data.daily.pool.find(t => t.id === id);
export const taskText = (t, n) => t.text.replace('{n}', t.n) + ` (${Math.floor(Math.min(n, t.n))}/${t.n})`;

// Ghi tiến độ: type theo pool (kill, guard, rare, meditate, bounty, brew, forge, harvest, salvage)
export function dailyEvent(game, type, id, amount = 1) {
  if (!game.save) return;
  if (type === 'brew' || type === 'harvest' || type === 'fish') praise(game, type);
  const dl = ensureDaily(game);
  for (const t of dl.tasks) {
    const d = taskDef(game, t.id);
    if (!d || d.type !== type || (d.mob && d.mob !== id) || (d.map && d.map !== id) || t.n >= d.n) continue;
    t.n = Math.min(d.n, t.n + amount);
    if (game.data.daily.off) continue;   // việc ngày giờ thành nhiệm vụ ngày của Hệ Thống (chủ dự án 06/11/2026): chỉ đếm, nhận điểm ở bảng Hệ Thống
    if (t.n >= d.n && game.pilot) autoClaim(game, dl.tasks.indexOf(t), d);
    else if (t.n >= d.n) game.toast(`Xong việc hằng ngày: ${d.text.replace('{n}', d.n)}. Mở bảng Việc để nhận thưởng.`, 2.2);
    game.newDaily = true;
  }
}

// Hạ quái: việc đánh quái + việc Trấn giữ vùng an toàn (#47, #48: quái thường gần NPC, data/daily.json guard.r)
export function dailyKill(game, m) {
  dailyEvent(game, 'kill', m.id);
  const r = game.data.daily.guard?.r;
  // Trấn giữ (chủ dự án 12/11/2026 11:36: Đi làm không dẫn đi được): hạ quái thường ở tinh cầu có dân làng là tính, ngoài bí cảnh;
  // tự hành làm như hạ quái bất kỳ (src/game/dailyjob.js)
  if (r && m.def.ai !== 'boss' && !m.wb && !game.dungeon && game.npcs?.length) dailyEvent(game, 'guard', m.id);
}

// Đang tự hành: xong việc thì nhận thưởng luôn, đủ hết thì mở rương
function autoClaim(game, idx, d) {
  const got = claimTask(game, idx), chest = claimChest(game);
  game.toast(`Xong việc hằng ngày: ${d.text.replace('{n}', d.n)}. Nhận ${got.join(', ')}.`, 2.6);
  if (chest) setTimeout(() => game.toast(`Xong hết việc hôm nay, mở rương: ${chest.join(', ')}.`, 3), 2800);
}

// Phát thưởng chung: coins (Linh Thạch), stones, qi, gem (số viên), item (độ hiếm thấp nhất), mats, pills
export function grant(game, r, why = 'thuong') {   // why: mã lý do Lịch sử Linh Thạch
  const { data, save } = game, got = [];
  if (r.coins) { addCoins(game, r.coins, why); got.push(`${r.coins} ${data.shop.name}`); }
  if (r.stones) { save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + r.stones; got.push(`${r.stones} Tẩy Luyện Thạch`); }
  for (let i = 0; i < (r.gem || 0); i++) { const g = rollGem(data); save.gems[g] = (save.gems[g] || 0) + 1; got.push(gemInfo(data, g).name); }
  for (const [k, n] of Object.entries(r.mats || {})) { save.mats[k] = (save.mats[k] || 0) + n; got.push(`${n} ${data.cave.materials[k]?.name || k}`); }
  for (const [k, n] of Object.entries(r.pills || {})) { save.pills[k] = (save.pills[k] || 0) + n; got.push(`${n} ${data.cave.pills[k].name}`); }
  if (r.item) {
    const it = rollItem(data, save, { lvl: totalLayer(save, data.realms), minRarity: r.item, base: r.slot ? baseForSlot(data, r.slot, weaponId(save, data)) : undefined });   // bí cảnh rơi đúng ô trang bị
    if (addItem(data, save, it)) { got.push(`[${rarityOf(data.items, it.rarity).name}] ${itemName(data, it)}`); game.newItems = (game.newItems || 0) + 1; }
    else got.push('(túi đầy, mất trang bị)');
  }
  if (r.qi) got.push(`${game.gainQi(r.qi, game.player.x, game.player.y)} linh khí`);
  game.refreshStats(); game.persist();
  return got;
}

export function claimTask(game, idx) {
  const t = ensureDaily(game).tasks[idx], d = t && taskDef(game, t.id);
  if (!d || t.got || t.n < d.n) return null;
  t.got = true;
  return grant(game, d.reward, 'viec-ngay');
}

export function claimChest(game) {
  const dl = ensureDaily(game);
  if (dl.chest || !dl.tasks.every(t => t.got)) return null;
  dl.chest = true;
  return grant(game, game.data.daily.chest, 'viec-ngay');
}

