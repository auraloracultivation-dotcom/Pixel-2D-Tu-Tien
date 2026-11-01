// Chuyển động của đồ hội và trò diễn (lễ hội tinh cầu). Đồ đứng yên mà có hồn: cờ bay phần phật (mỗi hàng điểm ảnh lệch theo sóng,
// gốc cán đứng yên), đèn lồng treo đung đưa, kiếm bay nhấp nhô có vòng sáng, trận pháp sáng lên tắt xuống, trống nảy theo nhịp.
// Kiểu chuyển động theo tên món ở data/le-hoi.json → anim (khớp phần sau tiền tố tinh cầu, khoá dài nhất thắng).
// Trò diễn (trạng thái ở src/game/hoi-tro.js): tỷ võ trên lôi đài, người đánh trống, người múa kiếm.
import { spriteImage } from './sprites.js';
import { ACT, drawAct, walkFrame } from './draw-acts.js';

export function hoiAnim(game, id) {
  const A = game.data['le-hoi']?.anim, rest = id.slice(id.indexOf('.') + 1);
  if (!A) return null;
  let best = '', kind = null;
  for (const p in A) if (rest.startsWith(p) && p.length > best.length) { best = p; kind = A[p]; }
  return kind;
}

// Vẽ món it theo kiểu chuyển động; trả false nếu kiểu không có (để vẽ thường)
export function drawAnimated(ctx, game, it, im, kind, t) {
  const s = it.spr, k = it.k, ph = (it.x * 0.37 + it.y * 0.11) % 6.28, W = s.w * k, Hh = s.h * k;
  const ox = it.x - s.anchor[0] * k, oy = it.y - s.anchor[1] * k;
  if (kind === 'wave') {   // cờ: hàng trên (gần cán ngang) đứng yên, càng xuống càng lệch
    const rows = Math.ceil(s.h / 2);
    for (let r = 0; r < rows; r++) {
      const sy = r * 2, f = sy / s.h, dx = Math.round(Math.sin(t * 3.4 - f * 5 + ph) * 1.6 * f * 2) / 2;
      ctx.drawImage(im, 0, sy, s.w, 2, ox + dx, oy + sy * k, W, 2 * k);
    }
    return true;
  }
  if (kind === 'swing') {   // đèn lồng treo: xoay quanh móc ở đỉnh
    ctx.save(); ctx.translate(it.x, oy); ctx.rotate(Math.sin(t * 1.9 + ph) * 0.12);
    ctx.drawImage(im, 0, 0, s.w, s.h, -W / 2, 0, W, Hh); ctx.restore();
    return true;
  }
  if (kind === 'float') {   // kiếm bay: nhấp nhô, vòng sáng dưới chân to nhỏ theo nhịp
    const b = Math.sin(t * 2.2 + ph) * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2.2 + ph);
    ctx.fillStyle = '#9adfff'; ctx.beginPath(); ctx.ellipse(it.x, it.y - 2, W * 0.42 * (1 + 0.1 * Math.sin(t * 2.2 + ph)), 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.drawImage(im, 0, 0, s.w, s.h, ox, oy - 3 + b, W, Hh);
    return true;
  }
  if (kind === 'trong') {   // trống: nảy lên khi bị đánh (xem trò trong)
    const st = troState(game, it), p = st?.pulse || 0, sc = 1 + p * 0.05;
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(sc, 1 + p * 0.03);
    ctx.drawImage(im, 0, 0, s.w, s.h, -s.anchor[0] * k, -s.anchor[1] * k, W, Hh); ctx.restore();
    return true;
  }
  ctx.drawImage(im, 0, 0, s.w, s.h, ox, oy, W, Hh);
  if (kind === 'pulse') {   // trận pháp, cổng xoáy: sáng lên tắt xuống
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t * 1.6 + ph);
    ctx.drawImage(im, 0, 0, s.w, s.h, ox, oy, W, Hh); ctx.restore();
  }
  return true;
}

export const troState = (game, it) => game.hoiTro?.list.find(s => s.it === it) || null;

const POSE = { idle: ACT.idle, wind: ACT.wind, hit: ACT.hit };

// Trò diễn gắn với món it (vẽ sau hình món)
export function drawTro(ctx, game, it, t) {
  const s = troState(game, it);
  if (!s) return;
  const c = s.c, art = game.data.art, x0 = it.x + (c.dx || 0), y0 = it.y + (c.dy || 0);
  if (c.kind === 'ty-vo') {
    const g = (s.gap ?? c.gap) / 2;
    for (const side of [0, 1]) {
      const dir = side ? -1 : 1, id = side ? c.b : c.a, atk = s.phase === 'danh' && s.turn === side;
      let f = s.phase === 'di' ? walkFrame(art.sprites[id], t) : atk ? POSE[s.pose] : ACT.idle, x = x0 - dir * g;
      if (atk) x += dir * (s.lunge || 0);
      if (s.phase === 'danh' && !atk && s.pose === 'hit') x -= dir * 1.5;   // bị trúng: lùi
      if (s.phase === 'nga') f = s.loser === side ? ACT.down : (art.sprites[id].frames > ACT.skill ? ACT.skill : ACT.hit);
      ctx.fillStyle = 'rgba(27,24,48,0.25)'; ctx.beginPath(); ctx.ellipse(x, y0 + 1, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      drawAct(ctx, art, id, f, x, y0 + 1, dir);
    }
  } else if (c.kind === 'trong') {
    drawAct(ctx, art, c.a, POSE[s.pose] ?? ACT.idle, x0, y0, c.face || 1);
  } else if (c.kind === 'mua-kiem') {
    const a = t * 0.45, x = x0 + Math.cos(a) * c.r, y = y0 + Math.sin(a) * c.r * 0.45, dir = -Math.sin(a) >= 0 ? 1 : -1;
    const step = Math.sin(t * 1.3) > 0.2;   // lúc bước lúc đứng tung kiếm
    drawAct(ctx, art, c.a, step ? walkFrame(art.sprites[c.a], t) : (Math.sin(t * 4) > 0 ? ACT.hit : ACT.wind), x, y, dir);
    const sw = art.sprites[c.sword], im = sw && spriteImage(sw);
    if (im) for (let i = 0; i < 3; i++) {
      const b = t * 2.4 + i * 2.094, sx = x + Math.cos(b) * 12, sy = y - 14 + Math.sin(b) * 5;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(b + Math.PI / 2); ctx.globalAlpha = Math.sin(b) > 0 ? 1 : 0.75;
      ctx.drawImage(im, 0, 0, sw.w, sw.h, -sw.w * 0.16, -sw.h * 0.32, sw.w * 0.32, sw.h * 0.32); ctx.restore();
    }
  }
  for (const p of s.sparks) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 1, 1); }
  for (const p of s.bits) {
    ctx.globalAlpha = Math.min(1, (p.life - p.t) * 2); ctx.fillStyle = p.c;
    ctx.fillRect(p.x + Math.sin(p.t * 9 + p.vx) * 1.2, p.y, p.w, Math.sin(p.t * 12 + p.vy) > 0 ? 1 : 0.5);   // giấy màu lật lấp lánh
  }
  ctx.globalAlpha = 1;
  if (s.words.length) {
    ctx.font = '7px "Unifont VN", system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.strokeStyle = '#1b1830';
    for (const w of s.words) { ctx.globalAlpha = Math.min(1, (1.1 - w.t) * 3); const y = w.y - w.t * 10; ctx.strokeText(w.text, w.x, y); ctx.fillStyle = '#ffe28a'; ctx.fillText(w.text, w.x, y); }
    ctx.globalAlpha = 1;
  }
}
