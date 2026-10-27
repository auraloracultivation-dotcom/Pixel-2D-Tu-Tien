// Trang bị chỉ số ngẫu nhiên, ngọc khảm, tẩy luyện, phân giải. Số liệu ở data/items.json.
// Mọi thay đổi đi qua các hàm ở đây để sau này chuyển sang hàm máy chủ (RPC) cho dễ.

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

function rollLines(items, base, rar, lvl, rnd) {
  const pool = [...base.pool], lines = [];
  for (let i = 0; i < rar.lines && pool.length; i++) {
    const s = pool.splice(Math.floor(rnd() * pool.length), 1)[0], def = items.stats[s];
    const v = (def.min + rnd() * (def.max - def.min)) * grow(items, s, items.line_per_lvl, lvl) * rar.mult;
    lines.push({ s, v: Math.max(1, Math.round(v)) });
  }
  return lines;
}

// Tạo một món mới. minRarity: độ hiếm thấp nhất (boss rơi từ Linh trở lên)
export function rollItem(data, save, { base: baseId, lvl = 0, minRarity, rarity, rnd = Math.random } = {}) {
  ensureInv(save);
  const items = data.items;
  const baseKeys = Object.keys(items.bases).filter(k => !items.bases[k].set); // đồ bộ chỉ rơi ở boss
  const id = baseId || baseKeys[Math.floor(rnd() * baseKeys.length)];
  const base = items.bases[id];
  const minIdx = minRarity ? items.rarities.findIndex(r => r.id === minRarity) : 0;
  const rar = rarity ? rarityOf(items, rarity) : pickWeighted(items.rarities.slice(minIdx), r => r.weight, rnd);
  const main = {};
  for (const [s, v] of Object.entries(base.main)) main[s] = Math.max(1, Math.round(v * grow(items, s, items.main_per_lvl, lvl) * rar.mult));
  return { uid: save.nextUid++, base: id, rarity: rar.id, lvl, main, lines: rollLines(items, base, rar, lvl, rnd), sockets: Array(rar.sockets).fill(null) };
}

export function addItem(data, save, item) {
  ensureInv(save);
  if (save.bag.length >= data.items.bag_size) return false;
  save.bag.push(item);
  return true;
}

export function itemName(data, item) {
  return `${data.items.bases[item.base].name}${item.plus ? ' +' + item.plus : ''}`;
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
  const n = rarityOf(data.items, it.rarity).salvage;
  save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + n;
  return n;
}

// Phí Linh Thạch tẩy luyện (items.reroll_fee): càng tẩy một món nhiều lần càng đắt, mỗi ngày qua rẻ lại vài bậc
const dayNo = now => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);
export function rerollCount(data, it, now = Date.now()) {
  const f = data.items.reroll_fee, d = dayNo(now);
  return Math.max(0, (it.rr || 0) - f.decay * Math.max(0, d - (it.rrDay ?? d)));
}
export function rerollFee(data, save, it, now = Date.now()) {
  const f = data.items.reroll_fee;
  return Math.round(f.base * f.realm_mul ** (save.realm || 0) * f.r ** rerollCount(data, it, now));
}

// Tẩy luyện: quay lại toàn bộ dòng phụ, giữ độ hiếm, cấp và chỉ số chính
// Tẩy luyện; lock: chỉ số dòng giữ lại (tốn thêm Khóa Linh Thạch, các dòng mới không trùng chỉ số dòng giữ)
export function reroll(data, save, uid, rnd = Math.random, lock = null, now = Date.now()) {
  const it = save.bag.find(x => x.uid === uid), lk = data.items.reroll_lock;
  const cost = data.items.reroll_cost, keep = lock != null ? it?.lines[lock] : null;
  if (!it || (save.mats['tay-luyen-thach'] || 0) < cost) return false;
  const fee = rerollFee(data, save, it, now);
  if ((save.lingshi || 0) < fee) return false;
  if (lock != null && (!keep || (save.mats[lk.mat] || 0) < lk.n)) return false;
  save.mats['tay-luyen-thach'] -= cost;
  save.lingshi -= fee;
  it.rr = rerollCount(data, it, now) + 1; it.rrDay = dayNo(now);
  const base = data.items.bases[it.base], rar = rarityOf(data.items, it.rarity);
  if (!keep) { it.lines = rollLines(data.items, base, rar, it.lvl, rnd); return true; }
  save.mats[lk.mat] -= lk.n;
  const lines = rollLines(data.items, { ...base, pool: base.pool.filter(s => s !== keep.s) }, { ...rar, lines: rar.lines - 1 }, it.lvl, rnd);
  lines.splice(lock, 0, keep);
  it.lines = lines;
  return true;
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

export function mergeGems(data, save, key) {
  const { type, lv } = gemInfo(data, key), need = data.items.gems.merge;
  if (lv >= data.items.gems.max_level || (save.gems[key] || 0) < need) return false;
  save.gems[key] -= need; if (!save.gems[key]) delete save.gems[key];
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
    for (const l of it.lines || []) { const def = items.stats[l.s]; if (def?.pct) l.v = Math.min(l.v, Math.max(1, Math.round(def.max * rar.mult))); }
  }
}

export function gearStats(data, save) {
  const sum = {};
  const add = (s, v) => { sum[s] = (sum[s] || 0) + v; };
  for (const it of equipped(save)) {
    const k = 1 + (it.plus || 0) * (data.gear?.enhance.main_per || 0);
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
