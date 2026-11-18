// Nền bộ 15 mảnh lưới đôi của SpriteCook (chủ dự án 18/11/2026 11:03: sông hồ, đất đá do SpriteCook làm; luật gốc 1: một cỡ điểm
// cho cả thế giới). Bản đồ khai "nen": { nuoc, dat, san?, gach? } (mã hình data/art.json, lưới 4×4 ô 32 điểm) thì nền vẽ ở đây thay
// cho tấm đệm 16 điểm mỗi ô của draw-ground.js: 1 ô bản đồ = 32 điểm, tức 1 điểm = 0,5 đơn vị như nhân vật.
// Các lớp từ dưới lên: cỏ → nước và bờ cát (nuoc) → sân lát đá ô '2' và '1' (san) → phố gạch ô '1' lọt trong sân (gach) → đường đất (dat).
// Lưới đôi: mỗi mảnh nằm lệch nửa ô, chọn theo 4 ô quanh góc (mặt nạ trên-trái 1, trên-phải 2, dưới-trái 4, dưới-phải 8 → FRAME).
// Sức máy: không dựng một tấm cả bản đồ (92 ô = 2 944² điểm ≈ 35 MB) mà dựng từng mảng 8×8 ô (256² điểm) khi máy quay tới,
// giữ tối đa KEEP mảng gần nhất. Bản đồ không khai san / gach thì ô sân, phố dán hình ô cũ phóng 2 lần.
import { spriteImage } from '../render/sprites.js';
import { discOf } from './map.js';

const FRAME = [-1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6];
const N = 8, K = 2, P = 32, KEEP = 48;   // ô mỗi cạnh mảng, điểm mỗi đơn vị, điểm mỗi ô, số mảng giữ
let cache = { map: null, chunks: new Map() };

const img = (game, id) => { const s = game.data.art.sprites[id]; return s ? spriteImage(s) : null; };

// Hình nền của bản đồ này đã tải đủ chưa (màn che lúc tải, src/render/world-veil.js)
export function nenReady(game, map) {
  const n = map.def.nen;
  return !!n && ['nuoc', 'dat', 'san', 'gach'].every(k => !n[k] || img(game, n[k]));
}

function piece(g, im, f, x, y) {
  g.drawImage(im, (f % 4) * P, (f >> 2) * P, P, P, x, y, P, P);
}

function build(game, map, tiles, hash, cx, cy) {
  const n = map.def.nen, nuoc = img(game, n.nuoc), dat = img(game, n.dat), san = n.san && img(game, n.san), gach = n.gach && img(game, n.gach), T = map.T;
  const cv = document.createElement('canvas'); cv.width = cv.height = N * P;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const x0 = cx * N, y0 = cy * N, at = (x, y) => map.at(x, y);
  // cổng, bồ đoàn, đá linh căn đứng trên nền của ô đi được bên cạnh (sân lát, cỏ…), như draw-ground.js
  const under = (tx, ty) => { const ch = at(tx, ty); return 'PMS'.includes(ch) ? [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => at(tx + dx, ty + dy)).find(c => !'PMS'.includes(c) && !tiles.types[c]?.solid) || '.' : ch; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const tx = x0 + i, ty = y0 + j, ch = under(tx, ty), k = tiles.types[ch] || {}, h = hash(tx, ty);
    if (k.void) continue;
    if (k.tex && !(san && '12'.includes(ch)) && img(game, 'ground.' + ch)) { g.drawImage(img(game, 'ground.' + ch), Math.floor(h * 4) * T, 0, T, T, i * P, j * P, P, P); continue; }
    if ('.,=^'.includes(ch) || !k.color || (san && '12'.includes(ch))) {   // cỏ đặc (khung 6), lật ngẫu nhiên cho đỡ lặp; sân, phố lát phủ lên sau
      const fx = h < 0.5 ? 1 : -1, fy = (h * 2) % 1 < 0.5 ? 1 : -1;
      g.save(); g.translate(i * P + (fx < 0 ? P : 0), j * P + (fy < 0 ? P : 0)); g.scale(fx, fy); piece(g, nuoc, 6, 0, 0); g.restore();
    } else { g.fillStyle = k.color; g.fillRect(i * P, j * P, P, P); }
  }
  // một lớp lưới đôi: full(ô) = ô "đầy"; zero = khung khi 4 ô đều không đầy (-1: bỏ); skip15: bỏ mảnh đầy cả 4 góc (đã có ở lớp dưới)
  const layer = (im, full, zero, skip15) => {
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = x0 + i, y = y0 + j, a = full(x - 1, y - 1), b = full(x, y - 1), c = full(x - 1, y), d = full(x, y);
      const m = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0), f = m ? FRAME[m] : zero;
      if ((skip15 && m === 15) || f < 0) continue;
      piece(g, im, f, i * P - P / 2, j * P - P / 2);
    }
  };
  layer(nuoc, (x, y) => at(x, y) !== '=', 12, true);   // nước và bờ cát (ô toàn đất: giữ nền cỏ, sân đã vẽ)
  if (san) layer(san, (x, y) => '12'.includes(under(x, y)), -1, false);   // sân lát đá, viền cỏ bo tròn
  if (gach) layer(gach, (x, y) => under(x, y) === '1', -1, false);   // phố gạch lọt trong sân đá
  layer(dat, (x, y) => at(x, y) === ',', -1, false);   // đường đất phủ lên cỏ
  const d = discOf(map.def, T);
  if (d) {   // cắt theo mép đĩa tinh cầu
    g.globalCompositeOperation = 'destination-in';
    g.beginPath(); g.arc((d.cx - x0 * T) * K, (d.cy - y0 * T) * K, d.r * K, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-over';
    const s = game.data.art.sprites['tile.cliff'], cl = s && spriteImage(s);   // vách dưới mép đĩa (hình cũ phóng 2 lần)
    if (cl) for (let x = x0 * T; x < (x0 + N) * T; x++) {
      const dx = x + 0.5 - d.cx;
      if (dx * dx > d.r * d.r) continue;
      const yb = Math.floor(d.cy + Math.sqrt(d.r * d.r - dx * dx)), seg = Math.floor(x / T), sx = ((x % T) + T) % T;
      g.drawImage(cl, Math.floor(hash(seg, 7) * 3) * s.w + sx, 0, 1, s.h, (x - x0 * T) * K, (yb - y0 * T) * K, K, s.h * K);
      g.drawImage(cl, (3 + Math.floor(hash(seg, 9) * 3)) * s.w + sx, 0, 1, s.h, (x - x0 * T) * K, (yb + s.h - y0 * T) * K, K, s.h * K);
    }
    g.globalCompositeOperation = 'source-over';
  }
  return cv;
}

// Vẽ phần nền đang thấy. Trả false khi hình chưa tải (draw-map.js vẽ hình khối tạm).
export function drawNen(ctx, game, map, tiles, view, hash) {
  if (!nenReady(game, map)) return false;
  if (cache.map !== map) cache = { map, chunks: new Map() };
  const T = map.T, S = N * T, rows = Math.ceil((map.h + 2) / N), cols = Math.ceil(map.w / N);
  const c0 = Math.max(0, Math.floor(view.x0 / S)), c1 = Math.min(cols - 1, Math.floor(view.x1 / S));
  const r0 = Math.max(0, Math.floor(view.y0 / S)), r1 = Math.min(rows - 1, Math.floor(view.y1 / S));
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const key = cy * cols + cx;
    let cv = cache.chunks.get(key);
    if (cv) cache.chunks.delete(key); else cv = build(game, map, tiles, hash, cx, cy);
    cache.chunks.set(key, cv);   // vừa dùng: đưa về cuối hàng
    ctx.drawImage(cv, cx * S, cy * S, S, S);
  }
  ctx.restore();
  for (const key of cache.chunks.keys()) { if (cache.chunks.size <= KEEP) break; cache.chunks.delete(key); }
  return true;
}
