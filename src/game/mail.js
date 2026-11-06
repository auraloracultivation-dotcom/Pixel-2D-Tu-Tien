// Hòm thư máy chủ (bảng p2d_hom_thu): mọi quà, hàng chợ mua về, tiền bán, hàng trả về nằm trong thư tới khi người chơi
// bấm Nhận (chủ dự án 06/11/2026: "all quà đều qua thư và đều cần bấm để nhận mới vào kho";
// migration 20261106070000_p2d_qua_qua_thu). Trước đây game tự nhận thư mỗi 90 giây nên người chơi không thấy quà.
// - refreshMail: đọc thư chưa nhận (p2d_xem_thu) vào game.mail; bảng Hòm thư (src/ui/inbox-panel.js) hiện mục Quà chờ nhận.
// - claimMail(game, ids?): nhận thư chọn (không truyền ids = nhận hết). Máy chủ cộng vào bản lưu, máy này cộng y như vậy;
//   trang bị cần ô trống trong túi (túi đầy thì thư trang bị nằm lại). Thư đã nhận ghi một dòng (đã đọc) vào Hòm thư.
// - startMailCheck: cứ inbox.poll.mail giây đọc lại thư, không tự nhận.
import { addCoins } from './shop.js';
import { addItem, itemName, gemInfo } from './items.js';
import { addMat, matInfo } from './cave.js';
import { notify } from './inbox.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const net = () => import('../net/market.js');
const fin = v => typeof v === 'number' && Number.isFinite(v);
export const canMail = game => !!(game.online && game.cloud && game.save);
const fmt = n => Number(n).toLocaleString('vi-VN');
const T = game => game.data.inbox?.text || {};

export const isMarketMail = (game, m) => !!game.data.market?.mail?.[m.ly_do];

// Tên thư: chợ, sự kiện, giới thiệu, điểm danh, Thôn Thiên Mãng, PvP, quà (data/inbox.json → mail); không có thì chính ly_do
export function mailHead(game, m) {
  const D = game.data, k = m.ly_do, d = m.noi_dung || {};
  return D.market?.mail?.[k] || D.inbox?.mail?.[k] || D.referral?.mail?.[k] || D.checkin?.mail?.[k] || D['thien-mang']?.mail?.[k]
    || D.pvp?.mail?.[k] || (k === 'dao_lu' ? `Quà đạo lữ${d.tu ? ' từ ' + d.tu : ''}` : '') || d.tieu_de || k || '';
}

// Các dòng quà trong thư (không đổi gì)
export function mailLines(game, m) {
  const D = game.data, d = m.noi_dung || {}, out = [];
  if (fin(d.coins)) out.push(`+${fmt(d.coins)} ${D.shop.name}`);
  if (d.item && D.items.bases[d.item.base]) out.push(itemName(D, d.item));
  if (d.mat && matInfo(D, d.mat.id)) out.push(`${matInfo(D, d.mat.id).name} ×${d.mat.n}`);
  if (d.gem && /^[a-z-]+:\d+$/.test(d.gem.key) && D.items.gems.types[d.gem.key.split(':')[0]]) {
    out.push(`${gemInfo(D, d.gem.key).name} ×${d.gem.n}${d.tu ? ` (${d.tu})` : d.tieu_de ? ` (${d.tieu_de})` : ''}`);
  }
  if (fin(d.tn)) out.push(`+${fmt(d.tn)} ${D.topup?.name || 'Tiên Ngọc'}`);
  if (fin(d.diem)) out.push(String(T(game).diem || '+{n} điểm QTV').replace('{n}', fmt(d.diem)));
  return out;
}

export async function refreshMail(game) {
  if (!canMail(game)) { game.mail = []; return game.mail; }
  const list = await (await net()).peekMail();
  game.mail = Array.isArray(list) ? list : [];
  return game.mail;
}

// Trả về các dòng chữ đã nhận
export async function claimMail(game, only) {
  if (!canMail(game)) return [];
  const { peekMail, takeMail } = await net();
  const mail = await peekMail(), s = game.save, want = only ? new Set(only) : null;
  let free = game.data.items.bag_size - s.bag.length;
  const ids = (mail || []).filter(m => (!want || want.has(m.id)) && (!m.noi_dung?.item || free-- > 0)).map(m => m.id);
  game.mail = mail || [];
  if (!ids.length) return [];
  const got = [], taken = new Set();
  await game.cloud.run(() => { const from = s.nextUid; s.nextUid += ids.length; return takeMail(ids, from); }, r => {
    for (const m of r.thu || []) {
      const d = m.noi_dung || {}, head = mailHead(game, m), lines = mailLines(game, m);
      taken.add(m.id);
      if (fin(d.coins)) addCoins(game, d.coins, 'thu');
      if (d.item && game.data.items.bases[d.item.base]) addItem(game.data, s, d.item);
      if (d.mat && matInfo(game.data, d.mat.id)) addMat(s, d.mat.id, d.mat.n);
      if (d.gem && /^[a-z-]+:\d+$/.test(d.gem.key) && game.data.items.gems.types[d.gem.key.split(':')[0]]) {   // máy chủ đã cộng vào bản lưu
        s.gems ??= {}; s.gems[d.gem.key] = (s.gems[d.gem.key] || 0) + d.gem.n;
      }
      for (const l of lines) got.push(head ? `${head}: ${l}` : l);
      if (lines.length) notify(game, { key: 'mail:' + m.id, kind: isMarketMail(game, m) ? 'cho' : 'thu', title: head, text: lines.join(' · '), read: true });
    }
    if (fin(r.tn)) s.tn = r.tn;   // Tiên Ngọc: số máy chủ giữ
    s.nextUid = Math.max(s.nextUid, r.next_uid || 0);
    game.refreshStats(); game.persist();
  });
  game.mail = game.mail.filter(m => !taken.has(m.id));
  return got;
}

export function startMailCheck(game) {
  const sec = game.data.inbox?.poll?.mail || 60;
  setTimeout(() => refreshMail(game).catch(() => {}), 3000);
  every(() => { if (canMail(game)) refreshMail(game).catch(() => { /* mạng lỗi: lần sau */ }); }, sec * 1000);
}
