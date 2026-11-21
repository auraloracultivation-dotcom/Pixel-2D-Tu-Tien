// Tải tấm hình trong data/art.json một lần. file?v=<mã nội dung>: đổi hình là đổi đường dẫn, máy không dùng lại tấm cũ còn lưu tạm.
// Tấm tải về không đúng cỡ data/art.json thì coi như chưa có. Tấm lưới nhiều hàng (hình hiệu ứng pfx.*: rows hàng) thì cao h × rows.
import { khoCanvas, traCanvas, canvasNhap, coHinh } from './canvas-kho.js';
const imgs = {};

export function spriteImage(spr) {
  const src = spr.v ? `${spr.file}?v=${spr.v}` : spr.file;
  if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; }
  const im = imgs[src];
  return im.complete && im.naturalWidth === spr.w * spr.frames && im.naturalHeight === spr.h * (spr.rows || 1) ? im : null;
}

// Bóng một màu của cả tấm hình (chớp trắng, ám đỏ khi trúng đòn). Không dùng ctx.filter vì Safari iPhone cũ không có.
// Bản sao giữ trong kho có hạn mức (src/render/canvas-kho.js, data/config.json → perf.canvas_mb), trước giữ mãi nên Safari hết bộ nhớ canvas.
// Máy không tạo được canvas (hết bộ nhớ) thì trả null: chỗ gọi bỏ lớp phủ, không làm hỏng khung hình.
const kho = khoCanvas();
export const setCanvasMb = mb => kho.han(mb);
export const canvasKho = () => ({ mb: Math.round(kho.bytes / 1048576), so: kho.size });   // bài thử, đo

const hong = new Map();   // khoá → lúc tạo hỏng (máy hết bộ nhớ canvas): đợi một lúc mới thử lại, không tạo canvas mỗi khung
function banSao(im, spr, key) {
  if (performance.now() - (hong.get(key) ?? -1e9) < 2000) return [null, null];
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d');
  if (g) g.drawImage(im, 0, 0);
  if (!g || (!coHinh(g, 0, 0, Math.min(spr.w, c.width), Math.min(spr.h, c.height)) && !coHinh(g, 0, 0, c.width, c.height))) {   // vẽ không ăn (Safari hết bộ nhớ canvas cho tấm trắng): không giữ
    traCanvas(c); hong.set(key, performance.now()); return [null, null];
  }
  hong.delete(key);
  return [c, g];
}

export function tintedImage(spr, im, color) {
  const key = `${spr.file}?${spr.v}|${color}`;
  let c = kho.get(key);
  if (!c) {
    const [b, g] = banSao(im, spr, key);
    if (!b) return null;
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, b.width, b.height);
    c = kho.set(key, b);
  }
  return c;
}

// Hình loé trắng giữ viền mực (src/game/hit-feel.js: quái vừa trúng đòn của mình): điểm tối (viền, nét trong, bóng sẫm nhất) giữ nguyên,
// mọi điểm còn lại trắng hẳn → con quái sáng bừng mà vẫn rõ dáng trên nền sáng (trắng đặc cả khối thì lẫn vào vệt chém trắng).
export function flashImage(spr, im) {
  const key = `${spr.file}?${spr.v}|loe`;
  let c = kho.get(key);
  if (!c) {
    const [b, g] = banSao(im, spr, key);
    if (!b) return null;
    try {
      const d = g.getImageData(0, 0, b.width, b.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) if (a[i + 3] && a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11 > 40) a[i] = a[i + 1] = a[i + 2] = 255;
      g.putImageData(d, 0, 0);
    } catch { traCanvas(b); return tintedImage(spr, im, '#ffffff'); }   // máy không cho đọc điểm ảnh: trắng cả khối như cũ
    c = kho.set(key, b);
  }
  return c;
}

// Màu chính của một hình (khung đầu): màu không phải mực tối có nhiều điểm nhất. Vụn văng lúc quái chết lấy màu này cho đúng con quái đang thấy
// (màu khai ở data/mobs.json là của hình khối cũ, có con đã lệch màu hình mới). Máy không cho đọc điểm ảnh thì trả null.
const tones = {};
export function spriteTone(spr, im) {
  const key = `${spr.file}?${spr.v}`;
  if (tones[key] === undefined) {
    tones[key] = null;
    try {
      const [, g] = canvasNhap(spr.w, spr.h); g.drawImage(im, 0, 0);   // canvas nháp dùng chung, không tạo mới mỗi hình
      const a = g.getImageData(0, 0, spr.w, spr.h).data, n = {};
      let best = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] < 200 || a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11 < 60) continue;
        const k = ((a[i] >> 4) << 8) | ((a[i + 1] >> 4) << 4) | (a[i + 2] >> 4);   // gom màu gần nhau: 16 bậc mỗi kênh
        if ((n[k] = (n[k] || 0) + 1) > best) { best = n[k]; tones[key] = '#' + [a[i], a[i + 1], a[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); }
      }
    } catch { /* giữ null */ }
  }
  return tones[key];
}

// Bóng đổ theo dáng hình (chủ dự án 09/11/2026 15:10, mẫu game Sheepdog): khung f tô một màu, nằm xuống đất từ chân, ép dẹt
// (squash: dài bóng / cao hình), xiên sang trái theo độ cao (skew), mờ alpha. Gọi khi ctx đặt chân hình ở gốc toạ độ (ngay trước
// drawImage(-anchor)); hình lật ngang thì bóng vẫn xiên cùng một phía. Số ở data/config.json → shadow (setShadow mỗi khung).
let SH = null;
export const setShadow = s => { SH = s; };
export function drawShadowFrame(ctx, spr, im, f) {
  if (!SH || !im) return;
  const m = ctx.getTransform();
  if (!m.a) return;
  ctx.save();
  ctx.transform(1, 0, SH.skew * Math.abs(m.d) / m.a, -SH.squash, 0, 0);
  ctx.globalAlpha *= SH.alpha; ctx.imageSmoothingEnabled = true;
  const t = tintedImage(spr, im, SH.color);
  if (t) ctx.drawImage(t, (f || 0) * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
}

// Vẽ khung f của hình kèm hiệu ứng trúng đòn: nửa đầu chớp trắng hẳn, nửa sau ám đỏ mờ dần (docs/02).
// hit: 0 là không trúng, 1 là vừa trúng.
export function drawHitFrame(ctx, spr, im, f, hit, solid) {
  const sx = f * spr.w, ax = -spr.anchor[0], ay = -spr.anchor[1];
  const lo = hit > 0.5 && solid && flashImage(spr, im);
  if (lo) { ctx.drawImage(lo, sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h); return; }   // đòn của mình (bản ra đòn mới): loé trắng hẳn, còn viền mực
  ctx.drawImage(im, sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
  const t = hit > 0 && tintedImage(spr, im, hit > 0.5 ? '#ffffff' : '#ff3a3a');
  if (!t) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = hit > 0.5 ? a * 0.7 : hit * 1.1;   // vừa trúng: hình thật phủ trắng 70% (trắng đặc cả bầy quái cộng quầng chiêu thành mảng chói, chơi thử 28/10); sau đó ám đỏ mờ dần
  ctx.drawImage(t, sx, 0, spr.w, spr.h, ax, ay, spr.w, spr.h);
  ctx.globalAlpha = hit > 0.5 ? a : 1;
}
