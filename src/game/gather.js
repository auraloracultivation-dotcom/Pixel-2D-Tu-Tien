// Khai linh khoáng (data/gather.json): mạch khoáng cố định trên mỗi tinh cầu, đứng cạnh bấm Đào, đứng yên vài giây thì được
// Tinh Thiết (thêm theo cấp Linh Cuốc), may thì Tẩy Luyện Thạch, Khóa Linh Thạch; mạch cạn rồi đầy lại theo giờ thật (save.veins).
import { hoiCovers } from '../world/hoi-foot.js';
import { matInfo } from './cave.js';
import { addCoins, coins } from './shop.js';

const C = game => game.data.gather;
export const toolLv = game => Math.max(1, Math.min(C(game).tool.max, game.save?.tool || 1));

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function hashStr(t) { let h = 2166136261; for (const ch of t) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// Chọn mạch khoáng cho bản đồ đang đứng (cùng bản đồ thì luôn cùng chỗ)
export function spawnVeins(game) {
  game.veins = [];
  const def = game.map.def, c = C(game);
  if (!def.planet) return;
  const map = game.map, D = def.planet.d, R = D / 2, r = rng(hashStr(def.id + ':vein'));
  const near = (x, y, list, d) => list.some(p => Math.abs(p[0] - x) <= d && Math.abs(p[1] - y) <= d);
  const avoid = [...def.spawners.map(s => s.at), ...def.portals.map(p => p.at), ...def.npcs.map(n => n.at)];
  const cand = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const d = Math.hypot(x + 0.5 - R, y + 0.5 - R) / R, k = map.type(x, y);
    if (d >= c.min_r && d <= c.max_r && !k.solid && !k.void && !map.solidTile(x, y) && !hoiCovers(map, x, y) && !near(x, y, avoid, 3)) cand.push([x, y]);   // tránh cả đồ lễ hội
  }
  const picked = [];
  for (let i = 0; i < 200 && picked.length < c.per_map && cand.length; i++) {
    const p = cand[Math.floor(r() * cand.length)];
    if (!near(p[0], p[1], picked, 5)) picked.push(p);
  }
  game.veins = picked.map((p, i) => ({ i, ...map.center(p[0], p[1]) }));
}

const readyAt = (game, v) => game.save.veins?.[game.map.id]?.[v.i] || 0;
export const veinReady = (game, v) => Date.now() >= readyAt(game, v);

export function nearVein(game) {
  const p = game.player, c = C(game);
  let best = null, bd = c.range;
  for (const v of game.veins || []) { const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < bd) { bd = d; best = v; } }
  return best;
}

// Bấm Đào: mạch còn thì bắt đầu đào, cạn thì báo còn bao lâu
export function startDig(game, v) {
  const c = C(game);
  if (!veinReady(game, v)) { game.toast(c.texts.empty.replace('{min}', Math.ceil((readyAt(game, v) - Date.now()) / 60000)), 1.6); return; }
  game.player.meditating = false;
  game.dig = { v, t: 0, dur: c.dig / (1 + (toolLv(game) - 1) * c.tool.speed_per) };
  game.sfx('swing', 0.5);
}

// Đang đào: đi chỗ khác là thôi; đủ thời gian thì nhận đồ, mạch cạn
export function updateDig(game, dt) {
  const g = game.dig, p = game.player, c = C(game);
  if (!g) return;
  if (p.moving || Math.hypot(g.v.x - p.x, g.v.y - p.y) > c.range + 4) { game.dig = null; return; }
  g.t += dt;
  if (Math.floor(g.t / 0.4) !== Math.floor((g.t - dt) / 0.4)) game.sfx('hit', 0.3);
  if (g.t < g.dur) return;
  game.dig = null;
  const s = game.save, k = 1 + (toolLv(game) - 1) * c.tool.yield_per, got = [];
  const give = (id, n) => { if (n <= 0) return; s.mats[id] = (s.mats[id] || 0) + n; got.push(`${n} ${matInfo(game.data, id).name}`); };
  const [id, lo, hi] = c.yield;
  give(id, Math.round((lo + Math.random() * (hi - lo)) * k));
  for (const [rid, pr, n] of c.rare) if (Math.random() < pr) give(rid, n);
  ((s.veins ??= {})[game.map.id] ??= {})[g.v.i] = Date.now() + c.respawn_min * 60000;
  game.toast(c.texts.got.replace('{got}', got.join(', ')), 1.8);
  game.sfx('pickup');
  game.persist();
}

export const toolCost = game => Math.round(C(game).tool.coins_base * C(game).tool.coins_r ** (toolLv(game) - 1));
export function upgradeTool(game) {
  const t = C(game).tool, lv = toolLv(game), cost = toolCost(game);
  if (lv >= t.max || coins(game.save) < cost) return false;
  addCoins(game, -cost);
  game.save.tool = lv + 1;
  game.persist();
  return true;
}
