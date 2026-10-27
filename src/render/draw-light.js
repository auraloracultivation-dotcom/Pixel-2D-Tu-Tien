// Hầm ngục, bí cảnh về đêm (data/light.json): phủ tối cả màn hình, khoét quầng sáng theo dải quanh đuốc, dung nham
// và người chơi (như bài pixel-lessons: tối nền, vũng sáng bậc thang, lửa lập loè), rồi hắt chút ánh lửa ấm lên nền.
import { spriteImage } from './sprites.js';

let cache = { map: null, torches: [], lava: [] };
let shade = null, warm = null;

export const isLit = game => game.data.light.maps.includes(game.map.id);

const walk = (map, tx, ty) => { const k = map.type(tx, ty); return !k.solid && !k.void; };
const wallish = (map, tx, ty) => { const k = map.type(tx, ty); return k.solid && !k.void && !k.low; };

// Đuốc trên mặt vách ngay trên ô đi được, cứ every ô một cây (lệch theo hàng cho đỡ đều); ô dung nham làm nguồn sáng nhỏ.
function scan(game) {
  const map = game.map, every = game.data.light.torch.every, T = map.T, torches = [], lava = [];
  for (let ty = 0; ty < map.h - 1; ty++) for (let tx = 0; tx < map.w; tx++) {
    if (map.at(tx, ty) === 'L' && (tx + ty) % 2 === 0) lava.push({ x: tx * T + T / 2, y: ty * T + T / 2 });
    if ((tx + ty * 2) % every || !wallish(map, tx, ty) || !walk(map, tx, ty + 1)) continue;
    if (wallish(map, tx - 1, ty) && wallish(map, tx + 1, ty)) torches.push({ x: tx * T + T / 2, y: ty * T + T - 2, ph: (tx * 7 + ty) % 4 });
  }
  cache = { map, torches, lava };
}

// Vách đá '#': mặt gạch ở ô ngay trên nền đi được, vân tối ở đỉnh vách (vách theo hệ đã có hình riêng thì để nguyên)
function drawWalls(ctx, game, view) {
  const s = game.data.art.sprites['tile.dwall'], im = s && spriteImage(s), map = game.map, T = map.T;
  if (!im) return;
  const x0 = Math.max(0, Math.floor(view.x0 / T)), x1 = Math.min(map.w - 1, Math.floor(view.x1 / T));
  const y0 = Math.max(0, Math.floor(view.y0 / T)), y1 = Math.min(map.h - 1, Math.floor(view.y1 / T));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (map.at(tx, ty) !== '#') continue;
    const f = (walk(map, tx, ty + 1) ? 0 : 2) + ((tx * 3 + ty) & 1);
    ctx.drawImage(im, f * s.w, 0, s.w, s.h, tx * T, ty * T, s.w, s.h);
  }
}

// Vẽ vách và đuốc (trong toạ độ thế giới, sau lớp bản đồ)
export function drawTorches(ctx, game, view, t) {
  if (!isLit(game)) return;
  if (cache.map !== game.map) scan(game);
  const s = game.data.art.sprites['prop.torch'], im = s && spriteImage(s);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  drawWalls(ctx, game, view);
  if (!im) { ctx.restore(); return; }
  for (const o of cache.torches) {
    if (o.x < view.x0 - 16 || o.x > view.x1 + 16 || o.y < view.y0 - 24 || o.y > view.y1 + 24) continue;
    const f = (Math.floor(t * 7) + o.ph) % s.frames;
    ctx.drawImage(im, f * s.w, 0, s.w, s.h, Math.round(o.x - s.anchor[0]), Math.round(o.y - s.anchor[1]), s.w, s.h);
  }
  ctx.restore();
}

// Khoét các dải sáng: mỗi dải ngoài khoét ít hơn dải trong, nên bóng tối bậc thang chứ không mờ trơn
function hole(c, x, y, r, bands) {
  for (let i = bands.length - 1; i >= 0; i--) {
    c.globalAlpha = (bands.length - i) / bands.length;
    c.beginPath(); c.ellipse(x, y, r * bands[i], r * bands[i] * 0.78, 0, 0, Math.PI * 2); c.fill();
  }
}

// Tấm vẽ nhỏ: mỗi điểm = một điểm ảnh thế giới (vừa nhẹ máy, vừa cho mép quầng sáng răng cưa đúng kiểu pixel)
function layer(cv, w, h) {
  cv ||= document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return cv;
}

// Lớp tối (toạ độ màn hình). Trả false nếu bản đồ này không phủ tối, để draw.js dùng lớp tối cũ.
export function drawDarkness(ctx, game, screen, t) {
  if (!isLit(game)) return false;
  if (cache.map !== game.map) scan(game);
  const L = game.data.light, k = 1 / screen.zoom, w = Math.ceil(screen.w * k), h = Math.ceil(screen.h * k);
  shade = layer(shade, w, h); warm = layer(warm, w, h);
  const c = shade.getContext('2d'), g = warm.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.clearRect(0, 0, w, h); g.clearRect(0, 0, w, h);
  c.fillStyle = `rgba(${L.color},${L.ambient})`; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  g.fillStyle = `rgb(${L.torch.warm})`;
  const at = (x, y) => { const p = screen.toScreen(x, y); return { x: p.x * k, y: p.y * k }; };
  const on = p => p.x > -60 && p.x < w + 60 && p.y > -60 && p.y < h + 60;
  const glow = (p, r, a) => { g.globalAlpha = a; g.beginPath(); g.ellipse(p.x, p.y, r * 0.55, r * 0.43, 0, 0, Math.PI * 2); g.fill(); };   // ánh lửa hắt lên nền
  for (const o of cache.torches) {
    const p = at(o.x, o.y - 8);
    if (!on(p)) continue;
    const r = L.torch.radius * (1 + Math.sin(t * 9 + o.ph * 1.7) * L.torch.flicker + Math.sin(t * 23 + o.ph) * L.torch.flicker * 0.5);
    hole(c, p.x, p.y, r, L.torch.bands); glow(p, r, L.torch.warm_alpha);
  }
  for (const o of cache.lava) {
    const p = at(o.x, o.y);
    if (on(p)) { hole(c, p.x, p.y, L.lava.radius, [1]); glow(p, L.lava.radius, L.lava.warm_alpha); }
  }
  const pp = at(game.player.x, game.player.y - 6);
  hole(c, pp.x, pp.y, L.player.radius, L.player.bands);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shade, 0, 0, w / k, h / k);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(warm, 0, 0, w / k, h / k);
  ctx.restore();
  return true;
}
