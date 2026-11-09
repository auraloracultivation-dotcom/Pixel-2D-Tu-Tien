// Tự động săn (nút Tự đánh): đánh quái quanh chỗ bật, không tự làm truyện, không chạy trong tháp, độ kiếp.
// Chủ dự án 06/11/2026 10:27: bật Tự đánh ngay cạnh boss (Thôn Thiên Mãng, Yêu Vương...) thì ưu tiên boss máu cao nhất trước, hết boss
// mới đánh quái thường. 10:43: không ép ai farm boss — bật ở chỗ khác (xa boss quá boss_on) thì không đánh boss, như trước.
// Trong động phủ thì đánh Mộc Nhân.
import { dist } from './combat.js';
import { skillSlots } from './skills.js';
import { weaponId } from './stats.js';
import { unstuck } from './unstuck.js';
import { findPath } from './pilot.js';

// Trong nhà không tự đánh, trừ động phủ có Mộc Nhân (góp ý #114: tự đánh Mộc Nhân để đo sát thương/giây, game/dummy.js)
const indoorOk = game => !game.map.def.indoor || (game.map.id === game.data.home.map && game.mobs.some(m => m.dummy));
export const autoAllowed = game => !game.map.def.tower && !game.map.def.res && indoorOk(game) && !(game.trib.active && !game.trib.wantsAuto);   // độ kiếp: được Tự đánh để hạ tâm ma (tribulation.js wantsAuto)

export function toggleAuto(game) {
  if (!game.auto && !autoAllowed(game)) { game.toast('Không tự đánh được ở đây.', 1.4); return; }
  game.auto = !game.auto;
  game.autoTgt = null; game.autoPath = null; game.unstuck = null;   // bật lại thì bỏ trạng thái cũ (bước ngang dở, đường cũ)
  if (game.auto) { game.autoHome = { x: game.player.x, y: game.player.y }; game.autoBoss = nearBoss(game); }
  game.toast(game.auto ? (game.autoBoss ? 'Tự đánh: đánh boss trước, hết boss thì săn quái' : 'Tự đánh: săn quái quanh đây') : 'Tắt tự đánh', 1.2);
}

// Gọi khi người chơi không tự đẩy cần: trả về hướng đi và có đánh thường không; bấm chiêu đã hồi
export function autoStep(game, ax, dt = 0) {
  const p = game.player, cfg = game.data.config.auto;
  if (!game.auto) return { ax, atk: false };
  if (!autoAllowed(game)) { game.auto = false; return { ax, atk: false }; }
  if (Math.hypot(ax.x, ax.y) > 0.1) { game.autoHome = { x: p.x, y: p.y }; game.autoBoss = nearBoss(game); return { ax, atk: false }; } // tự tay đi: dời chỗ săn theo (đi tới cạnh boss thì đánh boss, đi xa thì thôi)
  const home = game.autoHome ??= { x: p.x, y: p.y };   // bật từ chỗ khác chưa ghi chỗ săn thì lấy chỗ đang đứng
  const dun = (game.map.def.rooms || []).length > 0;   // góp ý #110: trong bí cảnh đánh mọi quái kể cả boss, không giới hạn vùng săn (phòng nối nhau)
  let R = cfg.radius;
  const ok = m => m && !m.dead && m.hp > 0 && !m.story && !m.remote && (dun || game.autoBoss || !isBoss(m)) && game.mobs.includes(m) && !((m.skipUntil || 0) > Date.now()) && (dun || m.dummy || Math.hypot(m.x - home.x, m.y - home.y) <= ((m.def.ai === 'boss' || m.wboss) ? cfg.boss_radius ?? R : R));   // Mộc Nhân: đánh ở đâu trong động phủ cũng được
  let tgt = null, bd = Infinity, boss = null;
  const pick = () => { for (const m of game.mobs) {
    if (!ok(m)) continue;
    if (isBoss(m)) { if (!boss || m.maxHp > boss.maxHp) boss = m; continue; }
    const d = dist(m, p); if (d < bd) { bd = d; tgt = m; }
  } };
  pick();
  // Chủ dự án 09/11/2026 12:29: bấm Tự đánh mà quanh chỗ bật không có quái thì nhân vật đi lung tung (lên trên) chứ không tìm con gần.
  // Không có con nào trong radius thì tìm xa hơn (far), có thì dời chỗ săn tới đó.
  if (!tgt && !boss && !dun && cfg.far) { R = cfg.far; pick(); if (tgt) game.autoHome = { x: tgt.x, y: tgt.y }; }
  if (boss) { bd = dist(boss, p); tgt = boss; }   // boss máu cao nhất trước, không đổi sang quái con
  // Bám một con tới khi chết (báo lỗi #87: chọn lại con gần nhất mỗi khung nên hai con cách gần bằng nhau thì chạy lên chạy xuống);
  // chỉ đổi khi có con khác gần hơn hẳn (dưới một nửa khoảng cách)
  const cur = game.autoTgt;
  if (!boss && ok(cur) && tgt !== cur && bd > dist(cur, p) * 0.5) tgt = cur;
  game.autoTgt = tgt;
  const r = tgt ? pathStep(game, tgt, ax, dt) : { ax: !dun && Math.hypot(home.x - p.x, home.y - p.y) > 8 ? toward(p, home.x, home.y) : ax, atk: false };   // bí cảnh hết quái: đứng chờ
  // Chống kẹt (báo lỗi #102, #117): đuổi mãi sau nhà, cây, cột đá mà không nhích thì bỏ con này một lúc (skipUntil, tự hành cũng tránh),
  // khung sau chọn con khác hoặc đi về chỗ săn; trước đó bước ngang một chút cho thoát góc (unstuck.js)
  // boss thì không bỏ (đường vòng bossStep tự tìm lại), chỉ quái thường mới bỏ một lúc
  return unstuck(game, r, dt, () => { if (tgt && tgt !== boss) { tgt.skipUntil = Date.now() + game.data.config.unstuck.skip * 1000; game.autoTgt = null; } else game.autoPath = null; });
}

// Chưa tới tầm hoặc bị nhà, cây chắn thì đi theo đường tìm trên lưới ô (pilot.js findPath) tới ô sát mục tiêu, tìm lại mỗi giây;
// tới nơi thì đánh như thường. Trước đây chỉ boss mới tìm đường, quái thường đi thẳng nên đâm vào nhà rồi bước ngang lung tung.
// Không có đường tới (quái đứng trong chỗ kín) thì bỏ con đó một lúc.
function pathStep(game, tgt, ax, dt) {
  const p = game.player, T = game.map.T;
  if (dist(tgt, p) <= reachOf(game, tgt) && clearShot(game, p, tgt)) { game.autoPath = null; return fightStep(game, tgt, ax); }
  const a = game.autoPath ??= { path: null, t: 0, key: '' }, key = `${game.map.id}:${Math.floor(tgt.x / T)},${Math.floor(tgt.y / T)}`;
  if (a.key !== key || (a.t -= dt) <= 0) { a.key = key; a.t = 1; a.path = findPath(game, Math.floor(tgt.x / T), Math.floor(tgt.y / T)); }
  const path = a.path;
  while (path?.length && Math.hypot(path[0].x - p.x, path[0].y - p.y) < 4) path.shift();
  if (!path) { if (!isBoss(tgt)) { tgt.skipUntil = Date.now() + 5000; game.autoTgt = null; } return fightStep(game, tgt, ax); }
  if (!path.length) return fightStep(game, tgt, ax);
  return { ax: toward(p, path[0].x, path[0].y), atk: false };
}

const isBoss = m => m.def.ai === 'boss' || !!m.wboss;
// Đang đứng cạnh một boss còn sống (data/config.json auto.boss_on)
const nearBoss = game => { const p = game.player, r = game.data.config.auto.boss_on ?? 160; return game.mobs.some(m => !m.dead && !m.story && isBoss(m) && dist(m, p) <= r + (m.r || 0)); };

export const toward = (p, x, y) => { const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; };

// Đánh một con: áp sát tới tầm vũ khí, đánh thường, bấm chiêu đã hồi
export const reachOf = (game, tgt) => { const w = game.data.weapons[weaponId(game.save, game.data)]; return w.range * (w.attack === 'shot' ? 0.7 : 0.6) + tgt.r; };
export function fightStep(game, tgt, ax = { x: 0, y: 0 }) {
  const p = game.player, bd = dist(tgt, p), reach = reachOf(game, tgt), see = clearShot(game, p, tgt);
  const slots = skillSlots(game);
  if (bd < reach + 30 && see) {
    for (let i = 0; i < 3; i++) if (slots[i] && p.skillCd[i] <= 0) game.input.pressed.add('s' + i);
    if ((p.artCd || 0) <= 0) game.input.pressed.add('art');   // góp ý #111: chiêu pháp bảo đã hồi thì tự dùng (không có pháp bảo thì nút không làm gì)
  }
  return bd > reach || !see ? { ax: toward(p, tgt.x, tgt.y), atk: false } : { ax, atk: true };
}

// Có bắn thẳng tới được không: không vướng vách, cây, nhà giữa hai bên (đạn chạm vách là tan, combat.js).
// Trước đây đứng trong tầm mà cách hàng cây thì tự hành đánh mãi không trúng (chơi thử 28/10: kẹt ở Rừng Mê).
export function clearShot(game, a, b) {
  const map = game.map, T = map.T, d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 4);
  const bx = Math.floor(b.x / T), by = Math.floor(b.y / T);   // ô của chính mục tiêu không tính (quái lỡ đứng lấn vào cây vẫn đánh được)
  for (let i = 1; i < n; i++) {
    const x = Math.floor((a.x + (b.x - a.x) * i / n) / T), y = Math.floor((a.y + (b.y - a.y) * i / n) / T);
    if ((x !== bx || y !== by) && map.wallTile(x, y)) return false;
  }
  return true;
}
