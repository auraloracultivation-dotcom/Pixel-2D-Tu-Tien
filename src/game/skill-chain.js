// Kiểu chiêu 'chain' — Thiểm Ảnh Liên Trảm (chủ dự án 09/11/2026 18:32, bán ở Vạn Bảo Lâu, data/shop.json): hoá ảnh lướt qua lại
// tối đa s.targets mục tiêu gần nhất trong tầm s.range, s.hits nhát trong s.dur giây (mỗi nhát s.mult × đánh thường, cả chiêu
// 4 × 2,5 = 10 lần), bất tử suốt lúc lướt (dashT: combat.js hitPlayer, duel-cast.js duelTake), dừng ở chỗ mục tiêu cuối.
// Ít mục tiêu hơn số nhát thì lướt xuyên qua lại (mỗi nhát lướt xuyên qua người mục tiêu, sang phía bên kia).
// Không có mục tiêu trong tầm: không dùng được (chainReady, player.js chưa trừ linh lực). Lướt bằng map.move nên không xuyên tường;
// khối cứng (crowd.js) bỏ qua người đang lướt. PvP giữ luật trọng tài (chủ dự án 09/11/2026 18:32): mỗi nhát gọi pvpTryHit như một
// đòn thường, máy chủ phòng tự tính sát thương. Bản sao so tài cũng dùng được (duel-cast.js, mục tiêu là người chơi).
// Hình: bóng lướt (render/draw-chain.js theo a.chain), vệt chém chữ thập lõi trắng viền màu trang phục (slash-fx.js) mỗi nhát.
import { hitMob, dist, impactShake } from './combat.js';
import { slashLine, outfitColor } from './slash-fx.js';
import { pvpTryHit, pvpMap } from './pvp.js';
import { heroLook } from '../render/draw-hero.js';
import { weaponId } from './stats.js';

const alive = t => t && !t.dead && t.hp !== 0;

// Mục tiêu của người chơi: quái còn sống; ở Ngoại Vực đang tắt bảo vệ thì cả người khác cũng tắt bảo vệ (o.pk)
function playerFoes(game) {
  const out = game.mobs.filter(m => !m.dead);
  if (game.pvp?.off && pvpMap(game)) for (const o of game.others.list.values()) if (o.pk && o.x !== null) out.push({ x: o.x, y: o.y, r: 5, pvp: o.id });
  return out;
}

// Gần nhất trước, tối đa s.targets, trong tầm s.range (tính từ mép thân)
function pick(a, foes, s, skip) {
  return foes.filter(t => alive(t) && !skip?.includes(t) && dist(a, t) - (t.r || 0) <= s.range)
    .sort((u, v) => dist(a, u) - dist(a, v)).slice(0, s.targets);
}

export const chainReady = (game, s) => pick(game.player, playerFoes(game), s).length > 0;

// Bắt đầu lướt. foes(): danh sách mục tiêu (gọi lại mỗi nhát, mục tiêu chết thì chọn con khác); strike(t, i): gây đòn nhát thứ i
export function startChain(game, a, s, foes, strike) {
  const list = pick(a, foes(), s);
  if (!list.length) return false;
  a.chain = { s, foes, strike, list, n: 0, t: 0, hop: null, color: s.color };
  a.dashT = s.dur + 0.1; a.dashV = null; a.kx = a.ky = 0;
  hop(game, a);
  return true;
}

// Chiêu của người chơi (skills.js castSkill): dmg mỗi nhát = đánh thường × s.mult × cấp chiêu
export function castChain(game, s, dmg) {
  const p = game.player, w = game.data.weapons[weaponId(game.save, game.data)];
  const color = outfitColor(game, w);
  const ok = startChain(game, p, s, () => playerFoes(game), (t, i, c) => {
    pvpTryHit(game);   // người tắt bảo vệ gần nhất trong tầm (máy chủ kiểm nhịp, tầm)
    if (!t.pvp) hitMob(game, t, dmg, { color, fromX: c.hop.sx, fromY: c.hop.sy });
    game.sfx('swing', 0.9);
    if (i === s.hits - 1) impactShake(game, 40);   // nhát cuối: rung nhẹ
  });
  if (ok) { p.chain.color = color; p.meditating = false; p.riding = false; }
  return ok;
}

// Chọn mục tiêu nhát kế tiếp và điểm đến: xuyên qua mục tiêu, sang phía bên kia s.over đơn vị (nhát cuối dừng sát sau lưng nó)
function hop(game, a) {
  const c = a.chain, s = c.s;
  if (c.n >= s.hits) return end(game, a);
  let list = c.list.filter(alive);
  if (!list.length) list = c.list = pick(a, c.foes(), s);
  if (!list.length) return end(game, a);
  const T = list[c.n % list.length];
  let dx = T.x - a.x, dy = T.y - a.y, d = Math.hypot(dx, dy);
  if (d < 1) { dx = a.face?.x || 1; dy = a.face?.y || 0; d = Math.hypot(dx, dy) || 1; }
  const ux = dx / d, uy = dy / d, last = c.n === s.hits - 1, over = (T.r || 5) + (a.r || 5) + (last ? 2 : s.over);
  c.hop = { T, sx: a.x, sy: a.y, ex: T.x + ux * over, ey: T.y + uy * over, ux, uy, k: 0, hit: false };
  a.face = { x: ux, y: uy };
  if (Math.abs(ux) > 0.2) a.lookX = Math.sign(ux);
  const look = heroLook(game, a.save || game.save), atks = look?.attacks;   // động tác chém của nhân vật (render/draw-hero.js)
  if (atks?.length && look.anims?.[atks[c.n % atks.length]]) a.heroAnim = { name: atks[c.n % atks.length], t0: game.time };
  a.swingT = 0.18;
  c.n++;
}

function end(game, a) {
  const h = a.chain?.hop;
  if (h?.T) { const fx = h.T.x - a.x, fy = h.T.y - a.y, d = Math.hypot(fx, fy); if (d > 1) a.face = { x: fx / d, y: fy / d }; }
  a.chain = null;
  a.dashT = Math.min(a.dashT, 0.12);   // lấy lại thân sau một thoáng
}

// Mỗi khung: lướt nhanh (s.move giây) tới điểm đến, chém khi lướt ngang mục tiêu, đứng chờ hết nhịp s.dur / s.hits rồi lướt tiếp.
// Trả true khi còn đang lướt (người ra chiêu bỏ qua đi lại, đánh thường).
export function chainStep(game, a, dt) {
  const c = a.chain;
  if (!c) return false;
  const s = c.s, per = s.dur / s.hits, h = c.hop;
  c.t += dt; a.dashT = Math.max(a.dashT, 0.1); a.kx = a.ky = 0;
  if (h && h.k < 1) {
    const px = a.x, py = a.y;
    h.k = Math.min(1, h.k + dt / s.move);
    const e = 1 - (1 - h.k) ** 2, tx = h.sx + (h.ex - h.sx) * e, ty = h.sy + (h.ey - h.sy) * e;
    game.map.move(a, tx - a.x, ty - a.y);
    const R = (h.T.r || 5) + (a.r || 5) + 6;
    if (!h.hit && (segNear(h.T, px, py, a.x, a.y) < R || (h.k >= 1 && dist(a, h.T) < R + 18))) {
      h.hit = true;
      cross(game, a, h, c.color);
      if (alive(h.T)) c.strike(h.T, c.n - 1, c);
    }
  }
  if (c.t >= per * c.n) hop(game, a);
  return !!a.chain;
}

// Vệt chém chữ thập ngang mục tiêu: một vệt dọc theo hướng lướt, một vệt chéo cắt ngang (lõi trắng, viền màu: render/draw-slash.js)
function cross(game, a, h, color) {
  const T = h.T, ang = Math.atan2(h.uy, h.ux), y = T.y - 8, L = 26 + (T.r || 5);
  slashLine(game, { x: T.x - h.ux * L * 0.55, y: y - h.uy * L * 0.55, ang, len: L, from: 0, color });
  const b = ang + (a.chain.n % 2 ? 1.1 : -1.1);
  slashLine(game, { x: T.x - Math.cos(b) * L * 0.4, y: y - Math.sin(b) * L * 0.4, ang: b, len: L * 0.8, from: 0, color });
}

function segNear(pt, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((pt.x - x1) * dx + (pt.y - y1) * dy) / l));
  return Math.hypot(pt.x - (x1 + dx * t), pt.y - (y1 + dy * t));
}
