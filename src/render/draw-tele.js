// Khung đỏ báo đòn của boss (chủ dự án 16/11/2026 15:07: "nếu là boss chuẩn bị công kích một vùng nào đó, trước một khoảng thời gian ngắn vùng
// hoặc hướng đó sẽ phải làm một khung đỏ cảnh báo"). m.tele do src/game/mobs.js đặt, đội trưởng gửi cho cả đội (party-sync.js):
//   circle = chém vòng quanh boss (đúng bán kính đòn), line = lao thẳng (làn rộng bằng thân, dài đúng đường lao, mũi tên chạy theo hướng lao),
//   nova = vòng đạn (14 tia đúng hướng đạn sẽ bay, a = góc tia đầu).
// Vòng lửa rơi của boss và sét thiên kiếp (game.strikes) cùng kiểu khung (sét giữ màu xanh). Nét ô điểm ảnh bám lưới (vfx/pfx-shape.js, một ô
// = một đơn vị bản đồ): nền mờ cả vùng, phần đầy dần tới lúc ra đòn, viền màu có lót tối cho rõ trên tuyết, cát; từ tiến độ hot viền nháy trắng.
// Lớp dưới chân (trước người, quái); ban đêm, trong hầm vẫn sáng vì khung là nguồn sáng (draw-lights.js). Số ở data/juice.json → mob2.tele.
import { pfxBegin } from './vfx/pfx.js';
import { drawScorch } from './draw-trib.js';
import { pxArc, pxLine, pxRing, pxDot } from './vfx/pfx-shape.js';

const DEF = { fill: 0.16, full: 0.28, edge: 0.95, hot: 0.78, hz: 14, red: '#ff3448', hot_c: '#ffe0e4', dark: '#4a0612' };
const S = game => game.data.juice?.mob2?.tele || DEF;
const BLUE = ['#78dcff', '#e8fbff', '#0a2a4a'];
const TAU = Math.PI * 2;
const edge = (k, t, Q, P) => (k >= Q.hot && Math.floor(t * Q.hz) % 2 === 0 ? P[1] : P[0]);   // nhịp cuối: viền nháy sáng

// Vùng tròn tâm (x, y) bán kính r, tiến độ k (0 → 1 lúc ra đòn); P = [màu, màu nháy, màu lót]
function zone(ctx, x, y, r, k, t, Q, P) {
  const c = edge(k, t, Q, P), kk = Math.min(1, Math.max(0, k));
  pxRing(ctx, x, y, r, r, r, P[0], Q.fill, 2);
  if (kk > 0.03) pxRing(ctx, x, y, r * kk, r * kk, r, P[0], Q.full, 2);
  pxArc(ctx, x, y, r + 1, 1, 0, TAU, 1, P[2], Q.edge * 0.6, 2);
  pxArc(ctx, x, y, r, 1, 0, TAU, 2, c, Q.edge, 2);
  for (let i = 0; i < 4; i++) {   // bốn vạch ngắm ngoài viền, xoay chậm
    const a = i * Math.PI / 2 + t * 0.7, ca = Math.cos(a), sa = Math.sin(a);
    pxLine(ctx, [[x + ca * (r + 2), y + sa * (r + 2)], [x + ca * (r + 5), y + sa * (r + 5)]], 1, c, Q.edge, 2);
  }
}

// Làn lao: từ chân boss theo góc a, dài len, rộng bằng thân. Nền vẽ bằng phép xoay thường (trước khi nét ô đặt lại phép biến đổi), viền và mũi tên bằng ô.
function laneFill(ctx, m, tl, Q) {
  const w = m.r, k = Math.min(1, Math.max(0, tl.k));
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(tl.a); ctx.fillStyle = Q.red;
  ctx.globalAlpha = Q.fill; ctx.fillRect(0, -w, tl.len, 2 * w);
  ctx.globalAlpha = Q.full; ctx.fillRect(0, -w, tl.len * k, 2 * w);
  ctx.restore();
}
function lane(ctx, m, tl, t, Q) {
  const ca = Math.cos(tl.a), sa = Math.sin(tl.a), w = m.r, L = tl.len, k = Math.min(1, Math.max(0, tl.k)), c = edge(k, t, Q, [Q.red, Q.hot_c]);
  const P = (u, v) => [m.x + ca * u - sa * w * v, m.y + sa * u + ca * w * v];
  pxLine(ctx, [P(0, 1.1), P(L, 1.1), P(L, -1.1), P(0, -1.1)], 1, Q.dark, Q.edge * 0.6, 2);
  pxLine(ctx, [P(0, 1), P(L, 1), P(L, -1), P(0, -1)], 2, c, Q.edge, 2);
  for (let d = 10 + (t * 80) % 24; d < L - 4; d += 24) pxLine(ctx, [P(d - 5, 0.6), P(d, 0), P(d - 5, -0.6)], 2, c, Q.edge * (0.45 + 0.55 * k), 2);   // mũi tên chạy theo hướng lao
}

// Vòng đạn: vòng tụ lực quanh thân, 14 tia dài dần theo tiến độ, đầu tia một chấm
function nova(ctx, m, tl, t, Q) {
  const k = Math.min(1, Math.max(0, tl.k)), c = edge(k, t, Q, [Q.red, Q.hot_c]), r0 = tl.r + 3, r1 = r0 + 12 + 36 * k;
  pxArc(ctx, m.x, m.y, tl.r + 1, 1, 0, TAU, 1, c, Q.edge, 2);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU + (tl.a || 0), ca = Math.cos(a), sa = Math.sin(a);
    pxLine(ctx, [[m.x + ca * r0, m.y + sa * r0], [m.x + ca * r1, m.y + sa * r1]], 1, c, Q.edge * (0.4 + 0.6 * k), 2);
    pxDot(ctx, m.x + ca * (r1 + 1.5), m.y + sa * (r1 + 1.5), 2, c, Q.edge, 2);
  }
}

// Gọi từ draw.js drawMob (lớp dưới chân) khi m.tele có
export function drawTele(ctx, game, m, t) {
  const tl = m.tele, Q = S(game);
  ctx.save();
  if (tl.type === 'line') laneFill(ctx, m, tl, Q);
  pfxBegin(ctx);
  if (tl.type === 'line') lane(ctx, m, tl, t, Q);
  else if (tl.type === 'nova') nova(ctx, m, tl, t, Q);
  else zone(ctx, m.x, m.y, tl.r, tl.k, t, Q, [Q.red, Q.hot_c, Q.dark]);
  ctx.restore();
}

// Đòn từ trời chưa giáng (src/game/strikes.js): khung tròn đúng bán kính, đầy dần tới lúc giáng
export function drawStrikeMarks(ctx, game, t) {
  drawScorch(ctx, game, t);   // vết cháy thiên lôi trên đất (draw-trib.js)
  if (!game.strikes.length) return;
  const Q = S(game), red = [Q.red, Q.hot_c, Q.dark];
  ctx.save(); pfxBegin(ctx);
  for (const s of game.strikes) if (!s.hit) zone(ctx, s.x, s.y, s.r, s.t / s.delay, t, Q, s.kind === 'thunder' ? BLUE : red);
  ctx.restore();
}

// Nguồn sáng của khung (draw-lights.js gatherLights): ban đêm, trong hầm khung không bị tối che
export function teleLights(game, out) {
  for (const m of game.mobs) {
    const tl = m.tele;
    if (!tl || m.dead) continue;
    if (tl.type === 'line') out.push({ x: m.x + Math.cos(tl.a) * tl.len / 2, y: m.y + Math.sin(tl.a) * tl.len / 2, r: tl.len * 0.6, c: '255,52,72', a: 0.5 });
    else out.push({ x: m.x, y: m.y, r: (tl.type === 'nova' ? tl.r + 40 : tl.r) * 1.15, c: '255,52,72', a: 0.5 });
  }
  for (const s of game.strikes) if (!s.hit) out.push({ x: s.x, y: s.y, r: s.r * 1.2, c: s.kind === 'thunder' ? '120,220,255' : '255,52,72', a: 0.45 });
}
