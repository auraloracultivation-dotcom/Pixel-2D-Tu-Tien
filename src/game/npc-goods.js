// Mỗi NPC một món riêng (data/shop.json → npc_goods, chủ dự án chốt 02/11/2026; thay linh thực, đào khoáng):
// một loại đan, một bộ đồ, hoặc nguyên liệu không có ở bí cảnh / nhiệm vụ. Mua bằng Linh Thạch, giới hạn số lần mỗi ngày.
import { coins, addCoins, pillPrice } from './shop.js';
import { pickQty } from './so-luong.js';
import { addMat } from './cave.js';
import { owned as hasOutfit, grantOutfit } from './fashion.js';

const G = data => data.shop.npc_goods || {};
const today = () => new Date().toDateString();
export const goodsOf = (data, id) => (id && !id.startsWith('_') ? G(data)[id] : null);

export function goodsName(data, g) {
  return g.kind === 'pill' ? data.cave.pills[g.id]?.name : g.kind === 'outfit' ? data.fashion.list[g.id]?.name : data.cave.materials[g.id]?.name || g.id;
}
// Bộ chỉ một giới (data/fashion.json → only): người giới kia không mua được → tên giới được mặc, hoặc null
const onlyFor = (game, g) => { const o = g.kind === 'outfit' && game.data.fashion.list[g.id]?.only, H = game.data.heroes, look = H.list[game.save.look] ? game.save.look : H.default;
  return o && o !== look ? (o === 'nu' ? 'nhân vật nữ' : 'nhân vật nam') : null; };
const boughtToday = (game, id) => (game.save.npcBuy?.day === today() ? game.save.npcBuy[id] || 0 : 0);

// Trả về câu báo (đã mua / lý do không mua được)
export function buyGoods(game, npcId) {
  const g = goodsOf(game.data, npcId), s = game.save, d = game.data;
  if (!g) return null;
  const name = goodsName(d, g);
  if (onlyFor(game, g)) return `${name} chỉ dành cho ${onlyFor(game, g)}.`;
  if (g.kind === 'outfit' && hasOutfit(game, g.id)) return `Bạn đã có ${name}.`;
  if (g.kind !== 'outfit' && boughtToday(game, npcId) >= g.per_day) return `Hôm nay đã mua đủ ${g.per_day} lần, mai quay lại nhé.`;
  const price = g.kind === 'pill' ? pillPrice(game, g.id, g.price) : g.price;   // đan linh khí đắt dần theo cảnh giới (shop.js)
  if (coins(s) < price) return `Thiếu Linh Thạch (cần ${price.toLocaleString('vi-VN')}).`;
  addCoins(game, -price, 'npc');
  if (g.kind === 'pill') s.pills[g.id] = (s.pills[g.id] || 0) + 1;
  else if (g.kind === 'mat') addMat(s, g.id, 1);
  else grantOutfit(game, g.id);   // bản theo giới tính mình (src/game/fashion.js)
  if (s.npcBuy?.day !== today()) s.npcBuy = { day: today() };
  s.npcBuy[npcId] = (s.npcBuy[npcId] || 0) + 1;
  game.persist(); game.sfx('pickup');
  return `Đã mua ${name}.`;
}

export async function talkGoods(game, npc) {
  const d = game.data, g = goodsOf(d, npc.id), name = goodsName(d, g);
  const left = onlyFor(game, g) ? `chỉ dành cho ${onlyFor(game, g)}` : g.kind === 'outfit' ? (hasOutfit(game, g.id) ? 'đã có' : 'mua một lần') : `còn ${Math.max(0, g.per_day - boughtToday(game, npc.id))}/${g.per_day} lần hôm nay`;
  const pick = await game.dialog.choose(`${npc.def.name}: ${g.line}`, [
    { id: 'buy', label: name, spr: g.kind === 'outfit' ? (d.art.sprites['hero.' + g.id] ? 'hero.' + g.id : 'ui.ic-qua') : 'ui.vk-' + g.id, price: (g.kind === 'pill' ? pillPrice(game, g.id, g.price) : g.price).toLocaleString('vi-VN'), cur: 'ui.ic-linh-thach', tag: g.kind === 'outfit' ? (hasOutfit(game, g.id) ? 'Đã có' : '') : `${Math.max(0, g.per_day - boughtToday(game, npc.id))}/${g.per_day}`, desc: left, color: '#f2c94c' },   // ô lưới có hình, giá dưới ô (chủ dự án 19/11/2026 10:24)
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ]);
  if (pick === 'buy') {   // số lượng (chủ dự án 20/11/2026 01:20): tối đa số lượt còn trong ngày và số Linh Thạch đủ mua
    const price = g.kind === 'pill' ? pillPrice(game, g.id, g.price) : g.price;
    const max = g.kind === 'outfit' ? 1 : Math.min(Math.max(0, g.per_day - boughtToday(game, npc.id)), Math.floor(coins(game.save) / Math.max(1, price)));
    const q = max <= 1 ? 1 : await pickQty(game, `${name}: ${price.toLocaleString('vi-VN')} mỗi cái`, price, max);
    let msg = null, k = 0;
    for (let i = 0; i < q; i++) { const m = buyGoods(game, npc.id); if (!m?.startsWith('Đã mua')) { msg = msg || m; break; } k++; msg = m; }
    if (k > 1) msg = `Đã mua ${k} ${name}.`;
    if (msg) game.toast(msg, 2.2);
  }
  else if (pick === 'talk') { const L = npc.def.lines || ['…']; await game.dialog.say([[npc.def.name, L[Math.floor(Math.random() * L.length)]]]); }
}
