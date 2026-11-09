// Hình Phá Thiên Tuyệt Trảm (src/game/skill-charge.js), vẽ ở lớp trên cùng cùng vệt chém (draw-slash.js drawSlashes, sau ngày đêm
// nên đêm vẫn chói). Số ở data/config.json → charge_fx.
// Tụ lực: màn tối dần ở rìa, linh khí bốn phương hút về vũ khí; vũ khí bay lên trên đầu, dựng thẳng, đỏ rực và lớn dần tới s.grow lần;
// sét trắng đỏ, huyết vụ đỏ đen, sương trắng thay nhau cuốn quanh (mỗi thứ mạnh lên rồi lắng theo nhịp lệch nhau); vòng huyết dưới chân.
// Chém (chủ dự án 09/11/2026 23:41): cả cây vũ khí khổng lồ bay vọt về phía trước (F.fly_t giây) cùng vệt sáng hình quạt s.angle độ có đáy
// tới mép màn, ba lớp (viền mờ màu trang phục, thân trắng nhạt dần về cuối, lõi trắng tinh), tia tốc độ, loé ở gốc; lan ra trong F.grow_t
// giây rồi tan dần.
import { drawWeaponAt } from './draw-flyweapon.js';

const clamp = k => Math.max(0, Math.min(1, k));
const ease = k => 1 - (1 - clamp(k)) ** 3;
const RED = '#ff1a24';

export function drawCharges(ctx, game) {
  const F = game.data.config.charge_fx;
  if (!F) return;
  for (const a of [game.player, ...(game.others?.visible?.() || []), ...game.mobs.filter(m => m.charge)]) if (a?.charge) one(ctx, game, a, F);
  for (const f of game.fx) if (f.type === 'beam') beam(ctx, game, f, F);
}

function one(ctx, game, a, F) {
  const c = a.charge, s = c.s, k = clamp(c.t / s.charge), e = ease(k), T = game.time, dd = Math.abs(ctx.getTransform().d) || 1;
  const sc = 1 + (s.grow - 1) * e, top = a.top || 24, wx = a.x, wy = a.y - top - 4 - F.lift * e - F.half * sc;   // F.half: nửa chiều dài vũ khí bay thường: chuôi ở trên đầu
  ctx.save();
  // rìa màn tối dần (chỉ máy mình)
  if (a === game.player && game.screen?.viewRect) {
    const v = game.screen.viewRect(), g = ctx.createRadialGradient(a.x, a.y - 12, 30, a.x, a.y - 12, Math.max(v.x1 - v.x0, v.y1 - v.y0) * 0.75);
    g.addColorStop(0, 'rgba(8,0,4,0)'); g.addColorStop(1, `rgba(8,0,4,${F.vignette * e})`);
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }
  // vòng huyết dưới chân
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 8 * dd;
  ctx.globalAlpha = 0.35 + 0.35 * e; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(a.x, a.y, 10 + 8 * e, (10 + 8 * e) * 0.32, 0, T * 2, T * 2 + Math.PI * 1.6); ctx.stroke();
  // linh khí bốn phương hút về vũ khí
  for (let i = 0; i < F.qi; i++) {
    const ph = (T * 0.9 + i / F.qi * 2.7) % 1, q = i * 2.399, r = F.qi_r * (1 - ph) ** 1.6;
    ctx.globalAlpha = Math.sin(Math.PI * ph) * (0.4 + 0.6 * e); ctx.fillStyle = i % 3 === 0 ? RED : i % 3 === 1 ? '#ffffff' : c.color;
    ctx.shadowBlur = 4 * dd; ctx.shadowColor = ctx.fillStyle;
    const px = wx + Math.cos(q) * r, py = wy + Math.sin(q) * r * 0.8, z = 0.8 + (1 - ph);
    ctx.fillRect(px - z / 2, py - z / 2, z, z);
  }
  // quầng đỏ sau vũ khí
  ctx.shadowBlur = 0;
  const glow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 10 * sc);
  glow.addColorStop(0, `rgba(255,60,60,${0.55 * e})`); glow.addColorStop(1, 'rgba(255,0,20,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(wx, wy, 10 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // huyết vụ đỏ đen, sương trắng (sau vũ khí một nửa, trước một nửa: vẽ hai lượt)
  swirl(ctx, a, F, T, k, wx, wy, sc, true);
  ctx.globalAlpha = 1;
  if (a !== game.player || !drawWeaponAt(ctx, game, wx, wy, -Math.PI / 2, F.fw_k * sc, F.red * Math.min(1, k * 1.3), RED)) blade(ctx, wx, wy, sc, k, dd);
  swirl(ctx, a, F, T, k, wx, wy, sc, false);
  // sét trắng đỏ quanh vũ khí
  const wl = (0.5 + 0.5 * Math.sin(T * 2.3)) * e;
  if (wl > 0.08) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter';
    for (let b = 0; b < 3; b++) {
      if (Math.random() > 0.55 + 0.4 * wl) continue;
      const a0 = Math.random() * Math.PI * 2, a1 = a0 + 1 + Math.random() * 2, rx = 5 + 4 * sc, ry = 8 + 7 * sc;
      ctx.beginPath();
      for (let j = 0; j <= 6; j++) {
        const u = a0 + (a1 - a0) * j / 6, jr = 1 + (Math.random() - 0.5) * 0.35;
        const px = wx + Math.cos(u) * rx * jr, py = wy + Math.sin(u) * ry * jr;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 8 * dd; ctx.lineWidth = 1.6; ctx.globalAlpha = wl; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 2 * dd; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }
  ctx.restore();
}

// Huyết vụ đỏ, khói đen, sương trắng cuộn quanh vũ khí theo vòng elip dựng đứng; ba thứ thay nhau mạnh lên. back: nửa phía sau
function swirl(ctx, a, F, T, k, wx, wy, sc, back) {
  const rx = 5 + 4.5 * sc, ry = 8 + 7.5 * sc, n = F.mist;
  const w = [0, 2.1, 4.2].map(o => (0.5 + 0.5 * Math.sin(T * 2.3 + o)) * ease(k));   // sét, huyết vụ, sương
  for (let i = 0; i < n; i++) {
    const u = T * (1.6 + (i % 3) * 0.3) + i / n * Math.PI * 2, front = Math.sin(u) > 0;
    if (front === back) continue;
    const kind = i % 3, px = wx + Math.cos(u) * rx, py = wy + Math.sin(u * 0.5 + i) * ry * 0.8, r = 2.5 + 1.6 * sc;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    if (kind === 0) { g.addColorStop(0, 'rgba(200,16,40,0.9)'); g.addColorStop(1, 'rgba(90,0,10,0)'); ctx.globalAlpha = 0.75 * w[1]; }
    else if (kind === 1) { g.addColorStop(0, 'rgba(18,4,10,0.9)'); g.addColorStop(1, 'rgba(18,4,10,0)'); ctx.globalAlpha = 0.7 * w[1]; }
    else { g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(230,236,255,0)'); ctx.globalAlpha = 0.5 * w[2]; }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}

// Lưỡi kiếm vẽ bằng nét (người khác, bản sao: không có hình vũ khí của họ): dựng thẳng, đỏ rực dần, lõi trắng
function blade(ctx, x, y, sc, k, dd, rot = 0) {   // rot: xoay quanh tâm (0: mũi chĩa lên)
  const L = 9 * sc, W = 1.6 * sc;
  ctx.save(); if (rot) { ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y); } ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = RED; ctx.shadowBlur = 10 * dd;
  ctx.fillStyle = `rgba(255,${Math.round(200 - 170 * k)},${Math.round(200 - 170 * k)},0.95)`;
  ctx.beginPath(); ctx.moveTo(x, y - L); ctx.lineTo(x + W, y + L * 0.55); ctx.lineTo(x - W, y + L * 0.55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 2 * dd;
  ctx.beginPath(); ctx.moveTo(x, y - L * 0.9); ctx.lineTo(x + W * 0.35, y + L * 0.45); ctx.lineTo(x - W * 0.35, y + L * 0.45); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - W * 1.6, y + L * 0.55, W * 3.2, Math.max(1, sc * 0.7));   // chắn kiếm
  ctx.restore();
}

// Quạt sáng: gốc (x, y), hướng ang, nửa góc half, dài len; lan ra trong F.grow_t giây rồi tan
function beam(ctx, game, f, F) {
  const g = clamp(f.t / F.grow_t), L = f.len * ease(g), fade = f.t < F.grow_t ? 1 : clamp(1 - (f.t - F.grow_t) / (f.life - F.grow_t));
  if (L < 2 || fade <= 0) return;
  const dd = Math.abs(ctx.getTransform().d) || 1, c = Math.cos(f.ang), s = Math.sin(f.ang);
  // quạt có đáy (game/skill-charge.js inBeam): rộng b mỗi bên tại gốc, mở nửa góc h, dài len từ gốc; vẽ như quạt nhọn từ đỉnh ảo sau gốc
  const wedge = (h, len, b) => {
    b = Math.max(1, b);
    const off = b / Math.tan(h), ax = f.x - c * off, ay = f.y - s * off, R = len + off;
    ctx.beginPath(); ctx.moveTo(f.x + s * b, f.y - c * b);
    for (let i = 0; i <= 16; i++) { const a = f.ang - h + 2 * h * i / 16; ctx.lineTo(ax + Math.cos(a) * R, ay + Math.sin(a) * R); }
    ctx.lineTo(f.x - s * b, f.y + c * b); ctx.closePath();
  };
  const B = f.base || 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = 26 * dd; ctx.globalAlpha = F.rim * fade;   // viền mờ màu trang phục
  wedge(f.half * 1.14, L * 1.02, B + 6); ctx.fill();
  const gr = ctx.createLinearGradient(f.x, f.y, f.x + c * L, f.y + s * L);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = gr; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12 * dd; ctx.globalAlpha = 0.85 * fade;   // thân trắng
  wedge(f.half, L, B + 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = fade;   // lõi trắng tinh
  wedge(f.half * 0.42, L * 0.97, B * 0.45 + 1.5); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;   // tia tốc độ chạy dọc quạt
  for (let i = 0; i < 10; i++) {
    const q = (((i * 0.618) % 1) - 0.5) * 1.8, a = f.ang + q * f.half, u = ((f.t * 2.2 + i * 0.37) % 1), ox = f.x - s * B * q, oy = f.y + c * B * q;   // tia toả từ khắp đáy
    ctx.globalAlpha = 0.6 * fade * (1 - u); ctx.beginPath();
    ctx.moveTo(ox + Math.cos(a) * L * u, oy + Math.sin(a) * L * u); ctx.lineTo(ox + Math.cos(a) * L * Math.min(1, u + 0.25), oy + Math.sin(a) * L * Math.min(1, u + 0.25)); ctx.stroke();
  }
  const u = clamp(f.t / F.fly_t), fd = f.len * ease(u) * 0.9, G = f.grow || 5, wx = f.x + c * fd, wy = f.y + s * fd;   // cả cây vũ khí bay vọt theo vệt sáng
  const tr = ctx.createRadialGradient(wx, wy, 0, wx, wy, 12 * G);   // quầng đỏ quanh vũ khí, nổi trên nền trắng
  tr.addColorStop(0, 'rgba(255,30,40,0.55)'); tr.addColorStop(1, 'rgba(255,30,40,0)');
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade * (1 - 0.5 * u); ctx.fillStyle = tr; ctx.beginPath(); ctx.arc(wx, wy, 12 * G, 0, Math.PI * 2); ctx.fill();
  if (!f.own || !drawWeaponAt(ctx, game, wx, wy, f.ang, F.fw_k * G, 0.9, RED)) blade(ctx, wx, wy, G, 1, dd, f.ang + Math.PI / 2);
  const fl = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 26);   // loé ở gốc
  fl.addColorStop(0, 'rgba(255,255,255,1)'); fl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = fade * (1 - g * 0.5); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
