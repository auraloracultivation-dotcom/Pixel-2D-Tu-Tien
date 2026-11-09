// Hình Thiên Phạt (src/game/skill-thunder.js), lớp trên cùng (gọi từ draw-charge.js drawCharges). Số ở data/config.json → thunder_fx.
// Sét (chủ dự án 10/11/2026 00:14): lõi trắng chói, viền đỏ, ngoài cùng viền đen mỏng; nét gãy khúc đổi hình liên tục cho chớp nháy,
// thỉnh thoảng toẽ nhánh nhỏ.
// Tụ lực: rìa màn tối dần, sét từ bốn phía giật về quả cầu trên đầu, quả cầu trắng lớn dần, sét nhỏ cuộn quanh, vòng đỏ dưới chân.
// Nổ: từng tia sét chạy theo đường (gốc → các mục tiêu → đuôi) với tốc độ speed, chỗ trúng loé trắng; hết đường thì tan trong linger giây.
import { orbAt } from '../game/skill-thunder.js';

const clamp = k => Math.max(0, Math.min(1, k));
const ease = k => 1 - (1 - clamp(k)) ** 3;
const RED = '#ff1a24', INK = '#160008';

// số ngẫu nhiên lặp lại được theo hạt giống (nét sét đổi theo khung thời gian, không nhảy loạn mỗi lần vẽ)
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Gãy khúc một đường qua các điểm: mỗi đoạn chia khúc ~F.seg đơn vị, lệch ngang tối đa F.amp
function jag(pts, seed, F) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.ceil(l / F.seg));
    const amp = Math.min(F.amp, l * 0.12);
    for (let k = 1; k < n; k++) { const u = k / n, o = (rnd(seed + i * 31 + k) - 0.5) * 2 * amp; out.push({ x: a.x + dx * u - dy / l * o, y: a.y + dy * u + dx / l * o }); }
    out.push(b);
  }
  return out;
}

// Một tia sét ba lớp; kèm vài nhánh nhỏ toẽ ra
export function bolt(ctx, pts, seed, F, dd, alpha, w = 1) {
  if (pts.length < 2 || alpha <= 0.01) return;
  const P = jag(pts, seed, F), path = Q => { ctx.beginPath(); ctx.moveTo(Q[0].x, Q[0].y); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i].x, Q[i].y); };
  const br = [];
  for (let i = 2; i < P.length - 1; i += 3) if (rnd(seed + i * 7) < F.branch) {
    const q = P[i], ang = Math.atan2(P[i + 1].y - P[i - 1].y, P[i + 1].x - P[i - 1].x) + (rnd(seed + i) - 0.5) * 2.2, l = 6 + rnd(seed + i * 3) * 12;
    br.push(jag([q, { x: q.x + Math.cos(ang) * l, y: q.y + Math.sin(ang) * l }], seed + i * 13, F));
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const layer = (style, lw, blur, glow, op, a) => {
    ctx.globalCompositeOperation = op; ctx.strokeStyle = style; ctx.shadowColor = glow; ctx.shadowBlur = blur * dd; ctx.globalAlpha = alpha * a;
    ctx.lineWidth = lw * w; path(P); ctx.stroke();
    ctx.lineWidth = lw * w * 0.55; for (const b of br) { path(b); ctx.stroke(); }
  };
  layer(INK, F.w[0], 0, INK, 'source-over', 0.7);   // viền đen
  layer(RED, F.w[1], 7, RED, 'lighter', 0.75);       // viền đỏ
  layer('#ffffff', F.w[2], 6, '#ffffff', 'lighter', 1);   // lõi trắng chói
  ctx.restore();
}

function glowAt(ctx, x, y, r, a, inner = 'rgba(255,255,255,1)') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(0.35, 'rgba(255,240,240,0.55)'); g.addColorStop(1, 'rgba(255,40,60,0)');
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function drawThunderCharge(ctx, game, a, F0) {
  const F = game.data.config.thunder_fx, c = a.charge, k = clamp(c.t / c.s.charge), e = ease(k), T = game.time, dd = Math.abs(ctx.getTransform().d) || 1, o = orbAt(a);
  ctx.save();
  if (a === game.player && game.screen?.viewRect) {   // rìa màn tối dần (chỉ máy mình)
    const v = game.screen.viewRect(), g = ctx.createRadialGradient(o.x, o.y, 30, o.x, o.y, Math.max(v.x1 - v.x0, v.y1 - v.y0) * 0.75);
    g.addColorStop(0, 'rgba(6,0,8,0)'); g.addColorStop(1, `rgba(6,0,8,${F0.vignette * e})`);
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 8 * dd;   // vòng đỏ dưới chân
  ctx.globalAlpha = 0.3 + 0.4 * e; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(a.x, a.y, 12 + 8 * e, (12 + 8 * e) * 0.32, 0, -T * 2.5, -T * 2.5 + Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  // sét bốn phía giật về quả cầu: mỗi tia sống một nhịp ngắn rồi đổi chỗ, càng tụ càng dày
  const tick = Math.floor(T * F.pull_hz), n = Math.round(F.pull * (0.35 + 0.65 * e));
  for (let i = 0; i < n; i++) {
    const sd = tick * 97 + i * 13, q = rnd(sd) * Math.PI * 2, r = F.pull_r[0] + rnd(sd + 1) * (F.pull_r[1] - F.pull_r[0]);
    const from = { x: o.x + Math.cos(q) * r, y: o.y + Math.sin(q) * r * 0.8 }, life = (T * F.pull_hz) % 1, reach = ease(life * 2.2);
    const to = { x: from.x + (o.x - from.x) * reach, y: from.y + (o.y - from.y) * reach };
    bolt(ctx, [from, to], sd, F, dd, (1 - life * 0.6) * (0.5 + 0.5 * e), 0.8);
  }
  // quả cầu trắng, sét nhỏ cuộn quanh
  const R = F.orb * (0.3 + 0.7 * e) * (1 + 0.06 * Math.sin(T * 30));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0;
  glowAt(ctx, o.x, o.y, R * 2.4, 0.5 + 0.3 * e, 'rgba(255,230,230,0.9)');
  glowAt(ctx, o.x, o.y, R, 1);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const sd = Math.floor(T * 18) * 31 + i * 7, a0 = rnd(sd) * Math.PI * 2, pts = [];
    for (let j = 0; j <= 4; j++) { const u = a0 + j * 0.5, rr = R * (1.05 + rnd(sd + j) * 0.5); pts.push({ x: o.x + Math.cos(u) * rr, y: o.y + Math.sin(u) * rr }); }
    bolt(ctx, pts, sd, F, dd, 0.5 + 0.5 * e, 0.6);
  }
}

// Sét toả ra sau khi quả cầu vỡ: mỗi tia chạy dần theo đường của nó, chỗ trúng loé trắng, hết đường thì tan
export function drawThunderFx(ctx, game, f) {
  const F = game.data.config.thunder_fx, dd = Math.abs(ctx.getTransform().d) || 1, frame = Math.floor(f.t * F.flicker_hz);
  const o = f.routes[0]?.pts[0];
  if (o && f.t < 0.25) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, o.x, o.y, F.orb * 3 * (1 + f.t * 4), 1 - f.t / 0.25); ctx.restore(); }   // quả cầu vỡ
  f.routes.forEach((r, ri) => {
    const D = (f.t - r.t0) * f.speed;
    if (D <= 0) return;
    const cut = [r.pts[0]];
    let d = 0;
    for (let j = 1; j < r.pts.length; j++) {
      const a = r.pts[j - 1], b = r.pts[j], l = Math.hypot(b.x - a.x, b.y - a.y);
      if (d + l <= D) { cut.push(b); d += l; if (j < r.pts.length - 1) hitFlash(ctx, b, f.t - r.t0 - d / f.speed, dd); continue; }
      const u = (D - d) / (l || 1); cut.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }); break;
    }
    const done = r.t0 + r.len / f.speed, fade = f.t < done ? 1 : clamp(1 - (f.t - done) / f.linger);
    bolt(ctx, cut, frame * 53 + ri * 17, F, dd, fade, 1.15);
  });
}

function hitFlash(ctx, p, age, dd) {
  if (age < 0 || age > 0.22) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowAt(ctx, p.x, p.y, 14 * (1 + age * 3), 1 - age / 0.22); ctx.restore();
}
