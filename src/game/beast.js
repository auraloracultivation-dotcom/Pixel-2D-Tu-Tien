// Chỉ số linh thú, khôi lỗi, thú cưỡi, thời trang (chủ dự án chốt 02/11/2026 14:39; số liệu data/pets.json → beast).
// - Linh thú (và khôi lỗi): mỗi loài có chỉ số gốc cố định (bốc ngẫu nhiên một lần theo tên loài, ai cũng như ai), lớn theo cấp,
//   sao, tiến hoá; tẩy luyện như trang bị: mỗi lần mở thêm 1 dòng màu lục → đen, giữ cố định, trần dòng 1–10 (src/game/tiers.js).
//   Chỉ số này cộng vào lực chiến của nhân vật (con đang mang), không cộng vào chỉ số cơ bản.
// - Thú cưỡi: ngoài tốc chạy có 1 dòng % một chỉ số bất kỳ (tẩy luyện là bốc lại dòng đó), cộng thẳng vào chỉ số nhân vật.
// - Thời trang: 1 dòng chỉ số bốc lúc có bộ, màu theo độ hiếm của bộ, cố định mãi; bộ đang mặc thì cộng vào chỉ số nhân vật.
import { newLine, lineValue, addLine, ensureCap, tierOf } from './tiers.js';
import { coins, addCoins } from './shop.js';
import { curOutfit, owned } from './fashion.js';

const B = data => data.pets.beast;

// Số giả ngẫu nhiên cố định theo chuỗi (cùng loài → cùng chỉ số gốc)
function h01(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return ((x >>> 0) % 10000) / 10000;
}

export function speciesBase(data, kind, id) {
  const out = {};
  for (const [s, [mn, mx]] of Object.entries(B(data).base)) out[s] = Math.round(mn + h01(`${kind}:${id}:${s}`) * (mx - mn));
  return out;
}

export const beastOf = (save, kind, id) => (kind === 'pet' ? save.pets?.[id] : save.comps?.[id]);   // khôi lỗi: save.comps

// Chỉ số cuối của một con: gốc × cấp × sao × tiến hoá + các dòng tẩy luyện
export function beastStats(data, save, kind, id) {
  const b = beastOf(save, kind, id), C = B(data);
  if (!b) return {};
  const mul = (1 + ((b.lv || 1) - 1) * C.lv) * (1 + (b.star || 0) * C.star) * (b.evo ? 1 + C.evo : 1), out = {};
  for (const [s, v] of Object.entries(speciesBase(data, kind, id))) out[s] = Math.round(v * mul);
  for (const l of b.lines || []) out[l.s] = (out[l.s] || 0) + l.v;
  return out;
}

export const statLine = (data, st) => Object.entries(st).map(([s, v]) => `${data.items.stats[s]?.name || s} +${v}${data.items.stats[s]?.pct ? '%' : ''}`).join(' · ');
export const linesText = (data, ls) => (ls || []).map(l => `[${tierOf(data, l.t).name}] ${data.items.stats[l.s]?.name || l.s} +${l.v}${data.items.stats[l.s]?.pct ? '%' : ''}`);

// Phí tẩy: coins × mul^(số dòng đang có) + nguyên liệu
export function rerollCost(data, b) {
  const R = B(data).reroll, n = (b?.lines || []).length;
  return { coins: Math.round(R.coins * R.mul ** n), mats: R.mats };
}
const canPay = (save, c) => coins(save) >= c.coins && Object.entries(c.mats || {}).every(([m, n]) => (save.mats[m] || 0) >= n);
const pay = (game, c) => { addCoins(game, -c.coins); for (const [m, n] of Object.entries(c.mats || {})) game.save.mats[m] -= n; };
export const costLine = (data, c) => [`${c.coins.toLocaleString('vi-VN')} ${data.shop.name}`, ...Object.entries(c.mats || {}).map(([m, n]) => `${n} ${data.cave.materials[m]?.name || m}`)].join(', ');

// Tẩy luyện linh thú / khôi lỗi: mở thêm 1 dòng. Trả câu báo
export function rerollBeast(game, kind, id) {
  const { data } = game, s = game.save, b = beastOf(s, kind, id);
  if (!b) return 'Không có.';
  b.lvl = b.lv || 1;
  ensureCap(data, b);
  if ((b.lines || []).length >= b.cap) return `Đã đủ ${b.cap} dòng, không tẩy thêm được.`;
  const c = rerollCost(data, b);
  if (!canPay(s, c)) return `Chưa đủ: cần ${costLine(data, c)}.`;
  pay(game, c);
  const r = addLine(data, b, B(data).pool);
  game.refreshStats(); game.persist(); game.sfx('levelup');
  return `Mở dòng ${tierOf(data, r.line.t).name}: ${data.items.stats[r.line.s].name} +${r.line.v}${r.last ? ' · đã đủ dòng' : ''}`;
}

// Thú cưỡi: dòng % một chỉ số (save.mountLine[id]); chưa có thì bốc khi có con đó
export function mountLine(game, id) {
  const s = game.save;
  if (!s.mounts?.[id]) return null;
  s.mountLine ??= {};
  if (!s.mountLine[id]) { s.mountLine[id] = newLine(game.data, B(game.data).mount.pool, 0); game.persist(); }
  return s.mountLine[id];
}
export function rerollMount(game, id) {
  const { data } = game, s = game.save, M = B(data).mount;
  if (!s.mounts?.[id]) return 'Không có thú cưỡi này.';
  if (!canPay(s, M.reroll)) return `Chưa đủ: cần ${costLine(data, M.reroll)}.`;
  pay(game, M.reroll);
  const l = s.mountLine[id] = newLine(data, M.pool, 0);
  game.refreshStats(); game.persist(); game.sfx('levelup');
  return `Dòng mới [${tierOf(data, l.t).name}] ${data.items.stats[l.s].name} +${l.v}%`;
}

// Thời trang: dòng bốc một lần lúc có bộ, màu theo nguồn bộ (fashion.json → from), cố định
export function outfitLine(game, key, f) {
  const s = game.save, F = B(game.data).fashion;
  s.outfitLine ??= {};
  // bộ bán bằng Linh Thạch: phẩm theo giá (pets.json → beast.fashion.price_tier); khác thì theo nguồn
  const src = Object.keys(f.from).find(k => F.tier[k] != null), pt = (f.from.shop && F.price_tier?.find(([lim]) => f.from.shop < lim)) || (f.from.tn && F.tn_tier?.find(([lim]) => f.from.tn < lim));   // Tiên Ngọc: bảng riêng
  const t = pt ? pt[1] : F.tier[src] ?? 0;
  if (s.outfitLine[key] && pt && s.outfitLine[key].t !== t) delete s.outfitLine[key];   // đổi giá → phẩm mới, bốc lại
  if (!s.outfitLine[key]) {
    const st = f.line?.s || F.pool[Math.floor(Math.random() * F.pool.length)];   // bộ có dòng định sẵn (Thần Nguyên Y: sát thương bạo kích)
    s.outfitLine[key] = { s: st, v: lineValue(game.data, st, 0, t, Math.random()), t };
    game.persist();
  }
  return s.outfitLine[key];
}

// Cộng vào chỉ số nhân vật (src/game/stats.js): dòng thú cưỡi đang chọn + dòng bộ thời trang đang mặc
export function wornExtra(save, data) {
  const out = {}, add = l => { if (l && data.items.stats[l.s]) out[l.s] = (out[l.s] || 0) + l.v; };
  if (save.mount) add(save.mountLine?.[save.mount]);
  const look = data.heroes.list[save.look] ? save.look : data.heroes.default;
  const r = data.fashion.renamed?.[save.outfit], oid = r ? (typeof r === 'string' ? r : r[look]) : save.outfit;   // bộ cũ đã đổi tên
  if (oid) add(save.outfitLine?.[`${oid}:${look}`]);
  return out;
}

// Lực chiến thêm từ linh thú đang mang (và khôi lỗi đang mang): quy chỉ số ra lực chiến như của nhân vật
export function beastPower(game) {
  const s = game.save, data = game.data, w = data.status.power, st = game.player?.st;
  if (!s || !st) return 0;
  const conv = { atk: v => v * w.atk, hp: v => v * w.maxHp, def: v => v * w.def, crit: v => v / 100 * w.crit, crit_dmg: v => v / 100 * w.critMult, cdr: v => v / 100 * w.cdr,
    atk_pct: v => st.atk * v / 100 * w.atk, hp_pct: v => st.maxHp * v / 100 * w.maxHp, speed: v => v / 100 * w.speedMul, qi_gain: () => 0 };
  const list = [s.pet && ['pet', s.pet], s.companion && ['puppet', s.companion], s.companion2 && ['puppet', s.companion2]].filter(Boolean);
  let n = 0;
  for (const [k, id] of list) for (const [stt, v] of Object.entries(beastStats(data, s, k, id))) n += conv[stt]?.(v) || 0;
  return Math.round(n);
}

// Bốc dòng còn thiếu của thú cưỡi đang chọn và bộ đang mặc (player.js gọi trước khi tính chỉ số)
export function ensureWornLines(game) {
  const s = game.save;
  if (!s) return;
  if (s.mount) mountLine(game, s.mount);
  const id = curOutfit(game), look = game.data.heroes.list[s.look] ? s.look : game.data.heroes.default;
  if (s.outfit && owned(game, id, look)) outfitLine(game, `${id}:${look}`, game.data.fashion.list[id]);
}
