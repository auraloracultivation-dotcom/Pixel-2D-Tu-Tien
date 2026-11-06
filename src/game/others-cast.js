// Hiệu ứng chiêu của người chơi khác (06/11/2026, chủ dự án: "thấy skill của mọi người"). Máy chủ phòng Cloudflare chuyển tin
// { id, k: mã chiêu, x, y, fx, fy } (cloud/src/proto.js cleanCast). Chỉ để nhìn: vẽ vòng, cung, tia theo loại chiêu và màu chiêu
// trong data/skills.json, không tạo đạn, không vùng sát thương, không ai bị trúng. Tin là dữ liệu lạ: mã chiêu phải có trong data/,
// toạ độ kẹp trong bản đồ, người gửi phải đang thấy trên đảo.
import { addFx } from './combat.js';

const clamp = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

export function castFx(game, o, c, bounds) {
  const s = c && Object.hasOwn(game.data.skills, c.k) ? game.data.skills[c.k] : null;
  if (!o || !s || o.x === null) return;
  const x = clamp(c.x, 0, bounds?.w ?? 1e5), y = clamp(c.y, 0, bounds?.h ?? 1e5);
  if (x === null || y === null || Math.hypot(x - o.x, y - o.y) > 200) return;   // lệch xa chỗ đang thấy người đó: bỏ
  const fx = clamp(c.fx, -1, 1) || 0, fy = clamp(c.fy, -1, 1) || 0, a = Math.atan2(fy, fx), col = s.color || '#c8f6ff';
  if (Math.abs(fx) + Math.abs(fy) > 0.1) o.face = { x: fx, y: fy };
  switch (s.type) {
    case 'projectile': case 'multi': {
      const len = Math.min(s.range || 120, 160);
      addFx(game, { type: 'arc', x, y: y - 4, r: 14, a, half: s.type === 'multi' ? Math.min(Math.PI, (s.spread || 30) * Math.PI / 360) : 0.5, color: col, life: 0.25 });
      for (let i = 1; i <= 4; i++) addFx(game, { type: 'ring', x: x + fx * len * i / 4, y: y - 4 + fy * len * i / 4, r: 4 + i, color: col, life: 0.18 + i * 0.06 });
      break;
    }
    case 'aoe': case 'zone': {
      const cx = x + fx * (s.offset || 0), cy = y + fy * (s.offset || 0);
      addFx(game, { type: 'ring', x: cx, y: cy, r: Math.min(s.radius || 40, 120), color: col, life: s.type === 'zone' ? 0.8 : 0.4, fill: true });
      break;
    }
    case 'heal': case 'shield': case 'buff':
      addFx(game, { type: 'ring', x, y: y - 6, r: 16, color: col, life: 0.5, fill: s.type !== 'heal' });
      break;
    case 'dash':
      addFx(game, { type: 'puff', x, y, r: 10, color: col, life: 0.35 });
      break;
    default:
      addFx(game, { type: 'ring', x, y: y - 4, r: 12, color: col, life: 0.3 });
  }
}
