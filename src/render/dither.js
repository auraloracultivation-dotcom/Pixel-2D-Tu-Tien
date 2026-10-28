// Tan dần kiểu pixel (docs/02-CHUAN-PIXEL.md: hiệu ứng tan bằng dither Bayer 4×4, không mờ trơn).
// drawDissolved vẽ một khung hình rồi khoét lỗ theo mẫu Bayer: k = 0 còn nguyên, k = 1 tan hết; white = tô trắng cả hình (chớp trúng).
// Dùng một tấm đệm chung, chỉ cho hình nhỏ (quái chết, số sát thương).
const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
let cv = null, cx = null, pats = [];

function pattern(level) {
  if (!pats[level]) {
    const p = document.createElement('canvas'); p.width = p.height = 4;
    const q = p.getContext('2d'); q.fillStyle = '#000';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (B[y][x] < level) q.fillRect(x, y, 1, 1);
    pats[level] = cx.createPattern(p, 'repeat');
  }
  return pats[level];
}

export function drawDissolved(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, k, white = false) {
  const level = Math.max(0, Math.min(16, Math.round(k * 16)));
  if (level >= 16) return;
  if (!cv || cv.width < sw || cv.height < sh) {
    cv = document.createElement('canvas'); cv.width = Math.max(64, sw); cv.height = Math.max(64, sh);
    cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; pats = [];
  }
  cx.globalCompositeOperation = 'source-over';
  cx.clearRect(0, 0, sw, sh);
  cx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  if (white) { cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, sw, sh); }
  if (level) { cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = pattern(level); cx.fillRect(0, 0, sw, sh); }
  cx.globalCompositeOperation = 'source-over';
  ctx.drawImage(cv, 0, 0, sw, sh, dx, dy, dw, dh);
}
