// Thời trang (data/fashion.json): đổi màu áo, tóc, đai; không cộng chỉ số.
import { coins, addCoins } from './shop.js';

const F = game => game.data.fashion.list;

export function owned(game, id) {
  const f = F(game)[id]?.from, s = game.save;
  if (!f) return false;
  return !!(f.start || s.outfits?.[id] || (f.achv && s.achv?.[f.achv]) || (f.fest && s.fest?.[f.fest]));
}

export function buyOutfit(game, id) {
  const f = F(game)[id], s = game.save;
  if (!f?.from.shop || owned(game, id) || coins(s) < f.from.shop) return false;
  addCoins(game, -f.from.shop);
  (s.outfits ??= {})[id] = true;
  game.persist();
  return true;
}

export function wear(game, id) { if (owned(game, id)) { game.save.outfit = id; game.persist(); } }

// Màu đang mặc: { robe, hair, sash } (sash null thì dùng màu hệ)
export function outfit(game) {
  const f = F(game)[game.save?.outfit] || F(game)['dong-phuc'];
  return { robe: f.robe, hair: f.hair, sash: f.sash || null };
}

export const howToGet = (game, f) => f.from.start ? 'Có sẵn' : f.from.shop ? `${f.from.shop} ${game.data.shop.name}`
  : f.from.achv ? `Thành tựu: ${game.data.status.achievements.find(a => a.id === f.from.achv)?.name}` : f.from.fest ? 'Quà lễ Tết'
  : f.from.tn ? `${f.from.tn} ${game.data.topup.name} (Quầy Tiên Ngọc)` : '';
