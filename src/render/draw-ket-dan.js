// Hình nghi lễ kết đan (src/game/ket-dan.js; chủ dự án 20/11/2026 01:35), vẽ bằng code, điểm ảnh cỡ điểm của nhân vật (1 điểm = 0,5 đơn vị
// bản đồ, docs/02-CHUAN-PIXEL.md) đặt đúng lưới; chỉ quầng sáng nền và vành sóng là mịn. Hai lớp:
//   drawKdBack  vẽ ngay trước thân người (draw.js drawPlayer / drawOther): bóng trên đất lúc lơ lửng, quầng tụ khí dưới chân, nửa SAU các vòng khói;
//   drawKdFront lớp trên cùng (sau lớp ngày đêm, như mọi hiệu ứng chiêu): hạt linh khí xoáy vào, nửa TRƯỚC các vòng khói, viên đan ở đan điền,
//               thiên lôi và dòng điện cuốn quanh thân (draw-kd-set.js), sóng linh lực, cột sáng (người được vẽ lại bên trên cột sáng cho khỏi bị nuốt mất).
// Mọi thứ tính từ đồng hồ st.t nên máy người xem vẽ y hệt. Màu: pal_khi (linh khí), pal_dan (kim đan) ở data/config.json → ket_dan.
import { glow } from './vfx/glow.js';
import { drawHero } from './draw-hero.js';
import { drawKdBolts, drawKdWrap } from './draw-kd-set.js';   // thiên lôi nhiều màu, dòng điện cuốn quanh thân

const TAU = Math.PI * 2;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const px = (ctx, x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w / 2, h / 2);   // w, h tính bằng điểm (nửa đơn vị)
const smooth = x => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
// nhiễu mượt chạy vòng (chu kỳ P ô theo x), trôi theo y: chỗ dày chỗ thưa của khói
function noise(x, y, P) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi), g = (a, b) => hash(((a % P) + P) % P * 57.3 + b * 131.7);
  return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy;
}
const soft = (ctx, x, y, r, color, a, sy = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(1, sy); glow(ctx, 0, 0, r, color, a); ctx.restore(); };

// Các vòng linh khí dạng khói: mỗi vòng một dải bầu dục nghiêng quay quanh người, dày mỏng theo nhiễu, có tua khói bốc lên.
// front: nửa gần người xem (vẽ đè lên người); nửa xa vẽ trước thân người. Lúc hút: vòng co về đan điền, quay nhanh dần
function rings(ctx, st, front) {
  const K = st.K, T = st.T, w = st.who, e = st.t, P = K.pal_khi;
  if (e < T.a || e >= T.in) return;
  const suck = e > T.b ? smooth((e - T.b) / K.t.hut_in) : 0, cx = w.x, cy0 = w.y - K.dan_y - (w.kdLift || 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  K.rings.forEach(([R, q, tilt, om, up, born], j) => {
    const age = e - T.a - born;
    if (age <= 0) return;
    const grow = smooth(age / 1.1), r = R * (1.55 - 0.55 * grow) * (1 - suck * suck), cy = cy0 - up * (1 - suck);
    if (r < 1.5) return;
    const rot = om * (e - T.a) + om * suck * suck * 9, ct = Math.cos(tilt), sn = Math.sin(tilt), N = Math.max(16, Math.round(r * 5.2)), A = grow * (front ? 1 : 0.6) * (0.8 + 0.2 * suck);
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU + rot, s = Math.sin(th);
      if ((s > 0) !== front) continue;
      const den = noise(i / N * 7 + j * 3, e * 0.4 + j * 7.3, 7) * 0.7 + noise(i / N * 21, e * 0.8 + j, 21) * 0.3;   // khói dày / mỏng, chậm rãi đổi
      if (den < 0.36 - suck * 0.26) continue;   // chỗ khói đứt
      const X = Math.cos(th) * r, Y = s * r * q, x = cx + X * ct - Y * sn, y = cy + X * sn + Y * ct, k = (den - 0.36) / 0.64, thick = 1 + Math.round(k * 5);
      ctx.fillStyle = P[3]; ctx.globalAlpha = 0.24 * A; px(ctx, x - 1, y - thick / 2 - 0.5, 4, thick + 2);   // mép khói loãng
      ctx.fillStyle = P[2]; ctx.globalAlpha = (0.3 + 0.34 * k) * A; px(ctx, x - 0.5, y - thick / 4, 3, Math.max(1, thick - 1));
      if (den > 0.68) { ctx.fillStyle = den > 0.84 ? P[0] : P[1]; ctx.globalAlpha = 0.8 * A; px(ctx, x, y - 0.25, 2, 1); }   // lõi sáng chỗ khói đặc nhất
      if (hash(i * 7.7 + j * 31) < 0.42 && den > 0.45) {   // tua khói tách khỏi vòng, uốn lượn bốc lên rồi tan
        const ph = (e * 0.5 + hash(i * 3.1 + j * 17)) % 1, out = Math.sign(X) || 1, sway = hash(i * 1.3 + j) * 6;
        for (let m = 1; m <= 9; m++) {
          ctx.fillStyle = m > 5 ? P[3] : P[2]; ctx.globalAlpha = 0.5 * A * (1 - ph) * (1 - m / 10);
          px(ctx, x + out * (m * 0.3 + ph * 1.6) + Math.sin(e * 2.2 + m * 0.7 + sway) * (0.4 + m * 0.14), y - thick / 4 - m * 0.75 - ph * 3.2, m < 4 ? 2 : 1, m < 4 ? 2 : 1);
        }
      }
    }
  });
  ctx.restore();
}

export function drawKdBack(ctx, game, w, t) {
  const st = w.kd;
  if (!st) return;
  const K = st.K, T = st.T, e = st.t, lift = w.kdLift || 0;
  ctx.save(); ctx.globalAlpha = 1;
  if (lift > 0.5) {   // bóng ở lại trên đất, nhỏ dần khi lên cao
    const k = lift / K.lift, rx = Math.round(15 - 5 * k), ry = Math.max(2, Math.round(5 - 2 * k));
    ctx.fillStyle = '#0a0612'; ctx.globalAlpha = 0.5 - 0.15 * k;
    for (let yy = -ry; yy <= ry; yy++) { const half = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)); px(ctx, w.x - half / 2, w.y + yy / 2, half * 2 + 1, 1); }
  }
  const gk = e < T.in ? Math.min(1, e / T.b) : Math.max(0, 1 - (e - T.in) / 0.5);   // quầng tụ khí trên đất quanh chỗ ngồi
  if (gk > 0.01) soft(ctx, w.x, w.y - 1, 22 + 26 * gk, K.pal_khi[2], 0.28 * gk, 0.42);
  if (e >= T.in && e < T.d) soft(ctx, w.x, w.y, 20 + 1.5 * Math.sin(e * 3), K.pal_khi[2], 0.16 * Math.min(1, (e - T.in) / 0.5), 0.4);   // lơ lửng: vũng sáng nhạt trên đất ngay dưới người
  if (e >= T.d && e < T.g) soft(ctx, w.x, w.y, 30, K.pal_dan[2], 0.3 * Math.min(1, (T.g - e) / 0.6), 0.42);   // kết đan xong: đất dưới chân ánh vàng
  ctx.globalAlpha = 1;
  rings(ctx, st, false);
  drawKdWrap(ctx, st, false);   // nửa sau lưng của dòng điện cuốn quanh thân
  ctx.restore();
}

function parts(ctx, st) {
  const P = st.K.pal_khi, near = st.t >= st.T.in ? 13 : 4;   // lúc đã bay lên khí đổ vào rất dày: tan sớm hơn quanh người cho thấy rõ thân và dòng điện
  for (const q of st.parts) {
    if (q.d <= near) continue;   // hạt linh khí: đầu trắng, đuôi xanh kéo ngược hướng bay; sát đan điền thì mờ dần (khỏi che người)
    const dx = q.x - (q.ox ?? q.x), dy = q.y - (q.oy ?? q.y), len = Math.hypot(dx, dy) || 1, ux = -dx / len, uy = -dy / len, a = Math.min(1, q.life / 0.35) * Math.min(1, Math.max(0, (q.d - near) / (near * 2.2))), big = q.s > 0.72;
    const n = len > 1.6 ? 9 : 6;
    for (let k = n; k >= 1; k--) { ctx.fillStyle = k > 4 ? P[3] : P[2]; ctx.globalAlpha = a * (0.7 - k * 0.07); px(ctx, q.x + ux * k * 0.6, q.y + uy * k * 0.6, big && k < 3 ? 2 : 1, big && k < 3 ? 2 : 1); }
    ctx.fillStyle = P[q.s > 0.4 ? 0 : 1]; ctx.globalAlpha = a; px(ctx, q.x, q.y, big ? 3 : 2, big ? 3 : 2);
  }
}

// Viên đan ở đan điền: lúc tụ là đốm linh khí lớn dần; hút xong loé sáng; chịu mỗi đạo sét lại vàng và lớn thêm; thành rồi rực vàng
function dan(ctx, st, x, y) {
  const K = st.K, T = st.T, e = st.t, D = K.pal_dan, Q = K.pal_khi;
  if (e < T.in) {
    const k = Math.min(1, e / T.b), s = e > T.b ? smooth((e - T.b) / K.t.hut_in) : 0;
    soft(ctx, x, y, 4 + 4 * k + 7 * s, Q[2], 0.22 + 0.16 * k + 0.4 * s);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + 0.4 * s; ctx.fillStyle = Q[1]; px(ctx, x - 1, y - 0.5, 4, 2); px(ctx, x - 0.5, y - 1, 2, 4);
    ctx.fillStyle = Q[0]; px(ctx, x - 0.5, y - 0.5, 2, 2);
    return;
  }
  const done = e >= T.d, g = done ? 1 : st.hit / st.n, burst = Math.max(0, 1 - (e - T.in) / 0.4), tw = Math.floor(e * 8) % 2, c1 = g > 0.15 ? D[1] : Q[1];
  soft(ctx, x, y, 6 + 4 * g + 13 * burst + (done ? 3 + 1.5 * Math.sin(e * 9) : 0), g > 0.15 ? D[2] : Q[2], 0.42 + 0.3 * g + 0.4 * burst);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  const R = 1 + Math.round(g * 2);   // viên đan: đĩa nhỏ lớn dần theo số đạo sét đã chịu
  ctx.fillStyle = g > 0.5 ? D[2] : c1;
  for (let yy = -R; yy <= R; yy++) { const half = Math.round(Math.sqrt(R * R + R - yy * yy)); px(ctx, x - half / 2, y + yy / 2, half * 2, 1); }
  ctx.fillStyle = c1; px(ctx, x - R / 2 + 0.25, y - R / 2, R + 1, R);
  ctx.fillStyle = D[0]; px(ctx, x - 0.5, y - 0.5, 2, 2);
  const ray = 3 + Math.round(5 * g) + (done ? 4 : 0);   // tia lấp lánh bốn hướng, đổi chéo / thẳng
  ctx.fillStyle = c1;
  for (let m = R + 2; m <= R + ray; m++) for (const [ax, ay] of tw ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.globalAlpha = 0.85 * (1 - (m - R - 2) / ray); px(ctx, x + ax * m / 2, y + ay * m / 2); }
}

// Sóng linh lực: vành bầu dục nở rất nhanh nối nhau, lõi trắng viền vàng, kèm vệt sáng phóng ra bốn phía
function waves(ctx, st, x, y) {
  const K = st.K, T = st.T, e = st.t, D = K.pal_dan;
  if (e < T.d || e >= T.e + K.wave_life) return;
  ctx.globalCompositeOperation = 'lighter';
  const last = Math.floor((Math.min(e, T.e - 0.25) - T.d) / K.wave_gap);
  for (let i = 0; i <= last; i++) {
    const u = (e - T.d - i * K.wave_gap) / K.wave_life;
    if (u < 0 || u >= 1) continue;
    const r = K.wave_r * (1 - (1 - u) ** 2.4), a = (1 - u) ** 1.4;
    ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = D[2]; ctx.lineWidth = 1.5 + 4 * (1 - u);
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, r - 2), Math.max(1, (r - 2) * 0.62), 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.2 * a; ctx.strokeStyle = D[3]; ctx.lineWidth = 6 + 10 * (1 - u);   // quầng mờ kéo sau vành
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, r - 8), Math.max(1, (r - 8) * 0.62), 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.95 * a; ctx.strokeStyle = i % 2 ? D[0] : '#ffffff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, 0, 0, TAU); ctx.stroke();
  }
  const live = Math.min(1, (T.e - e) / 0.4);
  if (live <= 0) return;
  for (let i = 0; i < 46; i++) {   // vệt sáng phóng ra
    const ang = hash(i * 1.7) * TAU, f = (e * (1.5 + hash(i) * 1.2) + hash(i * 5.3)) % 1, d = 10 + f * 190, c = Math.cos(ang), s = Math.sin(ang) * 0.7;
    ctx.fillStyle = i % 3 ? D[1] : D[0];
    for (let k = 0; k < 9; k++) { ctx.globalAlpha = live * (1 - f) * (1 - k / 9); px(ctx, x + c * (d - k * 1.1), y + s * (d - k * 1.1), k < 2 ? 2 : 1, k < 2 ? 2 : 1); }
  }
}

// Cột sáng từ trời: một vạch trắng giáng xuống, nở thành cột vàng nhiều lớp, vệt sáng chạy dọc cột, loang trên đất; lúc hạ xuống thì thu mảnh dần
function beam(ctx, game, st, front) {
  const K = st.K, T = st.T, e = st.t, w = st.who, D = K.pal_dan, u = e - T.e;
  if (u < 0 || e >= T.g) return;
  const v = game.screen.viewRect(), top = Math.floor(v.y0) - 4, bot = Math.round(w.y) + 2, x = Math.round(w.x);
  const fall = Math.min(1, u / 0.16), open = smooth((u - 0.16) / 0.34), close = e > T.f - 0.5 ? Math.max(0, 1 - (e - (T.f - 0.5)) / (0.5 + K.t.ha * 0.8)) : 1;
  const W = Math.max(1, K.beam_w * open * close * (1 + 0.05 * Math.sin(e * 21))), A = Math.min(1, close * 1.6), y1 = top + (bot - top) * fall;
  ctx.globalCompositeOperation = 'lighter';
  if (front) {   // lớp phủ mỏng trước người: vệt sáng chạy lên dọc cột
    if (open <= 0) return;
    ctx.fillStyle = D[0];
    for (let i = 0; i < 30; i++) {
      const sx = (hash(i * 2.3) - 0.5) * W * 0.92, sp = 150 + hash(i * 7.1) * 170, yy = bot - ((e * sp + hash(i) * 400) % (bot - top)), len = 8 + Math.round(hash(i * 3.7) * 26);
      ctx.globalAlpha = 0.5 * A * (0.4 + hash(i * 9.9) * 0.6); px(ctx, x + sx, yy, 1, len);
    }
    return;
  }
  for (const [f, c, a] of [[1, D[3], 0.2], [0.76, D[2], 0.3], [0.5, D[1], 0.42], [0.2, D[0], 0.85]]) {   // cột nhiều lớp: ngoài cam mờ → lõi trắng vàng
    const ww = Math.max(f === 0.2 ? 2 : 0, Math.round(W * f * 2));
    if (ww > 0) { ctx.fillStyle = c; ctx.globalAlpha = a * A; px(ctx, x - ww / 4, top, ww, (y1 - top) * 2); }
  }
  if (open <= 0) return;
  for (let yy = top; yy < bot; yy += 3) for (const sd of [-1, 1]) {   // mép cột lởm chởm: từng đoạn sáng tắt, chạy dọc cột
    const h1 = hash(Math.floor((yy + e * 90 * sd) / 3) * 1.3 + sd * 7), far = h1 > 0.85 ? 2 : h1 > 0.6 ? 1 : 0.5;
    if (h1 > 0.42) { ctx.fillStyle = h1 > 0.8 ? D[1] : D[2]; ctx.globalAlpha = 0.34 * A * h1; px(ctx, x + sd * (W / 2 + far) - (sd < 0 ? 0.5 : 0), yy, 1, 6); }
  }
  soft(ctx, x, bot - 1, W * 1.7, D[2], 0.75 * A, 0.36);   // loang sáng trên đất, vành sáng lan ra từng nhịp
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = D[1]; ctx.lineWidth = 1;
  for (const off of [0, 0.5]) {
    const rr = (e * 1.4 + off) % 1;
    ctx.globalAlpha = 0.6 * A * (1 - rr); ctx.beginPath(); ctx.ellipse(x, bot - 1, W * (0.55 + rr * 1.5), W * (0.55 + rr * 1.5) * 0.34, 0, 0, TAU); ctx.stroke();
  }
}

export function drawKdFront(ctx, game, t) {
  const L = game.kdSee?.length ? (game.kd ? [game.kd, ...game.kdSee] : game.kdSee) : game.kd ? [game.kd] : null;
  if (!L) return;
  for (const st of L) {
    const w = st.who, K = st.K, T = st.T, e = st.t, lift = w.kdLift || 0, x = w.x, y = w.y - K.dan_y - lift;
    ctx.save();
    if (e >= T.e) {   // cột sáng: vẽ cột, rồi vẽ lại người bên trên cho rõ dáng, rồi vệt sáng phủ ngoài
      beam(ctx, game, st, false);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(0, -lift); drawHero(ctx, game, w, t, false, w === game.player ? game.save : { look: w.look, outfit: w.outfit, pt: w.pt || null }); ctx.restore();
      beam(ctx, game, st, true);
    }
    ctx.globalCompositeOperation = 'lighter';
    parts(ctx, st);
    ctx.globalAlpha = 1;
    rings(ctx, st, true);
    if (e >= T.d && e < T.e) soft(ctx, x, y - 3, 20 + 3 * Math.sin(e * 10), K.pal_dan[2], 0.5 * Math.min(1, (T.e - e) / 0.5));   // người rực vàng lúc phát sóng
    waves(ctx, st, x, y - 2);
    dan(ctx, st, x, y);
    drawKdWrap(ctx, st, true);
    drawKdBolts(ctx, game, st);
    ctx.restore();
  }
}
