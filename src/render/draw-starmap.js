// Vẽ tinh đồ kiểu pixel ấm (chủ dự án thích màu ấm, pixel, không thích kiểu hiện đại): vẽ hình lên một tấm nhỏ rồi phóng nguyên lần
// (mỗi điểm ảnh tinh đồ = P điểm ảnh màn hình, không làm mịn); chữ tên vẽ sau ở độ phân giải thật cho dễ đọc.
import { flatPos, orbitR, dangerOf, REF } from '../game/starmap.js';

const TAU = Math.PI * 2, INK = '#1b1830';
let low = null;

// Khung nhìn: elip vừa khung, không dẹt hơn tilt, không cao hơn hình tròn
export function viewOf(sm, w, h) {
  const pad = 3;
  let rx = w / 2 - pad, ry = h / 2 - pad;
  if (ry > rx) ry = rx;
  if (ry < rx * sm.tilt) rx = ry / sm.tilt;
  return { cx: w / 2, cy: h / 2, rx, ry, s: rx / REF };
}

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function tone(hex, k) {   // k > 0 sáng lên về phía trắng ấm, k < 0 tối đi về phía tím mực
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255], to = k > 0 ? [255, 244, 214] : [27, 24, 48], a = Math.abs(k);
  return `rgb(${c.map((v, i) => Math.round(v + (to[i] - v) * a)).join(',')})`;
}
const px = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

// Hình tròn pixel tô theo từng hàng
function disc(ctx, x, y, r, c) {
  x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); ctx.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
}

function stars(ctx, w, h, n, t) {
  ctx.fillStyle = '#170e22'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i) * w), y = Math.floor(hash(i + 1) * h), on = Math.sin(t * (0.5 + hash(i + 9)) + i * 3) > -0.2;
    if (!on) continue;
    const c = hash(i + 5) > 0.7 ? '#fff4d8' : hash(i + 5) > 0.35 ? '#e8d8c8' : '#9a8aa8';
    px(ctx, c, x, y);
    if (hash(i + 3) > 0.93) { px(ctx, '#c8b8a8', x - 1, y); px(ctx, '#c8b8a8', x + 1, y); px(ctx, '#c8b8a8', x, y - 1); px(ctx, '#c8b8a8', x, y + 1); }
  }
}

function sun(ctx, x, y, r, t) {
  for (const [k, c] of [[3.2, 'rgba(255,170,70,.07)'], [2.5, 'rgba(255,180,80,.12)'], [1.9, 'rgba(255,200,100,.22)'], [1.45, 'rgba(255,220,130,.45)']]) disc(ctx, x, y, r * k, c);
  for (let i = 0; i < 8; i++) {   // tia nắng xoay chậm, từng bậc
    const a = t * 0.12 + i * TAU / 8;
    for (let d = r * 1.3; d < r * (1.9 + 0.25 * Math.sin(t * 1.4 + i)); d += 1) px(ctx, i % 2 ? '#ffd27a' : '#ffe9a8', x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  disc(ctx, x, y, r, '#ffb84a'); disc(ctx, x - r * 0.15, y - r * 0.15, r * 0.75, '#ffd76a'); disc(ctx, x - r * 0.3, y - r * 0.3, r * 0.4, '#fff6d0');
}

// Tinh cầu: ba tông theo hướng Linh Nhật, viền mực
function body(ctx, b, x, y, r, sx, sy, seen, t) {
  x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
  if (b.kind === 'soon' || b.kind === 'boss') disc(ctx, x, y, r * 1.8, `rgba(230,60,70,${(0.16 + 0.1 * Math.sin(t * 2)).toFixed(2)})`);
  if (b.kind === 'tong') for (let i = 0; i < 24; i += 2) { const a = i / 24 * TAU + t * 0.3; px(ctx, '#8ae0ff', x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55); }
  disc(ctx, x, y, r + 1, INK);
  const d = Math.hypot(sx - x, sy - y) || 1, ux = (sx - x) / d, uy = (sy - y) / d, lit = b.kind !== 'lost';
  const base = b.color, hi = tone(base, 0.35), lo = tone(base, -0.45);
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6));
    for (let dx = -hw; dx <= hw; dx++) {
      const k = (dx * ux + dy * uy) / r;
      let c = !lit ? (k < -0.2 ? lo : base) : k > 0.4 ? hi : k < -0.3 ? lo : base;
      if ((b.kind === 'forbidden' || b.kind === 'lost') && Math.abs(dy - Math.round(dx * 0.5)) === 0 && Math.abs(dx) < r * 0.8) c = b.kind === 'lost' ? INK : '#d090ff';   // vết nứt
      ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  if (lit && r > 2) px(ctx, '#fff8e0', x + Math.round(ux * r * 0.5) - 1, y + Math.round(uy * r * 0.5) - 1);   // chấm sáng
  if (!seen) disc(ctx, x, y, r, 'rgba(23,14,34,.6)');
  if (b.kind === 'home' && Math.sin(t * 3) > -0.3) px(ctx, '#ffc85a', x, y);
}

// Vòng ma khí: phủ ngoài một elip gợn sóng (răng cưa pixel), mép tím sáng, đốm ma khí trôi vào
function makhi(ctx, v, mk, w, h, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h);
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, r = mk.from + mk.wave * (Math.sin(a * 5 + t * 0.6) + 0.6 * Math.sin(a * 9 - t * 0.9) + 0.4 * Math.sin(a * 17 + t * 1.7));
    const x = Math.round(v.cx + Math.cos(a) * r * v.rx), y = Math.round(v.cy + Math.sin(a) * r * v.ry);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = mk.color + 'd8'; ctx.fill('evenodd');
  ctx.strokeStyle = '#5a2a7a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#b070e0'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  for (let i = 0; i < mk.motes; i++) {
    const a = hash(i + 40) * TAU + t * 0.03, k = (t * 0.02 + hash(i + 41)) % 1, r = mk.from + 0.12 - k * 0.14;
    if (k < 0.85) px(ctx, k < 0.5 ? '#c890f0' : '#8a5ab0', v.cx + Math.cos(a) * r * v.rx, v.cy + Math.sin(a) * r * v.ry);
  }
}

function orbitDots(ctx, v, r) {
  const n = Math.max(24, Math.round((v.rx + v.ry) * r * 1.1));
  for (let i = 0; i < n; i += 2) { const a = i / n * TAU; px(ctx, 'rgba(240,200,140,.28)', v.cx + Math.cos(a) * r * v.rx, v.cy + Math.sin(a) * r * v.ry); }
}

function label(ctx, text, x, y, color) {
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(27,24,48,.95)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// Đặt nhãn theo thứ tự ưu tiên, bỏ nhãn đè lên nhãn đã đặt
function placeLabels(ctx, list) {
  ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const boxes = [];
  for (const l of list.sort((a, b) => a.pri - b.pri)) {
    const w = ctx.measureText(l.text).width + 4, bx = { x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y, y1: l.y + 13 };
    if (!l.must && boxes.some(o => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) continue;
    boxes.push(bx); label(ctx, l.text, l.x, l.y, l.color);
  }
}

// st: { min, t, realm, here, sel, seen(b), hint (màu theo dungeon.json), view }; trả về chỗ chạm được (toạ độ màn hình)
export function drawStarmap(ctx, w, h, sm, bodies, st) {
  const P = Math.max(2, Math.round(Math.min(w, h) / 200)), W = Math.ceil(w / P), H = Math.ceil(h / P), t = st.t, z = st.view?.z || 1;
  if (!low) low = document.createElement('canvas');
  if (low.width !== W || low.height !== H) { low.width = W; low.height = H; }
  const c = low.getContext('2d'), v = viewOf(sm, W, H);
  if (st.view) { v.cx += st.view.x / P; v.cy += st.view.y / P; v.rx *= z; v.ry *= z; v.s *= Math.pow(z, 0.75); }
  stars(c, W, H, sm.stars, t);
  const maxOrbit = Math.max(...sm.bodies.map(b => b.orbit));
  for (let o = 1; o < maxOrbit; o++) orbitDots(c, v, orbitR(sm, o));
  const pts = bodies.map(b => { const p = flatPos(sm, b, st.min); return { b, x: v.cx + p.x * v.rx, y: v.cy + p.y * v.ry, r: Math.max(1.5, b.size * v.s / P * 2) }; });
  const S = pts[0];
  for (const p of pts.slice().sort((a, b) => a.y - b.y)) {
    if (p.b.sun) sun(c, p.x, p.y, p.r, t);
    else if (p.b.orbit !== maxOrbit) body(c, p.b, p.x, p.y, p.r, S.x, S.y, st.seen(p.b), t);
  }
  for (const p of pts) if (p.b.orbit === maxOrbit) body(c, p.b, p.x, p.y, p.r, S.x, S.y, true, t);   // vòng ngoài cùng chìm trong ma khí
  makhi(c, v, sm.makhi, W, H, t);
  for (const p of pts) {   // vòng chỉ chỗ đang đứng (vàng nhấp nháy) và chỗ đang chọn (trắng đứt)
    const here = p.b.map && p.b.map === st.here, sel = p.b.id === st.sel, n = 28;
    if (!here && !sel) continue;
    const rr = p.r + (here ? 3 + (Math.sin(t * 4) > 0 ? 1 : 0) : 5);
    for (let i = 0; i < n; i++) if (here || i % 3) { const a = i / n * TAU; px(c, here ? '#ffd24a' : '#ffffff', p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, W * P, H * P);
  const out = pts.map(p => ({ b: p.b, x: p.x * P, y: p.y * P, r: p.r * P })), labels = [];
  for (const p of out) {
    const b = p.b, here = b.map && b.map === st.here, sel = b.id === st.sel;
    if (here) labels.push({ text: sm.texts.here, x: p.x, y: p.y - p.r - 18, color: '#ffd24a', pri: 0, must: true });
    if (b.parent && !sel && !here && z < 1.8) continue;   // mặt trăng chỉ hiện tên khi chọn hoặc phóng to
    const seen = st.seen(b), dg = seen && dangerOf(b, st.realm);
    labels.push({ text: seen ? b.name : sm.texts.unknown, x: p.x, y: p.y + p.r + 3, color: dg ? st.hint[dg] : b.sun ? '#ffe48a' : '#f4ead8',
      pri: here || sel ? 1 : b.sun ? 30 : b.parent ? 20 : 10 - b.size / 2, must: here || sel });
  }
  placeLabels(ctx, labels);
  return out;
}
