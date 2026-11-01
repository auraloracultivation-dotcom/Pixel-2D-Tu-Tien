// Màu dòng phụ trang bị (tẩy luyện mới, chủ dự án chốt 02/11/2026; số liệu data/items.json → line_tiers).
// Dòng { s, v, t }: t là bậc màu 0 lục … 6 đen. Phẩm món = trung bình màu các dòng.

const T = data => data.items.line_tiers;
const grow = (items, s, lvl) => items.stats[s]?.pct ? 1 : 1 + lvl * items.line_per_lvl;

export const tierOf = (data, t) => T(data).list[Math.max(0, Math.min(T(data).list.length - 1, t | 0))];

export function pickTier(data, rnd = Math.random) {
  const L = T(data).list, total = L.reduce((a, x) => a + x.w, 0);
  let r = rnd() * total;
  for (let i = 0; i < L.length; i++) { r -= L[i].w; if (r <= 0) return i; }
  return L.length - 1;
}

// Giá trị dòng theo chỉ số, cấp đồ, màu; frac 0..1 là vị trí trong khoảng min–max
export function lineValue(data, s, lvl, t, frac) {
  const def = data.items.stats[s];
  return Math.max(1, Math.round((def.min + frac * (def.max - def.min)) * grow(data.items, s, lvl) * tierOf(data, t).mult));
}

export function newLine(data, pool, lvl, rnd = Math.random, t = pickTier(data, rnd)) {
  const s = pool[Math.floor(rnd() * pool.length)];
  return { s, v: lineValue(data, s, lvl, t, rnd()), t };
}

// Phẩm món theo màu dòng; món chưa có dòng màu thì null (dùng phẩm cũ)
export function quality(data, it) {
  const ls = (it?.lines || []).filter(l => Number.isInteger(l.t));
  if (!ls.length) return null;
  return tierOf(data, Math.round(ls.reduce((a, l) => a + l.t, 0) / ls.length));
}

// Đồ cũ: gắn màu cho dòng chưa có màu, giữ giá trị không thấp hơn cũ, tặng lượt tẩy miễn phí (chạy lại không đổi gì)
export function convertLines(data, it, rar) {
  const C = T(data), ls = it.lines || [];
  if (!ls.length || ls.every(l => Number.isInteger(l.t))) return false;
  for (const l of ls) {
    if (Number.isInteger(l.t)) continue;
    const def = data.items.stats[l.s];
    if (!def) { l.t = 0; continue; }
    const raw = l.v / (grow(data.items, l.s, it.lvl || 0) * (rar?.mult || 1));
    const frac = Math.max(0, Math.min(1, (raw - def.min) / Math.max(1e-9, def.max - def.min)));
    l.t = Math.min(C.list.length - 1, (C.from_rarity[it.rarity] ?? 0) + (frac >= C.top_frac ? 1 : 0));
    l.v = Math.max(l.v, lineValue(data, l.s, it.lvl || 0, l.t, frac));
  }
  it.free = (it.free || 0) + C.free;
  return true;
}

// Một lần tẩy: có thể ra thêm dòng (dây chuyền), không thì quay màu một dòng (chỉ giữ nếu cao hơn). Trả về mô tả kết quả.
export function rollReroll(data, it, pool, rnd = Math.random) {
  const C = T(data), added = [];
  while (it.lines.length < C.max && rnd() < (added.length ? C.chain : C.add) * (C.max - it.lines.length) / C.max) {   // càng nhiều dòng càng khó ra thêm
    const l = newLine(data, pool, it.lvl || 0, rnd); it.lines.push(l); added.push(l);
  }
  if (added.length) return { added };
  if (!it.lines.length) { const l = newLine(data, pool, it.lvl || 0, rnd); it.lines.push(l); return { added: [l] }; }
  const i = Math.floor(rnd() * it.lines.length), l = it.lines[i], t = pickTier(data, rnd);
  if (t <= (l.t | 0)) return { up: null };
  const def = data.items.stats[l.s], g = grow(data.items, l.s, it.lvl || 0) * tierOf(data, l.t).mult;
  const frac = Math.max(0, Math.min(1, (l.v / g - def.min) / Math.max(1e-9, def.max - def.min)));
  l.t = t; l.v = Math.max(l.v, lineValue(data, l.s, it.lvl || 0, t, frac));
  return { up: l };
}
