// Cảnh đi đường (vẽ theo toạ độ màn hình): bay truyền tống qua không gian sao giữa các tinh cầu,
// hoặc xoáy truyền tống khi ra vào bí cảnh. Trạng thái nằm ở game.trip (src/game/travel.js).
import { drawPerson } from './draw.js';
import { drawHero } from './draw-hero.js';
import { drawMount } from './draw-pet.js';
import { outfit } from '../game/fashion.js';
import { circle } from '../world/draw-map.js';
import { drawSpace } from './draw-space.js';

const INK = '#1b1830';

function hash(i, k) {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
const clamp01 = k => Math.max(0, Math.min(1, k));

// Thanh kiếm dưới chân: lưỡi sáng, chuôi phía sau, vệt kiếm khí kéo dài
function sword(ctx, len, color, t) {
  const g = ctx.createLinearGradient(-len * 3, 0, -len * 0.4, 0);
  g.addColorStop(0, 'rgba(200,246,255,0)'); g.addColorStop(1, 'rgba(200,246,255,0.75)');
  ctx.fillStyle = g; ctx.fillRect(-len * 3, -1.5 + Math.sin(t * 20) * 0.4, len * 2.6, 3);
  ctx.fillStyle = INK; ctx.fillRect(-len * 0.55 - 1, -2, len * 1.25 + 2, 4);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-len * 0.4, -1.3); ctx.lineTo(len * 0.62, -1.3); ctx.lineTo(len * 0.72, 0); ctx.lineTo(len * 0.62, 1.3); ctx.lineTo(-len * 0.4, 1.3); ctx.fill();
  ctx.fillStyle = '#f2c94c'; ctx.fillRect(-len * 0.45, -3, 2, 6);
  ctx.fillStyle = '#6a3a2a'; ctx.fillRect(-len * 0.55, -1, len * 0.1, 2);
}

// Người chơi trên đường bay: vẽ bằng hình nhân vật chính như ngoài bản đồ (chơi thử 28/10: trước đây là người khối, lạ hẳn)
let heroGame = null;
const FLY = { x: 0, y: 0, face: { x: 1, y: 0.2 }, moving: false, walkT: 0, swingT: 0, lookX: 1 };
const hero = (ctx, t) => heroGame && drawHero(ctx, heroGame, FLY, t, false);

function rider(ctx, who, x, y, s, t, color, hair, sash, swordLen) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // vạt áo bay về phía sau
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath(); ctx.moveTo(-2, -8 + i * 3);
    ctx.quadraticCurveTo(-8, -9 + i * 3 + Math.sin(t * 14 + i) * 2, -13 - i * 2, -6 + i * 3 + Math.sin(t * 11 + i) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const own = who === 0 && hero(ctx, t);
  if (!own) drawPerson(ctx, { x: 0, y: 0, moving: false, bob: who }, color, hair, t, false, { x: 1, y: 0.2 });
  if (sash && !own) { ctx.fillStyle = sash; ctx.fillRect(-4, -6, 8, 1.5); }
  ctx.translate(0, 1.5);
  if (swordLen) sword(ctx, swordLen, '#c8f6ff', t);
  ctx.restore();
}

// Bay truyền tống giữa các tinh cầu (src/render/draw-space.js); hàm này chỉ lo vẽ người bay
function drawFlight(ctx, screen, game, trip) {
  heroGame = game;
  const el = game.save.element ? game.data.elements[game.save.element].color : '#e6ebf7', fit = outfit(game);
  drawSpace(ctx, screen, game, trip, (c, px, py, S, t) => {
    if (trip.with) {
      const npc = game.data.npcs[trip.with];
      rider(c, 1, px + 8 * S, py, S * 1.15, t, npc.color, npc.hair || '#5a4a86', null, 30);
      rider(c, 0, px - 9 * S, py + 1.5 * S, S, t, fit.robe, fit.hair, fit.sash || el, 0); // đứng sau trưởng lão, chung một thanh kiếm
    } else if (game.save.realm >= game.data.pets.fly_realm && game.save.mount) {
      // Từ Nguyên Anh: cưỡi thú bay thay cho kiếm
      c.save(); c.translate(px, py + 6 * S); c.scale(S, S);
      drawMount(c, { x: 0, y: 0, face: { x: 1 }, moving: true, walkT: t }, game.data.pets.mounts[game.save.mount], t, game.data.art, game.save.mount);
      c.restore();
      rider(c, 0, px, py, S, t, fit.robe, fit.hair, fit.sash || el, 0);
    } else rider(c, 0, px, py, S, t, fit.robe, fit.hair, fit.sash || el, 24);
  }, caption);
}

// Xoáy truyền tống (vào/ra bí cảnh)
function drawPortal(ctx, screen, game, trip) {
  const { w, h } = screen, t = trip.t, k = trip.t / trip.dur;
  ctx.fillStyle = '#140c1e'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) * 0.6;
  for (let i = 0; i < 40; i++) {
    const a = hash(i, 41) * Math.PI * 2 + t * (2 + hash(i, 42) * 3);
    const r = ((hash(i, 43) - t * 0.9) % 1 + 1) % 1 * R;
    ctx.strokeStyle = i % 3 ? 'rgba(180,120,255,0.7)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 + r / R * 4;
    ctx.beginPath(); ctx.arc(cx, cy, r, a, a + 0.6); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(180,120,255,0.6)'; circle(ctx, cx, cy, 20 + Math.sin(t * 8) * 4);
  // người chơi bị cuốn vào giữa xoáy, nhỏ dần rồi hiện ra
  const S = Math.max(2, Math.min(w, h) / 120) * (0.6 + 0.4 * Math.abs(Math.cos(k * Math.PI)));
  const el = game.save.element ? game.data.elements[game.save.element].color : '#e6ebf7';
  ctx.save(); ctx.translate(cx, cy + 6 * S); ctx.rotate(Math.sin(t * 6) * 0.3); ctx.scale(S, S);
  heroGame = game;
  if (!hero(ctx, t)) { drawPerson(ctx, { x: 0, y: 0, moving: false, bob: 0 }, outfit(game).robe, outfit(game).hair, t, false, { x: 0, y: 1 }); ctx.fillStyle = el; ctx.fillRect(-4, -6, 8, 1.5); }
  ctx.restore();
  caption(ctx, w, h, trip, k);
  const fade = Math.max(1 - k / 0.15, (k - 0.85) / 0.15);
  if (fade > 0) { ctx.fillStyle = `rgba(20,12,30,${clamp01(fade)})`; ctx.fillRect(0, 0, w, h); }
}

function caption(ctx, w, h, trip, k, hint) {
  ctx.globalAlpha = clamp01(Math.min(k / 0.1, (1 - k) / 0.1));
  ctx.textAlign = 'center';
  ctx.font = '800 17px system-ui, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.fillStyle = '#fff7d6';
  ctx.strokeText(trip.text, w / 2, h * 0.14); ctx.fillText(trip.text, w / 2, h * 0.14);
  if (trip.t > 1) {
    ctx.font = '600 11px system-ui, sans-serif'; ctx.lineWidth = 3;
    const tip = hint || 'Chạm để bỏ qua';
    ctx.strokeText(tip, w / 2, h - 24); ctx.fillText(tip, w / 2, h - 24);
  }
  ctx.globalAlpha = 1;
}

export function drawTrip(game, screen) {
  const ctx = screen.ctx;
  screen.screenTransform();
  if (game.trip.kind === 'portal') drawPortal(ctx, screen, game, game.trip);
  else drawFlight(ctx, screen, game, game.trip);
}
