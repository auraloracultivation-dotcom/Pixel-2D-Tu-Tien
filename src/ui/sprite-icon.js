// Hình nhỏ cho ô giao diện (Menu, ô lưới các bảng): khung frame của hình id trong data/art.json vẽ lên canvas, thu phóng
// bằng CSS (pixelated) cho vừa size điểm ảnh. Hình chưa tải xong thì thử lại vài lần.
import { spriteImage } from '../render/sprites.js';

export function spriteIcon(game, id, frame = 0, size = 34, cls = 'mt-ico') {
  const cv = document.createElement('canvas'), spr = game.data.art.sprites[id];
  cv.className = cls;
  if (!spr) return cv;
  cv.width = spr.w; cv.height = spr.h;
  const paint = (tries = 0) => {
    const im = spriteImage(spr);
    if (!im) { if (tries < 20) setTimeout(() => paint(tries + 1), 250); return; }
    cv.getContext('2d').drawImage(im, Math.min(frame, spr.frames - 1) * spr.w, 0, spr.w, spr.h, 0, 0, spr.w, spr.h);
  };
  paint();
  const big = Math.max(spr.w, spr.h), k = big <= size ? Math.max(1, Math.floor(size / big)) : size / big;   // hình nhỏ: phóng nguyên lần; hình to: thu cho vừa
  cv.style.width = Math.round(spr.w * k) + 'px'; cv.style.height = Math.round(spr.h * k) + 'px';
  return cv;
}
