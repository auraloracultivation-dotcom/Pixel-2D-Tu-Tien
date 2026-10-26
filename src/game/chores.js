// Việc vặt cho tự hành khi truyện đang chờ tu luyện: trả việc phụ đã xong, làm tiếp việc phụ đang nhận,
// hạ quái cho việc hằng ngày và treo thưởng, về động phủ thu hoạch dược viên khi chín. Hết việc thì trả null để nhân vật về bồ đoàn đả tọa.
// Không tự nhận việc mới, không tự lãnh treo thưởng (những việc đó có lựa chọn, để người chơi quyết).
import { dist } from './combat.js';
import { ensureDaily, taskDef } from './daily.js';
import { nextRipe } from './garden.js';
import { daoLuHere } from './affinity.js';
import { outdoor } from './daynight.js';

const flagOk = (game, o) => (!o.need || game.save.flags[o.need]) && !(o.unless && game.save.flags[o.unless]);

// Bản đồ có NPC này (đã hiện)
function npcMap(game, id) {
  for (const m of Object.values(game.data.maps)) if (m.npcs.some(n => n.id === id && flagOk(game, n))) return m.id;
  return null;
}

// Bãi quái ngoài trời của loài này: ưu tiên đảo đang đứng, sau đó đảo đi tới được
function spawnerOf(game, mob, routeTo) {
  const here = game.map.def.spawners.find(s => s.mob === mob && flagOk(game, s));
  if (here) return { map: game.map.id, s: here };
  for (const m of Object.values(game.data.maps)) {
    const s = m.spawners.find(s => s.mob === mob && flagOk(game, s));
    if (s && routeTo(game, m.id)) return { map: m.id, s };
  }
  return gardenJob(game, routeTo);
}

// Ô đứng câu cá gần nhất trên đảo này: ô đi được, sát biển mây, không phải cổng
function fishSpot(game) {
  const map = game.map, p = game.player;
  if (!outdoor(game) || map.def.no_fish) return null;
  const gates = new Set(map.def.portals.map(pt => pt.at.join(',')));
  let best = null, bd = Infinity;
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
    if (map.solidTile(x, y) || gates.has(x + ',' + y) || ![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => map.at(x + dx, y + dy) === '~')) continue;
    const c = map.center(x, y), d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Danh sách việc theo thứ tự ưu tiên: { talk: npcId } | { kill: mobId } | { pick: sideId, map } | { fish: true }
function wants(game) {
  const s = game.save, out = [];
  for (const [id, q] of Object.entries(game.data.side.quests)) {
    const st = s.side?.[id];
    if (st?.state !== 'on') continue;
    if (st.n >= q.n) out.push({ talk: q.npc });
    else if (q.kind === 'kill') out.push({ kill: q.mob });
    else out.push({ pick: id, map: q.map });
  }
  for (const t of ensureDaily(game).tasks) {
    const d = taskDef(game, t.id);
    if (d?.type === 'kill' && d.mob && t.n < d.n) out.push({ kill: d.mob });
    if (d?.type === 'fish' && t.n < d.n) out.push({ fish: true });
  }
  const b = s.bounty && game.data.quests.bounties.find(x => x.id === s.bounty.id);
  if (b && s.bounty.n < b.n) out.push({ kill: b.mob });
  return out;
}

const goPortal = (game, routeTo, dest) => { const pt = routeTo(game, dest); return pt ? { go: game.map.center(pt.at[0], pt.at[1]) } : null; };

// Dược viên có luống chín mà không có đạo lữ ở nhà thu giúp: về động phủ, tới luống đầu rồi thu hoạch
function gardenJob(game, routeTo) {
  const g = game.data.garden;
  if (!game.save.flags['dong-phu'] || daoLuHere(game) || nextRipe(game) > 0) return null;
  if (game.map.id !== g.map) return goPortal(game, routeTo, g.map);
  return { use: game.map.center(g.plots[0][0], g.plots[0][1]) };
}

export function choreJob(game, routeTo) {
  const p = game.player;
  for (const w of wants(game)) {
    if (w.talk) {
      const n = game.npcs.find(n => n.id === w.talk);
      if (n) return { talk: n };
      const m = npcMap(game, w.talk), j = m && goPortal(game, routeTo, m);
      if (j) return j;
    } else if (w.pick) {
      if (game.map.id !== w.map) { const j = goPortal(game, routeTo, w.map); if (j) return j; continue; }
      const k = game.pickups.filter(k => k.side === w.pick).sort((a, b) => dist(a, p) - dist(b, p))[0];
      if (k) return { go: k };
    } else if (w.fish) {
      if (game.fish) return { fish: game.fish };   // đang thả câu: đứng yên chờ
      const at = fishSpot(game);
      if (at) return { fish: at };
      const j = goPortal(game, routeTo, 'thien-kiem-phong');
      if (j) return j;
    } else if (w.kill) {
      const sp = spawnerOf(game, w.kill, routeTo);
      if (!sp) continue;   // chỉ có trong bí cảnh: bỏ qua
      if (sp.map !== game.map.id) { const j = goPortal(game, routeTo, sp.map); if (j) return j; continue; }
      const m = game.mobs.filter(m => !m.dead && m.id === w.kill).sort((a, b) => dist(a, p) - dist(b, p))[0];
      return m ? { fight: m } : { go: game.map.center(sp.s.at[0], sp.s.at[1]) };   // chờ quái mọc lại ở bãi
    }
  }
  return gardenJob(game, routeTo);
}
