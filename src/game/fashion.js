// Thời trang (data/fashion.json): đổi dáng vẻ nhân vật. Chủ dự án chốt 02/11/2026 14:39: mỗi bộ có bản nam và bản nữ
// (hình hero.y-<bộ>-<nam|nu>), cả hai đều hiện trong bảng; mua bản nào nhận bản đó (s.outfits['<bộ>:<nam|nu>']), giới tính
// không đổi (s.look, chọn lúc vào game; đổi bằng Đan đổi giới tính ở Lò đan). Chỉ mặc được bản đúng giới tính mình.
// Bộ có được nhờ thành tựu, lễ, ma khí, có sẵn: có cả hai bản. Bản lưu cũ outfits[<bộ>] = true: tính là bản theo giới tính hiện tại.
import { coins, addCoins } from './shop.js';

const F = game => game.data.fashion.list;
const lookOf = game => (game.data.heroes.list[game.save?.look] ? game.save.look : game.data.heroes.default);

// Bộ đang mặc (đã đổi tên bộ cũ: data/fashion.json → renamed), không còn trong danh sách thì như đồng phục
export function curOutfit(game, save = game.save) {
  const D = game.data.fashion, id = save?.outfit, r = D.renamed?.[id];
  const look = game.data.heroes.list[save?.look] ? save.look : game.data.heroes.default;
  const x = r ? (typeof r === 'string' ? r : r[look]) : id;
  return D.list[x] ? x : 'dong-phuc';
}

// Bộ có những bản nào (bộ only: một bản)
export const versions = (game, id) => (F(game)[id]?.only ? [F(game)[id].only] : F(game)[id]?.look ? [lookOf(game)] : Object.keys(game.data.heroes.list));   // bộ có hình riêng (look): một bản, nam nữ đều mặc

export function owned(game, id, g = lookOf(game)) {
  const f = F(game)[id]?.from, s = game.save;
  if (!f || (F(game)[id].only && F(game)[id].only !== g)) return false;
  return !!(f.start || s.outfits?.[`${id}:${g}`] || (s.outfits?.[id] === true && g === lookOf(game)) || (f.achv && s.achv?.[f.achv]) || (f.fest && s.fest?.[f.fest]) || (f.elite && (s.elite?.[f.elite.map] || 0) >= f.elite.n) || (f.uid && f.uid.includes(game.owner)));
}

export function grantOutfit(game, id, g = lookOf(game)) { (game.save.outfits ??= {})[`${id}:${g}`] = true; }

export function buyOutfit(game, id, g = lookOf(game)) {
  const f = F(game)[id], s = game.save;
  if (!f?.from.shop || owned(game, id, g) || coins(s) < f.from.shop) return false;
  addCoins(game, -f.from.shop);
  grantOutfit(game, id, g);
  game.persist();
  return true;
}

// Chỉ mặc được bản đúng giới tính của mình
export function wear(game, id) { if (owned(game, id, lookOf(game))) { game.save.outfit = id; game.refreshStats?.(); game.persist(); } }   // dòng chỉ số của bộ (src/game/beast.js)

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
