// Hình thiên lôi độ kiếp và lễ ăn mừng (src/game/trib-sky.js, src/game/trib-cele.js), điểm ảnh nguyên theo lưới bản đồ.
// drawScorch: vết cháy đen sau mỗi tia sét (mép tan dither), than hồng trong lòng, gợn sét nhỏ lách tách tới hết kiếp, rồi nhạt dần.
// drawCele: hạt linh khí xoáy vào người, quầng sáng to dần lúc tụ; sau tiếng bùm cả vùng nhìn thấy ánh màu cảnh giới rồi nhạt.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

export function drawScorch(ctx, game, t) {
  const L = game.scorch;
  if (!L?.length) return;
  for (const s of L) {
    const fade = s.fade != null ? Math.min(1, Math.max(0, s.fade / (s.fade0 || 3))) : 1, born = Math.min(1, s.t / 0.15);
    const a = fade * born, rx = Math.round(s.r), ry = Math.max(2, Math.round(s.r * 0.42)), cx = Math.round(s.x), cy = Math.round(s.y);
    if (a <= 0.02) continue;
    const cut = Math.floor((1 - a) * 16);
    ctx.fillStyle = '#120c14';
    for (let yy = -ry; yy <= ry; yy++) {   // vết cháy: bầu dục dẹt, mép thưa dần (dither theo khoảng cách tới tâm)
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / (ry + 0.5)) ** 2)));
      for (let xx = -half; xx <= half; xx++) {
        const x = cx + xx, y = cy + yy, edge = Math.hypot(xx / (rx + 0.5), yy / (ry + 0.5));
        if (BAYER[(y & 3) * 4 + (x & 3)] < cut + Math.floor(edge * edge * 12)) continue;
        ctx.globalAlpha = 0.7; ctx.fillRect(x, y, 1, 1);
      }
    }
    const pal = s.pal || ['#ffffff', '#9ad8ff', '#8a6cff'];
    ctx.globalAlpha = 0.6 * a * (0.6 + 0.4 * Math.sin(t * 7 + s.seed)); ctx.fillStyle = '#ff9a3a';   // than hồng giữa vết
    ctx.fillRect(cx - 1, cy, 3, 1); ctx.fillRect(cx, cy - 1, 1, 3);
    if (s.fade != null) continue;   // hết kiếp: gợn sét tắt, chỉ còn vết cháy nhạt dần
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tick = Math.floor(t * 12 + s.seed);   // gợn sét nhỏ: 1–3 nét gấp khúc ngắn quanh vết, đổi hình 12 lần / giây, lúc có lúc tắt
    for (let k = 0; k < 3; k++) {
      if (hash(tick * 3 + k + s.seed) < 0.45) continue;
      let x = cx + Math.round((hash(tick + k * 7 + s.seed) - 0.5) * rx * 1.6), y = cy + Math.round((hash(tick * 5 + k + s.seed) - 0.5) * ry * 1.6);
      ctx.fillStyle = pal[hash(tick + k) < 0.5 ? 0 : 1]; ctx.globalAlpha = 0.9;
      for (let i = 0; i < 4; i++) { ctx.fillRect(x, y, 1, 1); x += hash(tick + i + k * 11) < 0.5 ? -1 : 1; y -= 1; }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawCele(ctx, game, t) {
  if (game.cele) drawOne(ctx, game, game.cele, game.player, true);
  for (const c of game.celeSee || []) drawOne(ctx, game, c, c.who, false);   // lễ của người khác (trib-cele.js celeSeeStart)
}

function drawOne(ctx, game, c, p, mine) {
  const K = game.data.config.trib_fx?.cele || {}, G = K.gather || 2.6, k = Math.min(1, c.t / G);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (!c.boomed) {   // quầng sáng quanh người to dần, cột sáng mảnh vọt lên
    ctx.globalAlpha = 0.25 + 0.35 * k; ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 8, 10 + 22 * k, 8 + 16 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y - 8 - 220 * k), 3, Math.round(220 * k));
  } else if (mine) {   // sau bùm: cả vùng ánh màu cảnh giới rồi nhạt (after giây)
    const v = game.screen?.viewRect?.(), a = Math.max(0, 1 - (c.t - G) / (K.after || 1.6)) * (K.tint || 0.22);
    if (v && a > 0) { ctx.globalAlpha = a; ctx.fillStyle = c.color; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  }
  for (const q of c.parts) {   // hạt linh khí: lõi trắng, đuôi màu cảnh giới kéo ngược hướng bay
    const x = Math.round(q.x), y = Math.round(q.y), tx = Math.round(Math.cos(q.a + q.spin * 0.25) * 3), ty = Math.round(Math.sin(q.a + q.spin * 0.25) * 2);
    const z = q.s > 2 ? 3 : 2;
    ctx.globalAlpha = 0.85; ctx.fillStyle = c.color; for (let i = 1; i <= 3; i++) ctx.fillRect(x + tx * i, y + ty * i, z - 1, z - 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, z, z);
  }
  ctx.restore();
}
