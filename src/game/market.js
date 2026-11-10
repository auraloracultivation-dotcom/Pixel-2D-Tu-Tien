// Chợ trao đổi giữa người chơi (data/market.json). Máy chủ giữ hàng đang rao, hòm thư và tự trừ đồ khi rao,
// trừ Linh Thạch khi mua, cộng thư (hàng mua, tiền bán, hàng trả về) vào bản lưu trên máy chủ; máy này làm theo.
import { coins, addCoins } from './shop.js';
import { addItem, isEquipped, itemName, gemInfo } from './items.js';
import { grade } from './tiers.js';
import { applyDoi } from './ky-ngoc.js';
import { addMat, matInfo } from './cave.js';
import { notify } from './inbox.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

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
  const got = []; got.full = mail.length - ids.length;   // thư có đồ mà túi đầy: để lại, báo người chơi dọn túi (chủ dự án 10/11/2026: "2 thư ẩn không đọc được")
  if (!ids.length) return got;
  await game.cloud.run(() => { const from = s.nextUid; s.nextUid += ids.length; return takeMail(ids, from); }, r => {
    for (const m of r.thu || []) {
      const d = m.noi_dung, head = M(game).mail[m.ly_do] || game.data.referral?.mail?.[m.ly_do] || game.data.checkin?.mail?.[m.ly_do] || game.data['thien-mang']?.mail?.[m.ly_do] || game.data.pvp?.mail?.[m.ly_do] || (m.ly_do === 'dao_lu' ? `Quà đạo lữ${d.tu ? ' từ ' + d.tu : ''}` : '') || d.tieu_de || '', lines = [];
      if (d.coins) { addCoins(game, d.coins, 'thu'); lines.push(`+${d.coins} ${game.data.shop.name}`); }
      if (d.item && game.data.items.bases[d.item.base]) { addItem(game.data, s, d.item); lines.push(itemName(game.data, d.item)); }
      if (d.pill && game.data.cave.pills[d.pill.id]) { s.pills ??= {}; s.pills[d.pill.id] = (s.pills[d.pill.id] || 0) + d.pill.n; lines.push(`${game.data.cave.pills[d.pill.id].name} ×${d.pill.n}`); }   // đan dược thưởng nhiệm vụ hệ thống
      const D = game.data;   // quà Hệ Thống: thú cưỡi, khôi lỗi, thời trang (máy chủ đã cộng vào bản lưu trên máy chủ)
      if (d.mount && D.pets.mounts[d.mount]) { (s.mounts ??= {})[d.mount] = true; import('./beast.js').then(B => { B.mountLine(game, d.mount); game.persist(); }).catch(() => {}); lines.push(D.pets.mounts[d.mount].name); }
      if (d.comp && D.companions.list[d.comp]) { s.comps ??= {}; s.comps[d.comp] ??= { lv: 1, exp: 0 }; lines.push(`Khôi lỗi ${D.npcs[d.comp]?.name || D.companions.list[d.comp].name || d.comp}`); }
      if (d.outfit && D.fashion.list[d.outfit] && (d.g === 'nam' || d.g === 'nu')) { (s.outfits ??= {})[`${d.outfit}:${d.g}`] = true; lines.push(D.fashion.list[d.outfit].name); }
      if (d.mat && matInfo(game.data, d.mat.id)) { addMat(s, d.mat.id, d.mat.n); lines.push(`${matInfo(game.data, d.mat.id).name} ×${d.mat.n}`); }
      if (d.gem && /^[a-z-]+:\d+$/.test(d.gem.key) && game.data.items.gems.types[d.gem.key.split(':')[0]]) {   // ngọc thưởng sự kiện, góp ý (máy chủ đã cộng vào bản lưu)
        s.gems ??= {}; s.gems[d.gem.key] = (s.gems[d.gem.key] || 0) + d.gem.n; lines.push(`${gemInfo(game.data, d.gem.key).name} ×${d.gem.n}${d.tu ? ` (${d.tu})` : d.tieu_de ? ` (${d.tieu_de})` : ''}`);
      }
      for (const l of lines) got.push(head ? `${head}: ${l}` : l);
      // Hòm thư: hàng chợ vào mục Chợ, thư khác (quà, hệ thống) vào mục Thư. Thư nào cũng tới dạng chưa đọc (phong bì niêm), chạm thì
      // thành đã đọc, không kéo sang chợ (chủ dự án 07/11/2026 10:52: chạm thư bị kéo ra chợ; mua lần hai thư đã mở sẵn)
      if (lines.length) notify(game, { key: 'mail:' + m.id, kind: M(game).mail[m.ly_do] ? 'cho' : 'thu', title: head || m.ly_do || '', text: lines.join(' · '), go: '', read: false });
    }
    s.nextUid = Math.max(s.nextUid, r.next_uid || 0);
    game.refreshStats(); game.persist();
  });
  return got;
}

// Thỉnh thoảng tự nhận thư (tiền bán hàng) khi đang chơi
export function startMailCheck(game) {
  every(async () => {
    if (!canTrade(game) || game.uiOpen) return;
    try { const got = await claimMail(game); if (got.length) game.toast(got.join(' · '), 3); } catch { /* mạng lỗi: lần sau */ }
  }, 90000);
}
