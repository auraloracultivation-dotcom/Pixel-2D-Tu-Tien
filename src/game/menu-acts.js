// Việc của các ô Menu (data/menu.json): ô nào đã mở, đang bận không vào được, nói chuyện thẳng với NPC (tháp, luận võ,
// bí cảnh tài nguyên, tổ đội, tẩy linh căn) mà không phải đi tới chỗ họ, danh sách bí cảnh và vào thẳng từ menu.
import { talkTower } from './tower.js';
import { talkArena } from './arena.js';
import { talkRes } from './resrun.js';
import { talkParty } from './party.js';
import { talkReroot, rerootNpc } from './reroot.js';
import { pickMode, cleared, hintOf } from './dun-mode.js';
import { demonWhy } from './demon.js';

const M = game => game.data.menu;
const TALK = {
  tower: g => [g.data.tower.npc, talkTower],
  arena: g => [g.data.arena.npc, talkArena],
  res: g => [g.data.resrun.npc, talkRes],
  party: g => [g.data.party.npc, talkParty],
  reroot: g => [g.data.elements._reroot.npc, talkReroot],
};

// Ô chưa mở thì trả lý do (ô hiện mờ), mở rồi thì null
export function itemLock(game, it) {
  if (it.need && !game.save.flags[it.need]) return it.lock || M(game).dungeon.locked;
  if (it.talk === 'reroot' && !rerootNpc(game, game.data.elements._reroot.npc)) return it.lock;
  if (it.demon) return demonWhy(game);
  return null;
}

// Đang bận việc không bỏ ngang được (độ kiếp, cảnh truyện, đang bay, đang trong tháp / đài / bí cảnh tài nguyên)
export function busyWhy(game) {
  const B = M(game).busy;
  if (game.trib.active) return B.trib;
  if (game.story.busy || game.dialog.open) return B.story;
  if (game.trip || game.traveling) return B.trip;
  if (game.tower || game.arena || game.res) return B.run;
  return null;
}

export function talkMenu(game, kind) {
  const [id, fn] = TALK[kind](game);
  return fn(game, { id, def: game.data.npcs[id] });
}

// Bí cảnh: bản đồ có phòng mà một tinh cầu có cổng dẫn vào, theo thứ tự truyện (config.maps); cờ need của cổng là điều kiện mở
export function dungeonList(game) {
  const D = game.data, out = [], seen = new Set();
  for (const mid of D.config.maps) {
    const m = D.maps[mid];
    if (!m.world) continue;
    for (const pt of m.portals) {
      const d = D.maps[pt.to];
      if (!d || !(d.rooms || []).length || d.demon || seen.has(pt.to)) continue;
      seen.add(pt.to);
      const open = !pt.need || !!game.save.flags[pt.need], n = cleared(game, pt.to);
      out.push({ id: pt.to, name: d.name, from: m.name, spawn: pt.spawn, label: pt.label, open, done: n > 0, hint: open ? hintOf(game, pt.to, Math.max(0, n - 1)) : null });
    }
  }
  return out;
}

// Vào bí cảnh từ menu: như đi qua cổng (đã qua thì hỏi độ khó). Trả lý do nếu chưa vào được
export async function enterDungeon(game, d) {
  const why = busyWhy(game);
  if (why) return why;
  if (!(await pickMode(game, d.id))) return null;
  await game.travel(d.id, d.spawn, true, { text: d.label, kind: 'portal' });
  return null;
}

// Phương Thiên Địa (Ma Vương tuần): bay thẳng như chạm trên tinh đồ
export async function enterDemon(game) {
  const why = busyWhy(game) || demonWhy(game);
  if (why) return why;
  const id = Object.keys(game.data.maps).find(k => game.data.maps[k].demon);
  await game.travel(id, 'vao', true, { text: game.data.starmap.texts.trip.replace('{name}', game.data.maps[id].name), kind: 'portal' });
  return null;
}
