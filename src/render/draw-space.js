// Cảnh bay truyền tống (toạ độ màn hình): trời sao trôi, cổng trận pháp lướt qua, tinh cầu đi nhỏ dần, tinh cầu đến lớn dần,
// sao linh khí và mảnh vỡ hư không. Trạng thái ở game.trip.space (src/game/space-trip.js).
import { PX } from '../game/space-trip.js';
import { bodyOfMap } from '../game/starmap.js';

const TAU = Math.PI * 2, INK = '#1b1830';
const ease = k => k * k * (3 - 2 * k);
const clamp01 = k => Math.max(0, Math.min(1, k));
function hash(i, k) { const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return h - Math.floor(h); }

// Trời sao nhiều lớp: lớp xa trôi chậm, lớp gần kéo vệt
function starfield(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a0918'); g.addColorStop(0.6, '#171236'); g.addColorStop(1, '#241a4a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.08, h * 0.06, 0, w * 0.08, h * 0.06, Math.max(w, h) * 0.5); // Linh Nhật ở xa
  sun.addColorStop(0, 'rgba(255,220,130,.35)'); sun.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
  for (const [n, sp, len, a] of [[70, 20, 0, 0.5], [40, 90, 0, 0.8], [18, 600, 40, 0.6]]) {
    for (let i = 0; i < n; i++) {
      const span = w + 60, x = ((hash(i, sp) * span - t * sp) % span + span) % span - 30, y = hash(i, sp + 1) * h;
      ctx.fillStyle = `rgba(230,236,255,${a * (0.4 + hash(i, sp + 2) * 0.6)})`;
      if (len) ctx.fillRect(x, y, len * (0.5 + hash(i, 7)), 1); else ctx.fillRect(x, y, sp > 50 ? 2 : 1, sp > 50 ? 2 : 1);
    }
  }
}

// Cổng trận pháp của đường truyền tống lướt qua
function gates(ctx, w, h, t) {
  const gap = w * 0.55, off = (t * w * 0.45) % gap;
  for (let x = w + gap - off; x > -gap; x -= gap) {
    ctx.strokeStyle = 'rgba(120,220,255,.22)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, h / 2, h * 0.06, h * 0.46, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,240,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * h * 0.05, h / 2 + Math.sin(a) * h * 0.4); ctx.lineTo(x + Math.cos(a) * h * 0.07, h / 2 + Math.sin(a) * h * 0.5); ctx.stroke(); }
  }
}

function planet(ctx, x, y, r, color) {
  const at = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.25);
  at.addColorStop(0, color + '66'); at.addColorStop(1, color + '00');
  ctx.fillStyle = at; ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = color; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; // vùng đất tối loang lổ
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + (hash(i, 61) - 0.5) * r * 1.4, y + (hash(i, 62) - 0.5) * r * 1.4, r * (0.15 + hash(i, 63) * 0.25), r * (0.1 + hash(i, 64) * 0.15), hash(i, 65) * 3, 0, TAU); ctx.fill(); }
  const hl = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x - r * 0.4, y - r * 0.4, r * 1.2);
  hl.addColorStop(0, 'rgba(255,250,220,.4)'); hl.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = hl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(10,8,24,.45)'; ctx.beginPath(); ctx.arc(x + r * 0.55, y + r * 0.55, r * 1.05, 0, TAU); ctx.fill();
  ctx.restore();
}

function colorOf(game, id) {
  const b = id && bodyOfMap(game.data.starmap, id), m = id && game.data.maps[id];
  return b?.color || m?.island?.top || m?.ground || '#7cc46a';
}

function star(ctx, x, y, r, t, gold) {
  ctx.fillStyle = gold ? 'rgba(255,200,80,.35)' : 'rgba(170,230,255,.3)';
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = gold ? '#ffd76a' : '#e6f8ff';
  const s = r * (1 + 0.15 * Math.sin(t * 8));
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.4, y - s * 0.4); ctx.lineTo(x + s * 1.6, y); ctx.lineTo(x + s * 0.4, y + s * 0.4);
  ctx.lineTo(x, y + s * 1.6); ctx.lineTo(x - s * 0.4, y + s * 0.4); ctx.lineTo(x - s * 1.6, y); ctx.lineTo(x - s * 0.4, y - s * 0.4); ctx.fill();
}

function rock(ctx, x, y, r, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#6a6080'; ctx.strokeStyle = '#c090f0'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) { const q = i / 7 * TAU, rr = r * (0.7 + hash(i, 71) * 0.4); i ? ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr) : ctx.moveTo(Math.cos(q) * rr, Math.sin(q) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// riders(ctx, x, y, S, t): vẽ người bay (src/render/flight.js truyền vào)
export function drawSpace(ctx, screen, game, trip, riders, caption) {
  const { w, h } = screen, t = trip.t, k = t / trip.dur, sp = trip.space, U = Math.min(w, h);
  starfield(ctx, w, h, t);
  gates(ctx, w, h, t);
  const leave = ease(clamp01(k / 0.2)); // tinh cầu vừa rời đi: lùi sang trái, nhỏ dần
  if (leave < 1) planet(ctx, w * (0.1 - leave * 0.6), h * 0.75, U * (0.55 - leave * 0.3), colorOf(game, trip.from));
  const arrive = ease(clamp01((k - 0.6) / 0.4)); // tinh cầu đến: lớn dần từ bên phải
  if (arrive > 0) planet(ctx, w * (1.25 - arrive * 0.45), h * (0.62 + arrive * 0.1), U * (0.08 + arrive * 0.5), colorOf(game, trip.to));
  // sao và mảnh vỡ: vị trí ngang theo tiến độ, đi ngang chỗ người bay đúng lúc it.k
  for (const it of sp.items) {
    if (it.done) continue;
    const x = (PX + (it.k - k) * trip.dur * 0.5) * w; // trôi nửa màn mỗi giây
    if (x < -30 || x > w + 30) continue;
    if (it.kind === 'rock') rock(ctx, x, it.y * h, U * 0.035, t * 2 + it.spin);
    else star(ctx, x, it.y * h, U * (it.kind === 'gold' ? 0.02 : 0.014), t + it.k * 10, it.kind === 'gold');
  }
  // người bay: cất cánh, lượn theo sp.lane, lao xuống tinh cầu đến
  const up = ease(clamp01(k / 0.12)), down = ease(clamp01((k - 0.86) / 0.14));
  const S = Math.max(2, U / 120);
  const px = PX * w + down * w * 0.3, py = (1.05 - up * (1.05 - sp.lane)) * h + down * h * 0.1 + Math.sin(t * 3) * 4;
  if (sp.slowT > 0) { ctx.fillStyle = 'rgba(160,110,220,.35)'; ctx.beginPath(); ctx.arc(px, py - 6 * S, 16 * S, 0, TAU); ctx.fill(); }
  riders(ctx, px, py, S, t);
  for (const p of sp.pops) { // chữ +linh khí bay lên
    ctx.globalAlpha = clamp01(1.2 - p.t); ctx.font = '13px "Unifont VN", system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(p.text, px, py - 26 * S - p.t * 30); ctx.fillStyle = p.color; ctx.fillText(p.text, px, py - 26 * S - p.t * 30);
  }
  ctx.globalAlpha = 1;
  caption(ctx, w, h, trip, k, game.data.config.travel.space.texts.hint);
  const fade = Math.max(1 - k / 0.06, (k - 0.94) / 0.06); // loé sáng lúc vào trận và lúc đáp
  if (fade > 0) { ctx.fillStyle = `rgba(220,250,255,${clamp01(fade)})`; ctx.fillRect(0, 0, w, h); }
}
