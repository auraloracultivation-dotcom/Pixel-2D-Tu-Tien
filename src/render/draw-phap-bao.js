// Vẽ đòn pháp bảo (src/game/phap-bao-run.js, game.pbx.list) và dấu trạng thái hệ trên quái. Hình: pbfx.linh-chau / dai-an / ho-lo
// (chuyển động SpriteCook 12/11/2026), pb.* (pháp bảo), vfx.vk-kiem (Phi Kiếm), fx.slash-quat (Bảo Phiến), vfx.am (Đồng Chung),
// vfx.tran-kim (Trận Kỳ), fx.shield (Hộ Thuẫn), fx.fire / ice / vine (hệ trên quái). Phần còn lại vẽ bằng code: vệt sáng, nón gió,
// sóng vòng, nổ, mảnh, tia nảy, sét. Vẽ mượt, sau hiệu ứng chiêu.
// Khi hiệu ứng điểm ảnh bật (src/game/pfx.js pxOn; chủ dự án 13/11/2026: bỏ ảnh GPT) thì cả file này nhường cho ./draw-pb-px.js.
import { spriteImage } from './sprites.js';
import { visOf, shotFx, areaFx } from './draw-pb-fx.js';
import { pxOn } from '../game/pfx.js';
import { drawPbPx } from './draw-pb-px.js';

const TAU = Math.PI * 2;
const rgba = (hex, a) => { const n = parseInt((hex || '#ffffff').slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
const EL = { kim: '#ffe27a', moc: '#7fdc6a', thuy: '#7ac8ff', hoa: '#ff8a4a', tho: '#d8a86a' };
const tint = n => (n?.els?.length ? EL[n.els[n.els.length - 1]] : n?.color) || '#e8f4ff';

// Một khung hình: rộng w đơn vị, neo (ax, ay) theo tỉ lệ khung, xoay rot, lật ngang flip
function spr(ctx, game, id, f, x, y, w, rot = 0, a = 1, add = false, ax = 0.5, ay = 0.5, flip = false) {
  const S = game.data.art.sprites[id], im = S && spriteImage(S);
  if (!im || a <= 0.01) return;
  const h = w * S.h / S.w;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha = Math.min(1, a); if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(im, (f % S.frames) * S.w, 0, S.w, S.h, -w * ax, -h * ay, w, h);
  ctx.restore();
}

function glow(ctx, x, y, r, c, a) {
  if (a <= 0.01 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${Math.min(1, a)})`); g.addColorStop(0.35, rgba(c, a * 0.6)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function streak(ctx, x0, y0, x1, y1, w, c, a) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(c, a * 0.5); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function jag(ctx, x0, y0, x1, y1, seed, c, w) {   // tia gấp khúc (nảy, sét)
  const n = 6, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const k = i / n, o = Math.sin(seed * 13.7 + i * 7.1) * 5; pts.push([x0 + (x1 - x0) * k + o, y0 + (y1 - y0) * k + o * 0.4]); }
  pts.push([x1, y1]);
  for (const [lw, col] of [[w * 3, rgba(c, 0.45)], [w, 'rgba(255,255,255,0.95)']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
}

function shot(ctx, game, e, t) {
  const N = e.node, a = Math.atan2(e.vy, e.vx), c = tint(N), sp = Math.hypot(e.vx, e.vy) || 1, k = visOf(e);
  shotFx(ctx, e, c, t);   // đuôi sáng, hào quang theo phẩm (draw-pb-fx.js)
  ctx.globalCompositeOperation = 'lighter';
  streak(ctx, e.x - e.vx / sp * 16 * k, e.y - e.vy / sp * 16 * k, e.x, e.y, (N.look === 'manh' ? 1 : 1.8) * Math.sqrt(k), c, 0.55);
  glow(ctx, e.x, e.y, N.r * 1.6, c, 0.35);
  ctx.globalCompositeOperation = 'source-over';
  if (N.look === 'kiem') spr(ctx, game, 'vfx.vk-kiem', 3, e.x, e.y, 14 * k, a - Math.PI / 2);
  else if (N.look === 'chau') spr(ctx, game, 'pbfx.linh-chau', Math.floor(t * 12), e.x, e.y, 50 * k, a, 1, false, 0.86, 0.5);
  else { ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a); ctx.scale(k, k); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(0, 2.5); ctx.lineTo(-4, 0); ctx.lineTo(0, -2.5); ctx.fill(); ctx.restore(); }
}

function wave(ctx, game, e, t) {
  const N = e.node, k = Math.min(1, e.t / e.life), R = N.range * (0.35 + 0.65 * k), half = N.arc * Math.PI / 360, c = tint(N), fade = 1 - k * 0.7;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(e.x, e.y, R * 0.2, e.x, e.y, R);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.75, rgba(c, 0.22 * fade)); g.addColorStop(1, rgba('#ffffff', 0.4 * fade));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, R, e.ang - half, e.ang + half); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  areaFx(ctx, e, e.x + Math.cos(e.ang) * R * 0.5, e.y + Math.sin(e.ang) * R * 0.5, R * 0.55, c, t, k);
  if (N.look === 'quat') spr(ctx, game, 'fx.slash-quat', Math.min(2, Math.floor(k * 3)), e.x + Math.cos(e.ang) * R * 0.55, e.y + Math.sin(e.ang) * R * 0.55, R * 1.05, e.ang, fade);
  if (N.look === 'holo') {
    const left = Math.cos(e.ang) < 0, la = left ? Math.PI - e.ang : e.ang;
    ctx.save(); ctx.translate(e.x, e.y); if (left) ctx.scale(-1, 1); ctx.rotate(la + 0.6);
    spr(ctx, game, 'pbfx.ho-lo', Math.floor(t * 12), 6, 0, 46 * visOf(e), 0, Math.min(1, 1.6 - k), false, 0.25, 0.7);
    ctx.restore();
  }
}

function ring(ctx, game, e) {
  if (e.t < 0) return;
  const N = e.node, k = Math.min(1, e.t / e.life), c = tint(N);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const kk = Math.max(0, k - i * 0.18), R = N.r * kk;
    if (R <= 1) continue;
    ctx.strokeStyle = rgba(i ? c : '#ffffff', (1 - kk) * (i ? 0.6 : 0.9)); ctx.lineWidth = 3 - i;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, R, R * 0.62, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  areaFx(ctx, e, e.x, e.y, N.r * k, c, e.t, k);
  if (N.look === 'am') spr(ctx, game, 'vfx.am', 0, e.x, e.y - 14 * visOf(e), (26 + k * 12) * visOf(e), 0, 1 - k, true);
}

function blast(ctx, game, e) {
  const N = e.node, k = Math.min(1, e.t / e.life), c = tint(N), R = e.r;
  if (e.cast) areaFx(ctx, e, e.x, e.y, R * (0.3 + 0.8 * k), c, e.t, k);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, e.x, e.y, R * (0.6 + 0.6 * k), c, 0.75 * (1 - k));
  ctx.strokeStyle = rgba(c, 0.8 * (1 - k)); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, R * (0.3 + 0.8 * k), R * (0.3 + 0.8 * k) * 0.6, 0, 0, TAU); ctx.stroke();
  const shards = N.look === 'khien' ? 10 : 7;
  for (let i = 0; i < shards; i++) {
    const a = i / shards * TAU + e.x * 0.01, r0 = R * 0.2 + R * 0.9 * k;
    ctx.strokeStyle = rgba(N.look === 'khien' ? '#9ff2dc' : '#ffffff', 0.9 * (1 - k)); ctx.lineWidth = N.look === 'khien' ? 2.5 : 1.5;
    ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0 * 0.6); ctx.lineTo(e.x + Math.cos(a) * (r0 + 6), e.y + Math.sin(a) * (r0 + 6) * 0.6); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function zone(ctx, game, e, t) {
  const N = e.node, a = Math.min(1, e.t / 0.3) * Math.min(1, (e.life - e.t) / 0.4);
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.55); ctx.rotate(t * 0.8);
  spr(ctx, game, 'vfx.tran-kim', 0, 0, 0, N.r * 2, 0, 0.75 * a, true);
  ctx.restore();
  ctx.strokeStyle = rgba(tint(N), 0.6 * a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, N.r, N.r * 0.55, 0, 0, TAU); ctx.stroke();
  areaFx(ctx, e, e.x, e.y, N.r, tint(N), t, 0.3);
  spr(ctx, game, 'pb.tran-ky', 0, e.x, e.y, 22 * visOf(e), Math.sin(t * 3) * 0.05, a, false, 0.3, 1);
}

function seal(ctx, game, e) {
  const N = e.node, k = Math.min(1, e.t / e.life), y = e.y - 80 * visOf(e) * (1 - k * k);
  ctx.fillStyle = `rgba(20,16,40,${0.15 + 0.35 * k})`; ctx.beginPath(); ctx.ellipse(e.x, e.y, N.r * (0.3 + 0.5 * k), N.r * (0.3 + 0.5 * k) * 0.45, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#ffe08a', 0.35 + 0.4 * Math.sin(e.t * 20) ** 2); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.ellipse(e.x, e.y, N.r, N.r * 0.55, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  areaFx(ctx, e, e.x, e.y, N.r, '#ffe08a', e.t, 1 - k);
  spr(ctx, game, 'pb.dai-an', 0, e.x, y, (20 + 10 * k) * visOf(e), 0, 1, false, 0.5, 1);
}

function orbit(ctx, game, e, t) {
  const N = e.node, O = N.orbit, c = tint(N), a0 = Math.min(1, (e.life - e.t) / 0.3);
  for (let i = 0; i < O.n; i++) {
    const a = e.t * 4 + i / O.n * TAU, x = e.x + Math.cos(a) * O.rad, y = e.y + Math.sin(a) * O.rad * 0.6;
    const vk = visOf(e);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 9 * vk, c, 0.6 * a0); ctx.globalCompositeOperation = 'source-over';
    if (N.look === 'kiem') spr(ctx, game, 'vfx.vk-kiem', 3, x, y, 10 * vk, a + Math.PI, a0);
    else if (N.look === 'chau') spr(ctx, game, 'pb.linh-chau', 0, x, y, 12 * vk, 0, a0);
  }
}

function status(ctx, game, t) {
  const now = game.time || 0;
  for (const m of game.mobs) {
    const st = m.pb;
    if (!st || m.dead) continue;
    const top = m.y - (m.r || 8) * 2.2;
    if (st.burn && st.burn.t > now) spr(ctx, game, 'fx.fire', Math.floor(t * 12), m.x, m.y - (m.r || 8) * 0.6, 10, 0, 0.85, false, 0.5, 1);
    if ((st.iceT || 0) > now) spr(ctx, game, 'fx.ice', 5, m.x, m.y + 2, 24, 0, 0.8, false, 0.5, 1);
    else if ((st.coldT || 0) > now) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, m.x, m.y - 4, (m.r || 8) * 1.3, '#7ac8ff', 0.3); ctx.globalCompositeOperation = 'source-over'; }
    if ((st.rootT || 0) > now) spr(ctx, game, 'fx.vine', 4, m.x, m.y + 3, 16, 0, 0.9, false, 0.5, 1);
    if ((st.brkT || 0) > now) { ctx.fillStyle = `rgba(255,226,122,${0.6 + 0.4 * Math.sin(t * 10)})`; ctx.fillRect(m.x - 1, top - 4, 2, 6); ctx.fillRect(m.x - 3, top - 2, 6, 2); }
  }
}

export function drawPhapBao(ctx, game, t) {
  const S = game.pbx;
  if (!S) return;
  if (pxOn(game)) return drawPbPx(ctx, game, t);
  const p = game.player;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  status(ctx, game, t);
  for (const e of S.list) {
    switch (e.kind) {
      case 'zone': zone(ctx, game, e, t); break;
      case 'seal': seal(ctx, game, e); break;
      case 'wave': wave(ctx, game, e, t); break;
      case 'ring': ring(ctx, game, e); break;
    }
  }
  for (const e of S.list) {
    switch (e.kind) {
      case 'shot': shot(ctx, game, e, t); break;
      case 'blast': blast(ctx, game, e); break;
      case 'orbit': orbit(ctx, game, e, t); break;
      case 'anim': { const S2 = game.data.art.sprites[e.spr]; spr(ctx, game, e.spr, Math.min(S2.frames - 1, Math.floor(e.t / e.life * S2.frames)), e.x, e.y + 6, e.w, 0, 1, false, 0.5, 0.8); break; }
      case 'shield': if (!e.done) { areaFx(ctx, e, p.x, p.y - 6, 22 * visOf(e), '#7fe0c8', t, 0.2); spr(ctx, game, 'fx.shield', 2 + Math.floor(t * 8) % 4, p.x, p.y + 2, 34 * Math.sqrt(visOf(e)), 0, 0.85, false, 0.5, 0.85); } break;
      case 'suck': {
        const k = e.t / e.life;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 5, r = e.cast.T.pre.r * (1 - ((k * 2 + i / 12) % 1)); glow(ctx, p.x + Math.cos(a) * r, p.y - 4 + Math.sin(a) * r * 0.6, 3, '#a8e4ff', 0.8); }
        ctx.globalCompositeOperation = 'source-over';
        spr(ctx, game, 'pb.ho-lo', 0, p.x + 10, p.y - 24 + Math.sin(t * 6) * 2, 16, 0.4, 1, false, 0.5, 0.5);
        break;
      }
      case 'zap': ctx.globalCompositeOperation = 'lighter'; jag(ctx, e.x, e.y, e.x2, e.y2, e.x, e.color || '#bfe0ff', 1.5 * (1 - e.t / e.life)); ctx.globalCompositeOperation = 'source-over'; break;
      case 'bolt': ctx.globalCompositeOperation = 'lighter'; jag(ctx, e.x + 6, e.y - 90, e.x, e.y - 4, e.y, '#9fc8ff', 2 * (1 - e.t / e.life)); glow(ctx, e.x, e.y, 14, '#9fc8ff', 0.8 * (1 - e.t / e.life)); ctx.globalCompositeOperation = 'source-over'; break;
    }
  }
  ctx.restore();
}
