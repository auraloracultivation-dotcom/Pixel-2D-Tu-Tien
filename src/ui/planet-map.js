// Bản đồ tinh cầu đang đứng (tab "Tinh cầu này" trong nút Bản đồ, chủ dự án xin 28/10/2026): tinh cầu tròn vẽ mỗi ô một
// điểm ảnh rồi phóng lên không làm mịn; đánh dấu bãi quái, cổng bí cảnh, việc truyện, NPC, người chơi. Chạm chỗ nào là
// ngự kiếm bay tới đó (src/game/hop.js). Vẽ lên cùng canvas với tinh đồ (src/ui/world-map.js gọi drawPlanet, tapPlanet).
const SOLID = {
  T: '#2e6a3a', Z: '#24502c', Y: '#3e6e5a', V: '#5a4a40', '^': '#a89c86', '=': '#3a7ac0', L: '#e0502a', O: '#7ab8e0', f: '#120820',
  R: '#6e6a78', H: '#a0423a', B: '#5a4a44', W: '#6a8a40', N: '#8a6a3a', z: '#9a6a4a', '#': '#1f1830', U: '#3a3446', k: '#5a7a98',
  '*': '#7a5aa0', J: '#7a6a5a', I: '#8a6a4a', b: '#c0a050', E: '#3a2618', C: '#2a2418', X: '#241a12', Q: '#e0b050', S: '#9a94a8',
};
const COL = { camp: '#ff5a4a', gate: '#b47cff', goal: '#ffd86b', npc: '#fff2d0', you: '#ffffff' };
const cache = { id: null, cv: null };

function mini(game) {
  const map = game.map;
  if (cache.id === map.id && cache.cv) return cache.cv;
  const cv = document.createElement('canvas'); cv.width = map.w; cv.height = map.h;
  const c = cv.getContext('2d'), types = game.data.tiles.types;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (map.edge(x, y)) continue;   // ngoài mép đĩa
    const ch = map.at(x, y), k = types[ch] || {};
    c.fillStyle = SOLID[ch] || (k.solid ? shade(k.color || '#7cc46a', 0.6) : k.color || '#7cc46a');
    c.fillRect(x, y, 1, 1);
  }
  cache.id = map.id; cache.cv = cv;
  return cv;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * k);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Các điểm đánh dấu (toạ độ ô) và tên để báo khi bay tới
function marks(game) {
  const def = game.map.def, D = game.data, T = D.starmap.texts, out = [];
  for (const s of def.spawners) out.push({ k: 'camp', at: s.at, name: T.camp.replace('{name}', D.mobs[s.mob]?.name || '') });
  for (const pt of def.portals) if (!pt.fly && (!pt.need || game.save.flags[pt.need])) out.push({ k: 'gate', at: pt.at, name: T.gate.replace('{name}', D.maps[pt.to]?.name || pt.label) });
  const g = game.story?.goal?.();
  if (g?.target) out.push({ k: 'goal', at: g.target, name: g.text });
  for (const n of game.npcs) out.push({ k: 'npc', at: [Math.floor(n.x / game.map.T), Math.floor(n.y / game.map.T)], name: n.def?.name });
  return out;
}

// Vẽ; trả về bố cục để chạm đổi ra ô
export function drawPlanet(ctx, w, h, t, game) {
  const map = game.map, cv = mini(game);
  const s = Math.max(2, Math.floor(Math.min(w - 16, h - 56) / Math.max(map.w, map.h))), ox = Math.round((w - map.w * s) / 2), oy = Math.round((h - map.h * s) / 2) + 6;
  ctx.fillStyle = '#06050d'; ctx.fillRect(0, 0, w, h);
  const cx = ox + map.w * s / 2, cy = oy + map.h * s / 2, R = map.w * s / 2;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.12);
  glow.addColorStop(0, 'rgba(255,220,140,.18)'); glow.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, ox, oy, map.w * s, map.h * s);
  const at = ([x, y]) => ({ x: ox + (x + 0.5) * s, y: oy + (y + 0.5) * s });
  const ms = marks(game), r = Math.max(3, s * 0.7);
  for (const m of ms) {
    const p = at(m.at);
    ctx.fillStyle = COL[m.k]; ctx.strokeStyle = '#1b1830'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (m.k === 'npc') ctx.arc(p.x, p.y, Math.max(1.5, s * 0.3), 0, Math.PI * 2);
    else if (m.k === 'camp') { ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath(); }
    else if (m.k === 'goal') star(ctx, p.x, p.y - Math.abs(Math.sin(t * 4)) * 3, r * 1.4);
    else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke(); ctx.fill();
  }
  const p = game.player, pp = { x: ox + p.x / map.T * s, y: oy + p.y / map.T * s }, pr = r + 1 + Math.sin(t * 6) * 1.5;
  ctx.strokeStyle = '#1b1830'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COL.you; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = COL.you; ctx.beginPath(); ctx.arc(pp.x, pp.y, 2, 0, Math.PI * 2); ctx.fill();
  legend(ctx, w, h, game.data.starmap.texts);
  return { s, ox, oy, ms };
}

function star(ctx, x, y, r) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
}

function legend(ctx, w, h, T) {
  ctx.font = '700 11px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = '#e2c07a'; ctx.fillText(T.hop_hint, 10, 14);
  let x = 10;
  for (const [k, label] of [['you', T.legend_you], ['camp', T.legend_camp], ['gate', T.legend_gate], ['goal', T.legend_goal]]) {
    ctx.fillStyle = COL[k]; ctx.fillRect(x, h - 16, 8, 8);
    ctx.fillStyle = '#bcb2d0'; ctx.fillText(label, x + 11, h - 12);
    x += 18 + ctx.measureText(label).width;
  }
}

// Chạm: điểm đánh dấu gần thì lấy chỗ đó (kèm tên), không thì lấy ô dưới ngón tay. Trả về { at: [tx, ty], name } hoặc null
export function tapPlanet(lay, x, y, game) {
  if (!lay) return null;
  const pick = lay.ms.map(m => ({ m, d: Math.hypot(lay.ox + (m.at[0] + 0.5) * lay.s - x, lay.oy + (m.at[1] + 0.5) * lay.s - y) }))
    .filter(o => o.d < Math.max(12, lay.s * 1.4)).sort((a, b) => a.d - b.d)[0];
  if (pick) return { at: pick.m.at, name: pick.m.name };
  const tx = Math.floor((x - lay.ox) / lay.s), ty = Math.floor((y - lay.oy) / lay.s);
  if (tx < 0 || ty < 0 || tx >= game.map.w || ty >= game.map.h || game.map.at(tx, ty) === '~') return null;
  return { at: [tx, ty], name: null };
}
