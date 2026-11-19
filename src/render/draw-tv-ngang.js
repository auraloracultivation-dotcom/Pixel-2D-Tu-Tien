// Tinh đồ màn ngang vẽ giống hệt video tinh-do-ngang.mp4 (chủ dự án 19/11/2026 04:08 "chả giống video", 04:09 "làm đi").
// Khung thiết kế 1920×1080 như video, co theo màn; màn rộng hơn 16:9 thì khung rộng ra, mây và tinh thể hai mép dạt ra theo mép.
// Tinh cầu đứng đúng chỗ ảnh mẫu (data/starmap.json → tv.ngang.pos), mặt trăng quay quanh mẹ 1 vòng mỗi 24 giây, khai hoang trên vòng
// theo cấp (cấp cao ra rìa, vượt rìa thì kết giới nở theo). Nền trong kết giới: sao, quỹ đạo chấm, hạt linh khí toả từ Linh Nhật;
// ngoài: ma giới (draw-tv-ma-ngang.js), mây / tinh thể SpriteCook, kết giới bị ma tộc công kích (draw-tv-ket-gioi.js). Màn dọc giữ draw-starmap.js.
import { dangerOf } from '../game/starmap.js';
import { spriteImage } from './sprites.js';
import { drawMangSky } from './draw-mang-sky.js';
import { sprite, khDeco, tongMau } from './draw-starmap.js';
import { maNgang } from './draw-tv-ma-ngang.js';
import { drawKetGioi } from './draw-tv-ket-gioi.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180;
let low = null;
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Tên ngắn, không khung (chủ dự án 04:27): chữ viền tối; tên đè tên đã đặt thì bỏ (trừ chỗ đang đứng, đang chọn)
function chu(ctx, list, px) {
  ctx.font = `${px}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const boxes = [];
  for (const l of list.sort((a, b) => a.pri - b.pri)) {
    const f = l.small ? Math.max(8, Math.round(px * 0.8)) : px, w = (ctx.font = `${f}px "Unifont VN", system-ui`, ctx.measureText(l.text).width + 4), h = f * 1.2;
    // chỗ đặt tên: dưới hình; vướng tên khác thì thử trên hình, bên phải, bên trái, thấp hơn (chủ dự án 19/11/2026 11:07: vài tinh cầu không hiện tên)
    const up = l.top != null ? l.top - h : l.y - h * 2, side = (l.r || h) + w / 2 + 2;
    const tries = l.must ? [[l.x, l.y]] : [[l.x, l.y], [l.x, up], [l.x + side, l.y - h], [l.x - side, l.y - h], [l.x, l.y + h]];
    let at = null;
    const cw = ctx.canvas.width / (ctx.getTransform().a || 1);
    for (const [x0, y] of tries) {
      const x = Math.min(cw - w / 2 - 2, Math.max(w / 2 + 2, x0));   // không cắt chữ ở mép
      const bx = { x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h };
      if (l.must || !boxes.some(o => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) { at = [x, y]; boxes.push(bx); break; }
    }
    if (!at) continue;
    ctx.lineWidth = Math.max(2, f * 0.3); ctx.strokeStyle = 'rgba(14,8,24,.95)'; ctx.strokeText(l.text, at[0], at[1]);
    ctx.fillStyle = l.color; ctx.fillText(l.text, at[0], at[1]);
  }
}

function put(ctx, art, id, x, y, k, flip) {
  const s = art[id], im = s && spriteImage(s); if (!im) return;
  const w = s.w * k, h = s.h * k;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, 0, 0, s.w, s.h, Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h));
  ctx.restore();
}

// Nền trong kết giới (tấm nhỏ = thiết kế / 3): trời tối, sao nhấp nháy, quỹ đạo chấm quanh Linh Nhật, hạt linh khí bay ra
function trong(c, Wl, Hl, ox, oy, sun, e, t) {
  c.fillStyle = '#0c0a1e'; c.fillRect(0, 0, Wl, Hl);
  const a = t / 24 * TAU;
  for (let i = 0; i < 380 * Wl / 640; i++) {
    const x = Math.floor(hash(i) * Wl), y = Math.floor(hash(i + 1) * Hl), s = hash(i + 2);
    if (Math.sin(a * 2 + s * 40) <= -0.3) continue;
    c.fillStyle = s > 0.85 ? '#fff4d8' : '#968cc8'; c.fillRect(x, y, 1, 1);
    if (s > 0.97) { c.fillStyle = '#c8b4ff'; c.fillRect(x - 2, y, 5, 1); c.fillRect(x, y - 2, 1, 5); }
  }
  c.fillStyle = 'rgb(120,100,80)';
  for (let k = 1; k < 8; k++) {
    const rx = (95 + k * 92) / 3, ry = rx * 0.6, n = Math.floor(rx * 1.5);
    for (let j = 0; j < n; j += 2) { const g = j / n * TAU, x = sun[0] / 3 + Math.cos(g) * rx, y = sun[1] / 3 + Math.sin(g) * ry; if (e(x, y) < 0.93) c.fillRect(Math.round(x), Math.round(y), 1, 1); }
  }
  for (let i = 0; i < 90; i++) {   // hạt linh khí từ Linh Nhật ra tới kết giới
    const g = hash(i + 50) * TAU, q = (hash(i + 51) + t / 24 * (0.8 + hash(i + 52) * 0.6)) % 1;
    c.fillStyle = q < 0.4 ? '#faf0aa' : '#96dc5a';
    c.fillRect(Math.round(sun[0] / 3 + Math.cos(g) * (130 + q * 596) / 3), Math.round(sun[1] / 3 + Math.sin(g) * (80 + q * 365) / 3), 1, 1);
  }
}

// st như drawStarmap; trả về chỗ chạm được (toạ độ màn)
export function drawNgang(ctx, w, h, sm, bodies, st) {
  const T = sm.tv, N = T.ngang, art = st.art || {}, t = st.t, z = st.view?.z || 1;
  const Wd = Math.max(w < h ? 1560 : 1920, 1080 * w / h),   // màn dọc: cắt bớt hai mép cho kết giới to ra
    Hd = Math.max(1080, (w < h ? 1560 : 1920) * h / w), ox = (Wd - 1920) / 2, oy = (Hd - 1080) / 2;
  const s = Math.min(w / Wd, h / Hd) * z, tx = w / 2 + (st.view?.x || 0) - Wd / 2 * s, ty = h / 2 + (st.view?.y || 0) - Hd / 2 * s;
  // Màn rộng / cao hơn 16:9: mây, tinh thể ở mép vẽ thêm một bản dạt ra sát mép màn, khỏi lộ chỗ trống
  const mep = (x, y) => {
    const L = [], px = Math.max(0, ox), dx = x < 480 ? -px : x > 1440 ? px : 0, dy = y < 200 ? -oy : y > 880 ? oy : 0;
    if (Math.abs(dy) > 40) { L.push([x + ox, y + oy + dy]); if (Math.abs(dy) > 160) L.push([x + ox, y + oy + dy / 2]); }   // màn dọc: lấp trên dưới
    if (Math.abs(dx) > 40) L.push([x + ox + dx, y + oy]);
    L.push([x + ox, y + oy]); return L; };
  // Khai hoang: vòng theo cấp; cấp cao vượt rìa thì kết giới nở theo
  const kh = bodies.filter(b => b.kh), khR = cap => N.kh[0] + N.kh[1] * (Math.max(1, cap) - 1);
  const no = Math.max(1, ...kh.map(b => (khR(b.cap) + 0.1) / 0.92));
  const V = N.vong, cx = V.cx + ox, cy = V.cy + oy, vrx = V.rx * no, vry = V.ry * no;
  const e = (x, y) => Math.hypot((x - cx / 3) / (240 * no), (y - cy / 3) / (150 * no));
  ctx.save(); ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([s, 0, 0, s, tx, ty])));
  ctx.imageSmoothingEnabled = false;
  // Nền: ma giới ngoài, trời sao trong (cắt theo elip kết giới)
  const Wl = Math.ceil(Wd / 3), Hl = Math.ceil(Hd / 3);
  ctx.drawImage(maNgang(art, Wl, Hl, cx / 3, cy / 3, 240 * no, 150 * no, t, ox / 3), 0, 0, Wl * 3, Hl * 3);
  if (!low) low = document.createElement('canvas');
  if (low.width !== Wl || low.height !== Hl) { low.width = Wl; low.height = Hl; }
  const sun = N.pos.sun, c = low.getContext('2d');
  trong(c, Wl, Hl, ox, oy, [sun[0] + ox, sun[1] + oy], e, t);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 720 * no, 450 * no, 0, 0, TAU); ctx.clip();
  ctx.drawImage(low, 0, 0, Wl * 3, Hl * 3); ctx.restore();
  // Mây, tinh thể ma khí (SpriteCook) đúng chỗ video
  N.may.forEach(([id, x, y, k, lat], i) => { for (const [X, Y] of mep(x, y)) put(ctx, art, 'tv.' + id, X + 10 * Math.sin(t / 24 * TAU + i), Y + 4 * Math.sin(t / 12 * TAU + i * 2), k, !!lat); });
  if (oy > 40) (N.may_doc || []).forEach(([id, x, y, k, lat], i) => put(ctx, art, 'tv.' + id, x + ox + 8 * Math.sin(t / 24 * TAU + i), y + oy + 3 * Math.sin(t / 12 * TAU + i), k, !!lat));   // màn dọc: mây lấp trên dưới
  N.tinh_the.forEach(([x, y, ph]) => { for (const [X, Y] of mep(x, y)) put(ctx, art, 'tv.tinh-the', X, Y + 8 * Math.sin(t / 24 * TAU + ph), 1.3); });
  drawKetGioi(ctx, art, T, { cx, cy, rx: vrx, ry: vry }, t, 3, N.tru_k * 756 / vrx);
  // Thiên thể
  const pts = [], at = {}, a = t / 24 * TAU;
  for (const b of bodies) {
    if (b.parent) continue;
    let q;
    if (b.kh) { const r = khR(b.cap), g = b.angle * RAD; q = { b, x: cx + Math.cos(g) * V.rx * r, y: cy + Math.sin(g) * V.ry * r, D: N.kh_d[0] + N.kh_d[1] * (b.cap || 1) }; }
    else { const p = N.pos[b.sun ? 'sun' : b.id]; if (!p) continue; q = { b, x: p[0] + ox, y: p[1] + oy, D: p[2] }; }
    pts.push(q); at[b.id] = q;
  }
  for (const b of bodies) {
    const m = b.parent && N.trang[b.map], pm = m && at[m[0]];
    if (!pm) continue;
    const g = m[2] + m[4] * a, r = pm.D / 2 * m[1] + m[3] / 2;
    pts.push({ b, x: pm.x + Math.cos(g) * r, y: pm.y + Math.sin(g) * r * 0.55, D: m[3], back: Math.sin(g) < 0, zz: pm.y });
  }
  const order = pts.slice().sort((p, q) => (p.zz ?? p.y) - (q.zz ?? q.y) || (p.b.parent ? (p.back ? -1 : 1) : 0) - (q.b.parent ? (q.back ? -1 : 1) : 0));
  for (const p of order) {
    const dim = !p.b.sun && p.b.kind !== 'lost' && !st.seen(p.b);
    if (p.b.kh) khDeco(ctx, p.b, p.x, p.y, p.D, t, true);
    sprite(ctx, art, p.b, p.x, p.y, p.D * 1.18 / 1.1, t, dim);
    if (p.b.kh) khDeco(ctx, p.b, p.x, p.y, p.D, t, false);
    if (p.b.id === 'thien-kiem-phong') {   // quầng xanh và kiếm trấn phía trên như video
      ctx.fillStyle = '#78e65a';
      for (let j = 0; j < 40; j++) { const g = j / 40 * TAU + a * 4; ctx.fillRect(Math.round(p.x + Math.cos(g) * p.D * 0.78), Math.round(p.y + 8 + Math.sin(g) * p.D * 0.3), 3, 3); }
      put(ctx, art, 'tv.tru', p.x, p.y - p.D * 0.95 + 3 * Math.sin(a * 8), 0.6);
    }
  }
  for (const p of pts) {   // chỗ đang đứng (vàng nhấp nháy), chỗ đang chọn (trắng đứt)
    const here = p.b.map && p.b.map === st.here, sel = p.b.id === st.sel;
    if (!here && !sel) continue;
    const rr = p.D * 0.62 + (here ? 8 + (Math.sin(t * 4) > 0 ? 4 : 0) : 14);
    ctx.fillStyle = here ? '#ffd24a' : '#ffffff';
    for (let i = 0; i < 40; i++) if (here || i % 3) { const g = i / 40 * TAU; ctx.fillRect(Math.round(p.x + Math.cos(g) * rr) - 2, Math.round(p.y + Math.sin(g) * rr) - 2, 4, 4); }
  }
  ctx.restore();
  // Ra toạ độ màn: chỗ chạm, rắn chín đầu, tên
  const S = (x, y) => [tx + x * s, ty + y * s], out = pts.map(p => { const [x, y] = S(p.x, p.y); return { b: p.b, x, y, r: Math.max(8, p.D * 0.5 * s) }; }), labels = [];
  if (st.mang) {
    const mv = out.find(p => p.b.id === 'ma-vuong'), [ccx, ccy] = S(cx, cy);
    const m = drawMangSky(ctx, st.mang.spr, st.mang.sky, { cx: ccx, cy: ccy, rx: vrx * s * 1.3, ry: vry * s * 1.3 }, mv ? mv.r : 20, t);
    if (m && st.mang.name) labels.push({ text: N.ten['thon-thien-mang'] || st.mang.name, x: m.x, y: m.y + m.r * 0.95, color: '#e0a8ff', pri: 2 });
    if (m) out.push({ b: { id: 'thon-thien-mang', mang: true, name: st.mang.name }, x: m.x, y: m.y, r: m.r * 0.8 });
  }
  for (const p of out) {
    const b = p.b, here = b.map && b.map === st.here, sel = b.id === st.sel;
    if (b.mang) continue;
    if (here) labels.push({ text: sm.texts.here, x: p.x, y: p.y - p.r - N.chu * s * 1.6 - 4, color: '#ffd24a', pri: 0, must: true });
    const seen = st.seen(b), dg = seen && dangerOf(b, st.realm);   // mặt trăng cũng hiện tên (chữ nhỏ hơn, nhường tinh cầu lớn)
    labels.push({ text: seen ? (N.ten[b.sun ? 'sun' : b.id] || b.name) + (b.kh && !b.trong && b.cap ? ` ${b.cap}` : '') : '?', x: p.x, y: p.y + p.r * 1.05, top: p.y - p.r * 1.05, r: p.r, small: !!b.parent && !sel && !here && z < 1.8,
      color: dg ? st.hint[dg] : b.sun ? '#ffe48a' : b.kh && !b.trong ? tongMau(b) : '#f4ead8',
      pri: here || sel ? 1 : b.sun ? 5 : b.parent ? 20 : 10 - (b.size || 0) / 2, must: here || sel });
  }
  chu(ctx, labels, Math.max(9, Math.round(N.chu * s)));
  return out;
}
