// Vẽ đòn pháp bảo bằng điểm ảnh (chủ dự án 13/11/2026: bỏ hết ảnh GPT trong hiệu ứng chiêu; chạy khi px bật, không thì src/render/draw-phap-bao.js).
// Ghép ba thứ: hình dựng sẵn pfx.pb-* (món pháp bảo; Hồ Lô là tranh gốc của chủ dự án thu về cỡ điểm nhân vật, tools/art/pb_vat.py; hiệu ứng quanh
// món vẽ bằng code, đổi màu theo hệ khảm), nét điểm ảnh vẽ thẳng cho
// phần rộng bằng cả vùng đòn (vành xung kích, vòng trận, mặt sóng: ./vfx/pfx-shape.js) và hạt (src/game/pb-px.js rải). Hai lớp như mọi chiêu:
// drawPbGround (dưới chân người, quái: vòng trận, vòng nhắm, sóng lan) và drawPbPx (trên cùng: vật bay, vật lơ lửng, dấu trạng thái trên quái).
import { pfxBegin, pfxDraw, pfxWarm } from './vfx/pfx.js';
import { pfxTint } from './vfx/pfx-pal.js';
import { pxRing, pxArc, pxLine, pxDot, pxGlow } from './vfx/pfx-shape.js';
import { darkness } from './draw-lights.js';
import { pbRamp, pbK, pbVis, pbSeal, pbGourd } from '../game/pb-px.js';
import { pbWorn } from '../game/phap-bao.js';

const TAU = Math.PI * 2, GOLD = '#ffd25a';
const cfg = game => game.data.vfx.pb;
const lightK = game => (+(document.body.dataset.perf || 0) >= 3 ? 0 : (game.data.vfx.px_light?.[0] ?? 0.6) + (game.data.vfx.px_light?.[1] ?? 0.4) * darkness(game));   // như draw-pfx.js: máy ở mức nhẹ nhất thì bỏ lớp sáng cộng
const rc = (R, u) => R[Math.max(0, Math.min(R.length - 1, Math.round(u * (R.length - 1))))];   // màu ở vị trí u (0 tối .. 1 sáng) của dải
const lookOf = e => e.cast?.look || {};
const domeDy = art => { const q = art.sprites['pfx.pb-khien']; return q ? (q.h / 2 - q.anchor[1]) * 0.5 : 0; };   // tâm vòm khiên lệch khỏi điểm neo (đơn vị bản đồ khi k = 1): vẽ sao cho tâm vòm nằm ngang ngực

// ---- tải sẵn hình và đổi màu sẵn cho các món đang mặc (mỗi khung một tấm, khỏi khựng lúc đánh)
const COMMON = ['pb-tran-mo', 'pb-trung', 'pb-no', 'pb-manh'];
const BY_LOOK = { kiem: ['pb-kiem', 'pb-kiem-khi'], chau: ['pb-chau', 'pb-chau-duoi'], quat: ['pb-quat', 'pb-phong'], an: ['pb-an', 'dia-chan', 'dia-chan-d'], khien: ['pb-khien'], am: ['pb-chuong'], tran: ['pb-co', 'pb-tran'], holo: ['pb-holo', 'pb-holo-phun', 'pb-holo-xoay', 'pb-holo-tia', 'pb-holo-song'] };
const BY_EL = { hoa: ['tt-lua'], thuy: ['tt-bang', 'tt-lanh'], moc: ['tt-re'], kim: ['tt-pha'] };
let sig = null;
const jobs = [];
function warm(game, art, C) {
  const worn = pbWorn(game).filter(Boolean), s = worn.map(it => `${it.uid}:${(it.mods || []).join('+')}`).join('|');
  if (s !== sig) {
    sig = s; jobs.length = 0;
    const T = game.data['phap-bao'].types;
    for (const it of worn) {
      const els = (it.mods || []).filter(m => C.ramps[m]), names = [...COMMON, ...(BY_LOOK[T[it.type]?.emit.look] || [])];
      for (const el of els) names.push(...(BY_EL[el] || []), C.hit[el], C.boom[el]);
      if ((it.mods || []).includes('loi-kich')) names.push('pb-set', 'set-dat');
      for (const n of names) if (n) { pfxWarm(art, n); if (art.sprites['pfx.' + n]?.pal) for (const pal of [C.base[it.type], ...els]) jobs.push([n, pal, 0]); }
    }
  }
  const j = jobs[0];
  if (j && (pfxTint(art, j[0], C.ramps, j[1]) !== undefined || ++j[2] > 600)) jobs.shift();
}

// ---- vành theo phẩm quanh đòn vùng (Huyền trở lên): thêm vòng mảnh ngoài rìa, phẩm Thiên vòng ngoài cùng màu vàng
function auraRings(ctx, e, x, y, r, sy, R, a) {
  const L = lookOf(e);
  for (let i = 0; i < (L.aura || 0); i++) pxRing(ctx, x, y, r * (1.05 + i * 0.06), r * (1.05 + i * 0.06) * sy, 1, L.gold && i === L.aura - 1 ? GOLD : rc(R, 0.75), (0.55 - i * 0.12) * a);
}

// ===================== LỚP DƯỚI CHÂN =====================
function zoneG(ctx, game, art, e, C, R, pal) {
  const N = e.node, sy = C.sy, a = Math.min(1, e.t / 0.25, (e.life - e.t) / 0.4);
  if (a <= 0) return;
  pxRing(ctx, e.x, e.y, N.r, N.r * sy, N.r, rc(R, 0), 0.2 * a);   // nền sẫm trong vùng cho phù văn nổi lên
  pfxDraw(ctx, art, 'pb-tran', e.x, e.y, e.t, { loop: true, k: pbK(game, e, 'tran'), a, pal, light: 0 });   // tấm lớn: không vẽ lớp sáng (nặng; ánh sáng vùng đã có ở lớp tối ngày đêm)
  pxRing(ctx, e.x, e.y, N.r, N.r * sy, 1, rc(R, 0.55), 0.9 * a);
  pxArc(ctx, e.x, e.y, N.r * 0.94, sy, 0, TAU, 1, rc(R, 0.85), 0.85 * a, 2, [0.14, 0.09], e.t * 0.45);   // vòng nét đứt xoay
  pxArc(ctx, e.x, e.y, N.r * 0.74, sy, 0, TAU, 1, rc(R, 0.7), 0.6 * a, 2, [0.05, 0.08], -e.t * 0.6);     // vòng chấm xoay ngược
  for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + e.t * 0.45, x = e.x + Math.cos(an) * N.r * 0.84, y = e.y + Math.sin(an) * N.r * 0.84 * sy; pxDot(ctx, x, y, 3, rc(R, 0.5), 0.9 * a, 2); pxDot(ctx, x, y, 1, '#ffffff', a, 2); }   // tám mắt trận
  if (e.t < 0.3) { const u = e.t / 0.3, rr = N.r * (0.2 + 0.9 * (1 - (1 - u) ** 2)); pxRing(ctx, e.x, e.y, rr, rr * sy, 3, '#ffffff', 1 - u); }   // lóe lúc cắm cờ
  const pu = e.px.pulse != null ? (e.t - e.px.pulse) / 0.45 : 2;   // nhịp trận: vành sáng nở từ gốc cờ
  if (pu >= 0 && pu < 1) { const rr = N.r * (0.12 + 0.88 * (1 - (1 - pu) ** 2)); pxRing(ctx, e.x, e.y, rr, rr * sy, 2, rc(R, 0.85), (1 - pu) * 0.85 * a); pxRing(ctx, e.x, e.y, rr - 2, (rr - 2) * sy, 1, '#ffffff', (1 - pu) * 0.7 * a); }
  auraRings(ctx, e, e.x, e.y, N.r, sy, R, a);
  pxGlow(ctx, e.x, e.y, 34, rc(R, 0.6), 0.3 * a, sy);   // quầng nhỏ ở gốc cờ (quầng phủ cả vùng thì quá nặng)
}

function sealG(ctx, e, C, R) {
  const N = e.node, sy = C.sy, k = Math.min(1, e.t / e.life), sh = N.r * (0.25 + 0.6 * k * k), blink = 0.5 + 0.5 * Math.sin(e.t * (9 + 30 * k));
  pxRing(ctx, e.x, e.y, sh, sh * sy, sh, '#0a0812', 0.16 + 0.34 * k);   // bóng khối ấn lớn dần
  pxArc(ctx, e.x, e.y, N.r, sy, 0, TAU, 2, rc(R, 0.7), 0.45 + 0.45 * blink, 2, [0.2, 0.13], -e.t * 1.3);   // vòng nhắm nét đứt, nháy nhanh dần
  pxRing(ctx, e.x, e.y, N.r * (1 - 0.78 * k), N.r * (1 - 0.78 * k) * sy, 1, rc(R, 0.9), 0.75);   // vòng thu về tâm: tới tâm là lúc ấn giáng
  auraRings(ctx, e, e.x, e.y, N.r, sy, R, 0.8);
  pxGlow(ctx, e.x, e.y, Math.min(60, N.r * 0.6), rc(R, 0.6), 0.12 + 0.25 * k, sy);
}

function ringG(ctx, e, C, R) {   // sóng âm Đồng Chung: ba vành nở nối nhau, vành đầu có lõi trắng
  if (e.t < 0) return;
  const N = e.node, sy = C.sy, k = Math.min(1, e.t / e.life), fade = 1 - k * k;
  for (let i = 2; i >= 0; i--) {
    const kk = k - i * 0.17;
    if (kk <= 0.03) continue;
    const r = N.r * kk, al = fade * (1 - i * 0.3);
    pxRing(ctx, e.x, e.y, r + 1, (r + 1) * sy, 1, rc(R, 0.25), al * 0.8);
    pxRing(ctx, e.x, e.y, r, r * sy, i ? 2 : 3, rc(R, i ? 0.5 : 0.7), al);
    if (!i) pxRing(ctx, e.x, e.y, r - 1, (r - 1) * sy, 1, '#ffffff', al);
  }
  auraRings(ctx, e, e.x, e.y, N.r * k, sy, R, fade);
  pxGlow(ctx, e.x, e.y, Math.min(70, N.r * k), rc(R, 0.6), 0.3 * fade, sy);
}

function blastG(ctx, e, C, R) {   // vành xung kích của vụ nổ
  const sy = C.sy, k = Math.min(1, e.t / e.life), r = e.r * (0.3 + 0.8 * (1 - (1 - k) ** 2)), al = 1 - k;
  pxRing(ctx, e.x, e.y, r + 1, (r + 1) * sy, 1, rc(R, 0.25), al * 0.7);
  pxRing(ctx, e.x, e.y, r, r * sy, 2, rc(R, 0.7), al);
  if (k < 0.5) pxRing(ctx, e.x, e.y, r - 1, (r - 1) * sy, 1, '#ffffff', 1 - k * 2);
  if (e.cast) auraRings(ctx, e, e.x, e.y, r, sy, R, al);
}

function suckG(ctx, game, e, C, R) {   // linh khí quanh mình bị Hồ Lô hút: ba nhánh xoáy trôn ốc trên mặt đất cuộn dần về chân người, càng vào trong càng sáng
  const p = game.player, r0 = e.cast.T.pre.r, a = Math.min(1, e.t * 5), k = Math.min(1, e.t / e.life);
  for (let i = 0; i < 3; i++) {
    const pts = [], hot = [];
    for (let j = 0; j <= 26; j++) { const u = j / 26, r = r0 * (1 - 0.9 * u), an = i * TAU / 3 + u * 4.4 - e.t * (3 + 4 * k); (u < 0.6 ? pts : hot).push([p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * C.sy]); if (u >= 0.56 && u < 0.6) hot.push(pts[pts.length - 1]); }
    pxLine(ctx, pts, 1, rc(R, 0.5), 0.5 * a, 2); pxLine(ctx, hot, 2, rc(R, 0.8), 0.85 * a, 2); pxLine(ctx, hot.slice(-6), 1, '#ffffff', 0.9 * a, 2);
  }
  pxRing(ctx, p.x, p.y, r0, r0 * C.sy, 1, rc(R, 0.55), 0.35 * a * (1 - k));   // mép vùng hút, mờ dần
  pxGlow(ctx, p.x, p.y, 44, rc(R, 0.6), 0.22 * a, C.sy);
}

export function drawPbGround(ctx, game) {
  const S = game.pbx, C = cfg(game);
  if (!S?.list.length || !C) return;
  const art = game.data.art;
  for (const e of S.list) {
    if (!e.px) continue;
    const pal = pbRamp(game, e), R = C.ramps[pal];
    switch (e.kind) {
      case 'zone': zoneG(ctx, game, art, e, C, R, pal); break;
      case 'seal': sealG(ctx, e, C, R); break;
      case 'ring': ringG(ctx, e, C, R); break;
      case 'blast': blastG(ctx, e, C, R); break;
      case 'suck': suckG(ctx, game, e, C, R); break;
    }
  }
}

// ===================== LỚP TRÊN CÙNG =====================
function shot(ctx, game, art, e, R, pal) {
  const N = e.node, L = lookOf(e), dir = Math.atan2(e.vy, e.vx), ux = Math.cos(dir), uy = Math.sin(dir), look = N.look === 'kiem' ? 'kiem' : N.look === 'chau' ? 'chau' : 'manh';
  const K = pbK(game, e, look), s = 'pb-' + look, o = { dir, snap: 1, loop: true, k: K, pal }, chau = look === 'chau', kiem = look === 'kiem';
  const b0 = (chau ? 5 : kiem ? 8 : 3) * K, tail = (chau ? 11 : kiem ? 12 : 5) * K, at = d => [e.x - ux * d, e.y - uy * d];
  if (chau) pfxDraw(ctx, art, 'pb-chau-duoi', e.x, e.y, e.t, { ...o, a: Math.min(1, e.t * 6) });   // Linh Châu: đuôi sao chổi
  else { pxLine(ctx, [at(b0), at(b0 + tail)], 1, rc(R, 0.5), 0.55); pxLine(ctx, [at(b0), at(b0 + tail * 0.5)], 1, rc(R, 0.85), 0.85); }   // kiếm, mảnh: vệt bay (nét màu dài, nét sáng ngắn)
  for (let j = L.trail || 0; j >= 1; j--) pfxDraw(ctx, art, s, e.x - ux * j * (kiem ? 6 : 4.5) * K, e.y - uy * j * (kiem ? 6 : 4.5) * K, e.t, { ...o, a: 0.38 * (1 - j / (L.trail + 1.6)), light: 0 });   // bóng mờ nối đuôi theo phẩm (không lớp sáng)
  pfxDraw(ctx, art, s, e.x, e.y, e.t, o);
  if (kiem && L.aura) pfxDraw(ctx, art, 'pb-kiem-khi', e.x, e.y, e.t, { ...o, pal: L.gold ? 'vang' : pal, a: 0.5 + 0.15 * L.aura });   // kiếm khí xoắn quanh lưỡi
  if (chau) for (let i = 0; i < (L.aura || 0); i++) pxArc(ctx, e.x, e.y, 7 * K + 4 + i * 3, 1, 0, TAU, 0.5, L.gold && i === L.aura - 1 ? GOLD : rc(R, 0.8), 0.7 - i * 0.15, 1, [0.5, 0.4], (i % 2 ? -1 : 1) * e.t * 3);   // vành hào quang xoay
  if (L.spark) for (let i = 0; i < 3; i++) { const a = e.t * 9 + i * 2.1, d = (5 + ((e.t * 40 + i * 7) % 12)) * K; pxDot(ctx, e.x - ux * d + Math.cos(a) * 4 * K, e.y - uy * d + Math.sin(a) * 4 * K, 2, L.gold ? GOLD : '#ffffff', 0.9); }
}

function orbit(ctx, game, art, e, pal) {   // Cầu Xoay: ba món bay vòng quanh người, kéo hai bóng mờ; con ở nửa xa vẽ trước
  const N = e.node, O = N.orbit, a0 = Math.min(1, (e.life - e.t) / 0.3, e.t / 0.15), kiem = N.look === 'kiem', s = kiem ? 'pb-kiem' : 'pb-chau', K = kiem ? pbK(game, e, 'kiem') : pbK(game, e, 'chau', 0.5), list = [];
  for (let i = 0; i < O.n; i++) for (let g = 2; g >= 0; g--) { const a = e.t * 4 + i / O.n * TAU - g * 0.2; list.push([e.x + Math.cos(a) * O.rad, e.y + Math.sin(a) * O.rad * 0.6, a, g]); }
  list.sort((u, v) => u[1] - v[1] || v[3] - u[3]);
  for (const [x, y, a, g] of list) pfxDraw(ctx, art, s, x, y, e.t, { dir: Math.atan2(Math.cos(a) * 0.6, -Math.sin(a)), snap: 1, loop: true, k: K, pal, a: a0 * (g ? 0.3 / g : 1), light: g ? 0 : 1 });
}

function wave(ctx, e, R) {
  const N = e.node, X = e.px, k = Math.min(1, e.t / e.life), r = N.range * (0.35 + 0.65 * k), hf = N.arc * Math.PI / 360, fade = 1 - k * k * 0.8, a0 = e.ang - hf, a1 = e.ang + hf, L = lookOf(e);
  // mặt sóng đang lan: viền tối, thân màu, lõi trắng; phía sau là vài cung gió đứt quãng
  pxArc(ctx, e.x, e.y, r + 2, 1, a0, a1, 1, rc(R, 0.3), 0.7 * fade);
  pxArc(ctx, e.x, e.y, r + 1, 1, a0, a1, 3, rc(R, 0.65), 0.92 * fade);
  pxArc(ctx, e.x, e.y, r - 1, 1, a0 + hf * 0.08, a1 - hf * 0.08, 1, '#ffffff', fade);
  for (let i = 1; i <= 3; i++) { const rr = r * (1 - i * 0.2), o = Math.sin(X.seed + i * 2.3) * hf * 0.3, w = hf * (0.78 - i * 0.12); if (rr > 8) pxArc(ctx, e.x, e.y, rr, 1, e.ang + o - w, e.ang + o + w, 1, rc(R, 0.85), (0.62 - i * 0.14) * fade, 2, [0.2, 0.12], X.seed + i); }
  for (let i = 0; i < (L.aura || 0); i++) pxArc(ctx, e.x, e.y, r + 5 + i * 3, 1, a0, a1, 1, L.gold && i === L.aura - 1 ? GOLD : rc(R, 0.8), (0.5 - i * 0.12) * fade);
  if (N.look === 'holo') pxArc(ctx, e.x, e.y, r + 3, 1, a0, a1, 2, '#ffffff', 0.9 * fade, 2, [0.07, 0.06], X.seed + e.t * 6);   // Hồ Lô: bọt trắng sủi dọc mặt sóng (hồ lô, luồng nước, con sóng là hình riêng: pb-px.js)
}

function shield(ctx, game, art, e, R, pal, t) {   // vòm khiên quanh người: sắp hết giờ thì nháy, vừa đỡ đòn thì gợn một vành sáng
  if (e.done) return;
  const p = game.player, K = pbK(game, e, 'khien'), h = e.px.hit != null ? (e.t - e.px.hit) / 0.2 : 2;
  pfxDraw(ctx, art, 'pb-khien', p.x, p.y - 11 - domeDy(art) * K, t, { loop: true, k: K, pal, a: Math.min(1, e.t * 8) * (e.life - e.t < 0.6 ? 0.6 + 0.4 * Math.sin(e.t * 34) : 1), light: h < 1 ? 2 - h : 1 });
  if (h >= 0 && h < 1) pxArc(ctx, p.x, p.y - 11, (8 + 3 * h) * K, 1, 0, Math.PI * 2, 1, h < 0.4 ? '#ffffff' : rc(R, 0.8), 1 - h, 2);
}

function sealT(ctx, game, art, e, R) {   // khối ấn treo trên cao rồi giáng xuống
  const vis = pbVis(e), [bx, by] = pbSeal(e, vis), K = pbK(game, e, 'an'), k = Math.min(1, e.t / e.life), u = Math.max(0, (k - 0.55) / 0.45), a = Math.min(1, e.t * 7);
  if (u > 0.12) {
    for (let i = 2; i >= 1; i--) pfxDraw(ctx, art, 'pb-an', bx, by - i * 10 * K * u, e.t, { loop: true, k: K, a: 0.28 / i, light: 0 });   // bóng mờ kéo phía trên
    for (const dx of [-8, 0, 8]) pxLine(ctx, [[bx + dx * K, by - 27 * K], [bx + dx * K, by - (27 + 26 * u) * K]], 1, rc(R, dx ? 0.7 : 0.9), 0.65 * u, 2);   // vạch tốc độ
  }
  pfxDraw(ctx, art, 'pb-an', bx, by, e.t, { loop: true, k: K, a });
  pxGlow(ctx, bx, by - 13 * K, 26 * K, rc(R, 0.65), 0.22 + 0.25 * k);
}

function zap(ctx, e, R) {   // tia nảy sang con kế: gấp khúc, đổi dáng liên tục
  const k = e.t / e.life, sd = Math.floor(e.t * 40) + e.x, n = 6, pts = [[e.x, e.y]];
  for (let i = 1; i < n; i++) { const u = i / n, o = Math.sin(sd * 13.7 + i * 7.1) * 6; pts.push([e.x + (e.x2 - e.x) * u + o, e.y + (e.y2 - e.y) * u + o * 0.5]); }
  pts.push([e.x2, e.y2]);
  pxLine(ctx, pts, 3, rc(R, 0.55), 0.8 * (1 - k)); pxLine(ctx, pts, 1, '#ffffff', 1 - k * 0.6);
  pxGlow(ctx, e.x2, e.y2, 16, rc(R, 0.7), 0.6 * (1 - k));
}

function status(ctx, game, art, t) {   // dấu hệ trên quái: cháy, đóng băng / lạnh, rễ trói, phá giáp
  const now = game.time || 0;
  for (const m of game.mobs) {
    const st = m.pb;
    if (!st || m.dead) continue;
    const r = m.r || 6, K = r >= 20 ? 4 : r >= 11 ? 3 : 2, tt = t + (m.uid || 0) * 0.37;
    if ((st.rootT || 0) > now) pfxDraw(ctx, art, 'tt-re', m.x, m.y + 2, tt, { loop: true, k: K });
    if (st.burn && st.burn.t > now) pfxDraw(ctx, art, 'tt-lua', m.x, m.y - r * 0.5, tt, { loop: true, k: K });
    if ((st.iceT || 0) > now) pfxDraw(ctx, art, 'tt-bang', m.x, m.y + 3, tt, { loop: true, k: K });
    else if ((st.coldT || 0) > now) pfxDraw(ctx, art, 'tt-lanh', m.x, m.y, tt, { loop: true, k: K });
    if ((st.brkT || 0) > now) pfxDraw(ctx, art, 'tt-pha', m.x, m.y - r * 2.6 - 4, tt, { loop: true, k: 2 });
  }
}

export function drawPbPx(ctx, game, t) {
  const S = game.pbx, C = cfg(game);
  if (!S || !C) return;
  const art = game.data.art, p = game.player;
  ctx.save(); pfxBegin(ctx, lightK(game), C.ramps);
  warm(game, art, C);
  status(ctx, game, art, t);
  for (const e of S.list) {
    if (!e.px) continue;
    const pal = pbRamp(game, e), R = C.ramps[pal];
    switch (e.kind) {
      case 'zone': { const a = Math.min(1, e.t / 0.1, (e.life - e.t) / 0.4), d = e.t < 0.16 ? 1 - (e.t / 0.16) ** 2 : 0; pfxDraw(ctx, art, 'pb-co', e.x, e.y - d * 70, t, { loop: true, k: pbK(game, e, 'co'), a }); break; }   // cờ trận rơi xuống cắm giữa vùng
      case 'seal': sealT(ctx, game, art, e, R); break;
      case 'wave': wave(ctx, e, R); break;
      case 'shot': shot(ctx, game, art, e, R, pal); break;
      case 'orbit': orbit(ctx, game, art, e, pal); break;
      case 'shield': shield(ctx, game, art, e, R, pal, t); break;
      case 'suck': {   // Hồ Lô hít: trái hồ lô (tranh gốc, bụng phồng dần) lơ lửng trên đầu, phễu linh khí xoáy vào miệng
        const [gx, gy, mx, my, K, flip] = pbGourd(game, e), f = Math.min(11, Math.floor(e.t / e.life * 12)), a = Math.min(1, e.t * 9);
        pfxDraw(ctx, art, 'pb-holo', gx, gy, 0, { f, k: 1, flip, a }); pfxDraw(ctx, art, 'pb-holo-xoay', mx, my, 0, { f, k: K, flip, pal, a });
        pxGlow(ctx, mx, my, 12 * K, rc(R, 0.75), 0.3 + 0.3 * e.t / e.life);
        break;
      }
      case 'zap': zap(ctx, e, R); break;
    }
  }
  ctx.restore();
}
