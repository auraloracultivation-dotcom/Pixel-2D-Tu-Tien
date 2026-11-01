// Trang bị chỉ số ngẫu nhiên, ngọc khảm, tẩy luyện, phân giải. Số liệu ở data/items.json.
// Mọi thay đổi đi qua các hàm ở đây để sau này chuyển sang hàm máy chủ (RPC) cho dễ.
import { newLine, convertLines, rollReroll, tierOf } from './tiers.js';

export function ensureInv(save) {
  save.bag ??= []; save.equip ??= {}; save.gems ??= {}; save.mats ??= {}; save.nextUid ??= 1;
}

function pickWeighted(list, w, rnd) {
  const total = list.reduce((s, x) => s + w(x), 0);
  let r = rnd() * total;
  for (const x of list) { r -= w(x); if (r <= 0) return x; }
  return list[list.length - 1];
}

export function rarityOf(items, id) { return items.rarities.find(r => r.id === id); }

// Chỉ số phần trăm (bạo kích, công %, ...) không lớn theo cấp đồ, chỉ chỉ số cộng thẳng mới lớn theo cấp
const grow = (items, s, per, lvl) => items.stats[s]?.pct ? 1 : 1 + lvl * per;

// Dòng phụ có màu (tiers.js), được trùng chỉ số (tẩy luyện mới 02/11/2026); số dòng lúc rơi theo độ hiếm
function rollLines(items, base, rar, lvl, rnd, data) {
  const lines = [];
  for (let i = 0; i < rar.lines && base.pool.length; i++) lines.push(newLine(data, base.pool, lvl, rnd));
  return lines;
}

// Gốc trang bị ngẫu nhiên của một ô (không đồ bộ, không Đạo Vận); vũ khí theo loại vũ khí đang dùng (weapon)
export function baseForSlot(data, slot, weapon, rnd = Math.random) {
  const B = data.items.bases, ids = Object.keys(B).filter(k => B[k].slot === slot && !B[k].set && !B[k].dv);
  const own = slot === 'vu-khi' ? ids.filter(k => B[k].weapon === weapon) : [];
  const pool = own.length ? own : ids;
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : undefined;
}

// Tạo một món mới. minRarity: độ hiếm thấp nhất (boss rơi từ Linh trở lên)
// Hệ của món (Đạo Vận mới 02/11/2026): mọi trang bị mới có một hệ ngẫu nhiên; đồ cũ chưa có hệ thì lấy theo uid (cố định)
export const elIds = data => Object.keys(data.elements).filter(k => !k.startsWith('_'));
export const matchEl = (data, save, it) => !!it?.el && it.el === save.element;
export const matchMul = (data, save, it) => (matchEl(data, save, it) ? 1 + (data.daovan?.match_main || 0) : 1);

export function rollItem(data, save, { base: baseId, lvl = 0, minRarity, rarity, el, rnd = Math.random } = {}) {
  ensureInv(save);
  const items = data.items;
  const baseKeys = Object.keys(items.bases).filter(k => !items.bases[k].set && !items.bases[k].dv); // đồ bộ chỉ rơi ở boss, đồ Đạo Vận chỉ có ở Con Đường Đạo Vận
  const id = baseId || baseKeys[Math.floor(rnd() * baseKeys.length)];
  const base = items.bases[id];
  const minIdx = minRarity ? items.rarities.findIndex(r => r.id === minRarity) : 0;
  const rar = rarity ? rarityOf(items, rarity) : pickWeighted(items.rarities.slice(minIdx), r => r.weight, rnd);
  const main = {};
  for (const [s, v] of Object.entries(base.main)) main[s] = Math.max(1, Math.round(v * grow(items, s, items.main_per_lvl, lvl) * rar.mult));
  const els = elIds(data);
  return { uid: save.nextUid++, base: id, rarity: rar.id, lvl, main, lines: rollLines(items, base, rar, lvl, rnd, data), sockets: Array(rar.sockets).fill(null), el: el || els[Math.floor(rnd() * els.length)] };
}

export function addItem(data, save, item) {
  ensureInv(save);
  if (save.bag.length >= data.items.bag_size) return false;
  save.bag.push(item);
  return true;
}

export function itemName(data, item) {
  const wt = item.wt && data.weapons[item.wt] ? ` (${data.weapons[item.wt].name})` : '';   // báo lỗi #50: Đạo Vận Binh ghi rõ loại vũ khí (đàn, kiếm…)
  return `${data.items.bases[item.base].name}${wt}${item.el ? ' · ' + (data.elements[item.el]?.name || '') : ''}${item.plus ? ' +' + item.plus : ''}${item.pb ? ' ★' + item.pb : ''}`;
}

// Chiêu của một pháp bảo (Đạo Vận Ấn: theo hệ của món)
export function artOf(data, it) {
  const b = data.items.bases[it?.base];
  return b?.art_by_el?.[it.el] || b?.art || null;
}

export function equipped(save) {
  ensureInv(save);
  return Object.values(save.equip).map(uid => save.bag.find(i => i.uid === uid)).filter(Boolean);
}

export function equip(save, data, uid) {
  const it = save.bag.find(i => i.uid === uid);
  if (!it) return;
  save.equip[data.items.bases[it.base].slot] = uid;
}

export function unequip(save, slot) { delete save.equip[slot]; }

export const isEquipped = (save, uid) => Object.values(save.equip).includes(uid);

// Phân giải: đổi món đồ (không đang mặc) lấy Tẩy Luyện Thạch; ngọc đang khảm trả về túi
export function salvage(data, save, uid) {
  if (isEquipped(save, uid)) return 0;
  const i = save.bag.findIndex(x => x.uid === uid);
  if (i < 0) return 0;
  const it = save.bag[i];
  for (const g of it.sockets) if (g) save.gems[g] = (save.gems[g] || 0) + 1;
  save.bag.splice(i, 1);
  const n = rarityOf(data.items, it.rarity).salvage, rf = enhanceRefund(data, it);
  save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + n + rf.stones;
  if (rf.iron) save.mats['tinh-thiet'] = (save.mats['tinh-thiet'] || 0) + rf.iron;
  if (data.items.bases[it.base]?.dv) for (const [m, k] of Object.entries(data.daovan?.salvage?.mats || {})) save.mats[m] = (save.mats[m] || 0) + k;   // món Đạo Vận: thêm Đạo Vận Thạch
  return n + rf.stones;
}

// Phân giải món đã cường hoá: trả lại gear.enhance.refund phần tinh thiết, thạch đã tốn cho các cấp đã lên (báo lỗi #7, chủ dự án chốt 40%)
export function enhanceRefund(data, it) {
  const e = data.gear?.enhance, k = e?.refund || 0, out = { iron: 0, stones: 0 };
  for (let i = 0; i < Math.min(it.plus || 0, e?.iron?.length || 0); i++) { out.iron += e.iron[i]; out.stones += e.stones[i] || 0; }
  out.iron = Math.floor(out.iron * k); out.stones = Math.floor(out.stones * k);
  return out;
}

// Phí Linh Thạch tẩy luyện (items.reroll_fee): càng tẩy một món nhiều lần càng đắt; decay bậc rẻ lại mỗi ngày (đang 0: không reset)
const dayNo = now => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);
export function rerollCount(data, it, now = Date.now()) {
  const f = data.items.reroll_fee, d = dayNo(now);
  return Math.max(0, (it.rr || 0) - f.decay * Math.max(0, d - (it.rrDay ?? d)));
}
export function rerollFee(data, save, it, now = Date.now()) {
  const f = data.items.reroll_fee;
  return Math.round(f.base * f.realm_mul ** (save.realm || 0) * f.r ** rerollCount(data, it, now) * (f.line_mul || 1) ** Math.max(0, (it.lines?.length || 1) - 1));   // càng nhiều dòng càng đắt
}

// Tẩy luyện mới (02/11/2026): mọi dòng quay lại ngẫu nhiên, có xác suất ra thêm dòng (tối đa line_tiers.max).
// Món có lượt miễn phí (it.free, đồ cũ quy đổi) thì không tốn gì. Trả về { added } hoặc false khi thiếu phí.
export function reroll(data, save, uid, rnd = Math.random, _lock = null, now = Date.now()) {
  const it = save.bag.find(x => x.uid === uid), cost = data.items.reroll_cost;
  if (!it) return false;
  const free = (it.free || 0) > 0, fee = free ? 0 : rerollFee(data, save, it, now);
  if (!free && ((save.mats['tay-luyen-thach'] || 0) < cost || (save.lingshi || 0) < fee)) return false;
  if (free) it.free -= 1;
  else { save.mats['tay-luyen-thach'] -= cost; save.lingshi -= fee; it.rr = rerollCount(data, it, now) + 1; it.rrDay = dayNo(now); }
  return rollReroll(data, it, data.items.bases[it.base].pool, rnd);
}

// Ngọc: khoá "loại:cấp", ví dụ "hong-ngoc:1"
export function gemInfo(data, key) {
  const [type, lv] = key.split(':');
  const t = data.items.gems.types[type];
  return { type, lv: Number(lv), name: `${t.name} cấp ${lv}`, color: t.color, stat: t.stat, value: t.values[Number(lv) - 1] };
}

export function rollGem(data, rnd = Math.random) {
  const types = Object.keys(data.items.gems.types);
  return `${types[Math.floor(rnd() * types.length)]}:1`;
}

export function socket(save, uid, idx, key) {
  const it = save.bag.find(x => x.uid === uid);
  if (!it || idx >= it.sockets.length || !(save.gems[key] > 0)) return false;
  if (it.sockets[idx]) save.gems[it.sockets[idx]] = (save.gems[it.sockets[idx]] || 0) + 1;
  save.gems[key] -= 1; if (!save.gems[key]) delete save.gems[key];
  it.sockets[idx] = key;
  return true;
}

export function unsocket(save, uid, idx) {
  const it = save.bag.find(x => x.uid === uid);
  const key = it?.sockets[idx];
  if (!key) return false;
  save.gems[key] = (save.gems[key] || 0) + 1; it.sockets[idx] = null;
  return true;
}

// Phí Linh Thạch ghép ngọc cấp lv lên lv + 1 (items.gems.merge_fee)
export const gemMergeFee = (data, lv) => { const f = data.items.gems.merge_fee; return Math.round(f.base * f.r ** (lv - 1)); };

// keep: số Linh Thạch luôn chừa lại (tự hành)
export function mergeGems(data, save, key, keep = 0) {
  const { type, lv } = gemInfo(data, key), need = data.items.gems.merge, fee = gemMergeFee(data, lv);
  if (lv >= data.items.gems.max_level || (save.gems[key] || 0) < need || (save.lingshi || 0) - fee < keep) return false;
  save.gems[key] -= need; if (!save.gems[key]) delete save.gems[key];
  save.lingshi -= fee;
  const up = `${type}:${lv + 1}`;
  save.gems[up] = (save.gems[up] || 0) + 1;
  return true;
}

// Cộng chỉ số từ đồ đang mặc + ngọc đã khảm
// Đồ cũ từng nhân chỉ số phần trăm theo cấp: kéo về mức trần của độ hiếm (chạy mỗi lần vào game, chạy lại không đổi gì)
export function fixGearPct(data, save) {
  const items = data.items;
  for (const it of save.bag || []) {
    const rar = rarityOf(items, it.rarity), base = items.bases[it.base];
    if (!rar || !base) continue;
    for (const s of Object.keys(it.main || {})) if (items.stats[s]?.pct && base.main[s] != null) it.main[s] = Math.min(it.main[s], Math.max(1, Math.round(base.main[s] * rar.mult)));
    convertLines(data, it, rar);   // tẩy luyện mới: gắn màu cho dòng đồ cũ
    if (!it.el) { const els = elIds(data); it.el = els[it.uid % els.length]; }   // Đạo Vận mới: đồ cũ chưa có hệ
    for (const l of it.lines || []) { const def = items.stats[l.s]; if (def?.pct) l.v = Math.min(l.v, Math.max(1, Math.round(def.max * (Number.isInteger(l.t) ? tierOf(data, l.t).mult : rar.mult)))); }
  }
}

export function gearStats(data, save) {
  const sum = {};
  const add = (s, v) => { sum[s] = (sum[s] || 0) + v; };
  for (const it of equipped(save)) {
    const b = data.items.bases[it.base], dv = matchMul(data, save, it);   // món cùng hệ linh căn: chỉ số chính mạnh thêm
    const k = (1 + (it.plus || 0) * (data.gear?.enhance.main_per || 0)) * (1 + (b?.slot === 'phap-bao' ? (it.pb || 0) * (data.gear?.refine?.per || 0) : 0)) * dv;   // cường hoá × bậc luyện pháp bảo × hợp hệ
    for (const [s, v] of Object.entries(it.main)) add(s, Math.round(v * k));
    for (const l of it.lines) add(l.s, l.v);
    for (const g of it.sockets) if (g) { const gi = gemInfo(data, g); add(gi.stat, gi.value); }
  }
  for (const [s, def] of Object.entries(data.items.stats)) if (def.cap && sum[s] > def.cap) sum[s] = def.cap;
  return sum;
}

export function statText(data, s, v) {
  const def = data.items.stats[s];
  return `${def.name} +${v}${def.pct ? '%' : ''}`;
}
