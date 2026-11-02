// Việc của các ô Menu (data/menu.json): ô nào đã mở, đang bận không vào được, nói chuyện thẳng với NPC (tháp, luận võ,
// bí cảnh tài nguyên, tổ đội, tẩy linh căn) mà không phải đi tới chỗ họ, danh sách bí cảnh và vào thẳng từ menu.
import { talkParty } from './party.js';
import { talkReroot, rerootNpc } from './reroot.js';
import { pickMode, cleared, hintOf } from './dun-mode.js';
import { demonWhy } from './demon.js';

const M = game => game.data.menu;
const TALK = {
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
  if (game.duel) return B.run;
  return null;
}

export function talkMenu(game, kind) {
  const [id, fn] = TALK[kind](game);
  return fn(game, { id, def: game.data.npcs[id] });
}

// Bí cảnh: bản đồ có phòng mà một tinh cầu có cổng dẫn vào, theo thứ tự truyện (config.maps); cờ need của cổng là điều kiện mở
export const dunClosed = (game, id) => (game.data.dungeon.closed || []).includes(id);   // bí cảnh tạm đóng cửa (data/dungeon.json → closed)
export function dungeonList(game) {
  const D = game.data, out = [], seen = new Set();
  for (const mid of D.config.maps) {
    const m = D.maps[mid];
    if (!m.world) continue;
    for (const pt of m.portals) {
      const d = D.maps[pt.to];
      if (!d || !(d.rooms || []).length || d.demon || seen.has(pt.to)) continue;
      seen.add(pt.to);
      const closed = dunClosed(game, pt.to), open = !closed && (!pt.need || !!game.save.flags[pt.need]), n = cleared(game, pt.to);
      out.push({ id: pt.to, name: d.name, from: m.name, spawn: pt.spawn, label: pt.label, open, closed, done: n > 0, hint: open ? hintOf(game, pt.to, Math.max(0, n - 1)) : null });
    }
  }
  return out.filter(d => d.open).concat(out.filter(d => !d.open && !d.closed), out.filter(d => d.closed));   // đang mở lên trên (chủ dự án 18:04)
}

// Vào bí cảnh từ menu: như đi qua cổng (đã qua thì hỏi độ khó). Trả lý do nếu chưa vào được
export async function enterDungeon(game, d) {
  const why = busyWhy(game);
  if (why) return why;
  if (!(await pickMode(game, d.id))) return null;
  await game.travel(d.id, d.spawn, true, { text: d.label, kind: 'portal' });
  return null;
}
