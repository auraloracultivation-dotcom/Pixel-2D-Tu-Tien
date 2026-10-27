// Vẽ tinh đồ: trời sao, Linh Nhật, quỹ đạo, tinh cầu và mặt trăng, vòng ma khí ăn mòn từ ngoài vào.
import { flatPos, orbitR, dangerOf, REF } from '../game/starmap.js';

const TAU = Math.PI * 2;

// Khung nhìn: elip vừa khung, không dẹt hơn tilt, không cao hơn hình tròn
export function viewOf(sm, w, h) {
  const pad = 6;
  let rx = w / 2 - pad, ry = h / 2 - pad;
  if (ry > rx) ry = rx;
  if (ry < rx * sm.tilt) rx = ry / sm.tilt;
  return { cx: w / 2, cy: h / 2, rx, ry, s: rx / REF };
}

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function drawStars(ctx, w, h, n, t) {
  ctx.fillStyle = '#0a0918'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + hash(i + 9)) + i));
    ctx.fillStyle = `rgba(255,255,240,${(a * (0.3 + hash(i + 5) * 0.7)).toFixed(2)})`;
    const z = hash(i + 3) > 0.92 ? 2 : 1;
    ctx.fillRect(Math.floor(hash(i) * w), Math.floor(hash(i + 1) * h), z, z);
  }
}

function drawSun(ctx, x, y, r, sun, t) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
  g.addColorStop(0, '#fffbe8'); g.addColorStop(0.3, sun.color); g.addColorStop(0.55, sun.glow + 'aa'); g.addColorStop(1, sun.glow + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = sun.color + '88'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) { // tia sáng xoay chậm
    const a = t * 0.15 + i * TAU / 8, l = r * (1.5 + 0.25 * Math.sin(t * 1.3 + i));
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}

function drawBody(ctx, b, x, y, r, sun, seen, t) {
  const lit = b.kind !== 'lost';
  if (b.kind === 'soon' || b.kind === 'boss') { // quầng đỏ phập phồng
    ctx.fillStyle = `rgba(220,40,60,${(0.18 + 0.12 * Math.sin(t * 2)).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, TAU); ctx.fill();
  }
  if (b.kind === 'tong') { ctx.strokeStyle = 'rgba(140,230,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 1.45, 0, TAU); ctx.stroke(); }
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = b.color; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const dx = sun.x - x, dy = sun.y - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (lit) { // mặt hướng Linh Nhật sáng, mặt sau tối
    const g = ctx.createRadialGradient(x + ux * r * 0.45, y + uy * r * 0.45, 0, x + ux * r * 0.45, y + uy * r * 0.45, r);
    g.addColorStop(0, 'rgba(255,250,220,.45)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fillStyle = 'rgba(10,8,24,.5)';
  ctx.beginPath(); ctx.arc(x - ux * r * 0.9, y - uy * r * 0.9, r * 1.05, 0, TAU); ctx.fill();
  if (b.kind === 'forbidden' || b.kind === 'lost') { // vết nứt
    ctx.strokeStyle = b.kind === 'lost' ? 'rgba(20,16,28,.8)' : 'rgba(200,120,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.2); ctx.lineTo(x - r * 0.1, y + r * 0.1); ctx.lineTo(x + r * 0.3, y - r * 0.4); ctx.lineTo(x + r * 0.8, y - r * 0.1);
    ctx.moveTo(x - r * 0.1, y + r * 0.1); ctx.lineTo(x + r * 0.05, y + r * 0.7); ctx.stroke();
  }
  if (!seen) { ctx.fillStyle = 'rgba(10,9,24,.55)'; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(10,8,24,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (b.kind === 'home') { ctx.fillStyle = `rgba(255,200,90,${(0.7 + 0.3 * Math.sin(t * 3)).toFixed(2)})`; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
}

// Vòng ma khí: phủ tối ngoài một elip mép gợn sóng, mép phát sáng tím, đốm ma khí trôi vào trong
function drawMakhi(ctx, v, mk, w, h, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h);
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, r = mk.from + mk.wave * (Math.sin(a * 5 + t * 0.6) + 0.6 * Math.sin(a * 9 - t * 0.9) + 0.4 * Math.sin(a * 17 + t * 1.7));
    const px = v.cx + Math.cos(a) * r * v.rx, py = v.cy + Math.sin(a) * r * v.ry;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = mk.color + 'd0'; ctx.fill('evenodd');
  ctx.strokeStyle = mk.edge + '55'; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = mk.edge + 'cc'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  for (let i = 0; i < mk.motes; i++) {
    const a = hash(i + 40) * TAU + t * 0.03, k = (t * 0.02 + hash(i + 41)) % 1, r = mk.from + 0.12 - k * 0.14;
    ctx.fillStyle = `rgba(170,90,220,${(0.6 * (1 - k)).toFixed(2)})`;
    ctx.fillRect(Math.round(v.cx + Math.cos(a) * r * v.rx), Math.round(v.cy + Math.sin(a) * r * v.ry), 2, 2);
  }
}

function label(ctx, text, x, y, color = '#fff') {
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,24,.9)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// Đặt nhãn theo thứ tự ưu tiên, bỏ nhãn đè lên nhãn đã đặt
function placeLabels(ctx, list) {
  ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const boxes = [];
  for (const l of list.sort((a, b) => a.pri - b.pri)) {
    const w = ctx.measureText(l.text).width + 4, bx = { x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y, y1: l.y + 12 };
    if (!l.must && boxes.some(o => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) continue;
    boxes.push(bx); label(ctx, l.text, l.x, l.y, l.color);
  }
}

// st: { min, t, realm, here, sel, seen(id), hint (màu theo dungeon.json) }; trả về chỗ chạm được
export function drawStarmap(ctx, w, h, sm, bodies, st) {
  const v = viewOf(sm, w, h), t = st.t, z = st.view?.z || 1;
  if (st.view) { v.cx += st.view.x; v.cy += st.view.y; v.rx *= z; v.ry *= z; v.s *= Math.pow(z, 0.75); }
  drawStars(ctx, w, h, sm.stars, t);
  const sg = ctx.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, v.rx * 0.6); // linh khí toả quanh Linh Nhật
  sg.addColorStop(0, 'rgba(255,214,120,.22)'); sg.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(200,210,255,.12)'; ctx.lineWidth = 1;
  const maxOrbit = Math.max(...sm.bodies.map(b => b.orbit));
  for (let o = 1; o <= maxOrbit; o++) { const r = orbitR(sm, o); ctx.beginPath(); ctx.ellipse(v.cx, v.cy, r * v.rx, r * v.ry, 0, 0, TAU); ctx.stroke(); }
  const pts = bodies.map(b => {
    const p = flatPos(sm, b, st.min);
    return { b, x: v.cx + p.x * v.rx, y: v.cy + p.y * v.ry, r: Math.max(2, b.size * v.s) };
  });
  const sun = pts[0];
  pts.slice().sort((a, b) => a.y - b.y).forEach(p => {
    if (p.b.sun) drawSun(ctx, p.x, p.y, p.r, sm.sun, t);
    else if (p.b.orbit !== maxOrbit) drawBody(ctx, p.b, p.x, p.y, p.r, sun, st.seen(p.b), t);
  });
  for (const p of pts) if (p.b.orbit === maxOrbit) drawBody(ctx, p.b, p.x, p.y, p.r, sun, true, t); // vòng ngoài cùng chìm trong ma khí
  drawMakhi(ctx, v, sm.makhi, w, h, t);
  const labels = [];
  for (const p of pts) {
    const b = p.b, here = b.map && b.map === st.here, sel = b.id === st.sel;
    if (here) {
      ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3 + Math.sin(t * 4), 0, TAU); ctx.stroke();
      labels.push({ text: sm.texts.here, x: p.x, y: p.y - p.r - 16, color: '#f2c94c', pri: 0, must: true });
    }
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (b.parent && !sel && !here && z < 1.8) continue; // mặt trăng chỉ hiện tên khi chọn hoặc phóng to
    const seen = st.seen(b), dg = seen && dangerOf(b, st.realm);
    labels.push({ text: seen ? b.name : sm.texts.unknown, x: p.x, y: p.y + p.r + 3, color: dg ? st.hint[dg] : b.sun ? '#ffe48a' : '#e8e4f4',
      pri: here || sel ? 1 : b.sun ? 30 : b.parent ? 20 : 10 - b.size / 2, must: here || sel });
  }
  placeLabels(ctx, labels);
  return pts;
}
