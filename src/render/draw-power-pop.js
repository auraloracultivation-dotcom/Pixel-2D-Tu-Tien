// Chữ "Lực chiến 12.345  ▲ +321" nổ giữa màn khi lực chiến tăng (src/game/power-pop.js đặt game.powerPop).
// Vừa hiện thì phóng to một nấc rồi thu về, số chạy từ cũ lên mới trong count giây, bay lên nhẹ, cuối đời mờ đi.
const INK = '#1b1830';

export function drawPowerPop(ctx, game, screen) {
  const P = game.powerPop, C = game.data.config.power_pop;
  if (!P || !C) return;
  const age = game.time - P.at;
  if (age > C.life) { game.powerPop = null; return; }
  const k = Math.min(1, age / C.count), shown = Math.round(P.from + (P.to - P.from) * (1 - (1 - k) ** 3));
  P.shown = shown;
  const pop = age < C.pop ? 1 + 0.35 * (1 - age / C.pop) : 1;
  const a = Math.min(1, age * 8, (C.life - age) / C.fade);
  const cx = screen.w / 2, y = screen.h * C.y - Math.min(1, age / C.life) * C.rise;
  const main = C.text.replace('{v}', shown.toLocaleString('vi-VN')), up = C.up.replace('{n}', P.d.toLocaleString('vi-VN'));
  ctx.save();
  ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.translate(cx, y); ctx.scale(pop, pop);
  ctx.font = `${C.size}px "Unifont VN", system-ui`; const wm = ctx.measureText(main).width;
  ctx.font = `${Math.round(C.size * 0.75)}px "Unifont VN", system-ui`; const wu = ctx.measureText(up).width;
  const gap = C.size * 0.5, x0 = -(wm + gap + wu) / 2;
  ctx.textAlign = 'left';
  ctx.font = `${C.size}px "Unifont VN", system-ui`; ctx.lineWidth = 4; ctx.strokeStyle = INK;
  ctx.strokeText(main, x0, 0); ctx.fillStyle = C.color; ctx.fillText(main, x0, 0);
  ctx.font = `${Math.round(C.size * 0.75)}px "Unifont VN", system-ui`; ctx.lineWidth = 3;
  ctx.strokeText(up, x0 + wm + gap, 1); ctx.fillStyle = C.up_color; ctx.fillText(up, x0 + wm + gap, 1);
  ctx.restore();
}
