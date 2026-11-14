// Vẽ cảm giác đánh (src/game/juice.js, data/juice.json; chủ dự án 09/11/2026 00:30 học clip mẫu): tia toả + chớp trắng khi trúng,
// vòng sóng, bụi vụn, khói vòng sau đạn và khi lướt, đốm linh khí hút về người, quầng Bạo Nộ; trên màn: số Liên Kích nảy,
// chữ mốc to giữa màn, viền đỏ khi mất nhiều máu, viền lửa khi Bạo Nộ. Vẽ mượt (không pixel) như hiệu ứng chiêu, lớp trên cùng.
const TAU = Math.PI * 2;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, a)})`; };
const easeOut = k => 1 - (1 - k) * (1 - k);

function glow(ctx, x, y, r, c, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.35, rgba(c, a * 0.8)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// Tia nhọn: tam giác mảnh từ gần tâm ra ngoài, lõi trắng
function ray(ctx, x, y, a, r0, r1, w, c, al) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * w, ny = ca * w;
  ctx.fillStyle = rgba(c, al);
  ctx.beginPath(); ctx.moveTo(x + ca * r0 + nx, y + sa * r0 + ny); ctx.lineTo(x + ca * r1, y + sa * r1); ctx.lineTo(x + ca * r0 - nx, y + sa * r0 - ny); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${al})`;
  ctx.beginPath(); ctx.moveTo(x + ca * r0 + nx * 0.4, y + sa * r0 + ny * 0.4); ctx.lineTo(x + ca * r1 * 0.85, y + sa * r1 * 0.85); ctx.lineTo(x + ca * r0 - nx * 0.4, y + sa * r0 - ny * 0.4); ctx.fill();
}

function rageAura(ctx, game, t) {
  const S = game.juice, R = game.data.juice.rage, p = game.player;
  if (!(S?.rageOn > 0)) return;
  const k = Math.min(1, S.rageOn / 0.4) * (0.85 + 0.15 * Math.sin(t * 12)), y = p.y - 9;
  glow(ctx, p.x, y, 22 + 3 * Math.sin(t * 7), R.color, 0.35 * k);
  ctx.strokeStyle = rgba(R.core, 0.55 * k); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 13 + Math.sin(t * 9), 4.5, 0, 0, TAU); ctx.stroke();
}

export function drawJuiceWorld(ctx, game, t) {
  const S = game.juice;
  if (!S) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  rageAura(ctx, game, t);
  for (const q of S.parts) {
    const k = Math.min(1, q.t / q.life), f = 1 - k;
    if (q.k === 'burst') {
      const L = q.len * (0.45 + 0.55 * easeOut(Math.min(1, k * 2.2))), w = (q.crit ? 1.6 : 1.1) * f;
      for (let i = 0; i < q.n; i++) {
        const a = q.rot + i * TAU / q.n + (i % 2 ? 0.18 : 0), l = L * (i % 2 ? 0.6 : 1);
        ray(ctx, q.x, q.y, a, q.core * 0.25, l, w, q.color, f);
      }
      glow(ctx, q.x, q.y, q.core * (1 + 0.6 * k), q.color, f);
    } else if (q.k === 'ring') {
      ctx.strokeStyle = rgba(q.color, 0.85 * f); ctx.lineWidth = 2.2 * f + 0.3;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * easeOut(k), 0, TAU); ctx.stroke();
    } else if (q.k === 'rune') {   // trận đồ: hai vòng + lục giác xoay, dẹt theo mặt đất, nở nhanh rồi mờ
      const r = q.r * easeOut(Math.min(1, k * 3)), a = f * 0.8, rot = q.rot + k * 2.2;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, 0.42);
      ctx.strokeStyle = rgba(q.color, a); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, TAU); ctx.stroke();
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        for (let i = 0; i <= 3; i++) { const b = rot + j * Math.PI / 3 + i * TAU / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(b) * r * 0.78, Math.sin(b) * r * 0.78); }
        ctx.stroke();
      }
      ctx.restore();
    } else if (q.k === 'pillar') {   // cột sáng lúc tu vi vừa lên: vọt lên từ chân người, to nhanh rồi thu hẹp dần; viền màu cảnh giới, lõi trắng, đỉnh tan vào trời
      const x = q.on.x, y = q.on.y + 2, h = q.h * easeOut(Math.min(1, k * 5)), w = q.w * (k < 0.12 ? k / 0.12 : 1 - 0.9 * (k - 0.12) / 0.88);
      for (const [ww, c, al] of [[w, q.color, 0.55], [w * 0.42, '#ffffff', 0.85]]) {
        const g = ctx.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.45, rgba(c, al * 0.6 * f)); g.addColorStop(1, rgba(c, al * f));
        ctx.fillStyle = g; ctx.fillRect(x - ww / 2, y - h, ww, h);
      }
      glow(ctx, x, y - 3, q.w * 1.1 * (1 - k * 0.5), q.color, 0.7 * f);
    } else if (q.k === 'orb' || q.k === 'ember') {
      const a = q.k === 'orb' ? Math.min(1, q.t * 6) : f;
      glow(ctx, q.x, q.y, q.k === 'orb' ? 4 : 2.2, q.color, a);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const q of S.parts) {
    const k = Math.min(1, q.t / q.life), f = 1 - k;
    if (q.k === 'deb') { if (q.t <= 0 && game.hit2) continue;   // vụn vừa sinh lúc khựng hình: hết khựng mới văng ra (src/game/hit-feel.js)
      ctx.fillStyle = rgba(q.color, f * f + 0.1); ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
    else if (q.k === 'smoke') {   // khói vòng trắng (clip): vòng tròn rỗng nở ra, mờ dần
      ctx.strokeStyle = `rgba(240,244,255,${q.a * f})`; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 + k * (q.grow || 1.3)), 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}

function label(ctx, text, x, y, size, color, a, align = 'center') {
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.font = `bold ${size}px "Unifont VN", system-ui`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = '#1b1830'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function vignette(ctx, w, h, c, a) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, a));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// Viền màu dọc bốn cạnh màn, đậm ở mép rồi nhạt dần vào trong theo sáu nấc (kiểu điểm ảnh, không loang mượt). Viền tròn ở trên chỉ thấy rõ ở đầu và cuối
// màn hình dọc, hai bên gần như không có; bản bị đánh mới dùng viền này để khoé mắt bên nào cũng thấy đỏ. thick: bề dày cả viền (điểm màn), a: độ đậm ở mép
const BAND = [1, 0.7, 0.46, 0.28, 0.15, 0.06];
function edgeGlow(ctx, w, h, c, a, thick) {
  const b = Math.max(2, Math.round(thick / BAND.length));
  ctx.fillStyle = c;
  for (let i = 0; i < BAND.length; i++) {
    const o = i * b; ctx.globalAlpha = Math.max(0, Math.min(1, a * BAND[i]));
    ctx.fillRect(o, o, w - 2 * o, b); ctx.fillRect(o, h - o - b, w - 2 * o, b);
    ctx.fillRect(o, o + b, b, h - 2 * (o + b)); ctx.fillRect(w - o - b, o + b, b, h - 2 * (o + b));
  }
  ctx.globalAlpha = 1;
}

// Lớp màn hình (toạ độ điểm màn): Liên Kích, chữ mốc, viền đỏ/lửa
export function drawJuiceScreen(ctx, game, screen, t) {
  const S = game.juice, D = game.data.juice;
  if (!S || !D) return;
  const w = screen.w, h = screen.h;
  if (S.vig > 0) vignette(ctx, w, h, '#ff1a2a', 0.38 * S.vig / D.hurt.life);
  const hv = game.h2vig, lw = game.h2low, H2 = D.hurt2;   // bản bị đánh mới (src/game/hurt-feel.js): viền đỏ mỗi lần trúng đòn + viền phập phồng theo nhịp tim lúc máu thấp
  if (hv && game.time - hv.t < H2.vig_t) edgeGlow(ctx, w, h, '#ff1a2a', hv.a * (1 - (game.time - hv.t) / H2.vig_t) ** 1.5, w * H2.vig_w);
  if (lw?.on) edgeGlow(ctx, w, h, '#c00818', H2.low.vig * (0.3 + 0.7 * Math.max(0, 1 - (game.time - lw.beat) / 0.4)), w * H2.vig_w);
  if (S.rageOn > 0) vignette(ctx, w, h, D.rage.color, 0.16 + 0.06 * Math.sin(t * 8));
  const C = D.combo;
  const talk = game.dialog?.open || game.uiOpen === 'qua';   // đang nói chuyện, đang diễn nghi lễ nhận thưởng: thế giới đứng yên nên số Liên Kích, chữ mốc không tự tắt được, treo mãi cạnh khung thoại
  if (talk) S.call = null;
  if (S.combo >= C.show_from && !talk) {
    const tier = C.marks.filter(m => S.combo >= m).length, col = C.colors[Math.min(C.colors.length - 1, tier)];
    const a = Math.min(1, S.comboT / 0.6), s = 1 + S.comboPop * 3, x = w - 18, y = h * (C.y ?? 0.47), sz = C.size ?? 30;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    label(ctx, String(S.combo), 0, 0, sz, col, a, 'right');
    ctx.restore();
    label(ctx, 'Liên Kích', x, y + sz * 0.8, 11, '#fff2cc', a, 'right');
  }
  if (S.call) {   // mốc Liên Kích, Bạo Nộ: chữ to nảy vào giữa màn rồi mờ
    const k = S.call.t, pop = k < 0.12 ? 1.7 - 0.7 * (k / 0.12) : 1, a = k < 1 ? 1 : 1 - (k - 1) / 0.3;
    ctx.save(); ctx.translate(w / 2, h * 0.38); ctx.scale(pop, pop);
    label(ctx, S.call.text, 0, 0, S.call.big ? 30 : 22, S.call.color, a);
    ctx.restore();
  }
}
