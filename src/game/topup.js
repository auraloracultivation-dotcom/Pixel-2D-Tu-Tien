// Tiên Ngọc và thẻ tháng (data/topup.json). Đây mới là khung: chưa thu tiền thật, gói nạp chỉ hiện giá.
// Mở nạp thật thì Tiên Ngọc phải do máy chủ giữ (src/net/), không cộng ở đây.
import { grant } from './daily.js';
import { owned } from './fashion.js';

const T = game => game.data.topup;
const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const tn = game => game.save.tn || 0;
function addTn(game, n) { game.save.tn = tn(game) + n; }

// Quà ra mắt một lần để người chơi thử quầy
export function starterGift(game) {
  const s = game.save;
  if (s.tnStarter) return 0;
  s.tnStarter = true; addTn(game, T(game).starter); game.persist();
  return T(game).starter;
}

export const cardLeft = game => Math.max(0, Math.ceil(((game.save.card?.until || 0) - Date.now()) / DAY));
export const cardClaimed = game => game.save.card?.last === ymd(new Date());

// Mua thẻ tháng: chỉ khi đã mở thanh toán thật (máy chủ xác minh rồi mới gọi)
export function activateCard(game) {
  const c = T(game).card, s = game.save, base = Math.max(Date.now(), s.card?.until || 0);
  s.card = { until: base + c.days * DAY, last: s.card?.last || '' };
  addTn(game, c.now); game.persist();
}

export function claimCard(game) {
  const c = T(game).card;
  if (!cardLeft(game) || cardClaimed(game)) return null;
  game.save.card.last = ymd(new Date());
  addTn(game, c.daily.tn);
  return [`${c.daily.tn} ${T(game).name}`, ...grant(game, c.daily.give)];
}

export const shopOwned = (game, x) => !!x.outfit && owned(game, x.outfit);

export function buyTn(game, id) {
  const x = T(game).shop.find(i => i.id === id), s = game.save;
  if (!x || shopOwned(game, x)) return null;
  if (tn(game) < x.tn) return false;
  addTn(game, -x.tn);
  if (x.outfit) { (s.outfits ??= {})[x.outfit] = true; game.persist(); return [game.data.fashion.list[x.outfit].name]; }
  return grant(game, x.give);
}
