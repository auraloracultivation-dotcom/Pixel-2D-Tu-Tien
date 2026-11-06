// Chợ trao đổi giữa người chơi (data/market.json). Máy chủ giữ hàng đang rao, hòm thư và tự trừ đồ khi rao,
// trừ Linh Thạch khi mua, cộng thư (hàng mua, tiền bán, hàng trả về) vào bản lưu trên máy chủ; máy này làm theo.
import { coins, addCoins } from './shop.js';
import { isEquipped, itemName } from './items.js';
import { grade } from './tiers.js';
import { applyDoi } from './ky-ngoc.js';
import { matInfo } from './cave.js';
import { refreshMail } from './mail.js';

const M = game => game.data.market;
const net = () => import('../net/market.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const canTrade = game => !!(game.online && game.cloud && game.save);

export function errText(game, e) {
  const msg = String(e?.message || ''), E = M(game).err;
  return E[Object.keys(E).find(k => msg.includes(k))] || E.other;
}

export function goodsName(game, loai, mon) {
  if (loai === 'mon') { const g = grade(game.data, mon); return { name: itemName(game.data, mon), color: g.color, sub: `${g.name} · cấp ${mon.lvl}` }; }
  const m = matInfo(game.data, mon.id);
  return { name: `${m?.name || mon.id} ×${mon.n}`, sub: 'Nguyên liệu' };
}

// Lệnh chợ chạy qua game.cloud.run: đẩy bản lưu mới nhất, gọi hàm máy chủ (máy chủ tự trừ đồ, trừ tiền, cộng thư
// vào bản lưu trên máy chủ và trả phien_ban mới), rồi sửa bản lưu trong máy y như vậy.
// Máy chủ chưa thấy món mới nhặt thì đợi một nhịp và thử lại một lần.
async function onServer(game, fn, mirror) {
  try { return await game.cloud.run(fn, mirror); }
  catch (e) {
    if (!String(e?.message).includes('khong_co')) throw e;
    await sleep(1500);
    return game.cloud.run(fn, mirror);
  }
}

// Ngọc đang khảm của một món ({ "loại:cấp": số }), chỉ loại có trong data/items.json gems như máy chủ
// Hàng mua, hàng huỷ rao về Hòm thư (bấm Nhận ở đó): đọc lại thư, báo một dòng
async function toMail(game) {
  try { await refreshMail(game); } catch { /* lần đọc sau */ }
  return [M(game).to_mail || 'Đã gửi vào Hòm thư.'];
}

export function gemsOf(game, it) {
  const out = {}, T = game.data.items.gems.types;
  for (const g of it?.sockets || []) if (g && T[g.split(':')[0]]) out[g] = (out[g] || 0) + 1;
  return out;
}

export async function sellItem(game, uid, price) {
  const s = game.save, it = s.bag.find(x => x.uid === uid);
  if (!it || isEquipped(s, uid)) throw new Error('khong_co');
  // ngọc khảm trả về túi, không bán theo đồ: máy chủ tháo (p2d_rao_ban), máy này cộng lại khi máy chủ nhận
  // (ô khảm nằm trong phần được ký: tự tháo ở máy trước sẽ bị máy chủ trả lại, migration 20261105020000_p2d_ky_ngoc)
  const { postListing } = await net();
  await onServer(game, () => postListing('mon', { uid }, price), () => {
    applyDoi(s, gemsOf(game, s.bag.find(x => x.uid === uid)));
    s.bag = s.bag.filter(x => x.uid !== uid);
    game.refreshStats(); game.persist();
  });
}

export async function sellMat(game, id, n, price) {
  const s = game.save;
  if ((s.mats[id] || 0) < n || n < 1) throw new Error('khong_co');
  const { postListing } = await net();
  await onServer(game, () => postListing('nl', { id, n }, price), () => { s.mats[id] -= n; game.persist(); });
}

export async function buy(game, row) {
  if (coins(game.save) < row.gia) throw new Error('thieu_tien');
  const { buyListing } = await net();
  await onServer(game, () => buyListing(row.id), () => { addCoins(game, -row.gia, 'cho-mua'); game.persist(); });
  return toMail(game);
}

export async function cancel(game, id) {
  const { cancelListing } = await net();
  await cancelListing(id);
  return toMail(game);
}

// Hòm thư (thư hàng mua, tiền bán, hàng trả về, quà): src/game/mail.js, người chơi bấm Nhận ở bảng Hòm thư
export { claimMail, startMailCheck } from './mail.js';
