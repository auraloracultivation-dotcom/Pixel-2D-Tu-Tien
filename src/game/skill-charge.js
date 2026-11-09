// Kiểu chiêu 'charge' — Phá Thiên Tuyệt Trảm, tuyệt học cấm kỵ (chủ dự án 09/11/2026 20:14, bán ở Vạn Bảo Lâu 100.000 Linh Thạch):
//   tụ lực s.charge giây: đứng yên, bất tử (a.charge, dashT); linh khí bốn phương hút vào vũ khí, vũ khí đỏ rực, lớn dần tới s.grow lần,
//   sét, huyết vụ đỏ đen, sương trắng thay nhau cuốn quanh (hình: render/draw-charge.js);
//   rồi chém ra một vệt sáng trắng chói hình quạt s.angle độ về phía trước (ngắm quái gần nhất lúc chém), viền mờ màu trang phục,
//   lan tới mép màn hình mới tan (s.beam giây). Mọi mục tiêu trong quạt trúng s.mult × đánh thường (15 lần).
// Dùng được cả khi không có quái (chiêu lớn để quay video). PvP giữ luật trọng tài: lúc chém gọi pvpTryHit. Bản sao so tài dùng được
// (duel-cast.js, mục tiêu là người chơi); người khác thấy tụ lực và vệt chém (others-cast.js, chỉ hình).
import { hitMob, dist, impactShake, addFx } from './combat.js';
import { outfitColor } from './slash-fx.js';
import { pvpTryHit } from './pvp.js';
import { weaponId } from './stats.js';

// Độ dài vệt: từ gốc theo hướng ang tới mép khung nhìn (+ s.over), không có khung nhìn thì s.range
function reach(game, x, y, ang, s) {
  const v = game.screen?.viewRect?.();
  if (!v) return s.range;
  const c = Math.cos(ang), d = Math.sin(ang), ts = [];
  if (c > 1e-3) ts.push((v.x1 - x) / c); else if (c < -1e-3) ts.push((v.x0 - x) / c);   // khung nhìn { x0, y0, x1, y1 } (core/screen.js, đã nới 16 đơn vị)
  if (d > 1e-3) ts.push((v.y1 - y) / d); else if (d < -1e-3) ts.push((v.y0 - y) / d);
  const t = Math.min(...ts.filter(n => n > 0));
  return Number.isFinite(t) ? Math.max(s.range * 0.5, t + s.over) : s.range;
}

// Quạt có đáy (chủ dự án 09/11/2026 23:35: hình quạt, không phải chữ V, quái sát người cũng trúng): rộng base mỗi bên ngay tại gốc, hai mép
// mở nửa góc half. Coi như quạt nhọn từ đỉnh ảo lùi sau gốc off = base / tan(half), cắt bỏ phần sau gốc. Dùng chung cho trúng đòn và hình.
export const beamOff = (base, half) => base / Math.tan(half);

// Mục tiêu t nằm trong quạt (gốc x, y, hướng ang, nửa góc half, đáy base, dài L tính từ gốc) không: tính cả bề ngang thân
export function inBeam(t, x, y, ang, half, L, base = 0) {
  const c = Math.cos(ang), s = Math.sin(ang), dx = t.x - x, dy = t.y - y, r = t.r || 5;
  const along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
  return along >= -r - 4 && along <= L + r && perp <= base + Math.max(0, along) * Math.tan(half) + r;
}

// Bắt đầu tụ lực. a: người ra chiêu; aim(): hướng chém lúc ra đòn (góc); fire(ang, L): gây đòn khi chém
export function startCharge(game, a, s, color, aim, fire) {   // vệt chém dùng s.base, s.angle
  a.charge = { s, t0: game.time, t: 0, color, aim, fire };
  a.dashT = s.charge + 0.2; a.dashV = null; a.kx = a.ky = 0; a.moving = false;
}

// Chiêu của người chơi (skills.js castSkill): dmg = đánh thường × cấp chiêu; trúng s.mult lần
export function castCharge(game, s, dmg) {
  const p = game.player, color = outfitColor(game, game.data.weapons[weaponId(game.save, game.data)]);
  p.meditating = false; p.riding = false;
  const hand = p.castAim;   // vuốt nút chiêu: chém theo hướng vuốt (player.js); chạm: tự ngắm con gần nhất lúc chém
  startCharge(game, p, s, color, () => {
    if (hand) return Math.atan2(hand.y, hand.x);
    let best = null, bd = 1e9;
    for (const m of game.mobs) if (!m.dead && dist(p, m) < bd) { bd = dist(p, m); best = m; }
    return best && bd < s.range * 1.5 ? Math.atan2(best.y - p.y, best.x - p.x) : Math.atan2(p.face.y, p.face.x);
  }, (ang, L) => {
    pvpTryHit(game);
    for (const m of game.mobs) if (!m.dead && inBeam(m, p.x, p.y - 8, ang, s.angle * Math.PI / 360, L, s.base)) hitMob(game, m, dmg * s.mult, { color, fromX: p.x, fromY: p.y });
  });
}

// Mỗi khung khi đang tụ lực (player.js, duel-ai.js): đứng yên, bất tử, rung màn tăng dần; đủ s.charge giây thì chém. Trả true khi còn tụ.
export function chargeHold(game, a, dt) {
  const c = a.charge;
  if (!c) return false;
  const s = c.s;
  c.t += dt; a.dashT = Math.max(a.dashT, 0.1); a.kx = a.ky = 0; a.moving = false;
  if (a === game.player && (c.shk = (c.shk || 0) - dt) <= 0) { c.shk = 0.12; game.screen?.shake?.(0.4 + 2.2 * Math.min(1, c.t / s.charge) ** 2, 0.12); }
  if (c.t < s.charge) return true;
  release(game, a);
  return false;
}

function release(game, a) {
  const c = a.charge, s = c.s, ang = c.aim(), x = a.x, y = a.y - 8, L = reach(game, x, y, ang, s);
  a.charge = null; a.dashT = 0.25;
  a.face = { x: Math.cos(ang), y: Math.sin(ang) };
  if (Math.abs(a.face.x) > 0.2) a.lookX = Math.sign(a.face.x);
  addFx(game, { type: 'beam', x, y, ang, half: s.angle * Math.PI / 360, base: s.base || 0, grow: s.grow, own: a === game.player, len: L, color: c.color, life: s.beam });
  c.fire?.(ang, L);
  if (!c.fire) return;   // người khác ra chiêu: chỉ hình, không rung, không chớp máy mình
  impactShake(game, 200); game.flashT = Math.max(game.flashT || 0, 0.18);
  game.sfx?.('impact', 1); game.sfx?.('swing', 1);
}

// Người khác ra chiêu (others-cast.js): chỉ hình tụ lực rồi vệt chém theo hướng họ nhìn lúc ra chiêu
export function seeCharge(game, o, s, ang) {
  startCharge(game, o, s, s.color, () => ang, null);
}
