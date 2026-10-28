// Tia sét điểm ảnh (chủ dự án xin 29/10/2026 áp dụng trang Xưởng VFX Pixel, bài Tia sét; số ở data/config.json → bolt).
// - Đường gấp khúc: chia đôi từng đoạn, dời điểm giữa sang ngang một khoảng ngẫu nhiên, khoảng dời nhỏ dần mỗi lần chia;
//   vài nhánh rẽ từ nửa trên chĩa chéo xuống; đổi hình mỗi `reshape` giây lúc đang sáng nên sét "sống", không đứng như hình dán.
// - Tô điểm ảnh thật ở lưới bản đồ (1 điểm = 1 đơn vị): mép tím thưa → viền xanh lơ → lõi trắng (2 điểm lúc vừa giáng, 1 điểm sau);
//   tan bằng dither Bayer: lõi nguội dần trắng → xanh → tím, nhánh tắt trước thân. Quầng mềm cộng sáng đặt dưới (chỗ duy nhất được mịn).
// - Chân sét: vệt sáng bầu dục dẹt trên đất. Vết cháy xém để lại là hình fx.bolt khung 4–6 (src/game/skill-fx.js → boltFx).
// f: { type: 'bolt', x, y (chân sét), h, seed, t, life }. drawBoltLead: vệt tiên dẫn mờ rơi xuống trước lúc sét từ trời giáng.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function rng(seed) {   // mulberry32: cùng hạt ra cùng hình
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Chia đôi dời điểm giữa: levels lần, khoảng dời ban đầu = độ dài × rough, mỗi lần còn một nửa
function zigzag(x0, y0, x1, y1, rough, levels, rnd) {
  let pts = [[x0, y0], [x1, y1]], d = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let l = 0; l < levels; l++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay) || 1, o = (rnd() - 0.5) * d;
      out.push([(ax + bx) / 2 - (by - ay) / len * o, (ay + by) / 2 + (bx - ax) / len * o], pts[i]);
    }
    pts = out; d *= 0.5;
  }
  return pts;
}

// Hình sét theo hạt: thân từ trên trời xuống chân (x, y), nhánh rẽ ở nửa trên
function shapeOf(C, x, y, h, seed) {
  const rnd = rng(seed), levels = h > 110 ? 5 : 4;
  const main = zigzag(x + (rnd() - 0.5) * h * 0.25, y - h, x, y, C.rough, levels, rnd), branches = [];
  for (let i = 0; i < C.branches; i++) {
    const at = main[Math.floor(main.length * (0.15 + rnd() * 0.45))], side = rnd() < 0.5 ? -1 : 1, L = h * (0.14 + rnd() * 0.16);
    branches.push(zigzag(at[0], at[1], at[0] + side * L * (0.5 + rnd() * 0.4), at[1] + L, 0.35, 3, rnd));
  }
  return { main, branches };
}

// Điểm ảnh dọc đường gấp khúc (Bresenham): [x, y, trục ngang?]; trục ngang: đoạn dốc đứng, viền đặt hai bên trái phải
function pixels(pts, upto = 1) {
  const out = [], n = Math.max(1, Math.round((pts.length - 1) * upto));
  for (let i = 1; i <= n; i++) {
    let x0 = Math.round(pts[i - 1][0]), y0 = Math.round(pts[i - 1][1]);
    const x1 = Math.round(pts[i][0]), y1 = Math.round(pts[i][1]), dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    const hz = dx <= -dy;
    let e = dx + dy;
    for (;;) {
      out.push(x0, y0, hz ? 1 : 0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  return out;
}

// Một đường điểm ảnh: lõi rộng cw điểm màu core, viền 1 điểm màu rim hai bên, mép tím thưa ngoài cùng; dis: dither Bayer 0–16
function plot(paths, px, cw, core, rim, edge, dis, seed) {
  for (let i = 0; i < px.length; i += 3) {
    const x = px[i], y = px[i + 1], hz = px[i + 2];
    if (dis && BAYER[(y & 3) * 4 + (x & 3)] < dis) continue;
    const put = (o, tone) => { if (tone != null) paths[tone].rect(hz ? x + o : x, hz ? y : y + o, 1, 1); };
    for (let o = 0; o < cw; o++) put(o, core);
    put(-1, rim); put(cw, rim);
    if (edge != null && hash(x * 7.3 + y * 13.1 + seed) > 0.45) put(hash(x + y * 3.7 + seed) < 0.5 ? -2 : cw + 1, edge);
  }
}

function fill(ctx, C, paths) {
  for (let i = 2; i >= 0; i--) { ctx.fillStyle = C.colors[i]; ctx.fill(paths[i]); }   // tím, xanh, trắng: lõi đè lên viền
}

function glowLine(ctx, pts, w, color, a) {
  ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

export function drawBolt(ctx, game, f) {
  const C = game.data.config.bolt;
  if (!C) return;
  const strike = f.t < C.strike, k = strike ? 0 : Math.min(1, (f.t - C.strike) / C.fade);
  const shape = shapeOf(C, f.x, f.y, f.h, f.seed * 31 + Math.floor(Math.min(f.t, C.strike - 1e-3) / C.reshape));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  glowLine(ctx, shape.main, strike ? 7 : 5, C.colors[1], C.glow * (1 - k));
  const rx = f.h > 110 ? 11 : 7;
  ctx.globalAlpha = C.glow * (1 - k); ctx.fillStyle = C.colors[1];
  ctx.beginPath(); ctx.ellipse(f.x, f.y, rx * 1.6, rx * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const paths = [new Path2D(), new Path2D(), new Path2D()], dis = Math.floor(k * 16);
  // thân: lõi trắng 2 điểm nửa đầu lúc sáng, rồi 1 điểm; tan: trắng → xanh → tím
  const [core, rim, edge] = k < 0.35 ? [0, 1, 2] : k < 0.7 ? [1, 2, null] : [2, null, null];
  plot(paths, pixels(shape.main), strike && f.t < C.strike / 2 ? 2 : 1, core, rim, edge, dis, f.seed);
  if (k < 0.35) for (const b of shape.branches) plot(paths, pixels(b), 1, strike ? 0 : 1, strike ? 1 : 2, null, dis, f.seed + 7);
  if (k < 0.6) {   // chân sét: vệt bầu dục dẹt điểm ảnh, trong trắng ngoài xanh
    const ry = Math.max(1, Math.round(rx * 0.35));
    for (let yy = -ry; yy <= ry; yy++) {
      const half = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)), y = Math.round(f.y) + yy;
      for (let xx = -half; xx <= half; xx++) {
        const x = Math.round(f.x) + xx;
        if (dis && BAYER[(y & 3) * 4 + (x & 3)] < dis + 4) continue;
        paths[Math.abs(xx) < half * 0.45 && !k ? 0 : Math.abs(xx) < half - 1 ? 1 : 2].rect(x, y, 1, 1);
      }
    }
  }
  fill(ctx, C, paths);
  ctx.restore();
}

// Vệt tiên dẫn: hình đầu tiên của tia sắp giáng, mờ, rơi từ trên xuống theo k (0 → 1 lúc chạm đất), đầu vệt sáng hơn
export function drawBoltLead(ctx, game, s, k) {
  const C = game.data.config.bolt;
  if (!C || k <= 0) return;
  const shape = shapeOf(C, s.x, s.y, C.h_sky, s.seed * 31), px = pixels(shape.main, Math.min(1, k));
  const paths = [new Path2D(), new Path2D(), new Path2D()];
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.4 * k;
  plot(paths, px, 1, 2, null, null, 0, s.seed);
  const n = px.length;
  if (n >= 3) { paths[1].rect(px[n - 3] - 1, px[n - 2], 3, 1); paths[1].rect(px[n - 3], px[n - 2] - 1, 1, 3); }   // đầu vệt
  fill(ctx, C, paths);
  ctx.restore();
}
