// Mốc Liên Kích (chủ dự án 17/11/2026 11:12–11:17, 12:41): đếm nhát đánh thường và đòn thú cưỡi có trúng quái (không tính kỹ năng,
// pháp bảo, linh thú, khôi lỗi); 6 giây không trúng thì đứt. Ở nhát thứ n, n chia hết cho mốc nào (5, 10, 20, 40, 80, 160) thì nhận
// hiệu ứng mốc đó, cộng dồn: nhát 150 nhận mốc 5 và 10; nhát 160, 320, 480… nhận đủ cả sáu. Mốc 20 trở lên rút bớt thời gian hồi
// pháp bảo ("đánh thường tích luỹ giảm hồi chiêu hay đó", 12:41), có sàn: mỗi món tính từ lúc tung không hồi nhanh hơn pb_floor giây.
// Số ở data/juice.json → combo.moc. Gọi từ src/game/juice.js comboSwing.
import { hitMob, addFx } from './combat.js';

export function comboMoc(game, n) {
  const C = game.data.juice.combo, list = (C.moc || []).filter(m => n % m.n === 0);
  if (!list.length) return null;
  const p = game.player;
  for (const m of list) {
    const e = m.fx || {};
    if (e.heal) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * e.heal);
    if (e.mp) p.mp = Math.min(p.mpMax || p.mp, (p.mp || 0) + (p.mpMax || 0) * e.mp);
    if (e.pb_cd) pbCut(game, e.pb_cd, C.pb_floor || 30);
    if (e.dmg) p.comboBuff = { mul: Math.max(p.comboBuff?.end > (game.time || 0) ? p.comboBuff.mul : 1, e.dmg), end: (game.time || 0) + (e.dmg_s || 3) };
    if (e.nova) nova(game, e.nova, m.color);
    addFx(game, { type: 'ring', x: p.x, y: p.y - 6, r: 10 + Math.log2(m.n / 5 + 1) * 6, color: m.color, life: 0.45 });
  }
  const top = list[list.length - 1];
  const txt = list.length > 2 ? `${top.ten} (+${list.length - 1} mốc)` : list.map(m => m.ten).join(' · ');   // nhiều mốc cùng lúc: chữ ngắn cho vừa màn điện thoại
  return { text: `Liên Kích ${n}! ${txt}`, color: top.color, big: top.n >= 80 };
}

// Rút thời gian hồi của mọi pháp bảo đang hồi; không cho một vòng hồi ngắn hơn floor giây kể từ lúc tung (chặn xả liên tục)
function pbCut(game, sec, floor) {
  const p = game.player, now = game.time || 0;
  (p.skillCd || []).forEach((cd, i) => {
    if (!(cd > 0)) return;
    const since = now - (p.pbCastT?.[i] ?? now - floor);
    p.skillCd[i] = Math.max(cd - sec, floor - since, 0);
  });
}

// Sóng kiếm quanh người (mốc lớn): sát thương theo công, đẩy nhẹ
function nova(game, N, color) {
  const p = game.player;
  for (const m of game.mobs) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < N.r + m.r) hitMob(game, m, Math.round(p.atk * N.mul), { color, soft: true });
  addFx(game, { type: 'ring', x: p.x, y: p.y - 4, r: N.r, color, life: 0.5, fill: true });
  game.screen?.shake?.(N.shake || 1.5, 0.2);
  game.sfx?.('impact', 0.6);
}
