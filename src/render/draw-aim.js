// Khung chiêu khi giữ / kéo nút chiêu (chủ dự án xin 28/10/2026): thay vạch ngắm bằng đúng hình và tầm của chiêu, vẽ trên mặt đất.
// Đạn: dải rộng bằng đạn, dài bằng tầm, có vòng nổ ở cuối nếu nổ; bắn quạt: hình quạt nhạt và từng dải đạn; chiêu vòng (aoe, zone):
// hình tròn đúng bán kính ở đúng chỗ nổ; lao tới: dải lao và chỗ đáp; chiêu tự thân: vòng nhỏ quanh người.
// Số lấy đúng như castSkill (src/game/skills.js) dùng: range, radius, spread, count, offset, dist, explode trong data/skills.json.
// Vẽ kiểu pixel: tô từng điểm ảnh ở độ phân giải bản đồ (lưới chấm + viền sáng + viền mực), lưu sẵn theo chiêu và hướng.
import { skillSlots } from '../game/skills.js';
import { autoAim } from '../game/player.js';

const DIRS = 128, INK = [27, 24, 48], cache = new Map();
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const SHOT_Y = -4, SHOT_FROM = 6;   // đạn bay ra từ ngang ngực, cách người 6 (như castSkill)

// Các mảnh hình theo hướng a, gốc ở chân người chơi. lv 1 = vùng phủ (nhạt), 2 = vùng trúng
function parts(s, a) {
  const P = [], dir = q => [Math.cos(q), Math.sin(q)];
  const lane = (ax, ay, bx, by, hw) => P.push({ k: 'lane', ax, ay, bx, by, hw: Math.max(hw, 1.5), lv: 2 });
  const circ = (x, y, r, lv = 2) => P.push({ k: 'circ', x, y, r, lv });
  const shot = q => {   // một viên đạn: dải từ chỗ bắn tới hết tầm, nổ thì thêm vòng nổ ở cuối
    const [c, n] = dir(q), ax = c * SHOT_FROM, ay = SHOT_Y + n * SHOT_FROM, bx = ax + c * s.range, by = ay + n * s.range;
    lane(ax, ay, bx, by, s.radius);
    if (s.explode) circ(bx, by, s.explode);
  };
  const [c, n] = dir(a);
  if (s.type === 'projectile') shot(a);
  else if (s.type === 'multi') {
    const full = s.spread >= 360, sp = s.spread * Math.PI / 180, R = s.range + SHOT_FROM;
    if (full) circ(0, SHOT_Y, R, 1); else P.push({ k: 'fan', x: 0, y: SHOT_Y, a, half: sp / 2, r: R, lv: 1 });
    for (let i = 0; i < s.count; i++) shot(full ? a + i / s.count * Math.PI * 2 : a + (s.count > 1 ? (i / (s.count - 1) - 0.5) * sp : 0));
  } else if (s.type === 'aoe' || s.type === 'zone') circ(c * (s.offset || 0), n * (s.offset || 0), s.radius);
  else if (s.type === 'dash') { lane(0, 0, c * s.dist, n * s.dist, 8); circ(c * s.dist, n * s.dist, 7); }   // trúng khi cách đường lao dưới 8 + thân quái
  else circ(0, 0, 14, 1);
  return P;
}

const box = p => (p.k === 'lane' ? [Math.min(p.ax, p.bx) - p.hw, Math.min(p.ay, p.by) - p.hw, Math.max(p.ax, p.bx) + p.hw, Math.max(p.ay, p.by) + p.hw]
  : [p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r]);

function inside(p, x, y) {
  if (p.k === 'circ') return (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;
  if (p.k === 'fan') {
    const dx = x - p.x, dy = y - p.y;
    return dx * dx + dy * dy <= p.r * p.r && Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - p.a), Math.cos(Math.atan2(dy, dx) - p.a))) <= p.half;
  }
  const dx = p.bx - p.ax, dy = p.by - p.ay, t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (y - p.ay) * dy) / (dx * dx + dy * dy || 1)));
  return (x - p.ax - dx * t) ** 2 + (y - p.ay - dy * t) ** 2 <= p.hw * p.hw;
}

// Tô thành ảnh: trong vùng trúng lưới chấm đậm, vùng phủ chấm thưa, mép vùng viền sáng, ngoài mép một viền mực cho nổi trên nền sáng
function build(s, a) {
  const P = parts(s, a);
  let X0 = 0, Y0 = 0, X1 = 0, Y1 = 0;
  for (const p of P) { const b = box(p); X0 = Math.min(X0, b[0]); Y0 = Math.min(Y0, b[1]); X1 = Math.max(X1, b[2]); Y1 = Math.max(Y1, b[3]); }
  X0 = Math.floor(X0) - 2; Y0 = Math.floor(Y0) - 2; X1 = Math.ceil(X1) + 2; Y1 = Math.ceil(Y1) + 2;
  const w = X1 - X0, h = Y1 - Y0, m = new Uint8Array(w * h);
  for (const p of P) {
    const b = box(p);
    for (let y = Math.max(0, Math.floor(b[1]) - Y0); y < Math.min(h, Math.ceil(b[3]) - Y0 + 1); y++) {
      for (let x = Math.max(0, Math.floor(b[0]) - X0); x < Math.min(w, Math.ceil(b[2]) - X0 + 1); x++) {
        const i = y * w + x;
        if (m[i] < p.lv && inside(p, X0 + x + 0.5, Y0 + y + 0.5)) m[i] = p.lv;
      }
    }
  }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'), img = cx.createImageData(w, h), d = img.data, col = rgb(s.color);
  const put = (i, c, al) => { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = al; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, v = m[i];
      const l = x > 0 ? m[i - 1] : 0, r = x < w - 1 ? m[i + 1] : 0, u = y > 0 ? m[i - w] : 0, dn = y < h - 1 ? m[i + w] : 0;
      if (v) {
        if (Math.min(l, r, u, dn) < v) put(i, col, v === 2 ? 240 : 170);
        else if (v === 2) put(i, col, (x + y) % 2 ? 70 : 125);
        else if ((x + y) % 2 === 0 && y % 2 === 0) put(i, col, 80);
      } else if (Math.max(l, r, u, dn)) put(i, INK, 110);
    }
  }
  cx.putImageData(img, 0, 0);
  return { cv, ox: X0, oy: Y0 };
}

// Hình không đổi theo hướng: vòng quanh người, chiêu tự thân
const still = s => ((s.type === 'aoe' || s.type === 'zone') && !s.offset) || !['projectile', 'multi', 'aoe', 'zone', 'dash'].includes(s.type);

// Gọi trong lớp mặt đất (src/render/draw.js drawWorld, đã ở toạ độ bản đồ)
export function drawAim(ctx, game) {
  const inp = game.input, act = inp?.aiming?.act || inp?.holding;
  if (!act || game.dialog?.open) return;
  const id = skillSlots(game)[Number(act.slice(1))], s = id && game.data.skills[id];
  if (!s) return;
  const p = game.player, f = (inp.aiming?.act === act && inp.aiming) || autoAim(game, id) || p.face || { x: 1, y: 0 };
  const k = still(s) ? 0 : ((Math.round(Math.atan2(f.y, f.x) / (Math.PI * 2) * DIRS) % DIRS) + DIRS) % DIRS, key = `${id}:${s.type}:${s.range || s.dist || s.radius}:${k}`;
  let c = cache.get(key);
  if (!c) { if (cache.size > 300) cache.clear(); c = build(s, k / DIRS * Math.PI * 2); cache.set(key, c); }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(game.time * 6);
  ctx.drawImage(c.cv, Math.round(p.x) + c.ox, Math.round(p.y) + c.oy);
  ctx.restore();
}
