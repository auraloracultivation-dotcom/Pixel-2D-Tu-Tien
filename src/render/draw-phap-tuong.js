// Pháp tượng sau lưng (chủ dự án 16/11/2026 21:57: pháp tượng thay ô Ngọc bội, đeo vào là luôn hiện, cả lúc cưỡi thú lẫn lúc đi bộ).
// Hình pt.NN (tools/art/phap_tuong_game.py, 16 khung lặp SpriteCook) vẽ cùng mật độ điểm với hình nhân vật; trục đối xứng đặt đúng giữa
// hai chân. Pháp tượng có lỗ giữa: tâm lỗ đặt vào mặt (30% chiều cao thân tính từ đỉnh đầu); không có lỗ: chỗ 92% chiều cao đặt vào chân.
// Ngồi xếp bằng (cưỡi thú, đả tọa) thì thân thấp lại theo ảnh ngồi (look.ngoi_h). Khí cầu giữa hai tay lúc ngồi cũng vẽ ở đây (drawOrb).
import { spriteImage } from './sprites.js';
import { heroScale } from './draw-hero.js';

// Hình pháp tượng của bản lưu: người khác gửi sẵn mã (others.js onlineLook → pt), mình thì đọc món đang đeo ở ô ngoc-boi
export function ptSprite(game, save = game.save) {
  if (typeof save?.pt === 'string') return game.data.art.sprites['pt.' + save.pt] ? 'pt.' + save.pt : null;
  const uid = save?.equip?.['ngoc-boi'], it = uid != null && save.bag?.find(i => i.uid === uid), b = it && game.data.items.bases[it.base];
  return b?.pt && game.data.art.sprites['pt.' + b.pt] ? 'pt.' + b.pt : null;
}

// (fx, fy): chân người (đang cưỡi: chỗ ngồi trên yên). name: động tác đang chạy ('ngoi' là ngồi xếp bằng)
export function drawPhapTuong(ctx, game, p, t, save, look, name, fx, fy) {
  const key = ptSprite(game, save), spr = key && game.data.art.sprites[key], im = spr && spriteImage(spr);
  if (!im || !look?.body) return;
  const m = ctx.getTransform(), { n } = heroScale(game, look, m), side = p.lookX || 1;
  const H = name === 'ngoi' && look.ngoi_h ? look.ngoi_h : look.body, f = Math.floor((t + (p.ptPhase ?? 0)) * (spr.fps || 10)) % spr.frames;
  // Cỡ: K lần mật độ điểm của nhân vật (chủ dự án 16/11/2026 23:34: "pháp tượng quá to, trùm xuống thấp hơn chân"; data/config.json phap_tuong)
  const C = game.data.config.phap_tuong || {}, K = C.scale ?? 1, k = n * K;
  let dy = spr.lo ? -H * 0.7 : 0;   // mặt người: 30% chiều cao tính từ đỉnh đầu (điểm ảnh nhân vật)
  const below = dy + (spr.h - spr.anchor[1]) * K;   // đáy pháp tượng so với chân, điểm ảnh nhân vật
  if (below > -(C.foot ?? 0)) dy -= below + (C.foot ?? 0);   // không trùm xuống dưới chân
  ctx.save();
  ctx.setTransform(k * side, 0, 0, k, Math.round(m.a * fx + m.e), Math.round(m.d * fy + m.f + dy * n));
  ctx.imageSmoothingEnabled = k < 0.98;
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
}

// Khí cầu linh lực giữa hai tay lúc ngồi xếp bằng (điểm ảnh hình nhân vật, đã ở phép biến đổi của hình): lõi sáng, quầng màu linh lực của bộ
export function drawOrb(ctx, x, y, mau, t) {
  const k = 0.5 - 0.5 * Math.cos(t * 3.4), r = 2.2 + 0.9 * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  g.addColorStop(0, mau.mid); g.addColorStop(0.35, mau.outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.45 + 0.2 * k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = mau.outer; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mau.mid; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mau.core; ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.18, Math.max(0.6, r * 0.42), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
