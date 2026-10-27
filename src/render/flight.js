// Cảnh đi đường (vẽ theo toạ độ màn hình): ngự kiếm bay qua biển mây giữa các đảo,
// hoặc xoáy truyền tống khi ra vào bí cảnh. Trạng thái nằm ở game.trip (src/game/travel.js).
import { drawPerson } from './draw.js';
import { drawMount } from './draw-pet.js';
import { outfit } from '../game/fashion.js';
import { circle } from '../world/draw-map.js';

const INK = '#1b1830';

function hash(i, k) {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
const ease = k => k * k * (3 - 2 * k);
const clamp01 = k => Math.max(0, Math.min(1, k));

function cloud(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.8, r * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.7, y - r * 0.25, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.6, y - r * 0.35, r, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Một lớp mây trôi ngang; speed theo px/giây, lớp gần trôi nhanh hơn
function cloudLayer(ctx, w, h, t, seed, n, speed, y0, y1, r0, r1, color) {
  ctx.fillStyle = color;
  const span = w + r1 * 4;
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, seed) * span - t * speed * (0.8 + hash(i, seed + 1) * 0.4)) % span + span) % span - r1 * 2;
    cloud(ctx, x, y0 + hash(i, seed + 2) * (y1 - y0), r0 + hash(i, seed + 3) * (r1 - r0));
  }
}

// Đảo nổi: mặt đất màu đảo, bụng đá nhọn, vài cây
function island(ctx, x, y, s, top, under, trees, hall) {
  ctx.fillStyle = under;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.55, y + s * 0.5); ctx.lineTo(x - s * 0.1, y + s * 0.95);
  ctx.lineTo(x + s * 0.3, y + s * 0.55); ctx.lineTo(x + s, y); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s * 0.1, y + s * 0.95); ctx.lineTo(x + s * 0.3, y + s * 0.55); ctx.lineTo(x + s, y); ctx.fill();
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // cây nhỏ dọc mép sau, điện tông môn ở giữa nếu đảo có
  for (let i = 0; i < 7; i++) {
    const tx = x - s * 0.8 + hash(i, 51) * s * 1.6, ty = y - s * 0.1 + hash(i, 52) * s * 0.12, r = s * (0.05 + hash(i, 53) * 0.04);
    ctx.fillStyle = trees || '#2f7a44'; circle(ctx, tx, ty - r, r);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(ctx, tx - r * 0.3, ty - r * 1.3, r * 0.5);
  }
  if (hall) {
    const hw = s * 0.28, hh = s * 0.16;
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - hw * 0.8, y - hh * 1.1, hw * 1.6, hh);
    ctx.fillStyle = '#a0423a';
    ctx.beginPath(); ctx.moveTo(x - hw * 1.15, y - hh * 1.05); ctx.lineTo(x, y - hh * 2); ctx.lineTo(x + hw * 1.15, y - hh * 1.05); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - hw * 0.12, y - hh * 0.6, hw * 0.24, hh * 0.5);
  }
}

function seaOfClouds(ctx, w, h, t, speed, y) {
  ctx.fillStyle = '#f4f8ff';
  ctx.fillRect(0, y + 14, w, h - y);
  const step = 46;
  for (let x = -step - ((t * speed) % step); x < w + step; x += step) {
    const i = Math.round((x + t * speed) / step);
    circle(ctx, x, y + 14 + hash(i, 9) * 8, 26 + hash(i, 4) * 14);
  }
  ctx.fillStyle = 'rgba(160,190,230,0.35)';
  ctx.fillRect(0, y + 40, w, h - y);
}

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
  drawPerson(ctx, { x: 0, y: 0, moving: false, bob: who }, color, hair, t, false, { x: 1, y: 0.2 });
  if (sash) { ctx.fillStyle = sash; ctx.fillRect(-4, -6, 8, 1.5); }
  ctx.translate(0, 1.5);
  if (swordLen) sword(ctx, swordLen, '#c8f6ff', t);
  ctx.restore();
}

function drawFlight(ctx, screen, game, trip) {
  const { w, h } = screen, t = trip.t, k = trip.t / trip.dur;
  const to = trip.toDef, isl = to.island || {};
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3f6fc0'); sky.addColorStop(0.55, '#8fc4f0'); sky.addColorStop(1, '#e8f4ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const S = Math.max(2, Math.min(w, h) / 120);   // cỡ người bay so với màn hình
  const sea = h * 0.74;

  cloudLayer(ctx, w, h, t, 1, 6, 30, h * 0.08, h * 0.45, 20, 40, 'rgba(255,255,255,0.45)');
  // Các đảo xa trôi qua
  for (let i = 0; i < 3; i++) {
    const span = w + 300, x = ((hash(i, 21) * span - t * (40 + i * 15)) % span + span) % span - 150;
    island(ctx, x, h * (0.3 + hash(i, 22) * 0.3), 30 + hash(i, 23) * 30, '#9cc88a', '#9a8a7a');
  }
  cloudLayer(ctx, w, h, t, 5, 5, 110, h * 0.2, h * 0.7, 26, 50, 'rgba(255,255,255,0.75)');

  // Đảo đích lớn dần từ bên phải ở cuối chặng
  const arrive = ease(clamp01((k - 0.62) / 0.38));
  if (arrive > 0) {
    const s = 60 + arrive * Math.min(w, h) * 0.45;
    island(ctx, w + s * 0.2 - arrive * (w * 0.55 + s * 0.2), h * 0.62 - arrive * h * 0.05, s, isl.top || '#7cc46a', isl.under || '#8a6a48', isl.trees, isl.hall);
  }
  seaOfClouds(ctx, w, h, t, 160, sea);

  // Người bay: cất cánh từ dưới lên, lơ lửng, rồi lao xuống đảo đích
  const up = ease(clamp01(k / 0.18)), down = ease(clamp01((k - 0.82) / 0.18));
  const px = w * 0.38 + down * w * 0.22, py = h * 1.1 - up * h * 0.62 + down * h * 0.12 + Math.sin(t * 3) * 6;
  // vệt gió
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = ((hash(i, 31) * (w + 200) - t * 900) % (w + 200) + w + 200) % (w + 200) - 100, y = hash(i, 32) * h;
    ctx.globalAlpha = 0.25 + hash(i, 33) * 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50 + hash(i, 34) * 60, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const el = game.save.element ? game.data.elements[game.save.element].color : '#e6ebf7', fit = outfit(game);
  if (trip.with) {
    const npc = game.data.npcs[trip.with];
    rider(ctx, 1, px + 8 * S, py, S * 1.15, t, npc.color, npc.hair || '#5a4a86', null, 30);
    rider(ctx, 0, px - 9 * S, py + 1.5 * S, S, t, fit.robe, fit.hair, fit.sash || el, 0); // đứng sau trưởng lão, chung một thanh kiếm
  } else if (game.save.realm >= game.data.pets.fly_realm && game.save.mount) {
    // Từ Nguyên Anh: cưỡi thú bay qua biển mây thay cho kiếm
    ctx.save(); ctx.translate(px, py + 6 * S); ctx.scale(S, S);
    drawMount(ctx, { x: 0, y: 0, face: { x: 1 }, moving: true, walkT: t }, game.data.pets.mounts[game.save.mount], t, game.data.art, game.save.mount);
    ctx.restore();
    rider(ctx, 0, px, py, S, t, fit.robe, fit.hair, fit.sash || el, 0);
  } else rider(ctx, 0, px, py, S, t, fit.robe, fit.hair, fit.sash || el, 24);

  cloudLayer(ctx, w, h, t, 9, 2, 420, h * 0.55, h * 0.95, 50, 80, 'rgba(255,255,255,0.9)');
  caption(ctx, w, h, trip, k);
  // Mờ vào lúc cất cánh, loé sáng lúc đáp
  const fade = Math.max(1 - k / 0.08, (k - 0.93) / 0.07);
  if (fade > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp01(fade)})`; ctx.fillRect(0, 0, w, h); }
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
  drawPerson(ctx, { x: 0, y: 0, moving: false, bob: 0 }, outfit(game).robe, outfit(game).hair, t, false, { x: 0, y: 1 });
  ctx.fillStyle = el; ctx.fillRect(-4, -6, 8, 1.5);
  ctx.restore();
  caption(ctx, w, h, trip, k);
  const fade = Math.max(1 - k / 0.15, (k - 0.85) / 0.15);
  if (fade > 0) { ctx.fillStyle = `rgba(20,12,30,${clamp01(fade)})`; ctx.fillRect(0, 0, w, h); }
}

function caption(ctx, w, h, trip, k) {
  ctx.globalAlpha = clamp01(Math.min(k / 0.1, (1 - k) / 0.1));
  ctx.textAlign = 'center';
  ctx.font = '800 17px system-ui, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.fillStyle = '#fff7d6';
  ctx.strokeText(trip.text, w / 2, h * 0.14); ctx.fillText(trip.text, w / 2, h * 0.14);
  if (trip.t > 1) {
    ctx.font = '600 11px system-ui, sans-serif'; ctx.lineWidth = 3;
    ctx.strokeText('Chạm để bỏ qua', w / 2, h - 24); ctx.fillText('Chạm để bỏ qua', w / 2, h - 24);
  }
  ctx.globalAlpha = 1;
}

export function drawTrip(game, screen) {
  const ctx = screen.ctx;
  screen.screenTransform();
  if (game.trip.kind === 'portal') drawPortal(ctx, screen, game, game.trip);
  else drawFlight(ctx, screen, game, game.trip);
}
