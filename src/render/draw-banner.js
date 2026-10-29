// Vẽ bảng tên nơi vừa tới (src/game/banner.js đặt game.banner): khung pixel viền mực, nền nâu ấm, tên lớn, dòng nhỏ nhiều màu. Hiện 3 giây rồi mờ dần.
const INK = '#1b1830', LIFE = 3.2;

export function drawBanner(ctx, game, screen) {
  const b = game.banner;
  if (!b) return;
  const age = game.time - b.at;
  if (age > LIFE) { game.banner = null; return; }
  const a = Math.min(1, age * 3, (LIFE - age) * 1.5), cx = screen.w / 2, y = screen.h * 0.24 - (1 - Math.min(1, age * 3)) * 8;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '22px "Unifont VN", system-ui'; const wName = ctx.measureText(b.name).width;
  ctx.font = '12px "Unifont VN", system-ui'; const sub = b.parts.map(p => p.t).join('  ·  '), wSub = ctx.measureText(sub).width;
  const w = Math.max(wName, wSub) + 44, h = b.parts.length ? 58 : 40, x0 = Math.round(cx - w / 2), y0 = Math.round(y - h / 2);
  ctx.fillStyle = INK; ctx.fillRect(x0 - 3, y0, w + 6, h); ctx.fillRect(x0, y0 - 3, w, h + 6);   // khung pixel: viền mực góc cắt, nền ấm
  ctx.fillStyle = '#f2c94c'; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#3a2618'; ctx.fillRect(x0 + 3, y0 + 3, w - 6, h - 6);
  ctx.fillStyle = '#f2c94c'; for (const px of [x0 + 10, x0 + w - 14]) ctx.fillRect(px, y0 + h / 2 - 2, 4, 4);   // hai hạt vàng hai bên
  ctx.font = '22px "Unifont VN", system-ui'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  const ny = y0 + (b.parts.length ? 21 : h / 2);
  ctx.strokeText(b.name, cx, ny); ctx.fillStyle = '#fff2d0'; ctx.fillText(b.name, cx, ny);
  if (b.parts.length) {   // dòng nhỏ: từng phần một màu
    ctx.font = '12px "Unifont VN", system-ui'; let x = cx - wSub / 2;
    b.parts.forEach((p, i) => {
      const t = (i ? '  ·  ' : '') + p.t, tw = ctx.measureText(t).width;
      ctx.textAlign = 'left'; ctx.fillStyle = p.c || '#e8d8b0'; ctx.fillText(t, x, y0 + 42); x += tw;
    });
  }
  ctx.restore();
}
