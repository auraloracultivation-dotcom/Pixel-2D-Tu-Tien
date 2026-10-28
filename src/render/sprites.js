// Tải tấm hình trong data/art.json một lần. file?v=<mã nội dung>: đổi hình là đổi đường dẫn, máy không dùng lại tấm cũ còn lưu tạm.
// Tấm tải về không đúng cỡ data/art.json thì coi như chưa có.
const imgs = {};

export function spriteImage(spr) {
  const src = spr.v ? `${spr.file}?v=${spr.v}` : spr.file;
  if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; }
  const im = imgs[src];
  return im.complete && im.naturalWidth === spr.w * spr.frames && im.naturalHeight === spr.h ? im : null;
}

// Bóng một màu của cả tấm hình (chớp trắng, ám đỏ khi trúng đòn). Không dùng ctx.filter vì Safari iPhone cũ không có.
const tints = {};

export function tintedImage(spr, im, color) {
  const key = `${spr.file}?${spr.v}|${color}`;
  if (!tints[key]) {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    tints[key] = c;
  }
  return tints[key];
}

// Vẽ khung f của hình kèm hiệu ứng trúng đòn: nửa đầu chớp trắng hẳn, nửa sau ám đỏ mờ dần (docs/02).
// hit: 0 là không trúng, 1 là vừa trúng.
export function drawHitFrame(ctx, spr, im, f, hit) {
  const sx = f * spr.w, ax = -spr.anchor[0], ay = -spr.anchor[1];
  if (hit > 0.5) {   // vừa trúng: hình thật phủ trắng 70% (trắng đặc cả bầy quái cộng quầng chiêu thành mảng chói, chơi thử 28/10)
    ctx.drawImage(im, sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
    const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.7;
    ctx.drawImage(tintedImage(spr, im, '#ffffff'), sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
    ctx.globalAlpha = a; return;
  }
  ctx.drawImage(im, sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
  if (hit > 0) {
    ctx.globalAlpha = hit * 1.1;
    ctx.drawImage(tintedImage(spr, im, '#ff3a3a'), sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
    ctx.globalAlpha = 1;
  }
}
