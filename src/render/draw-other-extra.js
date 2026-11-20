// Những thứ nhân vật mình có mà trước đây người khác không thấy (chủ dự án 20/11/2026 11:31: "nhân vật trên màn hình người khác hiển
// thị cái gì thì mọi người đều thấy cái đó, game online mà"). Người đó báo qua hồ sơ phòng (src/game/others.js onlineLook):
//   st: 'bay' (đứng trên vũ khí bay lên, như draw-fly.js), 'toa' (đả tọa: ngồi, vòng linh khí, vũ khí xoay quanh), 'guc' (gục chờ hồi sinh: mờ)
//   ri: cảnh giới (hào quang cảnh giới như draw-aura.js), title: danh hiệu đang đeo (chữ trên đầu như drawTitle)
// otherPre gọi trước khi vẽ thú cưỡi / thân người (trả về độ nhấc khi bay, đã dời khung vẽ), otherPost gọi sau cùng.
import { drawWeaponOf } from './draw-flyweapon.js';
import { ring } from './pixel-shapes.js';
import { textQ } from './draw-focus.js';

export function otherPre(ctx, game, o, t) {
  o.meditating = o.st === 'toa'; o.flying = o.st === 'bay';
  if (o.st === 'guc') ctx.globalAlpha = 0.45;
  const el = (o.element && game.data.elements[o.element]?.color) || '#e6ebf7';
  const a = o.ri != null && game.data.status.auras?.[+o.ri];
  if (a) {   // hào quang cảnh giới
    const y = o.y - 6, R = a.r * (1 + Math.sin(t * 2.2) * 0.08), g = ctx.createRadialGradient(o.x, y, 2, o.x, y, R);
    g.addColorStop(0, a.color + '00'); g.addColorStop(0.55, a.color + '55'); g.addColorStop(1, a.color + '00');
    const A = ctx.globalAlpha; ctx.globalAlpha = A * a.alpha * 2; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, y, R, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = A;
  }
  if (o.meditating) { const A = ctx.globalAlpha; ctx.globalAlpha = A * (0.5 + 0.3 * Math.sin(t * 3)); ring(ctx, o.x, o.y - 6, 12 + Math.sin(t * 2) * 2, el); ctx.globalAlpha = A; }
  if (!o.flying) return 0;
  const C = game.data.config.fly || {}, lift = Math.round((C.lift || 9) + Math.sin(t * 2.5 + (o.x % 5)) * 1.2), dir = (o.face?.x ?? 1) >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha *= 0.17; ctx.fillStyle = '#1b1830'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 1, 5, 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();   // bóng dưới đất
  ctx.save(); ctx.translate(Math.round(o.x), Math.round(o.y - lift + 2)); ctx.scale(dir, 1);
  if (o.moving) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.35 - i * 0.1; ctx.fillStyle = el; ctx.fillRect(-16 - i * 6, -1, 6, 2); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }   // vệt sáng sau kiếm
  if (!drawWeaponOf(ctx, game, o.vk, 0, 0, 0, C.weapon_k || 1.5)) { ctx.fillStyle = '#140c22'; ctx.fillRect(-13, -2, 25, 4); ctx.fillStyle = '#dfe8f5'; ctx.fillRect(-11, -1, 20, 2); }   // chưa có hình: thanh kiếm vẽ bằng code
  ctx.restore();
  ctx.save(); ctx.translate(0, -lift); o.lift = lift;
  return lift;
}

export function otherPost(ctx, game, o, lift) {
  const ti = o.title && game.data.status.titles?.[o.title];
  if (ti) {   // danh hiệu nằm trên tên (chủ dự án 18/11/2026 09:49)
    const q = textQ(game, 6), y = o.y - (o.top || 22) - 3 - 8 * q - (o.riding ? o.lift || 0 : 0);   // ngay trên dải tên (render/draw.js drawOther)
    ctx.font = `${6 * q}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * q; ctx.strokeStyle = '#1b1830';
    ctx.strokeText(ti.name, o.x, y); ctx.fillStyle = ti.color; ctx.fillText(ti.name, o.x, y);
  }
  if (lift) ctx.restore();
  ctx.globalAlpha = 1;
}
