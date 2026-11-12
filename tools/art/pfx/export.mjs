// Xuất hình hiệu ứng chiêu từ PixelFX (github.com/patch-gg/pixelfx, MIT, bản ghim ở tools/art/vfx_pfx.py) thành tấm lưới cho game.
// Chủ dự án 13/11/2026: bỏ ảnh GPT, hiệu ứng chiêu vẽ bằng code điểm ảnh, "đẹp và chất".
//
// Mỗi hình (tools/art/pfx/sprites.mjs) → hai tấm PNG trong tools/art/nguon/pfx/:
//   <tên>.png    lớp MÀU: điểm ảnh nguyên bản, không thu phóng, không làm mượt (vẽ đè bình thường)
//   <tên>.l.png  lớp SÁNG: quầng sáng cộng thêm (game vẽ bằng 'lighter', sáng theo ngày đêm)
// và một dòng trong meta.json (cỡ ô, số khung, số hướng, điểm neo, nhịp). tools/art/vfx_pfx.py đưa vào data/art.json.
//
// Hiệu ứng có hướng (đạn, vệt chém): dựng sẵn `dirs` góc từ 0 tới 90 độ bằng phép xoay của chính PixelFX (điểm ảnh sắc ở mọi góc);
// game lật ngang, lật dọc cho đủ vòng và chỉ xoay thêm phần lẻ rất nhỏ.
// Hiệu ứng riêng của game để ở tools/art/pfx/fx/*.js (cùng luật viết của PixelFX), chép vào <PixelFX>/src/fx/p2d/ trước khi dựng.
//
// Chạy: PIXELFX_DIR=<thư mục PixelFX> node tools/art/pfx/export.mjs [tên ...] [--sheet thư-mục] [--zoom 2] [--only-sheet]
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const PFX = process.env.PIXELFX_DIR || join(ROOT, 'tools', 'art', 'nguon', 'pfx', 'src');
const OUT = join(ROOT, 'tools', 'art', 'nguon', 'pfx');
if (!existsSync(join(PFX, 'src', 'core', 'index.js'))) { console.error('Chưa có PixelFX ở ' + PFX + ' (đặt PIXELFX_DIR hoặc chạy tools/art/vfx_pfx.py để tải bản ghim).'); process.exit(1); }

// hiệu ứng riêng của game → thư mục p2d của PixelFX (đường dẫn import ../../core/index.js giữ nguyên)
const MINE = join(HERE, 'fx'), DEST = join(PFX, 'src', 'fx', 'p2d');
mkdirSync(DEST, { recursive: true });
if (existsSync(MINE)) for (const f of readdirSync(MINE)) if (f.endsWith('.js')) copyFileSync(join(MINE, f), join(DEST, f));

const imp = p => import(pathToFileURL(join(PFX, p)).href);
const core = await imp('src/core/index.js'), lib = await imp('tools/lib/fxlib.mjs'), { encodePNG } = await imp('tools/lib/png.mjs');
const { SPRITES } = await import(pathToFileURL(process.env.PFX_SPRITES || join(HERE, 'sprites.mjs')).href + '?v=' + Date.now());   // PFX_SPRITES: danh sách khác (xem thử)

const args = process.argv.slice(2), F = {}, names = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--only-sheet') F.onlySheet = true; else if (args[i].startsWith('--')) F[args[i].slice(2)] = args[++i]; else names.push(args[i]); }
const MAXW = 2048, TICK = 1 / 120, LT = 2;   // LT: sáng yếu hơn mức này coi như không có (để cắt khung)
const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** Dựng một hình: trả về { w, h, n, dirs, cells[hướng][khung] = { c: Uint32Array màu, l: Uint32Array sáng }, anchor, ... } */
async function render(name, S) {
  const fx = await lib.loadEffect(S.fx), meta = fx.meta, [W, H] = meta.size, [OX, OY] = meta.origin, m = S.margin ?? 0;
  const box = S.box || [-OX - m, -OY - m, W - OX + m, H - OY + m];   // khung cắt trong toạ độ hiệu ứng (gốc = điểm neo), chưa xoay
  const dirs = S.dirs || 1, fps = S.fps || 20, t0 = S.t?.[0] ?? 0, t1 = S.t?.[1] ?? meta.duration;
  const times = S.times || Array.from({ length: Math.max(1, Math.round((t1 - t0) * fps)) }, (_, i) => t0 + i / fps), n = times.length;
  const pal = typeof S.pal === 'string' ? core.PAL[S.pal] : S.pal;
  if (S.pal && !pal) throw new Error(`${name}: không có bảng màu ${S.pal}`);
  const R = dirs > 1 ? Math.ceil(Math.max(...[[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]].map(([x, y]) => Math.hypot(x, y)))) + 1 : 0;
  const fw = dirs > 1 ? R * 2 : box[2] - box[0], fh = dirs > 1 ? R * 2 : box[3] - box[1], fox = dirs > 1 ? -R : box[0], foy = dirs > 1 ? -R : box[1];
  const frame = core.createFrame(fw, fh, fox, foy), E = S.edge ?? 6, cells = [];
  let bx0 = fw, by0 = fh, bx1 = -1, by1 = -1;
  for (let d = 0; d < dirs; d++) {
    const angle = dirs > 1 ? (d / (dirs - 1)) * Math.PI / 2 : S.angle || 0, cs = Math.cos(angle), sn = Math.sin(angle);
    const inst = core.createFx(fx.mod, { x: 0, y: 0, angle, ...(pal ? { palette: pal } : {}), ...(S.seed !== undefined ? { seed: S.seed } : {}), ...(S.light !== undefined ? { light: S.light } : {}), ...(S.opts || {}) });
    let tick = 0; const row = [];
    for (const ts of times) {
      const want = Math.round(ts / TICK);
      if (want > tick) { inst.update((want - tick) * TICK); tick = want; }
      core.clearFrame(frame);
      if (S.layer) inst.draw(frame, S.layer); else inst.draw(frame);
      const c = frame.color.slice(), l = frame.light.slice();
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const i = y * fw + x; if (!c[i] && !(l[i] & 0xffffff)) continue;
        // toạ độ trong hệ hiệu ứng chưa xoay: ngoài khung cắt thì bỏ, sát mép thì ánh sáng tắt dần (khỏi lộ khung vuông)
        const wx = x + fox + 0.5, wy = y + foy + 0.5, lx = wx * cs + wy * sn, ly = -wx * sn + wy * cs;
        const e = Math.min(lx - box[0], box[2] - lx, ly - box[1], box[3] - ly);
        if (e <= 0) { c[i] = 0; l[i] = 0; continue; }
        if (e < E && (l[i] & 0xffffff)) { const k = smooth(e / E), v = l[i]; l[i] = (255 << 24) | (Math.round(((v >>> 16) & 255) * k) << 16) | (Math.round(((v >>> 8) & 255) * k) << 8) | Math.round((v & 255) * k); }
        const v = l[i];
        if ((c[i] >>> 24) || (v & 255) > LT || ((v >>> 8) & 255) > LT || ((v >>> 16) & 255) > LT) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      }
      row.push({ c, l });
    }
    cells.push(row);
  }
  if (bx1 < 0) throw new Error(`${name}: không vẽ ra gì`);
  const pad = S.pad ?? 1; bx0 = Math.max(0, bx0 - pad); by0 = Math.max(0, by0 - pad); bx1 = Math.min(fw - 1, bx1 + pad); by1 = Math.min(fh - 1, by1 + pad);
  const w = bx1 - bx0 + 1, h = by1 - by0 + 1;
  const cut = buf => { const o = new Uint32Array(w * h); for (let y = 0; y < h; y++) o.set(buf.subarray((y + by0) * fw + bx0, (y + by0) * fw + bx0 + w), y * w); return o; };
  let lit = false;
  for (const row of cells) for (const q of row) { q.c = cut(q.c); q.l = cut(q.l); if (!lit) for (let i = 0; i < q.l.length; i++) if (q.l[i] & 0xffffff) { lit = true; break; } }
  return { name, S, fx, w, h, n, dirs, cells, lit, fps, times: S.times ? times.map(t => +(t - times[0]).toFixed(4)) : null,
    dur: +(S.times ? (S.end ?? times[n - 1] + (times[n - 1] - (times[n - 2] ?? 0))) - times[0] : n / fps).toFixed(4),
    loop: S.loop ?? meta.loop, anchor: [-fox - bx0, -foy - by0] };
}

/** Xếp ô thành tấm lưới: mỗi hướng một dải, dải dài quá MAXW thì xuống hàng. layer 'c' màu, 'l' sáng (s: thu nhỏ lớp sáng s lần). */
function atlas(r, layer, s = 1) {
  const cw = Math.ceil(r.w / s), ch = Math.ceil(r.h / s), cols = Math.max(1, Math.min(r.n, Math.floor(MAXW / cw))), wrap = Math.ceil(r.n / cols);
  const AW = cw * cols, AH = ch * wrap * r.dirs, out = new Uint8ClampedArray(AW * AH * 4);
  r.cells.forEach((row, d) => row.forEach((q, f) => {
    const X = (f % cols) * cw, Y = (d * wrap + Math.floor(f / cols)) * ch, src = q[layer];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      let R = 0, G = 0, B = 0, A = 0;
      if (layer === 'c') { const v = src[y * r.w + x]; R = v & 255; G = (v >>> 8) & 255; B = (v >>> 16) & 255; A = v >>> 24; }
      else {   // lớp sáng: trung bình ô s×s; alpha 255 chỗ có sáng (vẽ 'lighter' là cộng thẳng RGB)
        let k = 0;
        for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const sx = x * s + xx, sy = y * s + yy; if (sx < r.w && sy < r.h) { const v = src[sy * r.w + sx]; R += v & 255; G += (v >>> 8) & 255; B += (v >>> 16) & 255; } k++; }
        R = Math.round(R / k); G = Math.round(G / k); B = Math.round(B / k); A = R + G + B > 0 ? 255 : 0;
      }
      const o = ((Y + y) * AW + X + x) * 4; out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = A;
    }
  }));
  return { png: encodePNG(AW, AH, out), cw, ch, cols, rows: wrap * r.dirs };
}

// Bảng xem thử: khung của hướng đầu trên ba nền (tối, cỏ, tuyết) có cộng lớp sáng như game; hình nhiều hướng thêm một hàng mỗi hướng.
const BGS = { toi: [21, 19, 29], co: [92, 140, 96], tuyet: [222, 232, 238] };
function sheet(r, zoom = 2, max = 14) {
  const idx = r.n <= max ? [...Array(r.n).keys()] : Array.from({ length: max }, (_, i) => Math.round(i * (r.n - 1) / (max - 1)));
  const bgs = Object.entries(BGS), rows = bgs.length + (r.dirs > 1 ? r.dirs - 1 : 0), gap = 2, cw = r.w * zoom, ch = r.h * zoom;
  const img = lib.canvas(gap + idx.length * (cw + gap), 14 + rows * (ch + gap), [8, 8, 12, 255]);
  img.text(`${r.name}  ${r.S.fx}  ${r.w}x${r.h}  ${r.n}F  ${r.dur}S  ${r.dirs > 1 ? r.dirs + ' HUONG' : ''} ${r.loop ? 'LAP' : ''}`, gap, 3, 2, [240, 220, 140]);
  const cell = (q, bg, lk) => {
    const o = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const c = q.c[y * r.w + x], l = q.l[y * r.w + x], a = (c >>> 24) / 255;
      const R = Math.min(255, (c & 255) * a + bg[0] * (1 - a) + (l & 255) * lk), G = Math.min(255, ((c >>> 8) & 255) * a + bg[1] * (1 - a) + ((l >>> 8) & 255) * lk), B = Math.min(255, ((c >>> 16) & 255) * a + bg[2] * (1 - a) + ((l >>> 16) & 255) * lk);
      for (let yy = 0; yy < zoom; yy++) for (let xx = 0; xx < zoom; xx++) { const i = ((y * zoom + yy) * cw + x * zoom + xx) * 4; o[i] = R; o[i + 1] = G; o[i + 2] = B; o[i + 3] = 255; }
    }
    return o;
  };
  let j = 0;
  for (const [k, bg] of bgs) { idx.forEach((f, i) => img.paste(cell(r.cells[0][f], bg, k === 'toi' ? 1 : 0.55), cw, ch, gap + i * (cw + gap), 14 + j * (ch + gap))); j++; }
  for (let d = 1; d < r.dirs; d++) { idx.forEach((f, i) => img.paste(cell(r.cells[d][f], BGS.toi, 1), cw, ch, gap + i * (cw + gap), 14 + j * (ch + gap))); j++; }
  return img.png();
}

mkdirSync(OUT, { recursive: true });
const metaP = join(OUT, 'meta.json'), META = existsSync(metaP) ? JSON.parse(readFileSync(metaP, 'utf8')) : {};
const list = names.length ? names : Object.keys(SPRITES);
let total = 0;
for (const name of list) {
  const S = SPRITES[name];
  if (!S) { console.error('không có hình ' + name + ' trong sprites.mjs'); process.exitCode = 1; continue; }
  const t0 = Date.now(), r = await render(name, S);
  if (F.sheet) { mkdirSync(F.sheet, { recursive: true }); writeFileSync(join(F.sheet, name + '.png'), sheet(r, +(F.zoom ?? 2), +(F.max ?? 14))); }
  if (F.onlySheet) { console.log(`${name}: ${r.w}x${r.h} ${r.n} khung (chỉ bảng xem)`); continue; }
  const C = atlas(r, 'c'), ls = S.ls ?? (Math.max(r.w, r.h) > 72 ? 2 : 1), L = r.lit && S.lit !== false ? atlas(r, 'l', ls) : null;
  writeFileSync(join(OUT, name + '.png'), C.png);
  if (L) writeFileSync(join(OUT, name + '.l.png'), L.png);
  META[name] = { w: r.w, h: r.h, cols: C.cols, rows: C.rows, n: r.n, dirs: r.dirs, fps: r.fps, ...(r.times ? { times: r.times } : {}), dur: r.dur, loop: !!r.loop, anchor: r.anchor, k: S.k ?? 0.5,
    ...(L ? { lit: { w: L.cw, h: L.ch, s: ls } } : {}), fx: S.fx };
  total += C.png.length + (L ? L.png.length : 0);
  console.log(`${name}: ${S.fx} ${r.w}x${r.h} × ${r.n} khung${r.dirs > 1 ? ' × ' + r.dirs + ' hướng' : ''}, màu ${(C.png.length / 1024).toFixed(1)} KB${L ? ', sáng ' + (L.png.length / 1024).toFixed(1) + ' KB' : ''}, ${Date.now() - t0} ms`);
}
if (!F.onlySheet) {
  for (const k of Object.keys(META)) if (!SPRITES[k]) delete META[k];
  writeFileSync(metaP, JSON.stringify(Object.fromEntries(Object.entries(META).sort()), null, 1) + '\n');
  console.log(`xong ${list.length} hình, ${(total / 1024).toFixed(0)} KB`);
}
