// Ngự Thú Sư bán thú cưỡi và khôi lỗi (chủ dự án 02/11/2026 14:39; giá ở data/pets.json → shop). Bán lại: thú cưỡi ở
// src/game/home-pets.js (sellMount), khôi lỗi ở đây (sellPuppet), bấm ngay trong thẻ ở Túi đồ → Thú cưỡi / Khôi lỗi.
import { coins, addCoins } from './shop.js';
import { mountLine } from './beast.js';

const S = game => game.data.pets.shop;
const vn = n => n.toLocaleString('vi-VN');
export const isPuppet = (game, id) => !!S(game)?.puppets?.[id];
export const puppetName = (game, id) => `Khôi lỗi ${game.data.npcs[id]?.name || id}`;
export const puppetPrice = (game, id) => Math.round(S(game).puppets[id] * S(game).puppet_sell + ((game.save.comps?.[id]?.lv || 1) - 1) * S(game).puppet_per_lv);

export function buyMount(game, id) {
  const s = game.save, price = S(game).mounts[id], m = game.data.pets.mounts[id];
  if (!m || price == null) return 'Không bán con này.';
  if (s.mounts?.[id]) return `Đã có ${m.name}.`;
  if (coins(s) < price) return `Thiếu Linh Thạch (cần ${vn(price)}).`;
  addCoins(game, -price, 'mua-thu'); s.mounts[id] = true; mountLine(game, id);
  game.persist(); game.sfx('levelup');
  return `Mua ${m.name}. Chọn cưỡi ở Túi đồ → Thú cưỡi.`;
}

export function buyPuppet(game, id) {
  const s = game.save, price = S(game).puppets[id];
  if (price == null) return 'Không bán khôi lỗi này.';
  if (s.comps?.[id]) return `Đã có ${puppetName(game, id)}.`;
  if (coins(s) < price) return `Thiếu Linh Thạch (cần ${vn(price)}).`;
  addCoins(game, -price, 'mua-thu'); (s.comps ??= {})[id] = { lv: 1, exp: 0 };
  game.persist(); game.sfx('levelup');
  return `Mua ${puppetName(game, id)}. Mang theo ở Túi đồ → Khôi lỗi.`;
}

export function sellPuppet(game, id) {
  const s = game.save;
  if (!s.comps?.[id] || !isPuppet(game, id)) return 'Không có khôi lỗi này.';
  if (s.companion === id || s.companion2 === id) return 'Đang mang theo, cất đi rồi mới bán.';
  const price = puppetPrice(game, id);
  delete s.comps[id];
  addCoins(game, price, 'ban-thu'); game.persist(); game.sfx('pickup');
  return `Đã bán ${puppetName(game, id)}, nhận ${vn(price)} Linh Thạch.`;
}

// Hộp thoại ở Ngự Thú Sư (sau lần đầu tặng linh thú)
export async function talkBeastShop(game, npc) {
  const name = npc.def.name, s = game.save;
  const pick = await game.dialog.choose(`${name}: Muốn mua gì?`, [
    { id: 'mount', label: 'Mua thú cưỡi', desc: 'Tăng tốc chạy và 1 dòng chỉ số' },
    { id: 'puppet', label: 'Mua khôi lỗi', desc: 'Đi theo đánh cùng, mang tối đa 2 con' },
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ]);
  if (pick === 'talk') { await game.dialog.say([[name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
  const list = pick === 'mount'
    ? Object.entries(S(game).mounts).map(([id, p]) => ({ id, label: `${game.data.pets.mounts[id].name} · ${vn(p)} LT`, desc: s.mounts?.[id] ? 'Đã có' : `Tốc chạy +${Math.round(game.data.pets.mounts[id].speed * 100)}%`, color: game.data.pets.mounts[id].color }))
    : pick === 'puppet' ? Object.entries(S(game).puppets).map(([id, p]) => ({ id, label: `${puppetName(game, id)} · ${vn(p)} LT`, desc: s.comps?.[id] ? 'Đã có' : game.data.companions.list[id]?.desc || '', color: game.data.companions.list[id]?.color })) : null;
  if (!list) return;
  list.push({ id: 'thoi', label: 'Thôi', desc: `Đang có ${vn(coins(s))} Linh Thạch` });
  const id = await game.dialog.choose(`${name}: Chọn đi.`, list);
  if (id === 'thoi' || !id) return;
  game.toast(pick === 'mount' ? buyMount(game, id) : buyPuppet(game, id), 2.6);
}
