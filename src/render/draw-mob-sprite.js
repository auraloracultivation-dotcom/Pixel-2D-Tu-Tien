// Quái bằng hình pixel (data/mobs.json → look; tools/art/mob_design.py, bản cũ tools/art/mobs.py). Hình gốc nhìn phải,
// quay trái lật gương. Bản mới 4 khung đi, vẽ chi tiết rồi thu theo spr.scale; đứng yên thì khung đầu nhún 1 đơn vị.
// Bản cũ 2 khung luân phiên. Quái hiền nảy thì khung theo nhịp nảy. Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { spriteImage, drawHitFrame, drawShadowFrame } from './sprites.js';
import { drawDissolved } from './dither.js';

// Hình 5 dáng Canva (acts, chủ dự án 30/10/2026: người và thú 4 chân phải bước chân trái phải khi đi): 0 đứng, 1–2 bước, 3 lấy đà, 4 đánh.
// Lấy đà (windup, đòn boss) → khung 3; vừa ra đòn (hồi chiêu mới bắt đầu) → khung 4; đang đi → bước trái phải; đứng → khung 0 thở nhún.
function actFrame(m, t, wind) {
  const cd = m.def.cd || 1, struck = m.cd > cd - 0.28;
  if (wind || ['slash', 'charge', 'nova'].includes(m.state)) return { f: 3, bob: 0 };
  if (struck) return { f: 4, bob: 0 };
  const mv = Math.abs(m.x - (m.ax ?? m.x)) + Math.abs(m.y - (m.ay ?? m.y)) > 0.05;
  m.ax = m.x; m.ay = m.y;
  if (mv || m.moving) return { f: 1 + (Math.floor(t * 7 + (m.uid || 0) * 0.37) % 2), bob: 0 };
  return { f: 0, bob: Math.floor(t * 2 + (m.uid || 0) * 0.37) % 2 };
}

export function drawMobSprite(ctx, game, m, t, wind) {
  const spr = m.def.look && game.data.art.sprites['mob.' + m.id], im = spr && spriteImage(spr);
  if (!im) return false;
  const sc = spr.scale || 1;
  m.top = spr.anchor[1] * sc - 2;   // đỉnh hình: thanh máu, sao choáng đặt trên đó
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const { f, bob } = spr.acts ? actFrame(m, t, wind) : spr.atk ? { f: wind ? 1 : 0, bob: Math.floor(t * 2 + (m.uid || 0) * 0.37) % 2 } : mobFrame(spr, m, t);   // ảnh AI 5 dáng / 2 khung đứng, ra đòn
  ctx.save();
  ctx.translate(m.x, m.y + 1 - bob);
  ctx.scale((m.lookX || 1) * sc, sc);
  if (wind && !spr.acts) ctx.scale(1.12, 0.9);   // lấy đà trước khi đánh (hình 5 dáng đã có khung lấy đà)
  ctx.imageSmoothingEnabled = false;
  drawShadowFrame(ctx, spr, im, f);   // bóng đổ theo dáng (sprites.js)
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0);
  ctx.restore();
  return true;
}

function mobFrame(spr, m, t) {
  const off = (m.uid || 0) * 0.37;
  if (spr.frames >= 4) {
    if (m.def.ai === 'passive') return { f: Math.floor(((m.hop || 0) % Math.PI) / Math.PI * 4) & 3, bob: 0 };
    if (m.moving === false) return { f: 0, bob: Math.floor(t * 2 + off) % 2 };
    return { f: Math.floor(t * 8 + off) % 4, bob: 0 };
  }
  const f = m.def.ai === 'passive' ? (Math.abs(Math.sin(m.hop || 0)) > 0.5 ? 1 : 0) : Math.floor(t * (m.moving === false ? 2.5 : 5) + off) % 2;
  return { f, bob: 0 };
}

// Đấu sĩ luận võ (tools/art/build.py → rival.<id>, chibi như NPC): đứng thì nhún chậm, đi thì bước A/B. Trả false nếu chưa có hình.
export function drawRivalSprite(ctx, game, m, t, wind) {
  const spr = game.data.art.sprites['rival.' + m.def.rival], im = spr && spriteImage(spr);
  if (!im) return false;
  const sc = spr.scale || 1;
  m.top = spr.anchor[1] * sc - 2;
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const mv = Math.abs(m.x - (m.lastX ?? m.x)) + Math.abs(m.y - (m.lastY ?? m.y)) > 0.05;   // đang đi thì bước, đứng thì nhún
  m.lastX = m.x; m.lastY = m.y;
  // ảnh Canva 2 khung (đứng / ra đòn, chủ dự án 30/10/2026) như quái: lấy đà thì khung đánh, còn lại nhún; ảnh vẽ code 4 khung như cũ
  const A = spr.acts ? actFrame(m, t, wind) : null;
  const bob = A ? A.bob : spr.atk ? Math.floor(t * 2 + (m.uid || 0) * 0.37) % 2 : 0;
  const f = A ? A.f : spr.atk ? (wind ? 1 : 0) : mv ? 2 + Math.floor(t * 6) % 2 : Math.floor(t * 2) % 2;
  ctx.save();
  ctx.translate(Math.round(m.x), Math.round(m.y) + 1 - bob);
  ctx.scale((m.lookX || 1) * sc, sc);
  if (wind) ctx.scale(1.1, 0.92);
  ctx.imageSmoothingEnabled = false;
  drawShadowFrame(ctx, spr, im, f);   // bóng đổ theo dáng (sprites.js)
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0);
  ctx.restore();
  return true;
}

// Quái vừa chết (chủ dự án 09/11/2026 01:12: "chém chết thì đứt đôi"; số ở data/config.json → feel.split): chớp trắng nguyên con
// flash giây, rồi xẻ theo đường vuông góc hướng đòn cuối (c.ang, lệch c.tilt), loé đường chém trắng; hai nửa trượt tách theo
// mép cắt, cả xác văng ra sau (fly, hãm drag), rơi xuống, nghiêng ngược nhau, giữ hold giây rồi tan dither Bayer. Quái chưa có hình pixel chỉ có khói.
const SPLIT = { fly: 260, drag: 12, flash: 0.06, slide: 0.2, dist: 4, push: 5, fall: 5, rot: 0.3, tilt: 0.9, slash: 0.16, hold: 0.22, fade: 0.3 };
const SP = game => game.data.config.feel?.split || SPLIT;
export const corpseLife = game => { const L = SP(game); return L.flash + L.hold + L.fade; };
export function drawCorpse(ctx, game, c) {
  const m = c.m, t = game.time - c.t0, L = SP(game);
  const id = m.def.rival ? 'rival.' + m.def.rival : m.def.look ? 'mob.' + m.id : null;
  const spr = id && game.data.art.sprites[id], im = spr && spriteImage(spr);
  if (!im || t > corpseLife(game)) return;
  const sc = spr.scale || 1, fx = (m.lookX || 1) * sc;
  const fl = (L.fly ?? 0) * (1 - Math.exp(-t * (L.drag ?? 12))) / (L.drag ?? 12);   // bị đòn chí tử hất văng ra sau rồi mới đứt đôi
  const cx = c.x + Math.cos(c.ang) * fl, cy = c.y + Math.sin(c.ang) * fl + 1 + (spr.h / 2 - spr.anchor[1]) * sc;   // tâm hình (toạ độ bản đồ)
  const draw = (k, white) => { ctx.save(); ctx.scale(fx, sc); ctx.imageSmoothingEnabled = false;
    drawDissolved(ctx, im, 0, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1] - (spr.h / 2 - spr.anchor[1]), spr.w, spr.h, k, white); ctx.restore(); };
  if (t < L.flash) { ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); draw(0, true); ctx.restore(); return; }
  const u = t - L.flash, s = 1 - (1 - Math.min(1, u / L.slide)) ** 3, k = Math.max(0, (u - L.hold) / L.fade);
  const cut = c.ang + Math.PI / 2 + c.tilt * L.tilt, nx = -Math.sin(cut), ny = Math.cos(cut);   // n: pháp tuyến đường cắt
  const bx = Math.cos(c.ang) * L.push * s, by = Math.sin(c.ang) * L.push * s, fall = L.fall * s * s, R = Math.max(spr.w, spr.h) * sc;
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(cx + bx + nx * side * L.dist * s, cy + by + ny * side * L.dist * s + fall * (side > 0 ? 1 : 0.6));
    ctx.rotate(side * L.rot * s);
    ctx.rotate(cut); ctx.beginPath(); ctx.rect(-R, side > 0 ? 0 : -R, 2 * R, R); ctx.clip(); ctx.rotate(-cut);   // nửa bên này đường cắt
    draw(k, false);
    ctx.restore();
  }
  if (u < L.slash) {   // đường chém trắng loé qua tâm, dài ra rồi mờ
    const a = 1 - u / L.slash, len = R * (0.7 + 0.5 * (u / L.slash)), dx = Math.cos(cut) * len / 2, dy = Math.sin(cut) * len / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.6 * a + 0.4;
    ctx.beginPath(); ctx.moveTo(cx + bx - dx, cy + by - dy); ctx.lineTo(cx + bx + dx, cy + by + dy); ctx.stroke();
    ctx.restore();
  }
}
