// Thiện cảm và đạo lữ (data/affinity.json): tặng quà tăng thiện cảm và cấp bạn đồng hành, mốc mở cảnh riêng,
// đủ thân thì kết đạo lữ: song tu nhân linh khí đả tọa, đi cùng có chiêu hợp kích.
import { compNeed } from './companion.js';
import { coins, addCoins } from './shop.js';
import { hitMob, addFx, dist } from './combat.js';

const A = game => game.data.affinity;
const today = () => new Date().toDateString();

export const affinity = (game, id) => game.save.affinity?.[id] || 0;
export const tierOf = (game, pts) => [...A(game).tiers].reverse().find(t => pts >= t.pts) || null;
export const giftsLeft = (game, id) => {
  const g = game.save.giftDay;
  return A(game).per_day - (g?.day === today() ? g[id] || 0 : 0);
};

export function canGive(game, gift) {
  const s = game.save;
  if (gift.kind === 'coins') return coins(s) >= gift.n;
  if (gift.kind === 'pill') return (s.pills[gift.id] || 0) >= gift.n;
  return (s.mats[gift.id] || 0) >= gift.n;
}

// Trả về { pts, liked, scene } hoặc null
export function giveGift(game, id, giftId) {
  const cfg = A(game), s = game.save, gift = cfg.gifts.find(g => g.id === giftId);
  if (!gift || !canGive(game, gift) || giftsLeft(game, id) <= 0) return null;
  if (gift.kind === 'coins') addCoins(game, -gift.n);
  else if (gift.kind === 'pill') s.pills[gift.id] -= gift.n;
  else s.mats[gift.id] -= gift.n;
  if (s.giftDay?.day !== today()) s.giftDay = { day: today() };
  s.giftDay[id] = (s.giftDay[id] || 0) + 1;
  const liked = cfg.likes[id] === giftId, pts = gift.pts * (liked ? cfg.like_mul : 1);
  s.affinity ??= {};
  const before = affinity(game, id);
  s.affinity[id] = Math.min(cfg.max, before + pts);
  compExp(game, id, pts * cfg.exp_per_pt);
  // cảnh riêng ở mốc vừa vượt
  const sc = cfg.scenes[id] || {}, hit = Object.keys(sc).map(Number).filter(n => before < n && s.affinity[id] >= n).pop();
  game.persist();
  return { pts, liked, scene: hit ? sc[hit] : null };
}

function compExp(game, id, amount) {
  const s = game.save, cfg = game.data.companions;
  s.comps ??= {}; const st = s.comps[id] ??= { lv: 1, exp: 0 };
  st.exp += amount;
  while (st.lv < cfg.max_level && st.exp >= compNeed(game.data, st.lv)) { st.exp -= compNeed(game.data, st.lv); st.lv++; }
}

// Đạo lữ
export const daoLu = game => game.save.daoLu || null;
// Đạo lữ đang ở bên (không bị bắt đi theo truyện): mới khen, viết thư, thu hoạch giúp
export const daoLuHere = game => { const d = daoLu(game); return d && !game.save.flags[game.data.companions.list[d]?.unless] ? d : null; };
export const canPropose = (game, id) => {
  const d = A(game).dao_lu;
  return !daoLu(game) && d.can.includes(id) && affinity(game, id) >= d.pts && game.save.realm >= d.realm;
};
export function propose(game, id) {
  if (!canPropose(game, id)) return null;
  game.save.daoLu = id; game.save.daoLuAt = Date.now(); game.persist();
  return A(game).dao_lu.vows[id];
}
export const songTuMul = game => daoLu(game) ? A(game).dao_lu.meditate_mul : 1;

// Chiêu hợp kích: đạo lữ đang đi cùng, có quái gần thì cứ cd giây đánh một vòng quanh người chơi
export function updateCombo(game, dt) {
  const c = game.comp, d = A(game).dao_lu.combo, p = game.player;
  if (!c || c.id !== daoLu(game)) return;
  c.comboT = (c.comboT ?? d.cd) - dt;
  if (c.comboT > 0) return;
  const near = game.mobs.filter(m => !m.dead && dist(m, p) < d.radius + m.r);
  if (!near.length) { c.comboT = 0.5; return; }
  c.comboT = d.cd;
  addFx(game, { type: 'ring', x: p.x, y: p.y, r: d.radius, color: d.color, life: 0.6, fill: true });
  game.number(p.x, p.y - 26, d.name, d.color);
  for (const m of near) hitMob(game, m, p.atk * d.dmg, { soft: true, canCrit: true, color: d.color, fromX: p.x, fromY: p.y });
  game.screen.shake(3, 0.3); game.sfx('roar');
}
