// Ảnh và bối cảnh cho báo lỗi, đề xuất (src/ui/feedback-panel.js).
// - shotScreen: chụp cả màn đang thấy trừ Hệ Thống (mục Góp ý, he-thong-gop.js); shotGame: chỉ khung game (dự phòng), thu nhỏ thành JPEG.
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

// Chụp cả màn đang thấy (cảnh game và mọi bảng đang mở), trừ Hệ Thống (chủ dự án 11/11/2026 23:3x: "chụp cả màn đang thấy trừ bảng
// hệ thống, vì lúc ấn vào góp ý thì mình vẫn đang ở trong bảng hệ thống"). Dựng lại trang thành ảnh bằng html2canvas (nạp lười từ
// jsdelivr như thư viện máy chủ); khung viền vẽ bằng border-image có thể thiếu, chữ, hình, bảng vẫn đủ. Lỗi, quá 8 giây: chỉ chụp cảnh game.
const SKIP = e => e.classList?.contains('ht-back') || e.classList?.contains('ht-tip') || e.id === 'ht-icon' || e.id === 'toast';
export async function shotScreen(cfg) {
  const W = innerWidth, H = innerHeight, k = Math.min(2, cfg.max / Math.max(W, H));
  const work = (async () => {
    const h2c = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')).default;
    const c = await h2c(document.body, { backgroundColor: '#000', scale: k, logging: false, useCORS: true, x: 0, y: 0, width: W, height: H, windowWidth: W, windowHeight: H, scrollX: 0, scrollY: 0, ignoreElements: SKIP });
    return encode(c, c.width, c.height, cfg);
  })();
  const late = new Promise(r => setTimeout(() => r(null), 8000));
  try { return (await Promise.race([work, late])) || shotGame(cfg); } catch { return shotGame(cfg); }
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
