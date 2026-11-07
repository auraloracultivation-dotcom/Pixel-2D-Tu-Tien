// Tên người chơi khác kèm khiên PvP ngay sau tên (chủ dự án 07/11/2026 10:52: dùng hình khiên chủ dự án gửi): còn khiên thì khiên sáng
// (ui.k-khien-bat), đã tắt khiên thì khiên kiếm chéo (ui.k-khien-tat) và tên đỏ. Hình chưa tải xong thì tạm dùng chữ 🛡 / ⚔ như cũ.
// Nhãn của chính mình là nút HTML (src/ui/pvp-btn.js, pvp.css) dùng cùng hai hình.
import { spriteImage } from './sprites.js';

export function drawNameShield(ctx, game, o, ny, q, INK, color) {
  const name = o.def.name, spr = game.data.pvp ? game.data.art.sprites[o.pk ? 'ui.k-khien-tat' : 'ui.k-khien-bat'] : null, im = spr && spriteImage(spr);
  const txt = spr && !im ? `${name} ${o.pk ? '⚔' : '🛡'}` : name;
  const ih = 8 * q, iw = im ? ih * spr.w / spr.h : 0, w = ctx.measureText(txt).width, x0 = o.x - (iw ? iw + q : 0) / 2;   // cả cụm tên + khiên canh giữa đầu
  ctx.strokeText(txt, x0, ny); ctx.fillStyle = color; ctx.fillText(txt, x0, ny);
  if (im) ctx.drawImage(im, 0, 0, spr.w, spr.h, x0 + w / 2 + q, ny - ih + 1.5 * q, iw, ih);
}
