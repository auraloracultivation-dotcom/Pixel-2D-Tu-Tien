// Linh Thạch (data/shop.json): quái rơi, bán đồ cho tiệm, mua ở Vạn Bảo Lâu.
import { rollGem, gemInfo, isEquipped } from './items.js';

const C = game => game.data.shop;
export const coins = save => save.lingshi || 0;
export function addCoins(game, n) {
  game.save.lingshi = coins(game.save) + n;
  if (n > 0 && game.save.stats) game.save.stats.coins += n;
}

export function coinDrop(game, m) {
  const d = C(game).drop, boss = m.def.ai === 'boss';
  if (m.noQi || !m.def.qi || (!boss && Math.random() >= d.chance * (m.lootMul ?? 1))) return;
  const n = Math.max(1, Math.round(m.def.qi * d.per_qi * (boss ? d.boss_mul : 1) * (0.7 + Math.random() * 0.6) * game.eventMul('coin')));
  addCoins(game, n);
  game.number(m.x, m.y - 26, `+${n} ${C(game).name}`, '#ffd24a');
}

export const sellPrice = (game, it) => C(game).sell[it.rarity] || 0;

// Bán một món trong túi (không bán đồ đang mặc); ngọc đang khảm trả về túi ngọc
export function sell(game, uid) {
  const s = game.save, i = s.bag.findIndex(x => x.uid === uid);
  if (i < 0 || isEquipped(s, uid)) return 0;
  const it = s.bag[i], n = sellPrice(game, it);
  for (const g of it.sockets) if (g) s.gems[g] = (s.gems[g] || 0) + 1;
  s.bag.splice(i, 1);
  addCoins(game, n); game.persist();
  return n;
}

function label(game, x) {
  const d = game.data;
  if (x.kind === 'gem') return 'Ngọc ngẫu nhiên cấp 1';
  if (x.kind === 'pill') return d.cave.pills[x.ref].name;
  return d.cave.materials[x.ref]?.name || d.items.materials[x.ref]?.name || x.ref;
}

function buy(game, x) {
  const s = game.save;
  if (coins(s) < x.price) return null;
  s.lingshi -= x.price;
  if (x.kind === 'gem') { const g = rollGem(game.data); s.gems[g] = (s.gems[g] || 0) + 1; game.persist(); return gemInfo(game.data, g).name; }
  const bag = x.kind === 'pill' ? (s.pills ??= {}) : (s.mats ??= {});
  bag[x.ref] = (bag[x.ref] || 0) + x.n;
  game.persist();
  return `${x.n} ${label(game, x)}`;
}

// Vạn Bảo Lâu: chọn món, mua từng lần, tới khi bấm Thôi
export async function talkShop(game, npc) {
  let msg = 'Có Linh Thạch là có tất cả. Mua gì cứ nói.';
  for (;;) {
    const list = C(game).items.filter(x => !x.need || game.save.flags[x.need]);
    const opts = list.map((x, i) => ({ id: String(i), label: `${x.n > 1 ? x.n + ' ' : ''}${label(game, x)}`, desc: `${x.price} ${C(game).name}`, color: coins(game.save) >= x.price ? '#f2c94c' : '#b8b0c8' }));
    opts.push({ id: 'tn', label: game.data.topup.title, desc: `Thẻ tháng, đổi ${game.data.topup.name}`, color: game.data.topup.color });
    opts.push({ id: 'out', label: 'Thôi', desc: '' });
    const pick = await game.dialog.choose(`${npc.def.name}: ${msg} (Bạn có ${coins(game.save)} ${C(game).name})`, opts);
    if (!pick || pick === 'out') return;
    if (pick === 'tn') { game.openTopup?.(); return; }
    const got = buy(game, list[+pick]);
    msg = got ? `Mua được ${got}.` : 'Không đủ Linh Thạch.';
    game.sfx(got ? 'pickup' : 'hurt');
  }
}
