// Việc vặt cho tự hành khi truyện đang chờ tu luyện: trả việc phụ đã xong, làm tiếp việc phụ đang nhận, tự nhận việc phụ mới,
// nhận và trả treo thưởng, về động phủ nhận quà mỗi ngày của đạo lữ và khách, vuốt ve linh thú, hoàng hôn ra ngắm cảnh,
// hạ quái cho việc hằng ngày và treo thưởng, về động phủ thu hoạch dược viên khi chín. Hết việc thì trả null để nhân vật về bồ đoàn đả tọa.
import { dist } from './combat.js';
import { ensureDaily, taskDef, bountyLeft } from './daily.js';
import { nextRipe } from './garden.js';
import { daoLuHere } from './affinity.js';
import { outdoor, phase } from './daynight.js';
import { brew, canPay } from './cave.js';
import { visitorToday } from './home.js';
import { pilotOpt } from './pilotopt.js';

const flagOk = (game, o) => (!o.need || game.save.flags[o.need]) && !(o.unless && game.save.flags[o.unless]);

// Bản đồ có NPC này (đã hiện)
function npcMap(game, id) {
  for (const m of Object.values(game.data.maps)) if (m.npcs.some(n => n.id === id && flagOk(game, n))) return m.id;
  return null;
}

// Có bãi quái ngoài trời của loài này (tự hành chỉ nhận treo thưởng đánh được ngoài trời)
export const outdoorMob = (game, mob) => Object.values(game.data.maps).some(m => m.spawners.some(s => s.mob === mob && flagOk(game, s)));

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
  const gates = new Set(map.def.portals.map(pt => pt.at.join(',')));
  let best = null, bd = Infinity;
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
    if (map.solidTile(x, y) || gates.has(x + ',' + y) || ![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => map.at(x + dx, y + dy) === '~')) continue;
    const c = map.center(x, y), d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Danh sách việc theo thứ tự ưu tiên: { talk: npcId } | { gift: npcId } | { pat: true } | { view: true } | { kill: mobId } | { pick: sideId, map } | { fish: true } | { any: true } | { brew: pillId }
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
    if (d?.type === 'kill' && !d.mob && t.n < d.n) out.push({ any: true });
    if (d?.type === 'fish' && t.n < d.n) out.push({ fish: true });
    const R = game.data.resrun;   // việc vào bí cảnh tài nguyên: tới Quản Bí Cảnh, tự chọn loại còn lượt
    if (d?.type === 'res' && t.n < d.n && s.flags[R.need] && pilotOpt(game, 'bi-canh')) out.push({ talk: R.npc });
    if (d?.type === 'arena' && t.n < d.n && s.flags[game.data.arena.need] && pilotOpt(game, 'bi-canh')) out.push({ talk: game.data.arena.npc });   // luận võ
    if (d?.type === 'tower' && t.n < d.n && s.towerGaveUp !== new Date().toDateString() && (!d.need || s.flags[d.need]) && pilotOpt(game, 'bi-canh')) out.push({ talk: game.data.tower.npc });   // leo tháp: leo lại từ tầng 1
    const pill = game.data.cave.pill_button;
    if (d?.type === 'brew' && t.n < d.n && s.flags['dong-phu'] && canPay(game, game.data.cave.pills[pill].recipe)) out.push({ brew: pill });
  }
  const b = s.bounty && game.data.quests.bounties.find(x => x.id === s.bounty.id);
  if (b && s.bounty.n < b.n) out.push({ kill: b.mob });
  else if (b || (pilotOpt(game, 'viec') && bountyLeft(game) > 0 && game.data.quests.bounties.some(x => (!x.need || s.flags[x.need]) && outdoorMob(game, x.mob)))) out.push({ talk: 'chap-su' });   // trả treo thưởng, nhận việc mới
  for (const [id, q] of Object.entries(game.data.side.quests)) {   // việc phụ chưa nhận (bỏ việc đánh quái chỉ có trong bí cảnh)
    if (pilotOpt(game, 'viec') && !s.side?.[id] && s.flags[q.need] && (q.kind !== 'kill' || outdoorMob(game, q.mob))) out.push({ talk: q.npc });
  }
  if (s.flags['dong-phu'] && pilotOpt(game, 'nha')) {   // quà mỗi ngày ở động phủ: đạo lữ và khách ghé chơi
    const d = daoLuHere(game), day = new Date().toDateString();
    if (d && s.companion !== d && (s.homeGift !== day || s.tea !== day)) out.push({ gift: d });
    const v = visitorToday(game);
    if (v && s.visitGift !== day) out.push({ gift: v });
  }
  const hp = game.data.cave.pill_button;   // đan hồi máu sắp hết thì về luyện thêm cho đủ dùng
  if (pilotOpt(game, 'dan') && s.flags['dong-phu'] && (s.pills?.[hp] || 0) < game.data.config.pilot.pill_keep && canPay(game, game.data.cave.pills[hp].recipe)) out.push({ brew: hp });
  const ss = game.data.scenic.sunset;   // hoàng hôn: ra đá ngắm cảnh một lúc
  if (pilotOpt(game, 'ngam') && !game.view && s.sunset !== new Date().toDateString() && phase(game).id === ss.phase) out.push({ view: true });
  const pt = game.data.pets.pat;   // vuốt ve linh thú mấy lần đầu mỗi ngày
  if (pilotOpt(game, 'vuot') && game.pet && !(s.pat?.day === new Date().toDateString() && s.pat.n >= pt.per_day)) out.push({ pat: true });
  return out;
}

const goPortal = (game, routeTo, dest) => { const pt = routeTo(game, dest); return pt ? { go: game.map.center(pt.at[0], pt.at[1]), to: dest } : null; };

// Tới lò đan thì luyện một mẻ (tự hành gọi)
export function doBrew(game, id) {
  const r = brew(game, id), name = game.data.cave.pills[id].name;
  if (r === false) return;
  game.sfx(r === 'fail' ? 'hit' : 'levelup');
  game.toast(r === 'fail' ? `Lò hỏng, mẻ ${name} thất bại.` : `Luyện được ${r} ${name}.`, 1.8);
}

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
    } else if (w.gift) {   // quà ở động phủ: về nhà, tới chỗ người đang ngồi chờ
      if (game.map.id !== game.data.home.map) { const j = goPortal(game, routeTo, game.data.home.map); if (j) return j; continue; }
      const n = game.npcs.find(n => n.id === w.gift && (n.home || n.visit));
      if (n) return { talk: n };
    } else if (w.view) {
      const spot = game.data.scenic.spots.find(x => x.map === game.map.id);
      if (spot) return { view: spot, at: game.map.center(spot.at[0], spot.at[1]) };
      const j = goPortal(game, routeTo, 'thien-kiem-phong');
      if (j) return j;
    } else if (w.pat) {
      if (game.pet && !game.pet.target) return { pat: game.pet };
    } else if (w.pick) {
      if (game.map.id !== w.map) { const j = goPortal(game, routeTo, w.map); if (j) return j; continue; }
      const k = game.pickups.filter(k => k.side === w.pick).sort((a, b) => dist(a, p) - dist(b, p))[0];
      if (k) return { go: k };
    } else if (w.any) {   // hạ quái bất kỳ: đánh con gần nhất, không có thì tới bãi quái, đảo không có bãi thì về Thiên Kiếm Phong
      const m = game.mobs.filter(m => !m.dead && m.def.ai !== 'boss').sort((a, b) => dist(a, p) - dist(b, p))[0];
      if (m) return { fight: m };
      const sp = game.map.def.spawners.find(s => flagOk(game, s));
      if (sp) return { go: game.map.center(sp.at[0], sp.at[1]) };
      const j = goPortal(game, routeTo, 'thien-kiem-phong');
      if (j) return j;
    } else if (w.brew) {   // luyện đan: về động phủ, tới lò đan
      if (game.map.id !== game.data.cave.map) { const j = goPortal(game, routeTo, game.data.cave.map); if (j) return j; continue; }
      const k = game.map.findTiles('K')[0];
      if (k) return { brew: w.brew, at: game.map.center(k[0], k[1]) };
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
