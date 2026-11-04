// Đạo lữ giữa hai người chơi (chủ dự án chốt 02/11/2026 14:39; chữ data/social.json → dao_lu; luật ở máy chủ:
// migration 20261102160000_p2d_dao_lu.sql). game.daoLu: đạo lữ hiện tại { k, ten, tu } hoặc null, đọc lại 5 phút
// một lần. Có đạo lữ: Linh Thạch rơi từ quái và linh khí thêm bonus (game.daoLuMul, gọi ở shop.js coinDrop và game.gainQi).
// Tặng quà: máy chủ tự lấy món trong bản lưu trên máy chủ rồi gửi vào hòm thư người kia; máy này làm theo (như rao bán ở chợ).
import { isEquipped } from './items.js';
import { applyDoi } from './ky-ngoc.js';
import { gemsOf } from './market.js';
import { addCoins } from './shop.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const net = () => import('../net/daolu.js');
const T = game => game.data.social.dao_lu.text;
export const daoLuErr = (game, e) => T(game).err[e?.message] || T(game).err.net;

export async function loadDaoLu(game) {
  if (!game.online || !game.cloud) { game.daoLu = null; return null; }
  const st = await (await net()).daoLuState();
  game.daoLu = st?.dao_lu || null;
  return st;
}

export async function inviteDaoLu(game, k) { const r = await (await net()).daoLuInvite(k); await loadDaoLu(game).catch(() => {}); return T(game).done[r] || r; }
export async function cancelDaoLu(game, k) { const r = await (await net()).daoLuCancel(k); await loadDaoLu(game).catch(() => {}); return T(game).done[r] || r; }

// loai 'mon' (uid), 'nl' (id, n), 'lt' (n)
export async function giftDaoLu(game, loai, mon) {
  const s = game.save, { daoLuGift } = await net();
  if (loai === 'mon') {
    const it = s.bag.find(x => x.uid === mon.uid);
    if (!it || isEquipped(s, mon.uid)) throw new Error('khong_co');
  }   // ngọc khảm giữ lại, không tặng theo đồ: máy chủ tháo (p2d_dl_tang2), máy này cộng lại khi máy chủ nhận
  const mirror = () => {
    if (loai === 'mon') { applyDoi(s, gemsOf(game, s.bag.find(x => x.uid === mon.uid))); s.bag = s.bag.filter(x => x.uid !== mon.uid); game.refreshStats(); }
    else if (loai === 'nl') s.mats[mon.id] -= mon.n;
    else addCoins(game, -mon.n, 'dao-lu');
    game.persist();
  };
  try { await game.cloud.run(() => daoLuGift(loai, mon), mirror); }
  catch (e) {   // máy chủ chưa thấy món mới nhặt: đợi một nhịp cho bản lưu lên máy chủ rồi thử lại một lần (như chợ)
    if (e?.message !== 'khong_co') throw e;
    await new Promise(r => setTimeout(r, 1500));
    await game.cloud.run(() => daoLuGift(loai, mon), mirror);
  }
}

export function startDaoLu(game) {
  game.daoLuMul = () => (game.daoLu ? 1 + game.data.social.dao_lu.bonus : 1);
  let last = 0;
  every(() => { if (game.online && game.cloud && Date.now() - last > 300000) { last = Date.now(); loadDaoLu(game).catch(() => {}); } }, 5000);
}
