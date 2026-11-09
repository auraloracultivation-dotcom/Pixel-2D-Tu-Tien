// Hiệu ứng chiêu của người chơi khác (06/11/2026, chủ dự án: "thấy skill của mọi người"; 10:10 báo chưa thấy hoạt ảnh → vẽ y như
// chiêu của chính mình). Máy chủ phòng Cloudflare chuyển tin { id, k: mã chiêu, x, y, fx, fy } (cloud/src/proto.js cleanCast).
// Chỉ để nhìn: đạn bay là đạn from 'see' (combat.js updateBullets bỏ qua, không trúng ai), vùng chiêu chỉ vẽ hình (không tạo vùng
// sát thương), hiệu ứng mới data/vfx.json qua vfxCast như skills.js. Tin là dữ liệu lạ: mã chiêu phải có trong data/,
// toạ độ kẹp trong bản đồ, người gửi phải đang thấy trên đảo.
import { addFx, shoot } from './combat.js';
import { burstFx, zoneFx, selfFx } from './skill-fx.js';
import { vfxOf, vfxCast } from './vfx.js';
import { openDomain } from './skill-domain.js';

const clamp = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

export function castFx(game, o, c, bounds) {
  const s = c && Object.hasOwn(game.data.skills, c.k) ? game.data.skills[c.k] : null;
  if (!o || !s || o.x === null) return;
  const x = clamp(c.x, 0, bounds?.w ?? 1e5), y = clamp(c.y, 0, bounds?.h ?? 1e5);
  if (x === null || y === null || Math.hypot(x - o.x, y - o.y) > 200) return;   // lệch xa chỗ đang thấy người đó: bỏ
  const fx = clamp(c.fx, -1, 1) || 0, fy = clamp(c.fy, -1, 1) || 0;
  if (Math.abs(fx) + Math.abs(fy) > 0.1) o.face = { x: fx, y: fy };
  const who = { x: o.x, y: o.y, face: o.face }, V = vfxOf(game, c.k);
  const bullet = (a, sp) => shoot(game, {
    from: 'see', x: o.x + Math.cos(a) * 6, y: o.y - 4 + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    r: s.radius, dmg: 0, pierce: true, explode: s.explode, color: s.color, life: (s.range || 120) / sp, trail: true, fx: s.fx, ult: s.ult, sk: c.k,
  });
  switch (s.type) {
    case 'projectile': bullet(Math.atan2(fy, fx), s.speed || 200); if (V) vfxCast(game, c.k, s, who); break;
    case 'multi': {
      const base = Math.atan2(fy, fx), spread = (s.spread || 30) * Math.PI / 180, full = s.spread >= 360, n = Math.min(s.count || 3, 12);
      for (let i = 0; i < n; i++) bullet(full ? base + i / n * Math.PI * 2 : base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), s.speed || 200);
      if (V) vfxCast(game, c.k, s, who);
      break;
    }
    case 'zone': {
      const z = { x: o.x + fx * (s.offset || 0), y: o.y + fy * (s.offset || 0), radius: Math.min(s.radius || 40, 140), dur: Math.min(s.dur || 2, 6) };
      if (V) vfxCast(game, c.k, s, who, { zone: z });
      else if (s.fx) zoneFx(game, s.fx, z);
      addFx(game, { type: 'ring', x: z.x, y: z.y, r: z.radius, color: s.color, life: Math.min(z.dur, 1.2), fill: true });
      break;
    }
    case 'aoe': {
      const cx = o.x + fx * (s.offset || 0), cy = o.y + fy * (s.offset || 0);
      if (V) vfxCast(game, c.k, s, who, { cx, cy });
      else { addFx(game, { type: 'ring', x: cx, y: cy, r: s.radius, color: s.color, life: 0.35, fill: true }); if (s.fx) burstFx(game, s.fx, cx, cy, s.radius, Math.atan2(fy, fx)); }
      break;
    }
    case 'heal': case 'shield': case 'buff':
      if (V) vfxCast(game, c.k, s, o);   // aura, khiên bám theo người đó
      else { addFx(game, { type: 'ring', x: o.x, y: o.y, r: s.type === 'heal' ? 18 : 14, color: s.color, life: 0.5 }); if (s.fx) selfFx(game, s.fx, o); }
      break;
    case 'domain':   // Vô Ảnh Trảm Vực: chỉ vẽ lĩnh vực và nhát chém (không gây sát thương)
      openDomain(game, o, s, x, y, s.color, () => game.mobs, null);   // o: để người đó mờ dần, biến mất như máy họ
      break;
    case 'chain':   // Thiểm Ảnh: người đó lướt theo vị trí máy chủ báo, bóng lướt và vệt sáng vẽ theo đường đi (render/draw-chain.js)
      o.chainT = game.time + Math.min(s.dur || 2, 3); o.chainColor = s.color;
      addFx(game, { type: 'puff', x, y, r: 10, color: s.color, life: 0.35 });
      break;
    case 'dash':
      if (V) vfxCast(game, c.k, s, who, { sx: x, sy: y });
      addFx(game, { type: 'puff', x, y, r: 10, color: s.color, life: 0.35 });
      break;
    default:
      addFx(game, { type: 'ring', x: o.x, y: o.y - 4, r: 12, color: s.color, life: 0.3 });
  }
}
