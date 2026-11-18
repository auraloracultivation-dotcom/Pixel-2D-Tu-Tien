// Tinh đồ Thiên Kiếm Tinh Hệ (bố cục theo ảnh mẫu của chủ dự án 19/11/2026): Linh Nhật giữa, quỹ đạo elip, kết giới linh khí bọc cả
// tinh hệ, ngoài là ma giới. Nền (sao, quỹ đạo, ma giới) vẽ trên tấm nhỏ rồi phóng nguyên (mỗi điểm = P điểm màn); tinh cầu, mặt trăng,
// kết giới, mây ma khí là hình SpriteCook tv.* (tools/art/tinh_vuc_game.py) vẽ ở độ phân giải thật, không làm mịn. Tên vẽ sau cùng.
// Khai hoang: hình theo loại đất, biến tấu theo mã tinh cầu (lật, lệch sắc), cỡ theo cấp, cấp 3+ có vành, có tông thì cắm cờ.
import { flatPos, orbitR, dangerOf, rimOrbit } from '../game/starmap.js';
import { drawMangSky } from './draw-mang-sky.js';
import { spriteImage } from './sprites.js';
import { drawMaGioi } from './draw-tv-ma-gioi.js';
import { drawNgoai, drawKetGioi } from './draw-tv-ket-gioi.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180;
let low = null;
const hue = {};   // ảnh khai hoang đã lệch sắc / lật, theo mã tinh cầu

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function hashStr(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h; }
const tongMau = b => `hsl(${hashStr(b.desc || b.name) % 360},70%,62%)`;   // màu cờ / viền tên theo tông (chưa có màu tông trên máy chủ)
const px = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

// Khung nhìn: elip kết giới (tỉ lệ tv.tilt) vừa khung, chừa chỗ cho ma giới
export function viewOf(sm, w, h) {
  const T = sm.tv, k = T?.fit ?? 0.84, tilt = Math.max(T?.tilt ?? sm.tilt, Math.min(1, h / w * 0.55));   // màn dọc: tinh hệ tròn ra cho đầy khung
  const rx = Math.min(w / 2 * k, h / 2 * k / tilt);
  return { cx: w / 2, cy: h / 2, rx, ry: rx * tilt };
}

function stars(ctx, w, h, n, t) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i) * w), y = Math.floor(hash(i + 1) * h);
    if (Math.sin(t * (0.5 + hash(i + 9)) + i * 3) <= -0.2) continue;
    const c = hash(i + 5) > 0.7 ? '#fff4d8' : hash(i + 5) > 0.35 ? '#e8d8c8' : '#9a8aa8';
    px(ctx, c, x, y);
    if (hash(i + 3) > 0.94) for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, '#c8b8e8', x + a, y + b);
  }
}

// Ảnh khai hoang: lật ngang theo mã, xoay sắc ±14°, bỏ trống thì nhạt và tối (làm một lần, giữ trong hue)
function khImage(spr, im, b) {
  const key = b.map + (b.trong ? ':t' : '');
  if (hue[key]) return hue[key];
  const c = document.createElement('canvas'); c.width = spr.w; c.height = spr.h;
  const g = c.getContext('2d'), h = hashStr(b.map);
  if (h % 2) { g.translate(spr.w, 0); g.scale(-1, 1); }
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, spr.w, spr.h), a = ((h % 29) - 14) * RAD, cos = Math.cos(a), sin = Math.sin(a);
  const m = [0.299 + 0.701 * cos + 0.168 * sin, 0.587 - 0.587 * cos + 0.330 * sin, 0.114 - 0.114 * cos - 0.497 * sin,
    0.299 - 0.299 * cos - 0.328 * sin, 0.587 + 0.413 * cos + 0.035 * sin, 0.114 - 0.114 * cos + 0.292 * sin,
    0.299 - 0.3 * cos + 1.25 * sin, 0.587 - 0.588 * cos - 1.05 * sin, 0.114 + 0.886 * cos - 0.203 * sin];
  for (let i = 0; i < d.data.length; i += 4) {
    let [r, gg, bb] = [d.data[i], d.data[i + 1], d.data[i + 2]];
    [r, gg, bb] = [m[0] * r + m[1] * gg + m[2] * bb, m[3] * r + m[4] * gg + m[5] * bb, m[6] * r + m[7] * gg + m[8] * bb];
    if (b.trong) { const x = (r + gg + bb) / 3; [r, gg, bb] = [r, gg, bb].map(v => (v * 0.55 + x * 0.45) * 0.78); }
    d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = bb;
  }
  g.putImageData(d, 0, 0);
  return (hue[key] = c);
}

// Vẽ hình thiên thể: đường kính D trên màn; khung theo giờ (8 khung/giây như SpriteCook, chậm lại còn 4)
function sprite(ctx, art, b, x, y, D, t, dim) {
  const s = art[b.kh ? 'tv.kh.' + (b.ground || 'co') : b.parent ? 'tv.trang.' + b.map : 'tv.' + (b.sun ? 'sun' : b.id)];
  const im = s && spriteImage(s);
  if (!im) return false;
  const src = b.kh ? khImage(s, im, b) : im, f = b.kh ? 0 : Math.floor(t * 4) % s.frames, k = D / s.w * 1.1;
  if (dim) ctx.globalAlpha = 0.35;
  ctx.drawImage(src, b.kh ? 0 : f * s.w, 0, s.w, s.h, Math.round(x - s.w * k / 2), Math.round(y - s.h * k / 2), Math.round(s.w * k), Math.round(s.h * k));
  ctx.globalAlpha = 1;
  return true;
}

// Trang trí khai hoang: vành sáng (cấp 3+), quầng (cấp 5), cờ tông môn
function khDeco(ctx, b, x, y, D, t, back) {
  const cap = b.cap || 1, ph = hashStr(b.map) % 100 / 16;
  if (b.trong) return;
  const P = Math.max(1, Math.round(D / 40));
  if (cap >= 3) for (let j = 0; j < 36; j++) {
    const g = j / 36 * TAU + t * 0.25 + ph;
    if ((Math.sin(g) < 0) !== back) continue;
    px(ctx, back ? '#aa966e' : '#ffdc8c', x + Math.cos(g) * D * 0.85, y + Math.sin(g) * D * 0.22, P, P);
  }
  if (back) return;
  if (cap >= 5) for (let j = 0; j < 28; j++) if (Math.sin(t * 2 + j * 1.7 + ph) > 0.2) { const g = j / 28 * TAU; px(ctx, '#ffe28c', x + Math.cos(g) * D * 0.68, y + Math.sin(g) * D * 0.68, P, P); }
  const cx = x + D * 0.12, cy = y - D * 0.5, col = tongMau(b);
  px(ctx, '#dcdce6', cx, cy - 7 * P, P, 8 * P);
  for (let k = 0; k < 5; k++) px(ctx, col, cx + P + k * P, cy - 7 * P + Math.round(Math.sin(t * 6 + k + ph) * 0.6) * P, P, 3 * P);
}

function orbitDots(ctx, v, r) {
  const n = Math.max(24, Math.round((v.rx + v.ry) * r * 0.9));
  for (let i = 0; i < n; i += 2) { const a = i / n * TAU; px(ctx, 'rgba(240,200,140,.3)', v.cx + Math.cos(a) * r * v.rx, v.cy + Math.sin(a) * r * v.ry); }
}

// Bảng tên viền vàng như ảnh mẫu; khai hoang viền theo màu tông
function plaque(ctx, l, L) {
  ctx.font = '10px "Unifont VN", system-ui';
  const w = ctx.measureText(l.text).width + 8, x0 = Math.round(l.x - w / 2), y0 = Math.round(l.y);
  ctx.fillStyle = L.fill; ctx.fillRect(x0, y0, w, 14);
  ctx.strokeStyle = l.edge || L.edge; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 0.75, y0 + 0.75, w - 1.5, 12.5);
  ctx.fillStyle = l.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.text, l.x, y0 + 7.5);
}
function placeLabels(ctx, list, L) {
  ctx.font = '10px "Unifont VN", system-ui';
  const boxes = [];
  for (const l of list.sort((a, b) => a.pri - b.pri)) {
    const w = ctx.measureText(l.text).width + 12, bx = { x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y, y1: l.y + 16 };
    if (!l.must && boxes.some(o => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) continue;
    boxes.push(bx); plaque(ctx, l, L);
  }
}

// st: { min, t, realm, here, sel, seen(b), hint, view, mang }; trả về chỗ chạm được (toạ độ màn hình)
export function drawStarmap(ctx, w, h, sm, bodies, st) {
  const T = sm.tv, art = st.art || {}, P = Math.max(2, Math.round(Math.min(w, h) / 200)), W = Math.ceil(w / P), H = Math.ceil(h / P), t = st.t, z = st.view?.z || 1;
  const v = viewOf(sm, w, h);
  if (st.view) { v.cx += st.view.x; v.cy += st.view.y; v.rx *= z; v.ry *= z; }
  const rim = orbitR(sm, rimOrbit(sm, bodies)), u = { cx: v.cx, cy: v.cy, rx: v.rx / rim, ry: v.ry / rim };   // u: đơn vị quỹ đạo → màn
  if (!low) low = document.createElement('canvas');
  if (low.width !== W || low.height !== H) { low.width = W; low.height = H; }
  const c = low.getContext('2d');
  c.imageSmoothingEnabled = false;
  drawMaGioi(c, W, H, t);
  c.save(); c.beginPath(); c.ellipse(v.cx / P, v.cy / P, v.rx / P, v.ry / P, 0, 0, TAU); c.clip();   // trong kết giới: trời sao
  c.fillStyle = '#0c0a1e'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 700; i++) if ((i * 7) % 3) px(c, '#121032', hash(i + 99) * W, hash(i + 77) * H, 2, 1);
  stars(c, W, H, Math.round(sm.stars * W * H / 40000), t);
  const lo = { cx: u.cx / P, cy: u.cy / P, rx: u.rx / P, ry: u.ry / P };
  const maxO = Math.max(...sm.bodies.filter(b => !b.kh).map(b => b.orbit));
  for (let o = 1; o <= maxO; o++) orbitDots(c, lo, orbitR(sm, o));
  c.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, W * P, H * P);
  drawNgoai(ctx, art, T, v, t);
  drawKetGioi(ctx, art, T, v, t, P);
  // Vị trí: tinh cầu theo quỹ đạo (giờ thật), mặt trăng quanh mẹ trên màn theo cỡ mẹ, nửa sau quỹ đạo khuất sau mẹ
  const Dof = b => v.rx * (b.sun ? T.d_sun : b.kh ? T.d_kh[0] + T.d_kh[1] * (b.cap || 1) : b.parent ? T.d_moon : T.d_base + T.d_size * b.size);
  const pts = [], at = {};
  for (const b of bodies) {
    if (b.parent) continue;
    const p = flatPos(sm, b, st.min), q = { b, x: u.cx + p.x * u.rx, y: u.cy + p.y * u.ry, D: Dof(b) };
    pts.push(q); at[b.id] = q;
  }
  for (const b of bodies) {
    if (!b.parent) continue;
    const m = at[b.parent.id]; if (!m) continue;
    const g = (b.angle + b.spin * st.min) * RAD, D = Dof(b), r = m.D / 2 + D / 2 + m.D * 0.1 * b.dist;
    pts.push({ b, x: m.x + Math.cos(g) * r, y: m.y + Math.sin(g) * r * 0.55, D, back: Math.sin(g) < 0, z: m.y });
  }
  const order = pts.slice().sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y) || (a.b.parent ? (a.back ? -1 : 1) : 0) - (b.b.parent ? (b.back ? -1 : 1) : 0));
  for (const p of order) {
    const dim = !p.b.sun && p.b.kind !== 'lost' && !st.seen(p.b);
    if (p.b.kh) khDeco(ctx, p.b, p.x, p.y, p.D, t, true);
    sprite(ctx, art, p.b, p.x, p.y, p.D, t, dim);
    if (p.b.kh) khDeco(ctx, p.b, p.x, p.y, p.D, t, false);
  }
  for (const p of pts) {   // vòng chỉ chỗ đang đứng (vàng nhấp nháy) và chỗ đang chọn (trắng đứt)
    const here = p.b.map && p.b.map === st.here, sel = p.b.id === st.sel, n = 32;
    if (!here && !sel) continue;
    const rr = p.D * 0.62 + (here ? 3 + (Math.sin(t * 4) > 0 ? 2 : 0) : 6);
    for (let i = 0; i < n; i++) if (here || i % 3) { const a = i / n * TAU; px(ctx, here ? '#ffd24a' : '#ffffff', p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, 2, 2); }
  }
  const out = pts.map(p => ({ b: p.b, x: p.x, y: p.y, r: Math.max(6, p.D * 0.5) })), labels = [];
  if (st.mang) {   // Cửu Đầu Thôn Thiên Mãng lượn ngoài kết giới (src/render/draw-mang-sky.js), cỡ theo Ma Vương
    const mv = out.find(p => p.b.id === 'ma-vuong'), m = drawMangSky(ctx, st.mang.spr, st.mang.sky, { cx: v.cx, cy: v.cy, rx: v.rx * 1.3, ry: v.ry * 1.3 }, mv ? mv.r : 20, t);   // sky.ring 0,9 ứng với ma khí cũ: nhân 1,3 cho ra ngoài kết giới
    if (m && st.mang.name) labels.push({ text: st.mang.name, x: m.x, y: m.y + m.r * 0.95, color: '#e0a8ff', pri: 2 });
    if (m) out.push({ b: { id: 'thon-thien-mang', mang: true, name: st.mang.name }, x: m.x, y: m.y, r: m.r * 0.8 });
  }
  for (const p of out) {
    const b = p.b, here = b.map && b.map === st.here, sel = b.id === st.sel;
    if (b.mang) continue;
    if (here) labels.push({ text: sm.texts.here, x: p.x, y: p.y - p.r - 20, color: '#ffd24a', pri: 0, must: true });
    if (b.parent && !sel && !here && z < 1.8) continue;   // mặt trăng chỉ hiện tên khi chọn hoặc phóng to
    const seen = st.seen(b), dg = seen && dangerOf(b, st.realm);
    labels.push({ text: seen ? b.name + (b.kh && !b.trong && b.cap ? ` · cấp ${b.cap}` : '') : sm.texts.unknown, x: p.x, y: p.y + p.r + 2,
      color: dg ? st.hint[dg] : b.sun ? '#ffe48a' : '#f4ead8', edge: b.kh ? (b.trong ? '#6e6e78' : tongMau(b)) : null,
      pri: here || sel ? 1 : b.sun ? 30 : b.parent ? 20 : 10 - (b.size || 0) / 2, must: here || sel });
  }
  placeLabels(ctx, labels, T.labels);
  return out;
}
