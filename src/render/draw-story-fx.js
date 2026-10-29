// Hiệu ứng dàn cảnh trong truyện (lệnh {"fx": ...} ở data/story.json, src/game/story.js đặt game.storyFx).
// "ma-tay" (báo cáo #11, issue #333): khe nứt mở dưới chân NPC, cánh tay khói ma khí vươn lên, nắm lấy rồi kéo NPC lên trời,
// ma khí tím đen loang ra khắp làng rồi tan dần. Vẽ khối điểm ảnh nguyên, đồng hồ theo giờ thật (hộp thoại dừng game nhưng cảnh vẫn chạy).
const INK = '#120818', SMOKE = ['#1e0f2a', '#2e1640', '#4a2468'], GLOW = '#b45cff';
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : 1 - (1 - k) * (1 - k));

function puff(ctx, x, y, r, c) {   // cục khói tròn bằng các hàng điểm ảnh
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(ctx, c, x - w, y + dy, w * 2 + 1, 1); }
}

function crack(ctx, x, y, open) {   // khe nứt đen viền tím dưới đất
  const w = Math.round(14 * open);
  if (w < 1) return;
  ctx.globalAlpha = 0.5; R(ctx, GLOW, x - w - 1, y - 2, w * 2 + 3, 5); ctx.globalAlpha = 1;
  R(ctx, INK, x - w, y - 1, w * 2 + 1, 3);
  for (let i = -w; i <= w; i += 4) R(ctx, INK, x + i, y + ((i / 4) % 2 ? 2 : -2), 2, 1);
}

function hand(ctx, x, y, grip, t) {   // bàn tay khói: lòng bàn tay, bốn ngón cong dần khi nắm (grip 0..1), ngón cái
  puff(ctx, x, y, 5, SMOKE[1]);
  for (let i = 0; i < 4; i++) {
    const fx = x - 6 + i * 4, len = 7 - (i === 0 || i === 3 ? 2 : 0), curl = Math.round(grip * 4);
    R(ctx, INK, fx - 1, y - len - 1, 4, len + 2);
    R(ctx, SMOKE[2], fx, y - len, 2, len);
    if (curl) R(ctx, SMOKE[2], fx + (i < 2 ? 1 : -1), y - len - 1, 2, curl);   // đầu ngón quặp vào
    if ((t * 6 + i) % 2 < 1) R(ctx, GLOW, fx, y - len, 1, 1);
  }
  R(ctx, INK, x + 6, y - 2, 5, 4); R(ctx, SMOKE[2], x + 6 + grip * -2, y - 1, 4, 2);   // ngón cái
}

function arm(ctx, x0, y0, x1, y1, t) {   // thân tay: chuỗi cục khói dọc đường cong từ khe nứt tới bàn tay, gợn sóng
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const k = i / n, sway = Math.sin(t * 5 + k * 6) * 3 * (1 - k);
    const x = x0 + (x1 - x0) * k + sway, y = y0 + (y1 - y0) * k;
    const r = Math.round(9 - k * 3);
    ctx.globalAlpha = 0.35; puff(ctx, x, y, r + 2, GLOW); ctx.globalAlpha = 1;   // viền sáng tím cho nổi trên nền tối
    puff(ctx, x, y, r, INK);
    puff(ctx, x - 1, y - 1, r - 2, SMOKE[i % 2 + 1]);
  }
}

function fog(ctx, game, fx, age) {   // ma khí loang khắp làng quanh khe nứt, mờ dần sau cùng
  const a = Math.min(1, age / 1.5) * Math.max(0, 1 - Math.max(0, age - fx.fog) / 3);
  if (a <= 0) return;
  for (let i = 0; i < 16; i++) {   // mỗi đám mây ma khí: ba cục chồng, thân tím đen, mép trên tím sáng
    const ang = i * 2.39, d = 18 + (i * 37) % 130 * Math.min(1, age / 2.5);
    const x = fx.x + Math.cos(ang) * d + Math.sin(age * 0.6 + i) * 10, y = fx.y + Math.sin(ang) * d * 0.55 - (age * 3 + i * 5) % 10;
    const r = 10 + (i % 4) * 3;
    ctx.globalAlpha = a * 0.32;
    puff(ctx, x, y, r, '#2a0f40'); puff(ctx, x + r * 0.8, y + 2, Math.round(r * 0.7), '#2a0f40'); puff(ctx, x - r * 0.7, y + 3, Math.round(r * 0.6), '#2a0f40');
    ctx.globalAlpha = a * 0.22; puff(ctx, x - 2, y - Math.round(r * 0.4), Math.round(r * 0.55), '#7a3ab8');
  }
  ctx.globalAlpha = 1;
}

export function drawStoryFx(ctx, game) {
  const fx = game.storyFx;
  if (!fx || fx.fx !== 'ma-tay') return;
  const age = (performance.now() - fx.t0) / 1000, t = age;
  if (age > fx.fog + 3.5) { game.storyFx = null; return; }
  fog(ctx, game, fx, age);
  const npc = game.npcs.find(n => n.id === fx.npc), RISE = 0.9, GRAB = 1.3, DRAG = 2.4;
  const gx = fx.x, gy = fx.y + 6;   // khe nứt ngay dưới chân
  crack(ctx, gx, gy, ease(age / 0.4) * (age > DRAG + 0.6 ? Math.max(0, 1 - (age - DRAG - 0.6) / 0.5) : 1));
  if (age > DRAG + 0.6) return;
  let hx = gx, hy;
  if (age < RISE) hy = gy - 56 * ease(age / RISE);                       // tay vươn lên cao hơn đầu NPC
  else if (age < GRAB) hy = gy - 56 + 30 * ease((age - RISE) / (GRAB - RISE));   // chụp xuống nắm lấy
  else hy = gy - 26 - 150 * ease((age - GRAB) / (DRAG - GRAB));            // kéo vút lên trời (Ma Vân)
  const grip = age < RISE ? 0 : Math.min(1, (age - RISE) / (GRAB - RISE));
  if (npc && age > GRAB) {   // NPC bị nhấc theo bàn tay
    if (fx.ny == null) { fx.nx = npc.x; fx.ny = npc.y; }
    npc.y = Math.min(fx.ny, hy + 18); npc.x = fx.nx + Math.sin(age * 9) * 1.5;
  }
  arm(ctx, gx, gy, hx, hy + 8, t);
  ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.scale(2, 2);   // bàn tay to gấp đôi, khối điểm ảnh 2×2
  ctx.globalAlpha = 0.4; puff(ctx, 0, -2, 9, GLOW); ctx.globalAlpha = 1;
  hand(ctx, 0, 0, grip, t); ctx.restore();
}
