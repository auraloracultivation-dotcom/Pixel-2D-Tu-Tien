// Tự hành rảnh tay (chủ dự án 28/10/2026: người chơi thích treo máy chém, tung chiêu liên tục): đào linh khoáng còn trên tinh cầu này,
// không còn việc thì tới bãi treo máy vừa sức nhất (data/planets.json → farm) mà đánh, tinh cầu này không có bãi thì bay tới tinh cầu hợp cảnh giới.
import { dist } from './combat.js';
import { pilotOpt, nightRest, avoided } from './pilotopt.js';
import { veinReady } from './gather.js';
import { snackJob } from './snack.js';
import { fairMap } from './fair.js';

// Sức mình so một con quái (máu, công gấp mul lần): giống màu gợi ý ở cổng bí cảnh (dungeon.json → hint). >= hard là đánh được
export function foeRatio(game, def, mul = 1) {
  const H = game.data.dungeon.hint, st = game.player?.st, pc = game.data.config.player;
  if (!def || !st) return 1;
  const dps = st.atk * (1 + st.crit * (st.critMult - 1)) * H.dps_per_atk;
  const hit = Math.max(def.atk * mul * (pc.def_min_take ?? 0), def.atk * mul - st.def);
  return (st.maxHp / Math.max(0.1, hit * H.hit_rate / (def.cd || 1))) / (def.hp * mul / Math.max(1, dps));
}

// Mạch khoáng còn gần nhất trên bản đồ này (tự hành bật "Đào linh khoáng")
export function digJob(game) {
  if (!pilotOpt(game, 'dao') || nightRest(game) || !game.veins?.length) return null;
  const p = game.player, v = game.veins.filter(v => veinReady(game, v)).sort((a, b) => dist(a, p) - dist(b, p))[0];
  return v ? { dig: v } : null;
}

// Bãi treo máy vừa sức nhất ở bản đồ này: mạnh nhất mà vẫn đánh được
function bestCamp(game) {
  const H = game.data.dungeon.hint;
  let best = null, bm = -1;
  for (const s of game.spawners) {
    if (!s.farm || avoided(game, s.mob)) continue;
    const mul = s.mul || 1, r = foeRatio(game, game.data.mobs[s.mob], mul);
    if (r >= H.hard && mul > bm) { bm = mul; best = s; }
  }
  return best;
}

// Tinh cầu có bãi treo máy hợp cảnh giới nhất mà đi tới được
function farmPlanet(game, routeTo) {
  const sm = game.data.starmap, realm = game.save.realm || 0;
  const ok = sm.bodies.filter(b => b.map && b.realm != null && b.realm <= realm && game.data.maps[b.map]?.spawners.some(s => s.farm) && game.save.visited?.[b.map]);
  ok.sort((a, b) => b.realm - a.realm || b.orbit - a.orbit);
  return ok.find(b => b.map === game.map.id || routeTo(game, b.map))?.map || null;
}

// Tối có hội đèn ở tinh cầu đã tới (tùy chọn "hoi"): ra sân xóm ngồi đả tọa, linh khí x1,2 và gặp người chơi khác
export function fairJob(game, routeTo) {
  if (!pilotOpt(game, 'hoi') || nightRest(game)) return null;
  const id = fairMap(game);
  if (!id || !game.save.visited?.[id]) return null;
  if (game.map.id !== id) { const pt = routeTo(game, id); return pt ? { go: game.map.center(pt.at[0], pt.at[1]), to: id } : null; }
  const hm = game.map.def.hamlets?.[0];
  return hm ? { fair: true, sit: [hm[0], hm[1] + 1] } : null;
}

export function farmJob(game, routeTo) {
  if (!pilotOpt(game, 'treo') || nightRest(game)) return null;
  const camp = bestCamp(game), p = game.player;
  // Có tinh cầu hợp cảnh giới hơn tinh cầu đang đứng thì bay sang đó treo (chơi thử 28/10: Hóa Thần vẫn đứng chém Mộc linh
  // ở bãi tập Thiên Kiếm Phong hàng giờ, linh khí mỗi con quá ít)
  const better = farmPlanet(game, routeTo), bodyRealm = id => game.data.starmap.bodies.find(b => b.map === id)?.realm ?? -1;
  if (better && better !== game.map.id && bodyRealm(better) > bodyRealm(game.map.id)) {
    const pt = routeTo(game, better);
    if (pt) return { go: game.map.center(pt.at[0], pt.at[1]), to: better };
  }
  if (camp) {
    const sj = snackJob(game);   // hết linh thực mà dư Linh Thạch: ghé xóm mua một phần rồi mới treo
    if (sj) return sj;
    const m = camp.alive.filter(m => !m.dead && !((m.skipUntil || 0) > Date.now())).sort((a, b) => dist(a, p) - dist(b, p))[0];
    return m ? { fight: m } : { go: game.map.center(camp.at[0], camp.at[1]) };   // chờ quái hồi ngay tại bãi
  }
  const to = farmPlanet(game, routeTo);
  if (!to || to === game.map.id) return null;
  const pt = routeTo(game, to);
  return pt ? { go: game.map.center(pt.at[0], pt.at[1]), to } : null;
}
