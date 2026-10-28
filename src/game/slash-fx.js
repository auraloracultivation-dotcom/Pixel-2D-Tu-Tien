// Tạo vệt chém mượt (chủ dự án xin 29/10/2026), vẽ ở src/render/draw-slash.js; số ở data/config.json → slash.
// arc: cung quanh người (quét, hất, móc, xoay); line: vệt thẳng (đâm, bổ); spin: vùng chiêu xoay (kim luân).
import { addFx } from './combat.js';

const DEG = Math.PI / 180;
const C = game => game.data.config.slash;
const width = (game, r) => Math.max(C(game).w_min, Math.min(C(game).w_max, r * C(game).w));
const lifeOf = c => c.timing.reduce((a, b) => a + b, 0);   // đủ các khung: lóe, vút, đỉnh, tan
const seed = () => Math.floor(Math.random() * 1000);

// dir 1: quét theo chiều kim đồng hồ, -1: ngược lại
export function slashArc(game, { x, y, ang, r, arc = 150, dir = 1, color, pal, life }) {
  const c = C(game);
  if (!c) return;
  const half = Math.min(arc, c.max_arc) / 2 * DEG;
  addFx(game, { type: 'slash', shape: 'arc', x, y, r, a0: ang - half * dir, a1: ang + half * dir, w: width(game, r), color: color || c.color, pal, life: life || lifeOf(c), seed: seed() });
}

// Vệt thẳng từ (x, y) theo hướng ang dài len; from: phần đầu bỏ trống (vệt bắt đầu cách gốc một đoạn)
export function slashLine(game, { x, y, ang, len, from = 0.15, color, pal, life, w }) {
  const c = C(game);
  if (!c) return;
  addFx(game, { type: 'slash', shape: 'line', x, y, ang, len, from, w: w || width(game, len * 0.6), color: color || c.color, pal, life: life || lifeOf(c), seed: seed() });
}

// Hai lưỡi xoay quanh vùng chiêu suốt thời gian vùng còn
export function slashSpin(game, { on, r, color, pal, life, spin = 9 }) {
  const c = C(game);
  if (!c) return;
  addFx(game, { type: 'slash', shape: 'arc', on, ox: 0, oy: -3, r, spin, span: 2.1, w: width(game, r), color: color || c.color, pal, life, seed: seed() });
}

// Đòn đánh thường theo động tác vũ khí (src/game/player.js → strike)
export function weaponSlash(game, p, w, move, ang, tip) {
  const color = w.color, r = w.range;
  if (move === 'bo') {   // bổ dọc: vệt thẳng chém xuống tại chỗ trúng, nghiêng theo hướng mặt
    const tilt = Math.cos(ang) >= 0 ? -0.35 : 0.35;
    slashLine(game, { x: tip.x - Math.cos(Math.PI / 2 + tilt) * 16, y: tip.y - Math.sin(Math.PI / 2 + tilt) * 16, ang: Math.PI / 2 + tilt, len: 30, from: 0, color });
  } else if (move === 'dam') {   // đâm: vệt kiếm khí thẳng từ người ra mũi
    slashLine(game, { x: p.x, y: p.y - 8, ang, len: r + 6, from: 0.2, color });
  } else if (move === 'xoay') {
    slashArc(game, { x: p.x, y: p.y - 6, ang, r, arc: 330, dir: (p.swingDir = -(p.swingDir || 1)), color });
  } else {   // quét, hất (quét ngược chiều), móc (thấp hơn)
    slashArc(game, { x: p.x, y: p.y - (move === 'moc' ? 3 : 7), ang, r, arc: w.arc || 140, dir: move === 'hat' ? -1 : 1, color });
  }
}
