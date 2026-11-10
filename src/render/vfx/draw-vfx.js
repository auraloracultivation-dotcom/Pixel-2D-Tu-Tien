// Vẽ hiệu ứng chiêu thế hệ mới ở lớp TRÊN CÙNG (sau ngày đêm, mây, bóng tối hầm): đè lên nhà cửa, cây, người (quy tắc chiêu
// 05/11/2026, docs/02-CHUAN-PIXEL.md). Mọi hình vẽ mượt (không điểm ảnh); mỗi hình chiêu có quầng màu mờ dần và lõi trắng sáng ở
// giữa. Trạng thái ở game.vfx (src/game/vfx.js), công thức data/vfx.json. Thứ tự: pháp trận, vùng chiêu → khiên, hào quang →
// đạn (bóng mờ, quầng, hình, lõi) → nổ, sét, núi rơi… → hạt.
import { drawJuiceWorld, drawJuiceScreen } from '../draw-juice.js';
import { drawKiemVu } from '../draw-kiem-vu.js';
import { vfxOf } from '../../game/vfx.js';
import { glow, core, vimg, groundCircle, ease, back } from './glow.js';
import { spriteImage } from '../sprites.js';

const TAU = Math.PI * 2;

// Hình chiêu kèm quầng và lõi trắng: dùng cho mọi hình chính
function lit(ctx, art, C, name, x, y, size, color, o = {}) {
  const a = o.a ?? 1, g = o.glow ?? size * 0.6;
  glow(ctx, x, y, g, color, C.halo_a * a);
  vimg(ctx, art, name, x, y, size, o);
  core(ctx, x, y, size * C.r * (o.coreMul ?? 1), color, C.a * a * (o.core ?? 1));
}

function drawZones(ctx, game, art, C, t) {
  for (const z of game.zones) {
    const V = vfxOf(game, z.sk);
    if (!V) continue;
    const color = V.color || z.color, fade = Math.min(1, z.t * 4, (z.dur - z.t) * 2), r = z.radius;
    if (V.circle) groundCircle(ctx, art, V.circle, z.x, z.y + 1, r * 0.95, t * 0.5, 0.55 * fade);
    if (V.show === 'orbit') {   // kim luân: hai vòng kim xoay quanh người, sáng lóe theo vòng
      for (let i = 0; i < 2; i++) {
        const a = t * (V.spin || 2) * TAU / 3 + i * Math.PI, x = z.x + Math.cos(a) * r * 0.85, y = z.y - 8 + Math.sin(a) * r * 0.5;
        lit(ctx, art, C, V.img || z.sk, x, y, V.size, color, { rot: t * (V.spin || 2) * TAU, a: fade });
      }
      continue;
    }
    const size = V.size * (1 + 0.03 * Math.sin(t * 3)), a = fade * (z.follow ? 0.42 : 0.6);   // vùng kéo dài: trong để thấy người, quái bên trong
    glow(ctx, z.x, z.y - 4, r * 1.15, color, 0.3 * fade);
    vimg(ctx, art, V.img || z.sk, z.x, z.y - (V.flat ? 0 : size * 0.12), size, { a, sy: V.flat ? 0.62 : 1, rot: V.spin && !V.flat ? t * V.spin * TAU : 0 });
    core(ctx, z.x, z.y - 4, r * 0.35, color, 0.45 * fade);
  }
}

// Khiên bọc người, hào quang tăng sức (người chơi, bản sao so tài)
function drawSelf(ctx, game, art, C, t, who) {
  const Vs = who.shield > 0 && who.shieldT > 0 && vfxOf(game, who.shieldSk);
  if (Vs) {
    const p = 0.5 + 0.5 * Math.sin(t * 4), color = Vs.color || who.shieldColor;
    glow(ctx, who.x, who.y - 10, Vs.glow * 1.4, color, 0.1 + 0.05 * p);   // quầng rộng nhạt: không làm trắng nhân vật
    vimg(ctx, art, Vs.img || who.shieldSk, who.x, who.y - 11, Vs.size * (1 + 0.03 * p), { a: (Vs.dome_a ?? 0.3) + 0.05 * p, add: !!Vs.dome_add });   // khiên trong như kính: vẫn thấy rõ nhân vật
  }
  const Vb = who.buffT > 0 && vfxOf(game, who.buffSk);
  if (Vb) {
    const p = 0.5 + 0.5 * Math.sin(t * 5), color = Vb.color || who.buffColor;
    glow(ctx, who.x, who.y - 12, Vb.glow * 1.5, color, 0.08 + 0.05 * p);
    vimg(ctx, art, Vb.img || who.buffSk, who.x, who.y - 16, Vb.size * (1 + 0.05 * p), { a: 0.2 + 0.08 * p });   // hào quang to hơn người, nhạt, không cộng sáng: không làm trắng bệch nhân vật
    const k = (t * 0.8) % 1;   // vòng sáng chạy từ chân lên đầu: nhìn là biết đang tăng sức
    ctx.save(); ctx.translate(who.x, who.y - k * 26); ctx.scale(1, 0.35); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * Math.sin(Math.PI * k); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke(); ctx.restore();
  }
}

function drawBullet(ctx, game, art, C, t, b, V) {
  const color = V.color || b.color, sp = Math.hypot(b.vx, b.vy) || 1, a = Math.atan2(b.vy, b.vx), left = Math.cos(a) < 0;
  const rot = V.spin ? t * V.spin * TAU : V.face ? a : 0, name = V.img || b.sk, h = b.hist || [], n = Math.floor(h.length / 2);
  const fadeIn = Math.min(1, (b.age = (b.age || 0) + 1 / 60) * 10);
  for (let i = 0; i < n - 1; i++) {   // bóng mờ phía sau: nhạt, nhỏ dần
    const k = (i + 1) / n;
    vimg(ctx, art, name, h[i * 2], h[i * 2 + 1], V.size * (0.75 + 0.25 * k), { rot, flip: V.face && left, a: 0.28 * k * fadeIn, add: true });
  }
  if (V.streak) {   // kim gỗ: vệt sáng dài theo hướng bay
    const L = V.size * 1.8, ux = b.vx / sp, uy = b.vy / sp;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(b.x - ux * L, b.y - uy * L, b.x, b.y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, V.streak);
    ctx.globalAlpha = 0.9; ctx.strokeStyle = g; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(b.x - ux * L, b.y - uy * L); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  lit(ctx, art, C, name, b.x, b.y, V.size, color, { rot, flip: V.face && left, a: fadeIn, glow: V.glow });
}

function drawFx(ctx, game, art, C, t, f) {
  const T = f.t - (f.delay || 0);
  if (T < 0) return;
  const pl = game.player, nearMul = Math.hypot(f.x - pl.x, f.y - pl.y) < 16 ? game.data.vfx.near_mul ?? 1 : 1;   // nở ngay trên người: dịu lõi, quầng cho khỏi trắng nhân vật
  const k = Math.min(1, T / f.life), out = 1 - Math.max(0, (k - 0.55) / 0.45);
  switch (f.k) {
    case 'muzzle': glow(ctx, f.x, f.y, f.r * (0.5 + k), f.color, 0.8 * (1 - k)); core(ctx, f.x, f.y, f.r * 0.5, f.color, 0.9 * (1 - k)); break;
    case 'pop': glow(ctx, f.x, f.y, f.r * (0.6 + k * 0.8), f.color, 0.9 * (1 - k)); core(ctx, f.x, f.y, f.r * 0.6 * (1 - k * 0.5), f.color, 1 - k); break;
    case 'flash': lit(ctx, art, C, f.img, f.x, f.y - 6 - k * 6, f.size * (0.6 + 0.4 * ease(k * 2)), f.color, { a: out * 0.85, core: 0.5 }); break;
    case 'circle': groundCircle(ctx, art, f.img, f.x, f.y, f.r * (0.6 + 0.4 * ease(k * 5)), T * 1.2, 0.8 * out); break;
    case 'ring': {   // sóng xung kích: vành sáng nở ra, mỏng dần, nằm dẹt trên đất
      const r = f.r * (0.25 + 0.95 * ease(k));
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 0.5);
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, col, al] of [[5, f.color, 0.45], [1.6, '#ffffff', 0.9]]) {
        ctx.globalAlpha = al * (1 - k); ctx.strokeStyle = col; ctx.lineWidth = w * (1 - k * 0.6);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      }
      ctx.restore(); break;
    }
    case 'burst': {
      const s = f.size * (0.5 + 0.8 * ease(k * 1.6));
      glow(ctx, f.x, f.y, s * 0.8, f.color, 0.7 * (1 - k) * nearMul);
      vimg(ctx, art, f.img, f.x, f.y, s, { a: out * (nearMul < 1 ? 0.75 : 1), add: k > 0.35 });
      core(ctx, f.x, f.y, s * 0.3, f.color, (1 - k * 2.2) * nearMul);
      break;
    }
    case 'ground': {
      const s = f.size * back(Math.min(1, k * 3.2)), a = out * (f.flat ? 0.72 : 0.9) * (nearMul < 1 && !f.flat ? 0.8 : 1);
      glow(ctx, f.x, f.y - 4, f.size * 0.5, f.color, 0.3 * out * nearMul);
      vimg(ctx, art, f.img, f.x, f.y - (f.flat ? 0 : s * 0.12), s, { a, sy: f.flat ? 0.62 : 1, add: k > 0.45 });
      core(ctx, f.x, f.y - 4, f.size * 0.18, f.color, 0.9 * (1 - k) * nearMul);
      break;
    }
    case 'center': {   // lốc xoáy: lớn lên, lắc qua lại, xoáy nhẹ
      const s = f.size * back(Math.min(1, k * 3)), wob = Math.sin(T * 18) * 2;
      glow(ctx, f.x, f.y - s * 0.3, s * 0.7, f.color, 0.5 * out);
      vimg(ctx, art, f.img, f.x + wob, f.y - s * 0.42, s, { a: out, sx: 1 + 0.06 * Math.sin(T * 25) });
      core(ctx, f.x, f.y - s * 0.3, s * 0.2, f.color, 0.8 * (1 - k));
      break;
    }
    case 'sky': {   // sét giáng: chân sét ở tâm chiêu, kéo dài xuống thật nhanh, chớp tắt, cột sáng
      const grow = Math.min(1, T / 0.07), fl = T < 0.3 ? (Math.floor(T * 40) % 2 ? 0.75 : 1) : out;
      glow(ctx, f.x, f.y - f.size * 0.45, f.size * 0.9, f.color, 0.55 * fl);
      vimg(ctx, art, f.img, f.x, f.y - f.size * 0.5 * grow, f.size, { a: fl, sy: grow });
      core(ctx, f.x, f.y - 2, f.size * 0.35, f.color, 1.2 * (1 - k));
      break;
    }
    case 'drop': {   // núi, tháp rơi xuống: lao nhanh, chạm đất thì giữ một lúc rồi tan
      const on = f.on, x = on ? on.x : f.x, y = on ? on.y : f.y, land = Math.min(1, T / f.land);
      const yy = y - f.size * 0.42 - (1 - land * land) * 70, a = T < f.land ? Math.min(1, T * 8) : 1 - Math.max(0, (T - f.land) / (f.life - f.land)) * (f.soft ? 1 : 0.9);
      glow(ctx, x, yy, f.size * 0.7, f.color, 0.45 * a);
      vimg(ctx, art, f.img, x, yy, f.size, { a, add: f.soft && T > f.land });
      if (T >= f.land) core(ctx, x, y - 4, f.size * 0.4, f.color, (1 - (T - f.land) * 3) * nearMul);
      break;
    }
    case 'rise': {   // hồi máu: lá, sen bay lên trên đầu, nở ra, cột sáng dưới chân
      const on = f.on, y = on.y - 12 - 22 * ease(k * 1.4), s = f.size * (0.6 + 0.45 * ease(k * 2));
      glow(ctx, on.x, on.y - 8, f.size * 0.9, f.color, 0.45 * out);
      lit(ctx, art, C, f.img, on.x, y, s, f.color, { a: out });
      break;
    }
    case 'sweep': {   // lướt: hình chiêu bay dọc đường lướt, vệt sáng phía sau, vượt qua điểm cuối một đoạn rồi tan
      const go = Math.min(1, T / f.go), extra = Math.max(0, T - f.go) / (f.life - f.go), dx = f.x2 - f.x, dy = f.y2 - f.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L, d = L * ease(go) + 26 * extra, hx = f.x + ux * d, hy = f.y - 8 + uy * d, a = Math.atan2(uy, ux), left = ux < 0, al = 1 - extra;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const g = ctx.createLinearGradient(f.x, f.y - 8, hx, hy);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, f.color);
      ctx.globalAlpha = 0.75 * al; ctx.strokeStyle = g; ctx.lineWidth = f.size * 0.3;
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 8); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalAlpha = 0.9 * al; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = f.size * 0.07;
      ctx.beginPath(); ctx.moveTo(f.x + ux * d * 0.35, f.y - 8 + uy * d * 0.35); ctx.lineTo(hx, hy); ctx.stroke();
      for (let i = 1; i <= 3; i++) vimg(ctx, art, f.img, hx - ux * i * 9, hy - uy * i * 9, f.size * (1 - i * 0.08), { rot: a, flip: left, a: 0.25 * al / i, add: true });
      lit(ctx, art, C, f.img, hx, hy, f.size, f.color, { rot: a, flip: left, a: al });
      break;
    }
  }
}

function drawParts(ctx, art, parts) {
  for (const q of parts) {
    const k = q.t / q.life, a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    vimg(ctx, art, q.img, q.x, q.y, q.size * (1 - k * 0.45), { rot: q.rot, a, add: q.add });
  }
}

let warmed = false;
export function drawVfx(ctx, game, t) {
  const S = game.vfx, art = game.data.art, C = game.data.vfx?.core;
  if (!C) return;
  if (!warmed) { warmed = true; for (const [k, spr] of Object.entries(art.sprites)) if (k.startsWith('vfx.')) spriteImage(spr); }   // tải sẵn mọi hình chiêu: lần tung đầu không bị trống
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawZones(ctx, game, art, C, t);
  const fxs = S?.fx || [];
  for (const f of fxs) if (f.k === 'circle' || f.k === 'ground') drawFx(ctx, game, art, C, t, f);
  drawSelf(ctx, game, art, C, t, game.player);
  for (const e of game.duel?.mob ? game.duel.foes : []) drawSelf(ctx, game, art, C, t, e);
  for (const b of game.bullets) { const V = vfxOf(game, b.sk); if (V) drawBullet(ctx, game, art, C, t, b, V); }
  for (const f of fxs) if (f.k !== 'circle' && f.k !== 'ground') drawFx(ctx, game, art, C, t, f);
  if (S?.parts.length) drawParts(ctx, art, S.parts);
  ctx.restore();
  drawKiemVu(ctx, game, t);   // Vạn Kiếm Quy Tông (src/render/draw-kiem-vu.js)
  drawJuiceWorld(ctx, game, t);   // cảm giác đánh: tia toả, vụn, khói vòng, đốm linh khí (src/render/draw-juice.js)
  if (game.screen) { game.screen.screenTransform(); drawJuiceScreen(ctx, game, game.screen, t); game.screen.worldTransform(); }
}
