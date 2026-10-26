// Tự hành (nút Tự hành): nhân vật tự đi làm nhiệm vụ truyện. Tìm đường qua cổng giữa các đảo, đi bộ tới NPC,
// đánh đúng quái, nhặt vật phẩm, dọn bí cảnh và đánh boss. Truyện chờ tu luyện thì làm việc vặt (chores.js),
// hết việc thì ngồi bồ đoàn hoặc săn quái quanh đó. Nhặt được đồ tốt hơn thì tự mặc (autoequip.js).
import { dist } from './combat.js';
import { fightStep, toward, reachOf } from './auto.js';
import { choreJob, doBrew } from './chores.js';
import { autoEquip } from './autoequip.js';
import { pilotOpt } from './pilotopt.js';
import { daoLuHere } from './affinity.js';
import { canPat, patPet } from './pat.js';
import { phase } from './daynight.js';
import { sitView, standUp, spotHere } from './scenic.js';

const C = game => game.data.config.pilot;

export function togglePilot(game) {
  game.pilot = game.pilot ? null : { path: null, key: '', repath: 0, line: 0 };
  if (game.pilot) game.auto = false;
  game.toast(game.pilot ? 'Tự hành: tự đi làm nhiệm vụ' : 'Tắt tự hành', 1.4);
}

export function stopPilot(game, text) {
  if (!game.pilot) return;
  game.pilot = null;
  if (text) game.toast(text, 2.6);
}

// Chữ báo việc tự hành đang làm, hiện dưới mục tiêu
export function pilotLabel(game) {
  const j = game.pilot?.job, L = C(game).labels;
  const k = j && Object.keys(L).find(k => j[k]);
  if (!k) return '';
  const o = j[k], name = o?.def?.name || '', to = j.to && game.data.maps[j.to]?.name;
  return 'Tự hành: ' + (k === 'go' && to ? L.to.replace('{name}', to) : L[k].replace('{name}', name));
}

// Đường qua các đảo: tìm theo cổng (bỏ cổng chưa mở), trả về cổng đầu tiên phải đi
function routeTo(game, dest) {
  const maps = game.data.maps, flags = game.save.flags, seen = new Set([game.map.id]);
  const q = [[game.map.id, null]];
  while (q.length) {
    const [id, first] = q.shift();
    for (const pt of maps[id].portals) {
      if ((pt.need && !flags[pt.need]) || seen.has(pt.to)) continue;
      const f = first || pt;
      if (pt.to === dest) return f;
      seen.add(pt.to); q.push([pt.to, f]);
    }
  }
  return null;
}

// Tìm đường trên lưới ô (BFS), trả về danh sách điểm giữa ô
function findPath(game, tx, ty) {
  const map = game.map, T = map.T, p = game.player;
  const sx = Math.floor(p.x / T), sy = Math.floor(p.y / T), W = map.w;
  const prev = new Map([[sy * W + sx, -1]]), q = [[sx, sy]];
  const goal = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= (map.solidTile(tx, ty) ? 1 : 0);
  const gates = new Set(map.def.portals.filter(pt => pt.at[0] !== tx || pt.at[1] !== ty).map(pt => pt.at[1] * W + pt.at[0]));   // không giẫm nhầm cổng khác
  for (let i = 0; i < q.length && q.length < 6000; i++) {
    const [x, y] = q[i];
    if (goal(x, y)) {
      const out = [];
      for (let k = y * W + x; k !== -1; k = prev.get(k)) out.unshift(map.center(k % W, Math.floor(k / W)));
      return out.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * W + nx;
      if (prev.has(k) || gates.has(k) || map.solidTile(nx, ny)) continue;
      prev.set(k, y * W + x); q.push([nx, ny]);
    }
  }
  return null;
}

// Đi tới điểm (x, y) theo đường đã tìm, tính lại mỗi nhịp repath hoặc khi đổi đích
function walk(game, x, y, dt) {
  const pl = game.pilot, p = game.player, T = game.map.T;
  const key = `${game.map.id}:${Math.floor(x / T)},${Math.floor(y / T)}`;
  if (pl.key !== key || (pl.repath -= dt) <= 0) { pl.key = key; pl.repath = C(game).repath; pl.path = findPath(game, Math.floor(x / T), Math.floor(y / T)); }
  const path = pl.path;
  while (path?.length && Math.hypot(path[0].x - p.x, path[0].y - p.y) < 4) path.shift();
  const nx = path?.length ? path[0] : { x, y };
  return Math.hypot(nx.x - p.x, nx.y - p.y) < 2 ? { x: 0, y: 0 } : toward(p, nx.x, nx.y);
}

const nearest = (game, list) => { let b = null, bd = Infinity; for (const e of list) { const d = dist(e, game.player); if (d < bd) { bd = d; b = e; } } return b; };
const alive = game => game.mobs.filter(m => !m.dead);
const tileOf = (game, at) => game.map.center(at[0], at[1]);

// Việc tu luyện: đạo lữ đang ở nhà, hoặc trời đã tối, thì về động phủ; không thì ngồi bồ đoàn trên đảo này,
// đảo không có bồ đoàn thì về động phủ (hoặc Thiên Kiếm Phong)
function sit(game) {
  const home = game.save.flags['dong-phu'] ? 'dong-phu' : 'thien-kiem-phong', d = game.save.flags['dong-phu'] && daoLuHere(game);
  const m = game.map.findTiles('M')[0], night = game.save.flags['dong-phu'] && pilotOpt(game, 'dem') && phase(game).id === 'dem';   // đêm thì về nhà
  if (m && (game.map.id === home || (!night && (!d || game.save.companion === d)))) return { sit: m };
  const pt = routeTo(game, home);
  return pt ? { go: tileOf(game, pt.at), to: home } : { hunt: true };
}

// Việc cần làm lúc này: { fight } | { go: {x,y} } | { talk } | { use: {x,y} } | { fish: {x,y} } | { brew, at } | { pat } | { view, at } | { sit } | null (đứng chờ)
function plan(game) {
  const s = game.story.current(), p = game.player, u = s?.until;
  // Quái đang đánh mình ở gần: đánh trước
  const foe = nearest(game, alive(game).filter(m => m.aggro && dist(m, p) < C(game).guard));
  if (foe) return { fight: foe };
  if (game.map.def.res) { const m = nearest(game, alive(game)); return m ? { fight: m } : null; }   // trong bí cảnh tài nguyên: đánh tới hết giờ
  if (!s || u.never || u.realm || u.total || u.layer) return choreJob(game, routeTo) || sit(game);   // chờ tu luyện
  const dest = u.map || s.target_map || s.map || game.map.id;
  if (game.map.id !== dest) {
    const pt = routeTo(game, dest);
    return pt ? { go: tileOf(game, pt.at), to: dest } : sit(game);
  }
  if (u.map) { const pt = routeTo(game, u.map); return pt ? { go: tileOf(game, pt.at), to: u.map } : null; }
  if (u.talk) { const n = game.npcs.find(n => n.id === u.talk); return n ? { talk: n } : s.target ? { go: tileOf(game, s.target) } : null; }
  if (u.reach) return { go: tileOf(game, u.reach) };
  if (u.collect) { const k = nearest(game, game.pickups.filter(k => k.item === u.collect)); if (k) return { go: k }; }
  if (u.kill) { const m = nearest(game, alive(game).filter(m => m.id === u.kill)); if (m) return { fight: m }; }
  if (u.boss_dead || u.kill_all || u.any || u.kill) {
    const m = nearest(game, alive(game).filter(m => m.story || m.room || m.aggro || m.id === u.kill));
    if (m) return { fight: m };
    const room = game.dungeon?.rooms.find(r => !r.entered);
    if (room) { const [x, y, w, h] = room.rect; return { go: game.map.center(Math.floor(x + w / 2), Math.floor(y + h / 2)) }; }
  }
  if (s.target) return { go: tileOf(game, s.target) };
  return sit(game);
}

// Chưa tới tầm thì đi theo đường (vòng qua dung nham, tường), tới tầm thì đánh
const engage = (game, m, dt) => dist(m, game.player) > reachOf(game, m) ? { ax: walk(game, m.x, m.y, dt), atk: false } : fightStep(game, m);

// Gọi mỗi khung từ player khi đang tự hành: trả về hướng đi và có đánh thường không
export function pilotStep(game, ax, dt) {
  const p = game.player, none = { ax, atk: false };
  if (Math.hypot(ax.x, ax.y) > 0.1) return none;   // tự tay đẩy cần thì nhường
  if ((game.pilot.aeT = (game.pilot.aeT || 0) - dt) <= 0) { game.pilot.aeT = 2; if (pilotOpt(game, 'mac')) autoEquip(game); }
  if (game.view) { if (game.view.t >= game.data.scenic.sunset.sec) standUp(game); return none; }   // đang ngắm cảnh
  if (game.trib.canStart()) { game.input.pressed.add('act'); return none; }
  const job = game.pilot.job = plan(game);
  if (!job) return none;
  if (job.fight) { p.meditating = false; return engage(game, job.fight, dt); }
  if (job.talk) {
    if (dist(job.talk, p) < game.data.config.interact_range * 0.8) { game.input.pressed.add('act'); return none; }
    return { ax: walk(game, job.talk.x, job.talk.y, dt), atk: false };
  }
  if (job.sit) {
    const c = tileOf(game, job.sit);
    if (Math.hypot(c.x - p.x, c.y - p.y) > 10) return { ax: walk(game, c.x, c.y, dt), atk: false };
    if (!p.meditating) game.input.pressed.add('act');
    return none;
  }
  if (job.fish) {   // câu cá: tới mép đảo, thả câu, cá cắn thì kéo
    if (game.fish) { if (game.fish.bite) game.input.pressed.add('act'); return none; }
    if (Math.hypot(job.fish.x - p.x, job.fish.y - p.y) > 3) return { ax: walk(game, job.fish.x, job.fish.y, dt), atk: false };
    p.meditating = false; game.input.pressed.add('act');
    return none;
  }
  if (job.brew) {
    if (Math.hypot(job.at.x - p.x, job.at.y - p.y) > 22) return { ax: walk(game, job.at.x, job.at.y, dt), atk: false };
    if ((game.pilot.brewT = (game.pilot.brewT || 0) - dt) <= 0) { game.pilot.brewT = 1.2; doBrew(game, job.brew); }
    return none;
  }
  if (job.view) {   // ngắm hoàng hôn: tới phiến đá rồi ngồi
    if (!spotHere(game)) return { ax: walk(game, job.at.x, job.at.y, dt), atk: false };
    game.save.sunset = new Date().toDateString();
    sitView(game, job.view, true);
    return none;
  }
  if (job.pat) {   // vuốt ve linh thú: tới sát rồi vuốt, nghỉ chút giữa hai lần
    if (!canPat(game)) return { ax: walk(game, job.pat.x, job.pat.y, dt), atk: false };
    if ((game.pilot.patT = (game.pilot.patT || 0) - dt) <= 0) { game.pilot.patT = 2.2; p.meditating = false; patPet(game); }
    return none;
  }
  if (job.use) {
    if (Math.hypot(job.use.x - p.x, job.use.y - p.y) > 8) return { ax: walk(game, job.use.x, job.use.y, dt), atk: false };
    game.input.pressed.add('act');
    return none;
  }
  if (job.hunt) {
    const m = nearest(game, alive(game).filter(m => m.def.qi));
    return m && dist(m, p) < 220 ? engage(game, m, dt) : none;
  }
  p.meditating = false;
  return { ax: walk(game, job.go.x, job.go.y, dt), atk: false };
}

// Tự lật lời thoại khi đang tự hành (lựa chọn thì vẫn chờ người chơi)
export function pilotDialog(game, dt) {
  const pl = game.pilot;
  if (!pl || !game.dialog.open) { if (pl) pl.line = 0; return; }
  if ((pl.line += dt) < C(game).line) return;
  pl.line = 0;
  game.dialog.skip?.();
}
