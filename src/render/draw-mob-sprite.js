// Quái bằng hình pixel (data/mobs.json → look; tools/art/mob_design.py, bản cũ tools/art/mobs.py). Hình gốc nhìn phải,
// quay trái lật gương. Bản mới 4 khung đi, vẽ chi tiết rồi thu theo spr.scale; đứng yên thì khung đầu nhún 1 đơn vị.
// Bản cũ 2 khung luân phiên. Quái hiền nảy thì khung theo nhịp nảy. Trả false nếu chưa có hình để vẽ hình khối như cũ.
import { joltOff } from '../game/hit-feel.js';
import { lungeOff } from '../game/hurt-feel.js';
import { spriteImage, drawHitFrame, drawShadowFrame, flashImage, spriteTone } from './sprites.js';
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
  m.top = (spr.top ?? spr.anchor[1]) * sc - 2;   // đỉnh hình: thanh máu, sao choáng đặt trên đó (Bộ Quái Mới khai top: chân tới đỉnh đầu, khung có chừa trống)
  if (Math.abs(m.fx || 0) > 0.2) m.lookX = Math.sign(m.fx);
  const { f, bob = 0, lean = 0 } = spr.anim ? animFrame(game, spr, m, t) : spr.acts ? actFrame(m, t, wind) : spr.atk ? { f: wind ? 1 : 0, bob: Math.floor(t * 2 + (m.uid || 0) * 0.37) % 2 } : mobFrame(spr, m, t);   // Bộ Quái Mới / ảnh AI 5 dáng / 2 khung đứng, ra đòn
  ctx.save();
  const jo = joltOff(game, m.jolt);   // vừa trúng đòn của mình: giật lùi rồi rung tại chỗ trong lúc khựng (src/game/hit-feel.js)
  if (game.hit2) m.tone ??= spriteTone(spr, im);   // bản ra đòn mới: màu chính của hình, vụn văng lúc chết đúng màu con quái
  const lu = m.lun ? lungeOff(game, m) : 0, tg = lu ? m.tgt || game.player : null, td = tg ? Math.hypot(tg.x - m.x, tg.y - m.y) || 1 : 1;   // quái đánh gần: lùi lấy đà rồi chồm tới mục tiêu (src/game/hurt-feel.js)
  ctx.translate(m.x + (jo ? m.jolt.x * jo : 0) + (lu ? (tg.x - m.x) / td * lu : 0), m.y + 1 - bob + (jo ? m.jolt.y * jo : 0) + (lu ? (tg.y - m.y) / td * lu : 0));
  ctx.scale((m.lookX || 1) * sc, sc);
  if (wind && !spr.acts && !spr.anim) ctx.scale(1.12, 0.9);   // lấy đà trước khi đánh (hình 5 dáng, Bộ Quái Mới đã có khung lấy đà)
  ctx.imageSmoothingEnabled = false;
  if (!game.topPass) drawShadowFrame(ctx, spr, im, f);   // bóng đổ theo dáng (sprites.js); lượt vẽ đè lên vệt chém thì không đổ bóng lần hai
  if (lean) ctx.transform(1, 0, -lean, 1, 0, 0);   // con bay, lướt đang đi: xiên người về phía trước theo từng hàng điểm ảnh (không xoay hình)
  drawHitFrame(ctx, spr, im, f, m.flash > 0 ? m.flash / game.data.config.feel.flash : 0, !!m.jolt && game.time - m.jolt.t < 0.5);
  ctx.restore();
  return true;
}

// Bộ Quái Mới (SpriteCook 16/11/2026, tools/art/quai_moi_game.py): tấm ngang đứng | đi | công kích, spr.anim = {dung: [khung đầu, số khung], di,
// danh, hit: khung đòn chạm, fps}. Đứng lặp dung; đi lặp di (con bay, lướt không có di: lặp dung, xiên người về phía trước). Lấy đà (windup, boss
// chém / lao / vòng đạn) chạy khung đầu tới khung chạm theo tiến độ lấy đà, khung chạm hiện ngay trước lúc đòn trúng (khựng hình thì đứng thế); ra
// đòn xong chạy nốt theo đồng hồ quái m.ak (src/game/mobs.js). Boss đang lao: giữ khung chạm; gọi lửa rơi (m.cast): chạy trọn đòn. Quái của đội
// trưởng chỉ biết bận / rảnh: tính từ lúc thấy đổi. Lượt vẽ đè sau vệt chém (topPass) không tính lại đi / đứng.
const BUSY = { windup: 1, slash: 1, nova: 1, charge: 1 }, LEAN = 0.12;
function animFrame(game, spr, m, t) {
  const A = spr.anim, fps = A.fps || 8, [a0, an] = A.danh, h = A.hit, ak = m.ak ?? t;
  if (m.state !== m.aSt) { if (BUSY[m.aSt] && !BUSY[m.state]) m.aRa = ak; m.aSt = m.state; m.aS0 = ak; }
  if (!game.topPass) {
    if (Math.abs(m.x - (m.aPx ?? m.x)) + Math.abs(m.y - (m.aPy ?? m.y)) > 0.04) m.aMvT = t;
    m.aPx = m.x; m.aPy = m.y;
  }
  if (BUSY[m.state]) {
    if (m.state === 'charge' && !m.tele && !m.remote) return { f: a0 + h };   // đang lao
    const dur = m.state === 'nova' ? 0.6 : m.state === 'charge' ? 0.75 : m.def.windup || 0.5;
    const k = m.tele ? m.tele.k : m.remote ? (ak - m.aS0) / dur : m.t / dur;
    return { f: a0 + Math.max(0, Math.min(h, Math.floor(k * h + 0.5))) };
  }
  if (m.cast != null && ak - m.cast < an / fps) return { f: a0 + Math.max(0, Math.floor((ak - m.cast) * fps)) };
  if (m.aRa != null && ak - m.aRa < (an - h) / fps) return { f: a0 + h + Math.floor((ak - m.aRa) * fps) };
  const mv = t - (m.aMvT ?? -9) < 0.15, c = mv && A.di ? A.di : A.dung;
  if (!game.topPass) m.aLn = (m.aLn || 0) + ((mv && !A.di ? 1 : 0) - (m.aLn || 0)) * 0.15;
  return { f: c[0] + Math.floor(t * fps + (m.uid || 0) * 2.9) % c[1], lean: (m.aLn || 0) * LEAN };
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
  if (!game.topPass) drawShadowFrame(ctx, spr, im, f);   // bóng đổ theo dáng (sprites.js)
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
  const m = c.m, L = SP(game), hold = c.wait && game.time - c.t0 < c.wait, t = hold ? 0 : game.time - c.t0 - (c.wait ? c.wait - L.flash : 0);   // c.wait: nhát kết liễu kiểu mới, xác chờ hết khựng hình mới đứt đôi
  const id = m.def.rival ? 'rival.' + m.def.rival : m.def.look ? 'mob.' + m.id : null;
  const spr = id && game.data.art.sprites[id], im = spr && spriteImage(spr);
  if (!im || t > corpseLife(game)) return;
  const sc = spr.scale || 1, fx = (m.lookX || 1) * sc;
  const fl = (L.fly ?? 0) * (1 - Math.exp(-t * (L.drag ?? 12))) / (L.drag ?? 12);   // bị đòn chí tử hất văng ra sau rồi mới đứt đôi
  const cx = c.x + Math.cos(c.ang) * fl, cy = c.y + Math.sin(c.ang) * fl + 1 + (spr.h / 2 - spr.anchor[1]) * sc;   // tâm hình (toạ độ bản đồ)
  const draw = (k, white, src = im) => { ctx.save(); ctx.scale(fx, sc); ctx.imageSmoothingEnabled = false;
    drawDissolved(ctx, src, 0, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1] - (spr.h / 2 - spr.anchor[1]), spr.w, spr.h, k, white); ctx.restore(); };
  if (hold) {   // đang khựng hình: con quái còn nguyên, loé trắng giữ viền mực, rung tại chỗ theo hướng đòn (src/game/hit-feel.js)
    const o = joltOff(game, m.jolt);
    ctx.save(); ctx.translate(Math.round(cx) + (o ? m.jolt.x * o : 0), Math.round(cy) + (o ? m.jolt.y * o : 0)); draw(0, false, flashImage(spr, im) || im); ctx.restore(); return;
  }
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
