// Hình khối tạm cho người / quái chưa có hình pixel (thân, đầu, tóc, mắt nhìn theo hướng) và bóng tròn dưới chân.
// Tách khỏi draw.js để draw-nguoi.js (nhân vật người chơi) dùng chung mà không nhập vòng.
import { circle } from '../world/draw-map.js';

export const INK = '#1b1830';

export function shadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(27,24,48,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}

export function body(ctx, x, y, r, color, flash) {
  ctx.fillStyle = INK; circle(ctx, x, y, r + 1);
  ctx.fillStyle = flash ? '#fff' : color; circle(ctx, x, y, r);
}

export function drawPerson(ctx, e, color, hair, t, flash, face) {
  const bob = e.moving ? Math.abs(Math.sin(e.walkT * 12)) * 1.5 : Math.sin(t * 2.5 + (e.bob || 0)) * 0.5;
  const y = e.y - bob;
  shadow(ctx, e.x, e.y + 1, 5);
  body(ctx, e.x, y - 4, 4.5, color, flash);            // thân
  body(ctx, e.x, y - 11, 4.2, '#fbe3d2', flash);       // đầu
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(e.x, y - 12, 4.2, Math.PI, 0); ctx.fill();
  if (!flash && face) {                                  // mắt nhìn theo hướng
    ctx.fillStyle = INK;
    const fx = face.x * 1.6, fy = Math.max(-0.5, face.y) * 1.2;
    if (face.y > -0.7) { ctx.fillRect(e.x - 1.8 + fx, y - 11 + fy, 1, 1.6); ctx.fillRect(e.x + 0.8 + fx, y - 11 + fy, 1, 1.6); }
  }
}
