// Thời trang (data/fashion.json): đổi dáng vẻ nhân vật. Chủ dự án chốt 02/11/2026 14:39: mỗi bộ có bản nam và bản nữ
// (hình hero.y-<bộ>-<nam|nu>), cả hai đều hiện trong bảng; mua bản nào nhận bản đó (s.outfits['<bộ>:<nam|nu>']), giới tính
// không đổi (s.look, chọn lúc vào game; đổi bằng Đan đổi giới tính ở Lò đan). Chỉ mặc được bản đúng giới tính mình.
// Bộ có được nhờ thành tựu, lễ, ma khí, có sẵn: có cả hai bản. Bản lưu cũ outfits[<bộ>] = true: tính là bản theo giới tính hiện tại.
import { coins, addCoins } from './shop.js';
import { newKey } from './inst.js';

const F = game => game.data.fashion.list;
const lookOf = game => (game.data.heroes.list[game.save?.look] ? game.save.look : game.data.heroes.default);

// Áo mặc định của một giới: bộ ghi def đúng giới (chủ dự án 16/11/2026: nam tp-02 Băng Vương, nữ tp-10 Lam Hoa Thiếu Nữ, chọn lúc tạo nhân vật);
// không có thì bộ from.start không ghi only hoặc only đúng giới
export function defOutfit(game, look) {
  const L = F(game), ids = Object.keys(L);
  return ids.find(id => L[id].def === look) || ids.find(id => L[id].from.start && (!L[id].only || L[id].only === look)) || ids[0];
}

// Bộ đang mặc (đã đổi tên bộ cũ: data/fashion.json → renamed). Không còn trong danh sách, hoặc chỉ cho giới kia (only), thì là áo có sẵn của giới mình
export function curOutfit(game, save = game.save) {
  const D = game.data.fashion, id = save?.outfit, r = D.renamed?.[id];
  const look = game.data.heroes.list[save?.look] ? save.look : game.data.heroes.default;
  const x = r ? (typeof r === 'string' ? r : r[look]) : id, f = D.list[x];
  return f && (!f.only || f.only === look) ? x : defOutfit(game, look);
}

// Bản lưu còn bộ / bản giới đã gỡ khỏi data/fashion.json (chủ dự án 15/11/2026 11:39 gỡ bớt): bỏ khỏi outfits, đang mặc thì về áo có sẵn.
// Linh Thạch của bản đã mua do máy chủ hoàn qua Hòm thư (migration 20261115120000_p2d_go_thoi_trang.sql), máy khách không tự cộng.
export function cleanOutfits(game) {
  const s = game.save, L = F(game), look = lookOf(game), bad = (id, g) => !L[id] || (L[id].only && L[id].only !== g);
  let n = 0;
  for (const k of Object.keys(s.outfits || {})) { const [id, g = look] = k.split(':'); if (bad(id, g)) { delete s.outfits[k]; n++; } }
  if (s.outfit) { const r = game.data.fashion.renamed?.[s.outfit], x = r ? (typeof r === 'string' ? r : r[look]) : s.outfit; if (bad(x, look)) { delete s.outfit; n++; } }
  return n;
}

// Bộ có những bản nào (bộ only: một bản)
export const versions = (game, id) => (F(game)[id]?.only ? [F(game)[id].only] : F(game)[id]?.look ? [lookOf(game)] : Object.keys(game.data.heroes.list));   // bộ có hình riêng (look): một bản, nam nữ đều mặc

export function owned(game, id, g = lookOf(game)) {
  const f = F(game)[id]?.from, s = game.save;
  if (!f || (F(game)[id].only && F(game)[id].only !== g)) return false;
  const any = F(game)[id].look && Object.keys(game.data.heroes.list).some(k => s.outfits?.[`${id}:${k}`]);   // bộ có hình riêng: mua bản giới nào cũng mặc được (đổi giới không mất)
  return !!(f.start || any || Object.keys(s.outfits || {}).some(k => s.outfits[k] && k.split('#')[0] === `${id}:${g}`) || (s.outfits?.[id] === true && g === lookOf(game)) || (f.achv && s.achv?.[f.achv]) || (f.fest && s.fest?.[f.fest]) || (f.elite && (s.elite?.[f.elite.map] || 0) >= f.elite.n) || (f.uid && f.uid.includes(game.owner)));
}

export function grantOutfit(game, id, g = lookOf(game)) { (game.save.outfits ??= {})[`${id}:${g}`] = true; }

// Mua thêm được cả bộ đã có (chủ dự án 19/11/2026 13:02): mỗi lần mua là một bản riêng 'bộ:giới#xxxx', phẩm ngẫu nhiên (src/game/inst.js). Trả khoá bản
export function buyOutfit(game, id, g = lookOf(game)) {
  const f = F(game)[id], s = game.save;
  if (!f?.from.shop || coins(s) < f.from.shop) return false;
  addCoins(game, -f.from.shop, 'thoi-trang');
  const key = newKey(`${id}:${g}`);
  (s.outfits ??= {})[key] = true;
  game.persist();
  return key;
}

// Chỉ mặc được bản đúng giới tính của mình
export function wear(game, id, key) { if (owned(game, id, lookOf(game))) { game.save.outfit = id; game.save.outfitKey = key && game.save.outfits?.[key] ? key : null; game.refreshStats?.(); game.persist(); } }   // key: bản đang mặc (src/game/inst.js)   // dòng chỉ số của bộ (src/game/beast.js)

// Màu đang mặc: { robe, hair, sash } (sash null thì dùng màu hệ)
export function outfit(game) {
  const f = F(game)[curOutfit(game)];
  return { robe: f.robe, hair: f.hair, sash: f.sash || null };
}

export const howToGet = (game, f) => f.from.start ? 'Có sẵn' : f.from.soon ? 'Sắp mở bán' : f.from.uid ? 'Bộ riêng' : f.from.shop ? `${f.from.shop} ${game.data.shop.name}`
  : f.from.achv ? `Thành tựu: ${game.data.status.achievements.find(a => a.id === f.from.achv)?.name}` : f.from.fest ? 'Quà lễ Tết'
  : f.from.tn ? `${f.from.tn} ${game.data.topup.name} (Quầy Tiên Ngọc)`
  : f.from.elite ? `Hạ ${f.from.elite.n} quái nhiễm ma khí ở ${game.data.maps[f.from.elite.map]?.name} (${Math.min(f.from.elite.n, game.save.elite?.[f.from.elite.map] || 0)}/${f.from.elite.n})` : '';

// Hạ quái nhiễm ma khí (bãi vòng ngoài tinh cầu): đếm theo tinh cầu, đủ số thì mở bộ thời trang của tinh cầu đó
export function eliteKill(game, m) {
  if (!m.elite) return;
  const s = game.save, id = game.map.id, n = ((s.elite ??= {})[id] = (s.elite[id] || 0) + 1);
  for (const f of Object.values(F(game))) if (f.from.elite?.map === id && f.from.elite.n === n) game.toast(`Mở thời trang: ${f.name}!`, 2.4);
}
