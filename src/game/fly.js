// Bay — ngự kiếm phi hành (chủ dự án 17/11/2026 12:41, chốt 12:45 "đều theo ý bạn"): nút Bay cạnh nút Cưỡi.
// Đang bay: bay xuyên địa hình (ao, vách, cây, nhà; KHÔNG qua cửa khoá truyện, không ra khỏi mép tinh cầu); đồ rơi quanh đó tự
// về dưới chân (src/game/loot.js fly_pull); không đánh thường, không cưỡi thú; pháp bảo dùng bình thường. Bay tốn linh lực theo
// giây, hết thì tự đáp. Cấm bay trong phó bản, bí cảnh, đài luận võ, trong nhà, vùng không gian, gần boss. Đáp xuống chỗ không
// đứng được (giữa ao) thì trôi tới bờ gần nhất rồi đáp. Mở từ đầu game. Số ở data/config.json → fly.
const F = game => game.data.config.fly || {};

const bossNear = (game, r) => (game.mobs || []).some(m => !m.dead && (m.def?.ai === 'boss' || m.wboss) && Math.hypot(m.x - game.player.x, m.y - game.player.y) < r);

// Lý do không bay được ở đây (chuỗi để báo người chơi), không có thì null
export function noFly(game) {
  const d = game.map?.def || {}, C = F(game);
  if (!C.on) return 'off';
  if (d.indoor || d.space || d.arena || d.no_fly || (d.rooms || []).length || game.dungeon || game.duel || game.sweeping) return 'Ở đây không bay được.';
  if (bossNear(game, C.boss_r || 220)) return 'Gần boss không bay được.';
  return null;
}

// Va chạm lúc bay: chỉ chặn cửa khoá truyện (map.locked) và mép tinh cầu
function flyBlocked(m, x, y, r) {
  const T = m.T, x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (m.locked.has(tx + ',' + ty) || m.edge(tx, ty)) return true;
  return false;
}
export function flyMove(game, dx, dy) {
  const p = game.player, m = game.map;
  if (dx && !flyBlocked(m, p.x + dx, p.y, p.r)) p.x += dx;
  if (dy && !flyBlocked(m, p.x, p.y + dy, p.r)) p.y += dy;
}

export function toggleFly(game) {
  const p = game.player;
  if (p.flying) { land(game); return true; }
  const why = noFly(game);
  if (why) { if (why !== 'off') game.toast(why, 1.8); return false; }
  if (game.auto || game.pilot) { game.auto = null; game.pilot = null; game.autoTgt = null; game.autoPath = null; }   // bấm Bay thì tự tắt Tự đánh / Tự hành (chủ dự án 18/11/2026 09:10)
  const C = F(game);
  if ((p.mp ?? 0) < (C.min_mp || 0) * (p.mpMax || 1)) { game.number?.(p.x, p.y - 22, 'Thiếu linh lực', '#7ab8ff'); return false; }
  if (p.riding) { game.save.ride = false; p.riding = false; }
  p.flying = true; p.flyT = 0; p.meditating = false; p.landTo = null;
  game.sfx?.('dash');
  return true;
}

// Đáp: chỗ đang bay không đứng được thì trôi tới ô trống gần nhất (land_s giây) rồi mới đáp
export function land(game) {
  const p = game.player, m = game.map;
  if (!p.flying) return;
  if (m.blocked(p.x, p.y, p.r)) {
    const T = m.T, to = m.freeNear(Math.floor(p.x / T), Math.floor(p.y / T), 0, p.r);
    p.landTo = { x: to.x, y: to.y, sx: p.x, sy: p.y, t: 0 };
    return;
  }
  p.flying = false; p.landTo = null; p.flyT = 0;
}

// Mỗi khung (src/game/player.js): trừ linh lực, tự đáp khi hết linh lực / vào chỗ cấm / bật Tự đánh, trôi tới bờ khi đáp
export function updateFly(game, dt) {
  const p = game.player, C = F(game);
  if (!p.flying) return false;
  p.flyT = (p.flyT || 0) + dt;
  if (p.landTo) {
    const L = p.landTo, e = Math.min(1, (L.t += dt) / (C.land_s || 0.5));
    p.x = L.sx + (L.x - L.sx) * e; p.y = L.sy + (L.y - L.sy) * e;
    if (e >= 1) { p.flying = false; p.landTo = null; p.flyT = 0; }
    return true;
  }
  p.mp = Math.max(0, (p.mp ?? 0) - (C.mp_s || 0.06) * (p.mpMax || 100) * dt);
  const why = noFly(game);
  if (p.mp <= 0 || (why && why !== 'off') || game.auto || game.pilot || game.save.ride) {   // bật Tự đánh / Cưỡi khi đang bay: đáp xuống
    if (p.mp <= 0) game.number?.(p.x, p.y - 22, 'Hết linh lực, đáp xuống', '#7ab8ff');
    land(game);
  }
  return false;
}
