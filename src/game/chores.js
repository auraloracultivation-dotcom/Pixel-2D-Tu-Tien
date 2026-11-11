// Đường tới việc cho tự hành: tới bãi có loài quái cần hạ, ra mép tinh cầu câu cá, tới bản đồ, gặp NPC (dùng cho nhiệm vụ ngày,
// src/game/dailyjob.js). Việc vặt cũ (về nhà nhận quà, uống trà, vuốt ve linh thú, câu cá lúc rảnh, luyện đan, nấu canh, thu hoạch
// dược viên) đã xoá: chủ dự án 11/11/2026 16:53 "tự hành đi làm việc chả liên quan tới nhiệm vụ", chọn "Tự hành chỉ làm nhiệm vụ".
import { dist } from './combat.js';
import { outdoor } from './daynight.js';
import { avoided } from './pilotopt.js';

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
  return null;
}

// Ô đứng câu cá gần nhất trên đảo này: ô đi được, sát biển mây, không phải cổng
function fishSpot(game) {
  const map = game.map, p = game.player;
  if (!outdoor(game) || map.def.no_fish) return null;
  const gates = new Set(map.def.portals.filter(pt => !pt.fly).map(pt => pt.at.join(',')));
  let best = null, bd = Infinity;
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
    if (map.solidTile(x, y) || gates.has(x + ',' + y) || ![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => map.at(x + dx, y + dy) === '=' || map.edge(x + dx, y + dy))) continue;
    const c = map.center(x, y), d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

const goPortal = (game, routeTo, dest) => { const pt = routeTo(game, dest); return pt ? { go: game.map.center(pt.at[0], pt.at[1]), to: dest } : null; };

// Đổi danh sách việc cần làm thành một bước cho tự hành (việc ngày, src/game/dailyjob.js): { talk } | { any } | { fish } | { visit } | { kill }
export function wantJob(game, routeTo, list) {
  const p = game.player;
  for (const w of list) {
    if (w.talk) {
      const n = game.npcs.find(n => n.id === w.talk);
      if (n) return { talk: n };
      const m = npcMap(game, w.talk), j = m && goPortal(game, routeTo, m);
      if (j) return j;
    } else if (w.any) {   // hạ quái bất kỳ: đánh con gần nhất, không có thì tới bãi quái, đảo không có bãi thì về Thiên Kiếm Phong
      const m = game.mobs.filter(m => !m.dead && !m.dummy && m.def.ai !== 'boss' && !avoided(game, m.id)).sort((a, b) => dist(a, p) - dist(b, p))[0];
      if (m) return { fight: m };
      const sp = game.map.def.spawners.find(s => flagOk(game, s) && !avoided(game, s.mob));   // bãi của loài đang tạm tránh (vừa hạ mình) thì thôi, kẻo đứng im ở bãi mãi (test 10/11/2026: tân thủ thua Mộc linh, đứng ở bãi Thiên Kiếm Phong không làm gì)
      if (sp) return { go: game.map.center(sp.at[0], sp.at[1]) };
      const j = goPortal(game, routeTo, 'thien-kiem-phong');
      if (j) return j;
    } else if (w.fish) {
      if (game.fish) return { fish: game.fish };   // đang thả câu: đứng yên chờ
      const at = fishSpot(game);
      if (at) return { fish: at };
      const j = goPortal(game, routeTo, 'thien-kiem-phong');
      if (j) return j;
    } else if (w.visit) {   // việc ngày Về động phủ…: tới bản đồ đó là xong
      if (game.map.id !== w.visit) { const j = goPortal(game, routeTo, w.visit); if (j) return j; }
    } else if (w.kill) {
      if (avoided(game, w.kill)) continue;   // vừa gục trước loài này: tạm tránh, làm việc khác
      const sp = spawnerOf(game, w.kill, routeTo);
      if (!sp) continue;   // chỉ có trong bí cảnh: bỏ qua
      if (sp.map !== game.map.id) { const j = goPortal(game, routeTo, sp.map); if (j) return j; continue; }
      const m = game.mobs.filter(m => !m.dead && m.id === w.kill).sort((a, b) => dist(a, p) - dist(b, p))[0];
      return m ? { fight: m } : { go: game.map.center(sp.s.at[0], sp.s.at[1]) };   // chờ quái mọc lại ở bãi
    }
  }
  return null;
}
