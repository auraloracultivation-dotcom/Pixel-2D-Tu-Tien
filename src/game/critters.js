// Linh cầm ở động phủ (data/critters.json): mua ở Tiểu Linh, đi lững thững trong sân, cứ vài giờ thật làm ra một món quà nhỏ.
// Người chơi (hoặc tự hành) đi tới gần là nhặt. Quà tích cả lúc vắng mặt, tối đa cap phần mỗi con.
import { coins, addCoins } from './shop.js';
import { grant } from './daily.js';
import { addFx } from './combat.js';
import { praise } from './praise.js';
import { talkDecor } from './decor.js';
import { cleanText } from './social.js';

const C = game => game.data.critters;
const pick = a => a[Math.floor(Math.random() * a.length)];
const H = 3600000;

export const ownedCritters = game => Object.keys(game.save.critters || {}).filter(id => C(game).list[id]);
// Số phần quà đang chờ nhặt của một con
export const readyOf = (game, id) => {
  const c = C(game), st = game.save.critters?.[id];
  return st ? Math.min(c.cap, Math.floor((Date.now() - st.t) / (c.list[id].every_h * H))) : 0;
};
export const anyReady = game => ownedCritters(game).some(id => readyOf(game, id) > 0);
// Tên gọi: loài kèm tên riêng nếu đã đặt
export const critterName = (game, id) => { const nm = game.save.critters?.[id]?.name, d = C(game).list[id]; return nm ? `${d.name} ${nm}` : d.name; };

async function nameCritter(game, npc) {
  const N = C(game).name, own = ownedCritters(game), who = npc.def.name;
  if (!own.length) { await game.dialog.say([[who, N.none]]); return; }
  const id = await game.dialog.choose(`${who}: ${N.pick}`, [...own.map(k => ({ id: k, label: critterName(game, k), desc: C(game).list[k].desc })), { id: 'thoi', label: N.cancel, desc: '' }]);
  if (!C(game).list[id]) return;
  const raw = await game.dialog.ask(N.ask.replace('{name}', critterName(game, id)), N.placeholder, 12, N.ok, N.cancel);
  const nm = cleanText(game, raw || '').slice(0, 12).trim();
  if (!nm) return;
  game.save.critters[id].name = nm; game.persist(); game.sfx('pickup');
  await game.dialog.say([[who, N.done.replace('{kind}', C(game).list[id].name).replace('{name}', nm)]]);
}

// Ô ngẫu nhiên trong sân, đổi ra toạ độ px
function spot(game) {
  const [x, y, w, h] = C(game).pen, T = game.map.T;
  return { x: (x + Math.random() * w) * T, y: (y + Math.random() * h) * T + T / 2 };
}

// Gọi mỗi khung: dựng đàn khi vào động phủ, cho đi dạo, người chơi tới gần thì nhặt quà
export function updateCritters(game, dt) {
  const c = C(game);
  if (game.map.id !== c.map) { game.critters = null; return; }
  if (game.critterMap !== game.map || game.critters?.length !== ownedCritters(game).length) {
    game.critterMap = game.map;
    game.critters = ownedCritters(game).map(id => ({ id, ...spot(game), wait: Math.random() * 2, face: 1 }));
  }
  const p = game.player;
  for (const k of game.critters) {
    const d = c.list[k.id];
    if (k.wait > 0) k.wait -= dt;
    else {
      k.tx ??= spot(game);
      const dx = k.tx.x - k.x, dy = k.tx.y - k.y, l = Math.hypot(dx, dy), v = d.speed * dt;
      if (l <= v) { k.x = k.tx.x; k.y = k.tx.y; k.tx = null; k.wait = 1 + Math.random() * 4; }
      else { k.x += dx / l * v; k.y += dy / l * v; k.face = dx < 0 ? -1 : 1; }
    }
    k.ready = readyOf(game, k.id);
    if (k.ready && Math.hypot(k.x - p.x, k.y - p.y) < c.range) collect(game, k);
  }
}

function collect(game, k) {
  const d = C(game).list[k.id], n = k.ready, give = {};
  for (const [key, v] of Object.entries(d.give)) give[key] = typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([m, x]) => [m, x * n])) : v * n;
  game.save.critters[k.id].t = Date.now();
  const got = grant(game, give);
  for (let i = 0; i < 2; i++) addFx(game, { type: 'heart', x: k.x + (i - 0.5) * 6, y: k.y - i * 3, color: '#ffd27a', life: 1.1 });
  game.sfx('pickup');
  game.toast(d.text.replace(d.name, critterName(game, k.id)).replace('{got}', got.join(', ')), 3);
}

// Mua một con (cả tự hành dùng): trừ tiền, bắt đầu đếm giờ
export function buyCritter(game, id) {
  const d = C(game).list[id];
  if (!d || game.save.critters?.[id] || coins(game.save) < d.cost) return false;
  addCoins(game, -d.cost);
  (game.save.critters ??= {})[id] = { t: Date.now() };
  game.persist(); game.sfx('levelup');
  praise(game, 'decor', { item: d.name });
  return true;
}

// Tiểu Linh: chọn bày đồ hay nuôi linh cầm
export async function talkTieuLinh(game, npc) {
  const c = C(game), M = c.menu, name = npc.def.name;
  const ch = await game.dialog.choose(`${name}: ${c.ask}`, [
    { id: 'decor', label: M.decor, desc: M.decor_desc },
    { id: 'buy', label: M.buy, desc: M.buy_desc },
    { id: 'name', label: c.name.menu, desc: c.name.menu_desc },
    { id: 'out', label: M.out, desc: '' },
  ]);
  if (ch === 'decor') { await talkDecor(game, npc); return; }
  if (ch === 'name') { await nameCritter(game, npc); return; }
  if (ch !== 'buy') return;
  const left = Object.entries(c.list).filter(([id]) => !game.save.critters?.[id]);
  if (!left.length) { await game.dialog.say([[name, c.full]]); return; }
  const opts = left.map(([id, d]) => ({ id, label: `${d.name} (${d.cost} LT)`, desc: `${d.desc} Cứ ${d.every_h} giờ làm ra một món.`, color: coins(game.save) >= d.cost ? '#f2c94c' : '#8a8498' }));
  opts.push({ id: 'thoi', label: M.out, desc: `Đang có ${coins(game.save)} Linh Thạch` });
  const id = await game.dialog.choose(`${name}: ${pick(c.lines)}`, opts);
  if (!c.list[id]) return;
  if (!buyCritter(game, id)) { await game.dialog.say([[name, c.poor]]); return; }
  await game.dialog.say([[name, pick(c.bought)]]);
}
