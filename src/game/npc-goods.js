// Mỗi NPC một món riêng (data/shop.json → npc_goods, chủ dự án chốt 02/11/2026; thay linh thực, đào khoáng):
// một loại đan, một bộ đồ, hoặc nguyên liệu không có ở bí cảnh / nhiệm vụ. Mua bằng Linh Thạch, giới hạn số lần mỗi ngày.
import { coins, addCoins } from './shop.js';
import { addMat } from './cave.js';
import { owned as hasOutfit } from './fashion.js';

const G = data => data.shop.npc_goods || {};
const today = () => new Date().toDateString();
export const goodsOf = (data, id) => (id && !id.startsWith('_') ? G(data)[id] : null);

export function goodsName(data, g) {
  return g.kind === 'pill' ? data.cave.pills[g.id]?.name : g.kind === 'outfit' ? data.fashion.list[g.id]?.name : data.cave.materials[g.id]?.name || g.id;
}
const boughtToday = (game, id) => (game.save.npcBuy?.day === today() ? game.save.npcBuy[id] || 0 : 0);

// Trả về câu báo (đã mua / lý do không mua được)
export function buyGoods(game, npcId) {
  const g = goodsOf(game.data, npcId), s = game.save, d = game.data;
  if (!g) return null;
  const name = goodsName(d, g);
  if (g.kind === 'outfit' && hasOutfit(game, g.id)) return `Bạn đã có ${name}.`;
  if (g.kind !== 'outfit' && boughtToday(game, npcId) >= g.per_day) return `Hôm nay đã mua đủ ${g.per_day} lần, mai quay lại nhé.`;
  if (coins(s) < g.price) return `Thiếu Linh Thạch (cần ${g.price.toLocaleString('vi-VN')}).`;
  addCoins(game, -g.price);
  if (g.kind === 'pill') s.pills[g.id] = (s.pills[g.id] || 0) + 1;
  else if (g.kind === 'mat') addMat(s, g.id, 1);
  else (s.outfits ??= {})[g.id] = true;
  if (s.npcBuy?.day !== today()) s.npcBuy = { day: today() };
  s.npcBuy[npcId] = (s.npcBuy[npcId] || 0) + 1;
  game.persist(); game.sfx('pickup');
  return `Đã mua ${name}.`;
}

export async function talkGoods(game, npc) {
  const d = game.data, g = goodsOf(d, npc.id), name = goodsName(d, g);
  const left = g.kind === 'outfit' ? (hasOutfit(game, g.id) ? 'đã có' : 'mua một lần') : `còn ${Math.max(0, g.per_day - boughtToday(game, npc.id))}/${g.per_day} lần hôm nay`;
  const pick = await game.dialog.choose(`${npc.def.name}: ${g.line}`, [
    { id: 'buy', label: `Mua ${name} (${g.price.toLocaleString('vi-VN')} ${d.shop.name})`, desc: `${left} · có ${coins(game.save).toLocaleString('vi-VN')}`, color: '#f2c94c' },
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ]);
  if (pick === 'buy') { const msg = buyGoods(game, npc.id); if (msg) game.toast(msg, 2.2); }
  else if (pick === 'talk') { const L = npc.def.lines || ['…']; await game.dialog.say([[npc.def.name, L[Math.floor(Math.random() * L.length)]]]); }
}
