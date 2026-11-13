// Hiệu ứng chiêu điểm ảnh (chủ dự án 13/11/2026: bỏ ảnh GPT, làm lại bằng PixelFX). Công thức từng chiêu ở data/vfx.json → px,
// hình pfx.* (tools/art/pfx/). File này chỉ giữ trạng thái: game.vfx.px = hình đang diễn, game.vfx.pp = hạt điểm ảnh; vẽ ở
// src/render/vfx/draw-pfx.js. src/game/vfx.js gọi sang đây trước; chiêu chưa có công thức px (hoặc px đang tắt) thì dùng hiệu ứng cũ.
// game.vfx.pz = vùng chiêu của người khác (chỉ hình: không nằm trong game.zones nên phải tự giữ tới khi hết giờ).
//
// Công thức một chiêu: {
//   cast: [nhịp...]   lúc tung          hit: [nhịp...]  đạn trúng / hết tầm     boom: [nhịp...]  đạn nổ lan (không có thì dùng hit)
//   mob:  [nhịp...]   mỗi con quái trúng chiêu vùng, đường lướt
//   shot: { s, trail, rate, back, emerge } hình viên đạn (hình có hướng), hạt đuôi (tên dải màu ở vfx.json → part_px), số hạt mỗi giây,
//                                        hạt sinh sau đầu đạn back đơn vị; emerge: hình dài chui dần ra trong emerge đơn vị đầu
//   zone: { g, s, trail, rate, orbit }   vùng kéo dài: g hình lặp lớp đất, s hình lặp lớp nổi, hạt bốc trong vùng, orbit { s, n, r, spd } hình bay vòng quanh tâm
//   self: { g, s, dy }                   hình lặp bọc người (khiên, tăng sức): g lớp dưới chân, s lớp nổi
//   dash: { s, go, trail, end: [nhịp] }  chiêu lướt: hình bay dọc đường lướt trong go giây (có bóng mờ kéo sau), tới nơi thì diễn các nhịp end
//   spray: [tên dải màu, số hạt, tốc độ] hạt tóe lúc tung / lúc trúng }
// Một nhịp: { s: tên hình, at: 'me' (chân người tung, mặc định) | 'hand' | 'c' (tâm chiêu) | 'start' (đầu đường lướt), dx, dy, delay,
//   dir: 1 (xoay theo hướng mặt / hướng đạn), flip: 1 (lật khi quay trái), k (phóng), a, g: 1 (nằm dưới chân người, quái), on: 1 (bám theo người), rate }
import { hitSfx, zoneSfx } from './skill-sfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const st = game => { const S = (game.vfx ??= { fx: [], parts: [] }); S.px ??= []; S.pp ??= []; S.pz ??= []; return S; };

// Bật / tắt: vfx.json → px_on (bật cho mọi người từ 13/11/2026 08:04, chủ dự án duyệt); địa chỉ ?pfx=1 / ?pfx=0 ghi đè và nhớ trên máy đó (so bộ cũ, bộ mới)
let ON = null;   // một trang một game: hỏi một lần rồi nhớ
function enabled(game) {
  if (ON != null) return ON;
  let v = null;
  try { const q = new URLSearchParams(location.search).get('pfx'); if (q != null) localStorage.setItem('p2d-pfx', q); v = localStorage.getItem('p2d-pfx'); } catch { /* không có kho nhớ: theo mặc định */ }
  ON = v != null ? v === '1' : !!game.data.vfx?.px_on;
  game.pfxOn = ON;
  return ON;
}
export const pxOn = enabled;   // hiệu ứng điểm ảnh có đang bật không (bộ vẽ riêng của chiêu hệ kiếm hỏi)
export const pxOf = (game, id) => (id && enabled(game) && game.data.vfx?.px?.[id]) || null;
const durOf = (game, s) => game.data.art.sprites['pfx.' + s]?.dur || 0.5;
const lightOf = (game, s) => { const q = game.data.art.sprites['pfx.' + s]; return q ? Math.max(q.w, q.h) * (q.k || 0.5) * 0.45 : 0; };   // bán kính quầng sáng hắt ra đất (lớp tối ngày đêm)

function play(game, c, x, y, o = {}) {
  st(game).px.push({ s: c.s, x: x + (c.dx || 0), y: y + (c.dy || 0), t: -(c.delay || 0), dur: durOf(game, c.s), dir: c.dir ? o.dir || 0 : null, flip: !!(c.flip && o.face?.x < 0),
    k: c.k || 1, a: c.a ?? 1, g: !!c.g, on: c.on ? o.who : null, ox: c.dx || 0, oy: c.dy || 0, rate: c.rate || 1, col: c.col || o.col, lr: c.g ? 0 : c.lr ?? lightOf(game, c.s) });
}

// Thêm thẳng một hình đang diễn (đòn pháp bảo, src/game/pb-px.js): o = { s, x, y } + tuỳ chọn k, a, dir, snap, rot, pal (dải màu đổi sang), g (lớp
// dưới chân), on + ox, oy (bám theo người), loop + dur, fo (giây mờ dần lúc cuối), delay, vx, vy (trôi đều), col (màu hắt sáng), sw (bay từ điểm này tới điểm kia),
// rc { x, y, k } (giật lùi lúc đầu rồi về chỗ: lệch (x, y) tắt dần theo e^(-k·t); chỉ với hình bám theo người)
export function pxAdd(game, o) {
  const f = { dur: durOf(game, o.s), dir: null, flip: false, k: 1, a: 1, g: false, on: null, rate: 1, ...o, t: -(o.delay || 0) };
  f.lr ??= f.g || !f.col ? 0 : lightOf(game, f.s) * Math.min(2, f.k);
  st(game).px.push(f);
  return f;
}

// Hạt điểm ảnh tóe quanh (x, y): ramp = tên dải màu (vfx.json → part_px)
export function pxSpray(game, name, x, y, n, spd = 40, o = {}) {
  const P = game.data.vfx.part_px?.[name];
  if (!P || !n) return;
  const S = st(game), cap = (game.data.vfx.max_parts || 260) * (+(globalThis.document?.body?.dataset.perf || 0) >= 3 ? 0.5 : 1);
  for (let i = 0; i < n; i++) {
    if (S.pp.length >= cap) S.pp.shift();
    const a = o.dir != null ? o.dir + rnd(-1, 1) * (o.cone ?? 0.6) : rnd(0, Math.PI * 2), v = spd * rnd(0.35, 1);
    S.pp.push({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: Math.cos(a) * v, vy: Math.sin(a) * v * (o.dir != null ? 1 : 0.7) - (P.up || 0) * 0.4, g: P.g ?? 0, drag: P.drag ?? 1.8,
      t: 0, life: rnd(0.3, 0.7) * (o.life || 1), s: Math.random() < (P.big ?? 0.3) ? 2 : 1, ramp: P.c, add: P.add !== false });
  }
}

export function pxCast(game, id, s, who, info = {}) {
  const R = pxOf(game, id);
  if (!R) return false;
  const face = who.face || { x: 1, y: 0 }, dash = info.sx != null, dir = dash ? Math.atan2(who.y - info.sy, who.x - info.sx) : Math.atan2(face.y, face.x);
  const cx = info.cx ?? info.zone?.x ?? who.x, cy = info.cy ?? info.zone?.y ?? who.y;   // tâm chiêu: chiêu vùng tức thời, vùng kéo dài, không thì chân người tung
  for (const c of R.cast || []) {
    const [x, y] = c.at === 'hand' ? [who.x + face.x * 9, who.y - 10 + face.y * 7] : c.at === 'c' ? [cx, cy] : c.at === 'start' && dash ? [info.sx, info.sy] : [who.x, who.y];
    play(game, c, x, y, { dir, who, col: s.color, face });
  }
  if (R.dash && dash) {   // hình bay từ đầu đường lướt tới chỗ người vừa đáp
    const D = R.dash, go = D.go || 0.2;
    st(game).px.push({ s: D.s, x: info.sx, y: info.sy - 8, t: 0, dur: go + 0.16, dir, flip: false, k: D.k || 1, a: 1, g: false, on: null, rate: 1, col: s.color, loop: true,
      sw: { x0: info.sx, y0: info.sy - 8, x1: who.x, y1: who.y - 8, go, end: D.end, trail: D.trail, acc: 0 } });
  }
  if (R.self) { if (s.type === 'shield') who.shieldSk = id; else who.buffSk = id; }
  if (info.zone) { info.zone.sk = id; if (R.zone && !game.zones.includes(info.zone)) st(game).pz.push({ t: 0, ...info.zone }); }
  if (R.spray) pxSpray(game, R.spray[0], cx, cy - 4, R.spray[1], R.spray[2] || 50);
  return true;
}

export function pxMobHit(game, id, m) {
  const R = pxOf(game, id);
  if (!R) return false;
  hitSfx(game, id, 0.5);
  for (const c of R.mob || []) play(game, c, m.x, m.y, { col: game.data.skills[id]?.color });
  if (R.spray) pxSpray(game, R.spray[0], m.x, m.y - 6, Math.ceil(R.spray[1] / 3), 40);
  return true;
}

export function pxHit(game, b, x, y, big = 0) {
  const R = pxOf(game, b.sk);
  if (!R) return false;
  hitSfx(game, b.sk, big ? 0.9 : 0.7, !!big);
  const dir = Math.atan2(b.vy, b.vx);
  for (const c of (big && R.boom) || R.hit || []) play(game, c, x, y, { dir, col: b.color, face: { x: b.vx } });
  const tr = R.shot?.trail || R.spray?.[0];
  if (tr) pxSpray(game, tr, x, y - 3, big ? 12 : 7, big ? 80 : 55);
  return true;
}

export function updatePx(game, dt) {
  const S = game.vfx;
  if (!S?.px) return;
  for (const f of S.px) {
    f.t += dt * f.rate;
    if (f.on) { const r = f.rc ? Math.exp(-Math.max(0, f.t) * f.rc.k) : 0; f.x = f.on.x + (f.ox || 0) + (r ? f.rc.x * r : 0); f.y = f.on.y + (f.oy || 0) + (r ? f.rc.y * r : 0); }
    else if (f.vx != null && f.t > 0) { f.x += f.vx * dt; f.y += f.vy * dt; }
    const w = f.sw;
    if (!w) continue;
    const u = Math.min(1, f.t / w.go), e = 1 - (1 - u) ** 2;   // lao nhanh rồi chậm lại ở cuối
    f.x = w.x0 + (w.x1 - w.x0) * e; f.y = w.y0 + (w.y1 - w.y0) * e;
    if (u < 1 && w.trail) for (w.acc += dt * 90; w.acc >= 1; w.acc--) pxSpray(game, w.trail, f.x, f.y, 1, 26);
    if (u >= 1 && !w.done) { w.done = true; for (const c of w.end || []) play(game, c, w.x1, w.y1, { dir: f.dir, col: f.col }); if (w.trail) pxSpray(game, w.trail, w.x1, w.y1, 10, 70); }
  }
  S.px = S.px.filter(f => f.t < f.dur);
  for (const q of S.pp) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; const d = Math.max(0, 1 - dt * q.drag); q.vx *= d; q.vy *= q.g ? 1 : d; }
  S.pp = S.pp.filter(q => q.t < q.life);
  for (const b of game.bullets) {
    const R = b.sk && pxOf(game, b.sk);
    if (!R?.shot) continue;
    if (b.pt == null) { b.ox = b.x; b.oy = b.y; }   // chỗ viên đạn xuất hiện (hình dài chui ra từ đó, draw-pfx.js)
    b.pt = (b.pt || 0) + dt;
    if (!R.shot.trail) continue;
    b.pacc = (b.pacc || 0) + dt * (R.shot.rate || 14);
    const sp = Math.hypot(b.vx, b.vy) || 1, P = game.data.vfx.part_px?.[R.shot.trail];
    while (P && b.pacc >= 1) {
      b.pacc--;
      if (S.pp.length >= (game.data.vfx.max_parts || 260)) S.pp.shift();
      S.pp.push({ x: b.x - b.vx / sp * (R.shot.back ?? 6) + rnd(-2, 2), y: b.y - b.vy / sp * (R.shot.back ?? 6) + rnd(-2, 2), vx: -b.vx * 0.12 + rnd(-9, 9), vy: -b.vy * 0.12 + rnd(-9, 9) - (P.up || 0) * 0.3,
        g: P.g ?? 0, drag: P.drag ?? 1.8, t: 0, life: rnd(0.25, 0.55), s: Math.random() < (P.big ?? 0.3) ? 2 : 1, ramp: P.c, add: P.add !== false });
    }
  }
  for (const z of S.pz) z.t += dt;
  if (S.pz.length) S.pz = S.pz.filter(z => z.t < z.dur);
  for (const z of game.zones) if (z.sk) zoneSfx(game, z, dt);   // tiếng nền của vùng (lửa cháy, băng rít…): chỉ vùng của mình và của đối thủ so tài
  for (const z of S.pz.length ? game.zones.concat(S.pz) : game.zones) {   // vùng kéo dài: hạt bốc lên rải rác trong vùng
    const R = z.sk && pxOf(game, z.sk), P = R?.zone?.trail && game.data.vfx.part_px?.[R.zone.trail];
    if (!P) continue;
    z.pacc = (z.pacc || 0) + dt * (R.zone.rate || 8);
    while (z.pacc >= 1) {
      z.pacc--; const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * z.radius;
      S.pp.push({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d * 0.6, vx: rnd(-5, 5), vy: -rnd(8, 22) - (P.up || 0) * 0.3, g: P.g ? P.g * 0.2 : 0, drag: 0.4, t: 0, life: rnd(0.6, 1.1), s: 1, ramp: P.c, add: P.add !== false });
    }
  }
}
