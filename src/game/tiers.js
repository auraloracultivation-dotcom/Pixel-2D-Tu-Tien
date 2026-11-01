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

// Số dòng tối đa của một món (chủ dự án 02/11/2026 03:58): ngẫu nhiên 1..max theo cap_w, người chơi chỉ biết khi tẩy tới dòng cuối
export function rollCap(data, rnd = Math.random) {
  const W = T(data).cap_w, total = W.reduce((a, x) => a + x, 0);
  let r = rnd() * total;
  for (let i = 0; i < W.length; i++) { r -= W[i]; if (r <= 0) return i + 1; }
  return W.length;
}
// Món chưa có trần dòng (đồ trước 02/11 03:58): bốc trần, không thấp hơn số dòng đang có
export function ensureCap(data, it, rnd = Math.random) {
  if (!Number.isInteger(it.cap)) it.cap = Math.max((it.lines || []).length, rollCap(data, rnd));
  return it.cap;
}
export const linesFull = (data, it) => (it.lines || []).length >= ensureCap(data, it);

// Một lần tẩy (chủ dự án 02/11/2026 03:58): mở thêm đúng 1 dòng, chỉ số và màu (lục → đen) ngẫu nhiên, dòng đã có giữ nguyên.
// Tới trần dòng của món thì hết. Trả về { line, last } hoặc null khi đã đủ dòng.
export function addLine(data, it, pool, rnd = Math.random) {
  if (linesFull(data, it)) return null;
  const line = newLine(data, pool, it.lvl || 0, rnd);
  (it.lines ??= []).push(line);
  return { line, last: it.lines.length >= it.cap };
}
