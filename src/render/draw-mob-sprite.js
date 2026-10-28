// Quái bằng hình pixel (data/mobs.json → look; tools/art/mob_design.py, bản cũ tools/art/mobs.py). Hình gốc nhìn phải,
// quay trái lật gương. Bản mới 4 khung đi, vẽ chi tiết rồi thu theo spr.scale; đứng yên thì khung đầu nhún 1 đơn vị.
// Bản cũ 2 khung luân phiên. Quái hiền nảy thì khung theo nhịp nảy. Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { spriteImage, drawHitFrame } from './sprites.js';
import { drawDissolved } from './dither.js';

export function drawMobSprite(ctx, game, m, t, wind) {
  const spr = m.def.look && game.data.art.sprites['mob.' + m.id], im = spr && spriteImage(spr);
  if (!im) return false;
  const sc = spr.scale || 1;
  m.top = spr.anchor[1] * sc - 2;   // đỉnh hình: thanh máu, sao choáng đặt trên đó
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const { f, bob } = mobFrame(spr, m, t);
  ctx.save();
  ctx.translate(m.x, m.y + 1 - bob);
  ctx.scale((m.lookX || 1) * sc, sc);
  if (wind) ctx.scale(1.12, 0.9);   // lấy đà trước khi đánh
  ctx.imageSmoothingEnabled = false;
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
  m.top = spr.anchor[1] - 2;
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const mv = Math.abs(m.x - (m.lastX ?? m.x)) + Math.abs(m.y - (m.lastY ?? m.y)) > 0.05;   // đang đi thì bước, đứng thì nhún
  m.lastX = m.x; m.lastY = m.y;
  const f = mv ? 2 + Math.floor(t * 6) % 2 : Math.floor(t * 2) % 2;
  ctx.save();
  ctx.translate(Math.round(m.x), Math.round(m.y) + 1);
  ctx.scale(m.lookX || 1, 1);
  if (wind) ctx.scale(1.1, 0.92);
  ctx.imageSmoothingEnabled = false;
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0);
  ctx.restore();
  return true;
}

// Quái vừa chết: khung đầu chớp trắng FLASH giây, rồi tan dần bằng dither Bayer trong FADE giây, bốc lên 2 điểm ảnh.
// Quái chưa có hình pixel thì chỉ có khói (fx.puff) như cũ.
const FLASH = 0.08, FADE = 0.34;
export const corpseLife = FLASH + FADE;
export function drawCorpse(ctx, game, c) {
  const m = c.m, t = game.time - c.t0;
  const id = m.def.rival ? 'rival.' + m.def.rival : m.def.look ? 'mob.' + m.id : null;
  const spr = id && game.data.art.sprites[id], im = spr && spriteImage(spr);
  if (!im || t > corpseLife) return;
  const k = t < FLASH ? 0 : (t - FLASH) / FADE, lift = Math.round(k * 2);
  ctx.save();
  const sc = spr.scale || 1;
  ctx.translate(Math.round(c.x), Math.round(c.y) + 1 - lift);
  ctx.scale((m.lookX || 1) * sc, sc);
  ctx.imageSmoothingEnabled = false;
  drawDissolved(ctx, im, 0, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h, k, t < FLASH);
  ctx.restore();
}
