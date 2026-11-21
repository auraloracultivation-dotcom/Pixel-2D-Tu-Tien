// Nền bộ 15 mảnh lưới đôi của SpriteCook (chủ dự án 18/11/2026 11:03: sông hồ, đất đá do SpriteCook làm; luật gốc 1: một cỡ điểm
// cho cả thế giới). Bản đồ khai "nen": { nuoc, dat, san?, gach?, nui?, mep?, vach?, hoa? } (mã hình data/art.json) thì nền vẽ ở đây thay
// cho tấm đệm 16 điểm mỗi ô của draw-ground.js: 1 ô bản đồ = 32 điểm, tức 1 điểm = 0,5 đơn vị như nhân vật.
// Các lớp từ dưới lên: cỏ → hoa cỏ in nền (hoa) → nền đá chân núi ô '^' (nui) → nước và bờ cát (nuoc) → sân lát đá ô '2' và '1' (san)
// → phố gạch ô '1' lọt trong sân (gach) → đường đất (dat) → mép tinh cầu (mep) → vách đá dưới đáy tinh cầu (vach) → núi in nền.
// Núi in nền: món đồ hội có kiểu chân bake (data/le-hoi.json foot.nui) đứng trên ô chắn, không ai ra sau lưng được, nên in thẳng vào
// mảng nền theo thứ tự hàng (xa trước, gần sau) thay vì vẽ lại mỗi khung như đồ đứng; draw-hoi.js bỏ qua các món này.
// Lưới đôi: mỗi mảnh nằm lệch nửa ô, chọn theo 4 ô quanh góc (mặt nạ trên-trái 1, trên-phải 2, dưới-trái 4, dưới-phải 8 → FRAME).
// Mép tinh cầu (13:23 "làm lại toàn bộ"): bản đồ có mep thì không cắt đĩa theo vòng tròn nữa; ô đất sát tinh không lấy mảnh mép
// (cỏ, viền đất đá, rễ rủ ở mép nam), dưới mép nam treo dải vách đá uốn theo vòng tròn. Va chạm vẫn theo vòng tròn discOf (map.js).
// Sức máy: không dựng một tấm cả bản đồ (128 ô = 4 096² điểm ≈ 67 MB) mà dựng từng mảng 8×8 ô (256² điểm) khi máy quay tới,
// giữ tối đa KEEP mảng gần nhất. Bản đồ không khai san / gach thì ô sân, phố dán hình ô cũ phóng 2 lần.
// tools/the-gioi/toan_canh.py vẽ lại đúng các bước này (cùng hàm băm) để ảnh toàn cảnh giống trong game: sửa ở đây thì sửa cả ở đó.
// Tinh cầu khác (chủ dự án 21/11/2026 "nền và cây, hoa cỏ" cho mọi tinh cầu): "nen" khai thêm "ky" = ô nào thuộc lớp nào, vì mỗi tinh cầu
// dùng ký tự ô riêng (đất tro 'a', dung nham 'L', tuyết 'w', hồ băng 'O'…): { nen: ô nền (khung 6 của bộ nuoc), nuoc: ô mặt thứ hai (nước,
// dung nham, hồ băng, khe hư không), dat, san, gach, nui, them: [[mã hình, các ô], …] lớp phủ thêm (mặt băng, ruộng bậc thang, sàn gỗ) }.
// Có "ky" thì mọi ô không phải tinh không đều lót nền trước (cây, đá, nhà đứng trên nền), chuyện vẽ ô theo hình cũ không còn.
import { spriteImage } from '../render/sprites.js';
import { traCanvas, coHinh } from '../render/canvas-kho.js';
import { discOf } from './map.js';

const FRAME = [-1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6];
const N = 8, K = 2, P = 32, KEEP = 48;   // ô mỗi cạnh mảng, điểm mỗi đơn vị, điểm mỗi ô, số mảng giữ
const LAYERS = ['nuoc', 'dat', 'san', 'gach', 'nui', 'mep', 'vach', 'hoa'];
const KY = { nen: '.', nuoc: '=', dat: ',', san: '12', gach: '1', nui: '^' };   // Thiên Kiếm Tinh (bản đồ không khai ky)
export const kyOf = n => ({ ...KY, ...(n.ky || {}), them: n.ky?.them || [] });
// Ô nền của bản đồ này đã vẽ bằng bộ 15 mảnh (draw-map.js không vẽ hình khối cũ đè lên)
export const kyPainted = n => { const k = kyOf(n); return new Set((k.nen + k.nuoc + k.dat + k.san + k.gach + k.them.map(t => t[1]).join('')).split('')); };
let cache = { map: null, hoi: null, chunks: new Map(), hong: new Map() };

const img = (game, id) => { const s = game.data.art.sprites[id]; return s ? spriteImage(s) : null; };

// Hình nền của bản đồ này đã tải đủ chưa (màn che lúc tải, src/render/world-veil.js)
export function nenReady(game, map) {
  const n = map.def.nen;
  return !!n && LAYERS.every(k => !n[k] || img(game, n[k])) && kyOf(n).them.every(t => img(game, t[0])) && (map.hoi || []).every(it => !it.foot.bake || spriteImage(it.spr));
}

function piece(g, im, f, x, y) {
  g.drawImage(im, (f % 4) * P, (f >> 2) * P, P, P, x, y, P, P);
}

// Ô cỏ (tx, ty) in cụm hoa cỏ nào (−1: không): bãi hoa mọc thành vùng theo nhiễu mượt, mỗi vùng 11 ô một màu hoa chủ đạo,
// lác đác nấm và sỏi; chỉ in ở ô cỏ mà bốn ô kề cũng là cỏ (không lấn đường, bờ nước, mép).
function hoaO(at, hash, tx, ty, nen = '.') {
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) if (!nen.includes(at(tx + dx, ty + dy))) return -1;
  const gx = Math.floor(tx / 7), gy = Math.floor(ty / 7), u = tx / 7 - gx, v = ty / 7 - gy, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  const n = (hash(gx + 900, gy + 900) * (1 - a) + hash(gx + 901, gy + 900) * a) * (1 - b) + (hash(gx + 900, gy + 901) * (1 - a) + hash(gx + 901, gy + 901) * a) * b;
  if (hash(tx + 101, ty + 59) >= (n > 0.66 ? 0.26 : n > 0.52 ? 0.07 : 0.018)) return -1;
  const k = hash(tx + 7, ty + 211);
  if (k < 0.12) return k < 0.06 ? 3 : 4;
  return k < 0.8 ? Math.floor(hash(Math.floor(tx / 11) + 3, Math.floor(ty / 11) + 9) * 3) : Math.floor(k * 100) % 3;
}

function build(game, map, tiles, hash, cx, cy) {
  const n = map.def.nen, T = map.T, I = k => n[k] && img(game, n[k]);
  const nuoc = I('nuoc'), dat = I('dat'), san = I('san'), gach = I('gach'), nui = I('nui'), mep = I('mep'), vach = I('vach'), hoa = I('hoa');
  const ky = kyOf(n), lot = !!n.ky;   // lot: mọi ô lót nền (tinh cầu khai ky)
  const cv = document.createElement('canvas'); cv.width = cv.height = N * P;
  const g = cv.getContext('2d');
  if (!g) { traCanvas(cv); return null; }
  g.imageSmoothingEnabled = false;
  const x0 = cx * N, y0 = cy * N, at = (x, y) => map.at(x, y);
  let mau = null;   // ô đất đầu tiên vẽ vào mảng: soát vẽ có ăn không
  // cổng, bồ đoàn, đá linh căn đứng trên nền của ô đi được bên cạnh (sân lát, cỏ…), như draw-ground.js
  const under = (tx, ty) => { const ch = at(tx, ty); return 'PMS'.includes(ch) ? [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => at(tx + dx, ty + dy)).find(c => !'PMS'.includes(c) && !tiles.types[c]?.solid) || '.' : ch; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const tx = x0 + i, ty = y0 + j, ch = under(tx, ty), k = tiles.types[ch] || {}, h = hash(tx, ty);
    if (k.void) continue;
    mau ??= [i * P, j * P];
    if (!lot && k.tex && !(san && '12'.includes(ch)) && img(game, 'ground.' + ch)) { g.drawImage(img(game, 'ground.' + ch), Math.floor(h * 4) * T, 0, T, T, i * P, j * P, P, P); continue; }
    if (lot || '.,=^'.includes(ch) || !k.color || (san && '12'.includes(ch))) {   // cỏ đặc (khung 6), lật ngẫu nhiên cho đỡ lặp; sân, phố lát phủ lên sau
      const fx = h < 0.5 ? 1 : -1, fy = (h * 2) % 1 < 0.5 ? 1 : -1;
      g.save(); g.translate(i * P + (fx < 0 ? P : 0), j * P + (fy < 0 ? P : 0)); g.scale(fx, fy); piece(g, nuoc, 6, 0, 0); g.restore();
    } else { g.fillStyle = k.color; g.fillRect(i * P, j * P, P, P); }
  }
  if (hoa) {   // hoa cỏ in nền; cụm ở ô sát ngoài mảng cũng vẽ (phần lọt vào mảng), hai mảng kề nhau ghép khít
    const s = game.data.art.sprites[n.hoa];
    for (let j = -1; j <= N; j++) for (let i = -1; i <= N; i++) {
      const tx = x0 + i, ty = y0 + j, k = hoaO(at, hash, tx, ty, ky.nen);
      if (k >= 0) g.drawImage(hoa, k * s.w, 0, s.w, s.h, Math.round((i + 0.5) * P + Math.round((hash(tx + 31, ty + 17) - 0.5) * 16) - s.w / 2), (j + 1) * P - Math.round(hash(tx + 5, ty + 71) * 10) - s.h, s.w, s.h);
    }
  }
  // một lớp lưới đôi: full(ô) = ô "đầy"; zero = khung khi 4 ô đều không đầy (-1: bỏ); skip15: bỏ mảnh đầy cả 4 góc (đã có ở lớp dưới);
  // clear: xoá ô trước khi dán (lớp mép thay hẳn những gì đã vẽ ở ô sát tinh không)
  const layer = (im, full, zero, skip15, clear) => {
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = x0 + i, y = y0 + j, a = full(x - 1, y - 1), b = full(x, y - 1), c = full(x - 1, y), d = full(x, y);
      const m = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0), f = m ? FRAME[m] : zero;
      if ((skip15 && m === 15) || f < 0) continue;
      if (clear) g.clearRect(i * P - P / 2, j * P - P / 2, P, P);
      piece(g, im, f, i * P - P / 2, j * P - P / 2);
    }
  };
  if (nui) layer(nui, (x, y) => ky.nui.includes(at(x, y)), -1, false);   // nền đá chân núi (núi là đồ đứng tk.nui-*)
  layer(nuoc, (x, y) => !ky.nuoc.includes(at(x, y)), 12, true);   // nước và bờ cát (ô toàn đất: giữ nền cỏ, sân đã vẽ)
  if (san) layer(san, (x, y) => ky.san.includes(under(x, y)), -1, false);   // sân lát đá, viền cỏ bo tròn
  if (gach) layer(gach, (x, y) => ky.gach.includes(under(x, y)), -1, false);   // phố gạch lọt trong sân đá
  for (const [id, chs] of ky.them) layer(img(game, id), (x, y) => chs.includes(under(x, y)), -1, false);   // mặt băng, ruộng, sàn gỗ…
  if (dat) layer(dat, (x, y) => ky.dat.includes(at(x, y)), -1, false);   // đường đất phủ lên cỏ
  const d = discOf(map.def, T);
  if (mep) {
    layer(mep, (x, y) => at(x, y) !== '~', -1, true, true);
    if (vach && d) {   // vách đá dưới mép nam: mỗi cột điểm ảnh một lát của hình vách, treo từ vòng tròn lùi vào trong mép đất 0,35 ô
      const s = game.data.art.sprites[n.vach], c = map.w * P / 2, r = (map.w / 2 - 0.76) * P;
      g.globalCompositeOperation = 'destination-over';
      for (let i = 0; i < N * P; i++) {
        const x = x0 * P + i, dx = x + 0.5 - c;
        if (dx * dx > r * r) continue;
        const yb = Math.floor(c + Math.sqrt(r * r - dx * dx)) - 8 - y0 * P, u = x % (2 * s.w);
        if (yb >= N * P || yb + s.h <= 0) continue;
        g.drawImage(vach, u < s.w ? u : 2 * s.w - 1 - u, 0, 1, s.h, i, yb, 1, s.h);
      }
      g.globalCompositeOperation = 'source-over';
    }
  } else if (d) {   // bản đồ chưa có lớp mép: cắt theo mép đĩa tinh cầu, vách cũ phóng 2 lần
    g.globalCompositeOperation = 'destination-in';
    g.beginPath(); g.arc((d.cx - x0 * T) * K, (d.cy - y0 * T) * K, d.r * K, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-over';
    const s = game.data.art.sprites['tile.cliff'], cl = s && spriteImage(s);
    if (cl) for (let x = x0 * T; x < (x0 + N) * T; x++) {
      const dx = x + 0.5 - d.cx;
      if (dx * dx > d.r * d.r) continue;
      const yb = Math.floor(d.cy + Math.sqrt(d.r * d.r - dx * dx)), seg = Math.floor(x / T), sx = ((x % T) + T) % T;
      g.drawImage(cl, Math.floor(hash(seg, 7) * 3) * s.w + sx, 0, 1, s.h, (x - x0 * T) * K, (yb - y0 * T) * K, K, s.h * K);
      g.drawImage(cl, (3 + Math.floor(hash(seg, 9) * 3)) * s.w + sx, 0, 1, s.h, (x - x0 * T) * K, (yb + s.h - y0 * T) * K, K, s.h * K);
    }
    g.globalCompositeOperation = 'source-over';
  }
  for (const it of map.hoi || []) {   // núi in nền (map.hoi đã xếp theo hàng); mỗi mảng in phần lọt vào mình, các mảng kề nhau ghép khít
    if (!it.foot.bake) continue;
    const sp = it.spr, w = sp.w * it.k * K, h = sp.h * it.k * K, px = Math.round((it.x - sp.anchor[0] * it.k) * K) - x0 * P, py = Math.round((it.y - sp.anchor[1] * it.k) * K) - y0 * P;
    if (px >= N * P || py >= N * P || px + w <= 0 || py + h <= 0) continue;
    const im = spriteImage(sp);
    if (!im) continue;
    if (it.flip) { g.save(); g.translate(px + w, py); g.scale(-1, 1); g.drawImage(im, 0, 0, sp.w, sp.h, 0, 0, w, h); g.restore(); } else g.drawImage(im, 0, 0, sp.w, sp.h, px, py, w, h);
  }
  // Safari hết bộ nhớ canvas: mảng mới vẽ không ăn, giữ lại là cả vùng đất tối om tới lúc rời tinh cầu (người chơi báo 22/11/2026). Không giữ, lượt sau dựng lại.
  if (mau && !coHinh(g, mau[0], mau[1], P, P) && !coHinh(g, 0, 0, N * P, N * P)) { traCanvas(cv); return null; }
  return cv;
}

// Vẽ phần nền đang thấy. Trả false khi hình chưa tải (draw-map.js vẽ hình khối tạm).
export function drawNen(ctx, game, map, tiles, view, hash) {
  if (!nenReady(game, map)) return false;
  if (cache.map !== map || cache.hoi !== map.hoi) {   // bày lại đồ (map.setHoi) thì in lại núi; tấm cũ trả bộ nhớ ngay (src/render/canvas-kho.js)
    for (const cv of cache.chunks.values()) traCanvas(cv);
    cache = { map, hoi: map.hoi, chunks: new Map(), hong: new Map() };
  }
  const T = map.T, S = N * T, rows = Math.ceil((map.h + 4) / N), cols = Math.ceil(map.w / N);
  const c0 = Math.max(0, Math.floor(view.x0 / S)), c1 = Math.min(cols - 1, Math.floor(view.x1 / S));
  const r0 = Math.max(0, Math.floor(view.y0 / S)), r1 = Math.min(rows - 1, Math.floor(view.y1 / S));
  const now = performance.now();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const key = cy * cols + cx;
    let cv = cache.chunks.get(key);
    if (cv) cache.chunks.delete(key);
    else if (now - (cache.hong.get(key) ?? -1e9) < 1000) continue;   // vừa dựng hỏng: đợi một giây mới thử lại
    else if (!(cv = build(game, map, tiles, hash, cx, cy))) { cache.hong.set(key, now); continue; }
    cache.chunks.set(key, cv);   // vừa dùng: đưa về cuối hàng
    ctx.drawImage(cv, cx * S, cy * S, S, S);
  }
  ctx.restore();
  for (const [key, cv] of cache.chunks) { if (cache.chunks.size <= KEEP) break; cache.chunks.delete(key); traCanvas(cv); }
  return true;
}
