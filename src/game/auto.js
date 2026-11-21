// Tự động săn (nút Tự đánh): đánh quái quanh chỗ bật, không tự làm truyện, không chạy trong tháp, độ kiếp.
// Chủ dự án 06/11/2026 10:27: bật Tự đánh ngay cạnh boss (Thôn Thiên Mãng, Yêu Vương...) thì ưu tiên boss máu cao nhất trước, hết boss
// mới đánh quái thường. 10:43: không ép ai farm boss — bật ở chỗ khác (xa boss quá boss_on) thì không đánh boss, như trước.
// Trong động phủ thì đánh Mộc Nhân.
import { dist } from './combat.js';
import { reachOf as mobReach } from './mob-power.js';
import { skillSlots } from './skills.js';
import { pbOn, pbWorn } from './phap-bao.js';
import { knOn, knO } from './ky-nang.js';
import { weaponId } from './stats.js';
import { unstuck } from './unstuck.js';
import { findPath, leoBac } from './pilot.js';
import { lootStep } from './loot.js';

// Trong nhà không tự đánh, trừ động phủ có Mộc Nhân (góp ý #114: tự đánh Mộc Nhân để đo sát thương/giây, game/dummy.js)
const indoorOk = game => !game.map.def.indoor || (game.map.id === game.data.home.map && game.mobs.some(m => m.dummy));
export const autoAllowed = game => !game.map.def.tower && !game.map.def.res && indoorOk(game) && !(game.trib.active && !game.trib.wantsAuto);   // độ kiếp: được Tự đánh để hạ tâm ma (tribulation.js wantsAuto)

export function toggleAuto(game) {
  if (!game.auto && leoBac(game, 'danh')) return;   // chặng leo bậc đầu game: tự tay đánh
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
  // Sang bản đồ khác (bay tinh cầu, cổng) thì chỗ săn cũ thuộc bản đồ cũ: lấy chỗ đang đứng (chủ dự án 09/11/2026 16:19: vừa tới
  // Thiên Kim Tinh nhân vật chạy về một góc thay vì đánh quái gần, vì còn nhớ chỗ săn ở tinh cầu trước)
  if (game.autoHomeMap !== game.map.id) { game.autoHomeMap = game.map.id; game.autoHome = { x: p.x, y: p.y }; game.autoTgt = null; game.autoPath = null; }
  const home = game.autoHome ??= { x: p.x, y: p.y };   // bật từ chỗ khác chưa ghi chỗ săn thì lấy chỗ đang đứng
  const lootDir = lootStep(game);   // đồ rơi chạy qua mới nhặt: hết quái đang đánh mình thì đi nhặt trước (src/game/loot.js)
  if (lootDir) return { ax: lootDir, atk: false };
  const dun = (game.map.def.rooms || []).length > 0;   // góp ý #110: trong bí cảnh đánh mọi quái kể cả boss, không giới hạn vùng săn (phòng nối nhau)
  let R = cfg.radius;
  const ok = m => m && !m.dead && m.hp > 0 && !m.story && (!m.remote || m.qc != null) && (dun || game.autoBoss || !isBoss(m)) && game.mobs.includes(m) && !((m.skipUntil || 0) > Date.now()) && (dun || m.dummy || Math.hypot(m.x - home.x, m.y - home.y) <= ((m.def.ai === 'boss' || m.wboss) ? cfg.boss_radius ?? R : R));   // Mộc Nhân: đánh ở đâu trong động phủ cũng được
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

// Đánh một con: tới tầm vũ khí, đánh thường, bấm chiêu đã hồi. Tầm chém = tầm vệt chém (player.js reachW: tầm × slash.far) × keep.slash;
// tắt keep thì như cũ (× 0.6, áp sát vào hình quái lớn)
const keepCfg = game => { const K = game.data.config.auto?.keep; return K?.on ? K : null; };
// Đang cưỡi thì thú đánh (player.js mountSwing): tầm là tầm thú (data/pets.json → ride.reach), không theo vũ khí
export const reachOf = (game, tgt) => { const K = keepCfg(game), w = game.player?.riding ? { range: game.data.pets.ride.reach, attack: 'arc' } : game.data.weapons[weaponId(game.save, game.data)]; return w.range * (w.attack === 'shot' ? K?.shot ?? 0.7 : (K?.slash ?? 0.6) * (game.data.config.slash?.far || 1)) + tgt.r; };
export function fightStep(game, tgt, ax = { x: 0, y: 0 }) {
  const p = game.player, bd = dist(tgt, p), reach = reachOf(game, tgt), see = clearShot(game, p, tgt);
  const slots = pbOn(game) ? pbWorn(game) : skillSlots(game);   // hệ pháp bảo mới: tự đánh bấm 3 nút pháp bảo
  if (bd < reach + 30 && see) {
    for (let i = 0; i < 3; i++) if (slots[i] && p.skillCd[i] <= 0) game.input.pressed.add('s' + i);
    if ((p.artCd || 0) <= 0) game.input.pressed.add('art');   // góp ý #111: chiêu pháp bảo đã hồi thì tự dùng (không có pháp bảo thì nút không làm gì)
    if (knOn(game)) knO(game).forEach((id, i) => {   // Kỹ năng đã hồi thì tự dùng; chiêu hồi máu chờ lúc máu dưới 70%
      if (id && (p.knCd?.[i] ?? 0) <= 0 && !(game.data.skills[id].type === 'heal' && p.hp > p.maxHp * 0.7)) game.input.pressed.add('sk' + i);
    });
  }
  if (bd > reach || !see) { p.keepOut = null; return { ax: toward(p, tgt.x, tgt.y), atk: false }; }
  return keepStep(game, tgt, bd, reach, ax);
}

// Giữ khoảng cách (chủ dự án 16/11/2026 18:1x: "khi auto luôn duy trì khoảng cách vừa đủ tầm chém thường với quái và vừa đủ tầm chém
// của quái, không sát dính lại nhau"): đứng trong tầm mình mà chờ quái tự tới mép tầm của nó (mobs.js: quái đứng lại khi vừa vào tầm);
// quái lấn vào dưới keep × back thì lùi tới keep, mặt vẫn hướng quái, vẫn chém. Lùi tối đa back_max giây (vướng tường, bị vây), sau đó
// nghỉ back_rest giây; sau lưng là tường thì đứng đánh. Số ở data/config.json → auto.keep.
function keepStep(game, tgt, bd, reach, ax) {
  const p = game.player, K = keepCfg(game), now = game.time || 0;
  if (!K || Math.hypot(ax.x, ax.y) > 0.1) return { ax, atk: true };
  const keep = keepDist(game, tgt, reach);
  let k = p.keepOut;
  if (k && (k.m !== tgt || bd >= keep || now - k.t0 > K.back_max)) { if (k.m === tgt && bd < keep) p.keepRest = now + K.back_rest; p.keepOut = k = null; }
  if (!k && bd < keep * K.back && now >= (p.keepRest || 0)) k = p.keepOut = { m: tgt, t0: now };
  const dir = k && backDir(game, p, Math.atan2(p.y - tgt.y, p.x - tgt.x));
  if (!dir) return { ax, atk: true };
  return { ax: { x: dir.x * K.back_speed, y: dir.y * K.back_speed }, atk: true, face: toward(p, tgt.x, tgt.y) };
}

// Hướng lùi: thẳng ra xa quái; sau lưng vướng tường, cây thì chếch 45°, 90° (trượt dọc vật cản); kẹt cả thì null (đứng đánh)
const SIDE = [0, 0.785, -0.785, 1.571, -1.571];
function backDir(game, p, base) {
  for (const s of SIDE) { const x = Math.cos(base + s), y = Math.sin(base + s); if (!game.map.blocked(p.x + x * 8, p.y + y * 8, p.r)) return { x, y }; }
  return null;
}

// Khoảng muốn đứng với con đang đánh: tầm đánh của mình, hoặc tầm vồ của quái nếu ngắn hơn (quái bắn xa: theo tầm của mình)
export function keepDist(game, tgt, reach = reachOf(game, tgt)) {
  const p = game.player, K = keepCfg(game), near = tgt.def?.ai !== 'ranged' && tgt.def?.reach != null ? tgt.r + p.r + mobReach(game, tgt) : Infinity;
  return Math.max(tgt.r + p.r + 2, Math.min(reach, near) - (K?.pad ?? 2));
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
