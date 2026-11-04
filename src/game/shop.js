// Linh Thạch (data/shop.json): quái rơi, bán đồ cho tiệm, mua ở Vạn Bảo Lâu.
import { rollGem, gemInfo, isEquipped } from './items.js';
import { quality } from './tiers.js';
import { noteCoins } from './coin-log.js';

const C = game => game.data.shop;
export const coins = save => save.lingshi || 0;
// why: mã lý do cho Lịch sử Linh Thạch (data/shop.json → coin_log.why, src/game/coin-log.js); bỏ trống thì ghi 'khac'
export function addCoins(game, n, why) {
  game.save.lingshi = coins(game.save) + n;
  noteCoins(game.save, n, why);
  if (n > 0 && game.save.stats) game.save.stats.coins += n;
}

export function coinDrop(game, m) {
  const d = C(game).drop, boss = m.def.ai === 'boss';
  if (m.noQi || !m.def.qi || (!boss && Math.random() >= d.chance * (m.lootMul ?? 1))) return;
  const n = Math.max(1, Math.round(m.def.qi * d.per_qi * (boss ? d.boss_mul : 1) * (0.7 + Math.random() * 0.6) * game.eventMul('coin') * (game.daoLuMul?.() || 1) * (game.farmTeamMul?.() || 1)));   // có đạo lữ +5% (src/game/daolu.js); tổ đội farm +10% mỗi đồng đội cùng tinh cầu (src/game/farm-team.js)
  addCoins(game, n, game.sweeping ? 'can-quet' : 'nhat');   // gộp một dòng mỗi phút
  game.number(m.x, m.y - 26, `+${n} ${C(game).name}`, '#ffd24a');
}

export const sellPrice = (game, it) => C(game).sell[it.rarity] || 0;

// Bán một món trong túi (không bán đồ đang mặc); ngọc đang khảm trả về túi ngọc
export function sell(game, uid) {
  const s = game.save, i = s.bag.findIndex(x => x.uid === uid);
  if (i < 0 || isEquipped(s, uid) || s.bag[i].lock) return 0;   // đồ đã khoá (góp ý #61) không bán
  const it = s.bag[i], n = sellPrice(game, it);
  for (const g of it.sockets) if (g) s.gems[g] = (s.gems[g] || 0) + 1;
  s.bag.splice(i, 1);
  addCoins(game, n, 'ban-do'); game.persist();
  return n;
}

// Phẩm đang hiện của món (màu trên ô túi): màu trung bình các dòng; đồ chưa có dòng màu thì đổi phẩm cũ qua line_tiers.from_rarity
export function shownTier(game, it) {
  const T = game.data.items.line_tiers;
  return quality(game.data, it)?.id || T.list[T.from_rarity[it.rarity] ?? 0].id;
}
// Bán nhanh (data/shop.json → quick): các món có phẩm (màu đang hiện) đã chọn, trừ đồ đang mặc, đồ Đạo Vận, đồ đã cường hoá.
// Báo lỗi 02/11 18:56: bản cũ lọc theo phẩm chất cũ (Phàm, Linh…) nên món màu Đỏ mà phẩm cũ là Phàm vẫn bị bán.
export function quickList(game, tiers) {
  const s = game.save, q = C(game).quick, bases = game.data.items.bases;
  return s.bag.filter(it => tiers.includes(shownTier(game, it)) && !it.lock && !isEquipped(s, it.uid) && !bases[it.base]?.dv && !(q.skip_plus && it.plus > 0));
}

// Bán hết danh sách bán nhanh một lần: ngọc đang khảm trả về túi ngọc. Trả { n: số món, coins: Linh Thạch nhận }
export function quickSell(game, rarities) {
  const s = game.save, list = quickList(game, rarities), gone = new Set(list.map(it => it.uid));
  let got = 0;
  for (const it of list) {
    got += sellPrice(game, it);
    for (const g of it.sockets || []) if (g) s.gems[g] = (s.gems[g] || 0) + 1;
  }
  s.bag = s.bag.filter(it => !gone.has(it.uid));
  if (got) addCoins(game, got, 'ban-do');
  game.persist();
  return { n: list.length, coins: got };
}

// Giá đan linh khí (chủ dự án 02/11/2026 16:03: "mua tăng linh đan đừng rẻ quá"): đan cho linh khí theo % tầng nên càng lên
// cảnh giới càng đáng tiền; giá nhân base_mul và thêm per_realm mỗi cảnh giới (data/cave.json → qi_pill_day.price)
export function pillPrice(game, id, price) {
  const P = game.data.cave.qi_pill_day?.price, u = game.data.cave.pills[id]?.use;
  if (!P || !u?.qi) return price;
  return Math.round(price * P.base_mul * (1 + (game.save?.realm || 0) * P.per_realm) / 10) * 10;
}
const priceOf = (game, x) => (x.kind === 'pill' ? pillPrice(game, x.ref, x.price) : x.price);

function label(game, x) {
  const d = game.data;
  if (x.kind === 'gem') return 'Ngọc ngẫu nhiên cấp 1';
  if (x.kind === 'pill') return d.cave.pills[x.ref].name;
  return d.cave.materials[x.ref]?.name || d.items.materials[x.ref]?.name || x.ref;
}

function buy(game, x) {
  const s = game.save;
  const price = priceOf(game, x);
  if (coins(s) < price) return null;
  s.lingshi -= price; noteCoins(s, -price, 'van-bao');
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
    const opts = list.map((x, i) => ({ id: String(i), label: `${x.n > 1 ? x.n + ' ' : ''}${label(game, x)}`, desc: `${priceOf(game, x).toLocaleString('vi-VN')} ${C(game).name}`, color: coins(game.save) >= priceOf(game, x) ? '#f2c94c' : '#b8b0c8' }));
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

// Tự bán khi túi đầy (góp ý #86, chủ dự án 04/11/2026): bật ở Túi đồ → Bán nhanh, bán các món thuộc phẩm đang chọn ở hàng bán nhanh
// (save.autoSell = { on, tiers }); đồ khoá, đang mặc, Đạo Vận, đã cường hoá không bán. Trả true nếu đã bán được ít nhất 1 món.
export function autoSellFull(game) {
  const a = game.save.autoSell;
  if (!a?.on || !a.tiers?.length) return false;
  const r = quickSell(game, a.tiers);
  if (r.n) game.toast?.(`Túi đầy: tự bán ${r.n} món, +${r.coins.toLocaleString('vi-VN')} ${game.data.shop.name}`, 1.8);
  return r.n > 0;
}
