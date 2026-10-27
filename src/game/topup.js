// Tiên Ngọc và thẻ tháng (data/topup.json). Đây mới là khung: chưa thu tiền thật, gói nạp chỉ hiện giá.
// Đã đăng nhập và lưu máy chủ: Tiên Ngọc do máy chủ giữ (hàm p2d_qua_tn, p2d_doi_tn, p2d_nhan_the), máy này chỉ làm theo
// số máy chủ trả về; hàng đổi được (đá, ngọc, rương, áo) vẫn trao ở máy này như cũ. Chơi thử không tài khoản thì tính ở máy.
import { grant } from './daily.js';
import { owned } from './fashion.js';

const T = game => game.data.topup;
const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const calls = async () => (await import('../net/profile.js')).topupCalls;

export const tn = game => game.save.tn || 0;
function addTn(game, n) { game.save.tn = tn(game) + n; }

// Quà ra mắt một lần để người chơi thử quầy
export async function starterGift(game) {
  const s = game.save;
  if (s.tnStarter) return 0;
  if (game.cloud) {
    const c = await calls();
    const r = await game.cloud.run(() => c.starter(), r => { s.tn = r.tn; s.tnStarter = true; game.persist(); });
    return r.them || 0;
  }
  s.tnStarter = true; addTn(game, T(game).starter); game.persist();
  return T(game).starter;
}

export const cardLeft = game => Math.max(0, Math.ceil(((game.save.card?.until || 0) - Date.now()) / DAY));
export const cardClaimed = game => game.save.card?.last === ymd(new Date());

// Mua thẻ tháng: chỉ khi đã mở thanh toán thật (máy chủ xác minh rồi mới gọi). Có lưu máy chủ thì máy chủ ghi thẻ.
export function activateCard(game) {
  if (game.cloud) return;
  const c = T(game).card, s = game.save, base = Math.max(Date.now(), s.card?.until || 0);
  s.card = { until: base + c.days * DAY, last: s.card?.last || '' };
  addTn(game, c.now); game.persist();
}

export async function claimCard(game) {
  const c = T(game).card;
  if (!cardLeft(game) || cardClaimed(game)) return null;
  if (game.cloud) {
    const k = await calls();
    let got = null;
    // máy chủ cộng Tiên Ngọc và Linh Thạch vào bản lưu trên máy chủ; máy này cộng y như vậy
    await game.cloud.run(() => k.card(), r => {
      game.save.tn = r.tn; game.save.card = { ...game.save.card, last: r.last };
      got = [`${c.daily.tn} ${T(game).name}`, ...grant(game, c.daily.give)];
      game.persist();
    });
    return got;
  }
  game.save.card.last = ymd(new Date());
  addTn(game, c.daily.tn);
  return [`${c.daily.tn} ${T(game).name}`, ...grant(game, c.daily.give)];
}

export const shopOwned = (game, x) => !!x.outfit && owned(game, x.outfit);

export async function buyTn(game, id) {
  const x = T(game).shop.find(i => i.id === id), s = game.save;
  if (!x || shopOwned(game, x)) return null;
  if (tn(game) < x.tn) return false;
  const give = () => {
    if (x.outfit) { (s.outfits ??= {})[x.outfit] = true; game.persist(); return [game.data.fashion.list[x.outfit].name]; }
    return grant(game, x.give);
  };
  if (game.cloud) {
    const k = await calls();
    let got = null;
    await game.cloud.run(() => k.buy(id), r => { s.tn = r.tn; got = give(); game.persist(); });
    return got;
  }
  addTn(game, -x.tn);
  return give();
}
