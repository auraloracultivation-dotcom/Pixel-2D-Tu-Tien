// Thiên lôi của nghi lễ kết đan (src/game/ket-dan.js), vẽ riêng bằng code (chủ dự án 20/11/2026 02:17: "phải code thêm sét của bạn nữa, lửa sét
// cũ thì bỏ đi; sét trúng người có một dòng điện cuốn lấy thân một khoảng thời gian; tia sét ít cũng phải có vài màu; tầm 10–15 tia").
// Điểm ảnh cỡ điểm của nhân vật (0,5 đơn vị bản đồ) đặt đúng lưới, màu phẳng; chỉ quầng sáng dưới thân tia là mịn.
//   drawKdBolts: mỗi tia (st.bolts) qua ba nhịp: tiên dẫn (vệt mảnh rơi từ trời xuống tới người) → giáng (thân ba lớp mép / thân / lõi theo dải màu
//     của tia, đổi hình liên tục cho sét "sống", các nhánh rẽ MÀU KHÁC thân, điện rẽ từ người xuống đất, sao loé ở chỗ trúng) → tan (dither Bayer,
//     lõi nguội dần, nhánh tắt trước); kèm tia lửa điện văng ra rồi rơi (st.sparks).
//   drawKdWrap: dòng điện cuốn quanh thân sau mỗi tia: các sợi xoắn ốc gấp khúc chạy quanh người từ chân lên đầu, nửa sau lưng vẽ trước thân người
//     (front = false), nửa trước vẽ đè lên; chịu càng nhiều tia càng nhiều sợi; tắt dần trong wrap_s giây.
// Số: data/config.json → ket_dan (set_pals, set_lead, set_strike, set_fade, wrap_s).
import { glow } from './vfx/glow.js';

const TAU = Math.PI * 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) {   // mulberry32: cùng hạt ra cùng hình
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Đường gấp khúc: chia đôi từng đoạn, dời điểm giữa sang ngang, khoảng dời nhỏ dần
function zig(x0, y0, x1, y1, rough, levels, rnd) {
  let pts = [[x0, y0], [x1, y1]], d = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let l = 0; l < levels; l++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay) || 1, o = (rnd() - 0.5) * d;
      out.push([(ax + bx) / 2 - (by - ay) / len * o, (ay + by) / 2 + (bx - ax) / len * o], pts[i]);
    }
    pts = out; d *= 0.52;
  }
  return pts;
}
// Rải điểm ảnh (nửa đơn vị) dọc đường gấp khúc vào path: dày th điểm (đoạn dốc đứng thì dày theo ngang), chỉ tới phần upto của đường,
// dis: dither Bayer 0–16 (càng lớn càng thưa). Trả điểm cuối đã rải
function trace(path, pts, th, upto = 1, dis = 0) {
  const n = Math.max(1, Math.round((pts.length - 1) * upto)), off = Math.floor(th / 2) / 2;
  let lx = pts[0][0], ly = pts[0][1];
  for (let i = 1; i <= n; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2)), steep = Math.abs(dy) >= Math.abs(dx);
    for (let s = 0; s <= steps; s++) {
      const X = Math.round((ax + dx * s / steps) * 2), Y = Math.round((ay + dy * s / steps) * 2);
      if (dis && BAYER[(Y & 3) * 4 + (X & 3)] < dis) continue;
      if (steep) path.rect(X / 2 - off, Y / 2, th / 2, 0.5); else path.rect(X / 2, Y / 2 - off, 0.5, th / 2);
    }
    lx = bx; ly = by;
  }
  return [lx, ly];
}
const line = (ctx, pts, w, color, a) => { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
const put = (ctx, path, color, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(path); };

// Hình một tia ở lần đổi hình thứ key: thân từ trời tới người, các nhánh rẽ chéo xuống (có nhánh con), điện rẽ từ người xuống đất
function shape(b, x0, y0, x1, y1, gx, gy, key) {
  if (b.cache?.key === key) return b.cache;
  const rnd = rng(b.seed * 31 + key * 7919), main = zig(x0, y0, x1, y1, 0.17, 6, rnd), br = [];
  for (let k = 0, nb = b.big ? 6 : 4; k < nb; k++) {
    const [bx, by] = main[Math.floor((0.1 + rnd() * 0.68) * (main.length - 1))], dir = rnd() < 0.5 ? -1 : 1, len = 20 + rnd() * (b.big ? 72 : 46), ang = 0.35 + rnd() * 0.85;
    const pts = zig(bx, by, bx + dir * Math.sin(ang) * len, by + Math.cos(ang) * len, 0.24, 4, rnd);
    br.push(pts);
    if (rnd() < 0.55) { const [cx, cy] = pts[Math.floor(pts.length * 0.5)]; br.push(zig(cx, cy, cx - dir * (5 + rnd() * 14), cy + 9 + rnd() * 18, 0.26, 3, rnd)); }
  }
  return (b.cache = { key, main, br, gnd: gy - y1 > 10 ? zig(x1, y1 + 5, gx, gy, 0.3, 4, rnd) : null });
}

export function drawKdBolts(ctx, game, st) {
  if (!st.bolts.length && !st.sparks.length) return;
  const K = st.K, w = st.who, e = st.t, v = game.screen.viewRect(), top = v.y0 - 6, tx = w.x, ty = w.y - (w.kdLift || 0) - K.dan_y - 4;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const b of st.bolts) {
    const age = e - b.t0, P = b.pal, x0 = tx + b.sx, gx = tx + b.gx, gy = w.y + 3 + b.gy;
    if (age < 0) {   // tiên dẫn: vệt mảnh rơi từ trời xuống, đầu vệt sáng
      const S = shape(b, x0, top, tx, ty, gx, gy, 0), path = new Path2D(), [hx, hy] = trace(path, S.main, 1, Math.max(0.05, 1 + age / K.set_lead));
      ctx.globalCompositeOperation = 'lighter'; put(ctx, path, P[1], 0.75);
      ctx.fillStyle = P[0]; ctx.globalAlpha = 1; ctx.fillRect(Math.round(hx * 2) / 2 - 0.5, Math.round(hy * 2) / 2 - 0.5, 1.5, 1.5);
      continue;
    }
    const strike = age < K.set_strike, k = strike ? 0 : Math.min(1, (age - K.set_strike) / K.set_fade), dis = Math.floor(k * 16), T = b.big ? 2 : 0;
    const S = shape(b, x0, top, tx, ty, gx, gy, 1 + Math.floor(Math.min(age, K.set_strike - 1e-3) / 0.045));
    ctx.globalCompositeOperation = 'lighter';   // quầng mềm dưới thân tia
    line(ctx, S.main, (b.big ? 11 : 7) * (strike ? 1 : 0.7), P[2], 0.24 * (1 - k));
    line(ctx, S.main, b.big ? 4.5 : 3, P[1], 0.3 * (1 - k));
    ctx.globalCompositeOperation = 'source-over';
    const out = new Path2D(), mid = new Path2D(), core = new Path2D(), brc = new Path2D(), brw = new Path2D();
    if (k < 0.35) { trace(out, S.main, 5 + T, 1, dis); trace(mid, S.main, 3 + T, 1, dis); trace(core, S.main, strike && age < K.set_strike / 2 ? 2 + T : 1 + T / 2, 1, dis); }
    else if (k < 0.7) { trace(out, S.main, 3 + T, 1, dis); trace(mid, S.main, 1 + T / 2, 1, dis); }
    else trace(out, S.main, 1 + T / 2, 1, dis);
    if (k < 0.45) for (const pts of S.br) { trace(brc, pts, strike ? 2 : 1, 1, Math.min(15, dis + 3)); if (strike) trace(brw, pts, 1, 0.55); }   // nhánh rẽ: màu khác thân, gốc nhánh có lõi trắng
    if (S.gnd && k < 0.6) { trace(brc, S.gnd, 2, 1, dis); if (strike) trace(brw, S.gnd, 1, 1); }
    put(ctx, out, P[2]); put(ctx, brc, P[3]); put(ctx, mid, P[1]); put(ctx, core, P[0]); put(ctx, brw, P[0]);
    if (age < 0.2 && b.lead) {   // sao loé ở chỗ trúng: tám tia ngắn dần, tâm trắng
      const s = 1 - age / 0.2, R = Math.round((b.big ? 26 : 17) * s), star = new Path2D(), X = Math.round(tx * 2) / 2, Y = Math.round(ty * 2) / 2;
      for (let m = 2; m <= R; m++) { star.rect(X + m / 2, Y, 0.5, 0.5); star.rect(X - m / 2, Y, 0.5, 0.5); star.rect(X, Y + m / 2, 0.5, 0.5); star.rect(X, Y - m / 2, 0.5, 0.5); }
      for (let m = 2; m <= R * 0.6; m++) for (const [ax, ay] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) star.rect(X + ax * m / 2, Y + ay * m / 2, 0.5, 0.5);
      ctx.globalCompositeOperation = 'lighter'; put(ctx, star, P[1], 0.95);
      ctx.fillStyle = P[0]; ctx.globalAlpha = 1; ctx.fillRect(X - 1.5, Y - 1, 3.5, 2.5); ctx.fillRect(X - 1, Y - 1.5, 2.5, 3.5);
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const q of st.sparks) {   // tia lửa điện: đầu sáng, đuôi ngắn theo hướng bay
    const a = 1 - q.life / q.max, path = new Path2D();
    trace(path, [[q.ox, q.oy], [q.x, q.y]], 1);
    put(ctx, path, q.c, a * 0.8);
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = a; ctx.fillRect(Math.round(q.x * 2) / 2, Math.round(q.y * 2) / 2, 1, 1);
  }
  ctx.restore();
}

export function drawKdWrap(ctx, st, front) {
  const K = st.K, e = st.t, dt = e - st.hitT, P = st.hitPal;
  if (!P || dt < 0 || dt > K.wrap_s || e >= st.T.q) return;   // tới quãng lặng sau sét thì điện tắt hẳn
  const w = st.who, cx = w.x, base = w.y - (w.kdLift || 0) - 1, H = 24, life = Math.min(1 - dt / K.wrap_s, (st.T.q - e) / 0.35), strands = Math.min(2, 1 + Math.floor(st.hit / 5)) + (st.hitBig ? 1 : 0), tick = Math.floor(e * 20);
  const deep = new Path2D(), col = new Path2D(), hot = new Path2D(), halo = [];
  for (let s = 0; s < strands; s++) {   // mỗi sợi: xoắn ốc quanh thân từ chân lên đầu, gấp khúc đổi hình 20 lần / giây, chạy vòng quanh người
    const turns = 1.7 + s * 0.4, spin = (s % 2 ? -1 : 1) * e * (6 + s * 1.5) + s * 2.1, N = 38;
    let px0 = 0, py0 = 0, run = null;
    for (let i = 0; i <= N; i++) {
      const u = i / N, ang = u * turns * TAU + spin, jr = (hash(tick * 1.7 + i * 3.3 + s * 11) - 0.5) * 4.4, jy = (hash(tick + i * 7.1 + s * 5) - 0.5) * 3.4;
      const r = 7.5 + 3.6 * Math.sin(u * Math.PI) + jr, x = cx + Math.cos(ang) * r, y = base - u * H + jy;
      const on = i > 0 && (Math.sin(ang) > 0) === front && hash(Math.floor(i / 3) * 5.3 + tick * 0.21 + s * 3) < 0.25 + life * 0.75;   // sợi điện đứt từng quãng, càng về cuối càng thưa
      if (on) {
        const seg = [[px0, py0], [x, y]];
        trace(deep, seg, front ? 3 : 2); trace(col, seg, 1);
        if (front && hash(i * 9.7 + tick * 1.3 + s) > 0.7) trace(hot, seg, 1);
        if (run) run.push([x, y]); else halo.push(run = [[px0, py0], [x, y]]);
      } else run = null;
      px0 = x; py0 = y;
    }
  }
  for (let k = 0; k < 7; k++) {   // tia điện nhỏ bắn ra từ thân
    if (hash(tick * 3.3 + k) > life * 0.8) continue;
    const ang = hash(tick + k * 9.1) * TAU;
    if ((Math.sin(ang) > 0) !== front) continue;
    const pts = [[cx + Math.cos(ang) * 7, base - 4 - hash(tick * 2 + k) * 17]];
    for (let i = 0; i < 5; i++) pts.push([pts[i][0] + Math.cos(ang) * 2.4 + (hash(tick + i * 5 + k * 13) - 0.5) * 3.4, pts[i][1] + (hash(tick * 7 + i + k) - 0.6) * 3.4]);
    trace(col, pts, 1); trace(hot, pts.slice(0, 3), 1);
  }
  const a = (front ? 1 : 0.6) * Math.min(1, 0.4 + life);
  ctx.save();
  if (front) { ctx.translate(cx, base - H * 0.45); ctx.scale(1, 1.25); glow(ctx, 0, 0, 15, P[2], 0.28 * life); }   // thân người ánh màu điện
  ctx.restore(); ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const pts of halo) line(ctx, pts, 3.2, P[2], 0.32 * a);   // quầng mềm quanh sợi điện
  ctx.globalCompositeOperation = 'source-over';
  put(ctx, deep, P[2], a * 0.9); put(ctx, col, P[1], a); put(ctx, hot, '#ffffff', a);
  ctx.restore();
}
