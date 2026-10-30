// Chợ trao đổi giữa người chơi (data/market.json). Máy chủ giữ hàng đang rao, hòm thư và tự trừ đồ khi rao,
// trừ Linh Thạch khi mua, cộng thư (hàng mua, tiền bán, hàng trả về) vào bản lưu trên máy chủ; máy này làm theo.
import { coins, addCoins } from './shop.js';
import { addItem, isEquipped, unsocket, itemName, rarityOf, gemInfo } from './items.js';
import { addMat, matInfo } from './cave.js';
import { notify } from './inbox.js';

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

export async function sellItem(game, uid, price) {
  const s = game.save, it = s.bag.find(x => x.uid === uid);
  if (!it || isEquipped(s, uid)) throw new Error('khong_co');
  (it.sockets || []).forEach((_, i) => unsocket(s, uid, i));   // ngọc khảm trả về túi, không bán theo đồ
  game.persist();
  const { postListing } = await net();
  await onServer(game, () => postListing('mon', { uid }, price), () => {
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
  await onServer(game, () => buyListing(row.id), () => { addCoins(game, -row.gia); game.persist(); });
  return claimMail(game);
}

export async function cancel(game, id) {
  const { cancelListing } = await net();
  await cancelListing(id);
  return claimMail(game);
}

// Nhận thư còn chỗ trong túi (trang bị cần ô trống); máy chủ cộng vào bản lưu, máy này cộng y như vậy
// (món nhận được mang mã số máy chủ cấp, bắt đầu từ chỗ máy này giữ sẵn). Trả về các dòng chữ đã nhận.
export async function claimMail(game) {
  if (!canTrade(game)) return [];
  const { peekMail, takeMail } = await net();
  const mail = await peekMail(), s = game.save;
  let free = game.data.items.bag_size - s.bag.length;
  const ids = mail.filter(m => !m.noi_dung.item || free-- > 0).map(m => m.id);
  if (!ids.length) return [];
  const got = [];
  await game.cloud.run(() => { const from = s.nextUid; s.nextUid += ids.length; return takeMail(ids, from); }, r => {
    for (const m of r.thu || []) {
      const d = m.noi_dung, head = M(game).mail[m.ly_do] || game.data.referral?.mail?.[m.ly_do] || game.data.checkin?.mail?.[m.ly_do] || '', lines = [];
      if (d.coins) { addCoins(game, d.coins); lines.push(`+${d.coins} ${game.data.shop.name}`); }
      if (d.item && game.data.items.bases[d.item.base]) { addItem(game.data, s, d.item); lines.push(itemName(game.data, d.item)); }
      if (d.mat && matInfo(game.data, d.mat.id)) { addMat(s, d.mat.id, d.mat.n); lines.push(`${matInfo(game.data, d.mat.id).name} ×${d.mat.n}`); }
      if (d.gem && /^[a-z-]+:\d+$/.test(d.gem.key) && game.data.items.gems.types[d.gem.key.split(':')[0]]) {   // ngọc thưởng sự kiện, góp ý (máy chủ đã cộng vào bản lưu)
        s.gems ??= {}; s.gems[d.gem.key] = (s.gems[d.gem.key] || 0) + d.gem.n; lines.push(`${gemInfo(game.data, d.gem.key).name} ×${d.gem.n}${d.tu ? ` (${d.tu})` : d.tieu_de ? ` (${d.tieu_de})` : ''}`);
      }
      for (const l of lines) got.push(head ? `${head}: ${l}` : l);
      // Hòm thư: hàng chợ vào mục Chợ, thư khác (quà, hệ thống) vào mục Thư; đang mở bảng (mua, huỷ ở chợ) thì coi như đã đọc
      if (lines.length) notify(game, { key: 'mail:' + m.id, kind: M(game).mail[m.ly_do] ? 'cho' : 'thu', title: head || m.ly_do || '', text: lines.join(' · '), go: M(game).mail[m.ly_do] ? 'market' : '', read: !!game.uiOpen });
    }
    s.nextUid = Math.max(s.nextUid, r.next_uid || 0);
    game.refreshStats(); game.persist();
  });
  return got;
}

// Thỉnh thoảng tự nhận thư (tiền bán hàng) khi đang chơi
export function startMailCheck(game) {
  setInterval(async () => {
    if (!canTrade(game) || game.uiOpen) return;
    try { const got = await claimMail(game); if (got.length) game.toast(got.join(' · '), 3); } catch { /* mạng lỗi: lần sau */ }
  }, 90000);
}
