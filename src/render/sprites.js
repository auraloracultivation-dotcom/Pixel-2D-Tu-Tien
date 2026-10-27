// Tải tấm hình trong data/art.json một lần. file?v=<mã nội dung>: đổi hình là đổi đường dẫn, máy không dùng lại tấm cũ còn lưu tạm.
// Tấm tải về không đúng cỡ data/art.json thì coi như chưa có.
const imgs = {};

export function spriteImage(spr) {
  const src = spr.v ? `${spr.file}?v=${spr.v}` : spr.file;
  if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; }
  const im = imgs[src];
  return im.complete && im.naturalWidth === spr.w * spr.frames && im.naturalHeight === spr.h ? im : null;
}
