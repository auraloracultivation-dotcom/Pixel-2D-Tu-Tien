// Chợ trao đổi giữa người chơi (data/market.json). Máy chủ giữ hàng đang rao và hòm thư; máy này trừ đồ khi rao,
// trừ Linh Thạch khi mua, rồi nhận thư (hàng mua, tiền bán, hàng trả về) vào túi. Lưu lên máy chủ trước mỗi lần gọi
// để máy chủ kiểm tra theo bản mới nhất.
import { coins, addCoins } from './shop.js';
import { addItem, isEquipped, unsocket, itemName, rarityOf } from './items.js';
import { addMat, matInfo } from './cave.js';

const M = game => game.data.market;
const net = () => import('../net/market.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const canTrade = game => !!(game.online && game.cloud && game.save);

export function errText(game, e) {
  const msg = String(e?.message || ''), E = M(game).err;
  return E[Object.keys(E).find(k => msg.includes(k))] || E.other;
}

export function goodsName(game, loai, mon) {
  if (loai === 'mon') return { name: itemName(game.data, mon), color: rarityOf(game.data.items, mon.rarity)?.color, sub: `${rarityOf(game.data.items, mon.rarity)?.name} · cấp ${mon.lvl}` };
  const m = matInfo(game.data, mon.id);
  return { name: `${m?.name || mon.id} ×${mon.n}`, sub: 'Nguyên liệu' };
}

async function syncSave(game) {
  game.persist();
  await game.cloud.flush();
}

// Đẩy bản lưu rồi gọi; máy chủ chưa thấy món mới nhặt thì đợi một nhịp và thử lại một lần
async function withSync(game, fn) {
  await syncSave(game);
  try { return await fn(); }
  catch (e) {
    if (!String(e?.message).includes('khong_co')) throw e;
    await sleep(1500); await syncSave(game);
    return fn();
  }
}

export async function sellItem(game, uid, price) {
  const s = game.save, it = s.bag.find(x => x.uid === uid);
  if (!it || isEquipped(s, uid)) throw new Error('khong_co');
  (it.sockets || []).forEach((_, i) => unsocket(s, uid, i));   // ngọc khảm trả về túi, không bán theo đồ
  const { postListing } = await net();
  await withSync(game, () => postListing('mon', it, price));
  s.bag = s.bag.filter(x => x.uid !== uid);
  game.refreshStats(); game.persist();
}

export async function sellMat(game, id, n, price) {
  const s = game.save;
  if ((s.mats[id] || 0) < n || n < 1) throw new Error('khong_co');
  const { postListing } = await net();
  await withSync(game, () => postListing('nl', { id, n }, price));
  s.mats[id] -= n;
  game.persist();
}

export async function buy(game, row) {
  if (coins(game.save) < row.gia) throw new Error('thieu_tien');
  const { buyListing } = await net();
  await withSync(game, () => buyListing(row.id));
  addCoins(game, -row.gia);
  game.persist();
  return claimMail(game);
}

export async function cancel(game, id) {
  const { cancelListing } = await net();
  await cancelListing(id);
  return claimMail(game);
}

// Nhận thư còn chỗ trong túi (trang bị cần ô trống); trả về các dòng chữ đã nhận
export async function claimMail(game) {
  if (!canTrade(game)) return [];
  const { peekMail, takeMail } = await net();
  const mail = await peekMail(), s = game.save;
  let free = game.data.items.bag_size - s.bag.length;
  const ids = mail.filter(m => !m.noi_dung.item || free-- > 0).map(m => m.id);
  if (!ids.length) return [];
  const got = [];
  for (const m of await takeMail(ids)) {
    const d = m.noi_dung, head = M(game).mail[m.ly_do] || '';
    if (d.coins) { addCoins(game, d.coins); got.push(`${head}: +${d.coins} ${game.data.shop.name}`); }
    if (d.item && game.data.items.bases[d.item.base]) { const it = { ...d.item, uid: s.nextUid++ }; addItem(game.data, s, it); got.push(`${head}: ${itemName(game.data, it)}`); }
    if (d.mat && matInfo(game.data, d.mat.id)) { addMat(s, d.mat.id, d.mat.n); got.push(`${head}: ${matInfo(game.data, d.mat.id).name} ×${d.mat.n}`); }
  }
  game.refreshStats(); game.persist();
  return got;
}

// Thỉnh thoảng tự nhận thư (tiền bán hàng) khi đang chơi
export function startMailCheck(game) {
  setInterval(async () => {
    if (!canTrade(game) || game.uiOpen) return;
    try { const got = await claimMail(game); if (got.length) game.toast(got.join(' · '), 3); } catch { /* mạng lỗi: lần sau */ }
  }, 90000);
}
