// Ảnh và bối cảnh cho báo lỗi, đề xuất (src/ui/feedback-panel.js).
// - shotGame: chụp khung game ngay lúc bấm nút (trước khi bảng che), thu nhỏ thành JPEG.
// - fromFile: ảnh người chơi chọn trong máy, thu nhỏ cùng cách.
// - context: bối cảnh máy tự gắn để dễ tìm lỗi (bản đồ, cảnh giới, vị trí, máy, lỗi JavaScript gần nhất). Không gửi bản lưu.
import { recentErrors } from '../core/catch-errors.js';

// Thu nhỏ nguồn ảnh (canvas, img) về cạnh dài tối đa max điểm, ra data URL JPEG
function jpeg(src, w, h, max, q) {
  const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

// { anh, anh_nho } từ một nguồn ảnh theo cấu hình feedback.img
export function encode(src, w, h, cfg) {
  return { anh: jpeg(src, w, h, cfg.max, cfg.q), anh_nho: jpeg(src, w, h, cfg.thumb, cfg.thumb_q) };
}

export function shotGame(cfg) {
  const cv = document.getElementById('game');
  try { return cv?.width ? encode(cv, cv.width, cv.height, cfg) : null; } catch { return null; }
}

export function fromFile(file, cfg) {
  return new Promise(resolve => {
    if (!file || !/^image\//.test(file.type || 'image/')) { resolve(null); return; }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); try { resolve(encode(im, im.naturalWidth, im.naturalHeight, cfg)); } catch { resolve(null); } };
    im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    im.src = url;
  });
}

export function context(game) {
  const s = game.save || {}, p = game.player;
  return {
    map: game.map?.id, realm: s.realm, layer: s.layer, step: s.step, element: s.element, weapon: s.weapon,
    pos: p ? [Math.round(p.x), Math.round(p.y)] : null,
    busy: { trib: !!game.trib?.active, tower: !!game.tower, auto: !!game.auto, pilot: !!game.pilot, ui: !!game.uiOpen },
    screen: [innerWidth, innerHeight, Math.round((devicePixelRatio || 1) * 100) / 100],
    ua: navigator.userAgent.slice(0, 200), lang: navigator.language, page: location.pathname,
    errors: recentErrors().slice(-5), at: new Date().toISOString(),
  };
}
