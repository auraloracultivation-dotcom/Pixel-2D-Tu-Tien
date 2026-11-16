// Vẽ đòn của quái (trạng thái ở src/game/mob-fx.js; chủ dự án 16/11/2026 15:07: "nhớ tự code thêm hiệu ứng cho quái vật"): mỗi kiểu đòn một hình
// vẽ thẳng bằng ô điểm ảnh bám lưới (vfx/pfx-shape.js; ô nhỏ = một điểm hình quái), cùng kiểu nét với hiệu ứng chiêu (docs/02-CHUAN-PIXEL.md:
// màu phẳng ba bậc lấy từ màu đòn data/mobs.json → fx.c, lõi trắng, quầng cộng nhẹ, không viền, tan theo bậc). Đạn quái vẽ theo kiểu (b.mk),
// dấu chấm than lúc quái nhận ra mình. Lớp trên cùng (sau ngày đêm, hầm tối): ban đêm vẫn thấy mà né.
// Thêm kiểu đòn: viết một hàm vào K, ghi tên vào fx của con quái (tools/art/nguon/ai/quai-moi/ds.json), thời gian ở data/juice.json → mob2.life.
import { pfxBegin } from './vfx/pfx.js';
import { pxArc, pxLine, pxRing, pxDot, pxGlow } from './vfx/pfx-shape.js';
import { pxLightK } from './vfx/draw-pfx.js';

const INK = '#1b1830', W = '#ffffff', TAU = Math.PI * 2;
const pals = new Map();
function pal(hex) {   // [đậm, màu, sáng] từ màu đòn
  if (!pals.has(hex)) {
    const n = parseInt(String(hex || '#ffffff').slice(1), 16), c = Number.isFinite(n) ? [n >> 16, (n >> 8) & 255, n & 255] : [255, 255, 255];
    const mix = (k, to) => '#' + c.map(v => Math.round(v + (to - v) * k).toString(16).padStart(2, '0')).join('');
    pals.set(hex, [mix(0.5, 24), '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''), mix(0.55, 255)]);
  }
  return pals.get(hex);
}
const step = a => Math.max(0, Math.min(1, Math.ceil(a * 4) / 4));   // mờ theo bậc, không trộn mượt
const out = (u, from = 0.55) => step(u < from ? 1 : 1 - (u - from) / (1 - from));
const ease = u => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
const span = (lo, hi) => [Math.min(lo, hi), Math.max(lo, hi)];

function sparks(ctx, x, y, a, u, R, col, n, cone = 0.9) {   // vụn bắn ra hình nón quanh hướng a
  if (u > 0.85) return;
  for (let i = 0; i < n; i++) {
    const b = a + (n > 1 ? i / (n - 1) - 0.5 : 0) * 2 * cone, d = R * ease(u * 1.4) * (0.65 + 0.35 * ((i * 5) % 3) / 2);
    pxDot(ctx, x + Math.cos(b) * d, y + Math.sin(b) * d, u < 0.35 ? 2 : 1, col, out(u, 0.3));
  }
}
function star(ctx, x, y, u, R, col) {   // sao bốn cánh loé rồi thu lại, lõi trắng
  const r = R * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85), al = out(u, 0.3);
  if (r < 0.6) return;
  pxLine(ctx, [[x - r, y], [x + r, y]], 1, col, al); pxLine(ctx, [[x, y - r], [x, y + r]], 1, col, al);
  pxDot(ctx, x, y, r > 2 ? 3 : 2, W, al);
}

const K = {
  cao(ctx, f, u, [, C, L]) {   // cào: ba vạch xiên lần lượt rạch qua chỗ trúng, lõi trắng, vụn bắn ra
    const s = f.s, x = f.x, y = f.y - f.h, a = f.a + f.dir * 1.05, ca = Math.cos(a), sa = Math.sin(a), al = out(u);
    pxGlow(ctx, x, y, 7 * s, C, 0.35 * al);
    for (let i = -1; i <= 1; i++) {
      const g = ease((u - (i + 1) * 0.06) / 0.18), len = (i ? 8 : 10.5) * s;
      if (g <= 0) continue;
      const bx = x - sa * i * 2.6 * s - ca * len / 2, by = y + ca * i * 2.6 * s - sa * len / 2, ex = bx + ca * len * g, ey = by + sa * len * g;
      pxLine(ctx, [[bx, by], [ex, ey]], 3, C, al);
      pxLine(ctx, [[bx + ca * len * g * 0.3, by + sa * len * g * 0.3], [ex, ey]], 1, W, al);
    }
    sparks(ctx, x, y, f.a, u, 7 * s, L, 5);
  },
  can(ctx, f, u, [, C, L]) {   // cắn: hai hàm há ra rồi sập vào nhau (nhanh dần), răng so le cắm vào nhau, sập xong loé trắng, bắn vụn
    const s = f.s, x = f.x, y = f.y - f.h, R = 5.5 * s, k = Math.min(1, u / 0.2), g = (1 - k * k) * 5 * s, al = out(u, 0.5);
    pxGlow(ctx, x, y, 8 * s, C, 0.35 * al);
    pxArc(ctx, x, y - g, R, 0.55, Math.PI, TAU, 1.3 * s, C, al, 1);   // hàm trên (vòm)
    pxArc(ctx, x, y + g, R, 0.55, 0, Math.PI, 1.3 * s, C, al, 1);   // hàm dưới (lòng chảo)
    for (let i = 0; i < 3; i++) {
      const tx = x + (i - 1) * R * 0.55, bx = tx + R * 0.27;
      pxLine(ctx, [[tx - 0.9 * s, y - g], [tx, y - g + 2 * s], [tx + 0.9 * s, y - g]], 1, W, al);   // răng trên chĩa xuống
      pxLine(ctx, [[bx - 0.9 * s, y + g], [bx, y + g - 2 * s], [bx + 0.9 * s, y + g]], 1, W, al);   // răng dưới chĩa lên
    }
    if (u > 0.18 && u < 0.45) star(ctx, x, y, (u - 0.18) / 0.27, 5 * s, W);
    if (u > 0.2) sparks(ctx, x, y, f.a, (u - 0.2) / 0.8, 9 * s, L, 6, 1.4);
  },
  nen(ctx, f, u, [D, C, L]) {   // nện đất: sóng đất elip toả ra từ chỗ nện, vết nứt, bụi bốc
    const s = f.s, x = f.x, y = f.y, R = (3 + 12 * ease(u * 1.5)) * s, al = out(u, 0.4);
    for (let i = 0; i < 4; i++) {   // vết nứt chĩa về hướng đòn, nằm lại lâu hơn sóng
      const b = f.a + (i - 1.5) * 0.85, cb = Math.cos(b), sb = Math.sin(b), l = (4 + (i % 2) * 2) * s * ease(u / 0.15);
      pxLine(ctx, [[x, y], [x + cb * l * 0.5 - sb * 0.8, y + (sb * l * 0.5 + cb * 0.8) * 0.55], [x + cb * l, y + sb * l * 0.55]], 1, D, out(u, 0.65));
    }
    pxRing(ctx, x, y, R, R * 0.5, 1.4 * s, C, al, 1);
    if (u < 0.5) pxRing(ctx, x, y, R * 0.72, R * 0.36, 0.6 * s, L, out(u, 0.2), 1);
    for (let i = 0; i < 8; i++) {   // bụi bốc theo mép sóng
      const b = i / 8 * TAU + 0.3;
      pxDot(ctx, x + Math.cos(b) * R * 1.05, y + Math.sin(b) * R * 0.52 - u * 5 * s, 1, i % 2 ? L : C, out(u, 0.35));
    }
  },
  chem(ctx, f, u, [, C, L]) {   // chém: cung lưỡi liềm quét qua trước mặt, đầu lưỡi trắng, đuôi màu
    const x = f.ox, y = f.oy - f.h, R = f.r + 1.5 * f.s, sp = 1.15, g = ease(u / 0.26), al = out(u, 0.45);
    const a0 = f.a - sp, a1 = f.a + sp, lead = f.dir > 0 ? a0 + (a1 - a0) * g : a1 - (a1 - a0) * g, [lo, hi] = span(f.dir > 0 ? a0 : a1, lead);
    pxArc(ctx, x, y, R, 0.75, lo, hi, 0.8 * f.s, C, al, 1);
    const mlo = Math.max(lo, f.a - sp * 0.55), mhi = Math.min(hi, f.a + sp * 0.55);
    if (mhi > mlo) pxArc(ctx, x, y, R + 0.8 * f.s, 0.75, mlo, mhi, 2 * f.s, C, al, 1);   // giữa lưỡi dày hơn hai đầu
    const [hlo, hhi] = span(lead, lead - f.dir * 0.4);
    if (u < 0.45) pxArc(ctx, x, y, R + 0.8 * f.s, 0.75, Math.max(lo, hlo), Math.min(hi, hhi), 1.6 * f.s, W, 1, 1);
    pxArc(ctx, x, y, R - 1.2 * f.s, 0.75, lo, hi, 0.5, L, al, 1);
  },
  quat(ctx, f, u, [D, C, L]) {   // quất: roi / dây quét rộng nửa vòng, đầu roi sáng chạy qua kéo đuôi màu, vụn lá rơi lại
    const s = f.s, x = f.ox, y = f.oy - f.h * 0.7, R = f.r + 3 * s, sp = 1.6, g = ease(u / 0.38), al = out(u, 0.5);
    const a0 = f.a - sp, a1 = f.a + sp, head = f.dir > 0 ? a0 + (a1 - a0) * g : a1 - (a1 - a0) * g, [lo, hi] = span(head, head - f.dir * 1.3);
    pxArc(ctx, x, y, R, 0.75, Math.max(a0, lo), Math.min(a1, hi), 1.8 * s, C, al, 1);
    const [hlo, hhi] = span(head, head - f.dir * 0.35);
    pxArc(ctx, x, y, R + 0.8 * s, 0.75, Math.max(a0, hlo), Math.min(a1, hhi), 2.6 * s, L, al, 1);
    if (u < 0.45) pxDot(ctx, x + Math.cos(head) * (R + 0.4), y + Math.sin(head) * (R + 0.4) * 0.75, 3, W, al);   // đầu roi
    for (let i = 0; i < 6; i++) {   // vụn rơi dọc đường quét
      const b = a0 + (a1 - a0) * (i + 0.5) / 6;
      if ((f.dir > 0 ? b > head : b < head)) continue;
      pxDot(ctx, x + Math.cos(b) * (R + 1), y + Math.sin(b) * (R + 1) * 0.75 + u * 6, 2, i % 2 ? D : L, out(u, 0.4));
    }
  },
  dam(ctx, f, u, [, C, L]) {   // đâm: luồng thẳng từ thân phóng tới chỗ trúng, đuôi rút về mũi, mũi loé sao bốn cánh
    const s = f.s, ca = Math.cos(f.a), sa = Math.sin(f.a), y0 = f.oy - f.h, r0 = Math.max(2, f.d * 0.3), r1 = f.d + 3 * s;
    const L1 = r0 + (r1 - r0) * Math.min(1, u / 0.12), L0 = r0 + (r1 - r0) * Math.min(1, Math.max(0, (u - 0.12) / 0.4));
    const P = l => [f.ox + ca * l, y0 + sa * l], al = out(u, 0.35);
    if (L1 - L0 > 0.5) { pxLine(ctx, [P(L0), P(L1)], s > 1.2 ? 5 : 3, C, al); pxLine(ctx, [P(L0 + (L1 - L0) * 0.45), P(L1)], 1, W, al); }
    pxGlow(ctx, ...P(L1), 6 * s, C, 0.4 * al);
    star(ctx, ...P(L1), u, 4.5 * s, L);
  },
  xoay(ctx, f, u, [, C, L]) {   // gió xoáy: hai vệt gió dẹt quay quanh thân hai vòng, hạt bay vòng ngoài
    const s = f.s, x = f.ox, y = f.oy - f.h * 0.6, R = Math.max(7, f.r * 0.85) + 2 * s, rot = u * TAU * 2 * f.dir, al = out(u, 0.5);
    for (let i = 0; i < 2; i++) {
      const b = rot + i * Math.PI;
      pxArc(ctx, x, y, R, 0.5, b, b + 1.4, 1 * s, C, al, 1);
      pxArc(ctx, x, y, R - 1.4 * s, 0.5, b + 0.6, b + 1.4, 0.5, L, al, 1);
    }
    for (let i = 0; i < 6; i++) { const b = -rot * 1.3 + i / 6 * TAU; pxDot(ctx, x + Math.cos(b) * (R + 3 * s), y + Math.sin(b) * (R + 3 * s) * 0.5, 1, L, out(u, 0.4)); }
  },
  loe(ctx, f, u, [, C, L]) {   // loé chỗ đạn rời tay quái bắn xa
    const y = f.y - f.h;
    pxGlow(ctx, f.x, y, 6, C, 0.45 * out(u, 0.2));
    star(ctx, f.x, y, u, 3.5, L);
    pxRing(ctx, f.x, y, 1.5 + 3 * u, 1.5 + 3 * u, 0.5, C, out(u, 0.2), 1);
  },
  vong(ctx, f, u, [D, C, L]) {   // boss chém vòng: lưỡi quét trọn vòng đúng bán kính khung đỏ, chớp nền, vành đất toả ra
    const x = f.x, y = f.y, R = f.r, g = ease(u / 0.28), b0 = f.dir > 0 ? -Math.PI / 2 : Math.PI / 2, al = out(u, 0.45);
    if (u < 0.18) pxRing(ctx, x, y, R, R, R, C, 0.22 * (1 - u / 0.18), 2);
    const [lo, hi] = span(b0, b0 + f.dir * TAU * g);
    pxArc(ctx, x, y, R, 1, lo, hi, 2.5, C, al, 2);
    const head = b0 + f.dir * TAU * g, [hlo, hhi] = span(head, head - f.dir * 0.5);
    if (u < 0.32) pxArc(ctx, x, y, R + 1, 1, hlo, hhi, 3, W, 1, 2);
    pxArc(ctx, x, y, R - 3, 1, lo, hi, 1, L, al, 2);
    const W2 = R + 4 + 10 * ease(u);
    pxRing(ctx, x, y, W2, W2, 1, D, out(u, 0.3), 2);
  },
  no(ctx, f, u, [, C, L]) {   // boss nổ vòng đạn: vành sáng bật ra từ thân, tia ngắn, lõi trắng
    const x = f.x, y = f.y - 4, R = f.r + 2 + 12 * ease(u), al = out(u, 0.35);
    pxGlow(ctx, x, y, 14 * f.s, C, 0.5 * al);
    pxRing(ctx, x, y, R, R, 1.2, C, al, 2);
    for (let i = 0; i < 8; i++) { const b = i / 8 * TAU, c = Math.cos(b), d = Math.sin(b); pxLine(ctx, [[x + c * (R + 1), y + d * (R + 1)], [x + c * (R + 4), y + d * (R + 4)]], 1, L, al, 2); }
    star(ctx, x, y, u, 6, W);
  },
};

// Đạn quái theo kiểu (gọi từ draw-bullets.js khi đạn có mk; đạn bay ngang tầm thân nên không cần nhấc). Trả false nếu không có kiểu.
const SHOT = {
  ten(ctx, b, t, [, C, L], ux, uy) {   // mũi tên: thân sáng, đầu nhọn màu, lông đuôi
    const x = b.x, y = b.y, px = -uy, py = ux;
    pxLine(ctx, [[x - ux * 7, y - uy * 7], [x, y]], 1, L);
    pxLine(ctx, [[x - ux * 2 + px * 1.6, y - uy * 2 + py * 1.6], [x + ux * 1.5, y + uy * 1.5], [x - ux * 2 - px * 1.6, y - uy * 2 - py * 1.6]], 1, C);
    pxLine(ctx, [[x - ux * 6, y - uy * 6], [x - ux * 8 + px * 1.5, y - uy * 8 + py * 1.5]], 1, C);
    pxLine(ctx, [[x - ux * 6, y - uy * 6], [x - ux * 8 - px * 1.5, y - uy * 8 - py * 1.5]], 1, C);
    pxDot(ctx, x + ux, y + uy, 1, W);
  },
  cau(ctx, b, t, [D, C, L], ux, uy) {   // cầu phép: vành màu, lõi sáng lệch về phía bay, ba đốm đuôi nhỏ dần
    for (let i = 3; i >= 1; i--) pxDot(ctx, b.x - ux * (2 + i * 2.2), b.y - uy * (2 + i * 2.2) + Math.sin(t * 18 + i) * 0.5, 4 - i, i > 2 ? D : C, 0.9);
    pxRing(ctx, b.x, b.y, b.r, b.r, b.r, C, 1, 1);
    pxRing(ctx, b.x + ux * 0.4, b.y + uy * 0.4, b.r * 0.55, b.r * 0.55, b.r, L, 1, 1);
    pxDot(ctx, b.x + ux * 0.8, b.y + uy * 0.8, 1, W);
  },
  gai(ctx, b, t, [D, C, L]) {   // gai độc: ngôi sao bốn cánh xoay, lõi sáng
    const a = t * 12, r = b.r + 1.5;
    for (let i = 0; i < 4; i++) { const c = Math.cos(a + i * Math.PI / 2), d = Math.sin(a + i * Math.PI / 2); pxLine(ctx, [[b.x, b.y], [b.x + c * r, b.y + d * r]], i % 2 ? 1 : 2, i % 2 ? D : C); }
    pxDot(ctx, b.x, b.y, 2, L);
  },
  cat(ctx, b, t, [D, C, L], ux, uy) {   // cát: chùm hạt rung quanh đầu đạn (lõi đặc), hạt rơi lại phía sau
    pxRing(ctx, b.x, b.y, 1.6, 1.6, 2, C, 1, 1);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.1 + t * 9, d = 1.6 + (i % 3) * 0.9 + Math.sin(t * 20 + i) * 0.4;
      pxDot(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, i < 3 ? 2 : 1, i % 2 ? C : L);
    }
    for (let i = 1; i <= 4; i++) pxDot(ctx, b.x - ux * i * 2.6 + Math.sin(t * 15 + i) * 0.8, b.y - uy * i * 2.6 + i * 0.5, i < 3 ? 2 : 1, i % 2 ? D : C, 1 - i * 0.2);
  },
  da(ctx, b, t, [D, C, L], ux, uy) {   // đá nóng: hòn đá lăn (khối vuông xoay theo bậc 45°), vệt tàn lửa phía sau
    for (let i = 1; i <= 3; i++) pxDot(ctx, b.x - ux * (i * 2.6), b.y - uy * (i * 2.6) - Math.sin(t * 14 + i) * 0.6, i === 1 ? 2 : 1, i === 1 ? C : L, 1 - i * 0.2);
    const r = b.r + 1, q = (Math.floor(t * 10) % 2) * Math.PI / 4;
    const P = k => [b.x + Math.cos(q + k * Math.PI / 2) * r, b.y + Math.sin(q + k * Math.PI / 2) * r];
    pxRing(ctx, b.x, b.y, r * 0.85, r * 0.85, r, D, 1, 1);
    pxLine(ctx, [P(0), P(1), P(2), P(3), P(0)], 1, D);
    pxDot(ctx, b.x - 0.5, b.y - 0.5, 2, C); pxDot(ctx, b.x - 1, b.y - 1, 1, L);
  },
};
export function drawMobShot(ctx, game, b, t) {
  const f = SHOT[b.mk];
  if (!f) return false;
  const sp = Math.hypot(b.vx, b.vy) || 1, P = pal(b.color);
  ctx.save(); pfxBegin(ctx, pxLightK(game));
  pxGlow(ctx, b.x, b.y, b.r + 5, P[1], 0.45);
  f(ctx, b, t, P, b.vx / sp, b.vy / sp);
  ctx.restore();
  return true;
}

// Dấu chấm than (mob-fx.js noticeTick): bật lên to rồi thu về, nhún nhẹ, cuối đời tan theo bậc. Boss: hai dấu đỏ to hơn. Đặt trên thanh máu,
// chữ lực chiến của quái thường (draw-mob-bar.js), boss không có thanh trên đầu thì sát đỉnh đầu.
function bang(ctx, dx, c, hi) {   // dấu "!" đáy ở gốc toạ độ: thân 2 × 5, chấm 2 × 2, viền mực một đơn vị, một vệt sáng trái
  ctx.fillStyle = INK; ctx.fillRect(dx - 2, -10, 4, 7); ctx.fillRect(dx - 2, -4, 4, 4);
  ctx.fillStyle = c; ctx.fillRect(dx - 1, -9, 2, 5); ctx.fillRect(dx - 1, -3, 2, 2);
  ctx.fillStyle = hi; ctx.fillRect(dx - 1, -9, 1, 3);
}
function drawAlerts(ctx, game) {
  const N = game.data.juice?.mob2?.notice, B = game.data.config.mob_cp?.bar;
  if (!N) return;
  for (const m of game.mobs) {
    if (m.alert == null || m.dead) continue;
    const age = (m.ak || 0) - m.alert;
    if (age < 0 || age > N.t) continue;
    const boss = m.def.ai === 'boss', pop = age < 0.07 ? 0.4 + age / 0.07 : age < 0.16 ? 1.4 - (age - 0.07) / 0.09 * 0.4 : 1;
    const al = age > N.t - 0.24 ? Math.ceil((N.t - age) / 0.24 * 3) / 3 : 1, k = (boss ? 1.5 : 1) * pop;
    const lift = boss || !B ? 2 : 7 + (B.cp ? B.font : 0);
    ctx.save(); ctx.globalAlpha = al;
    ctx.translate(Math.round(m.x), Math.round(m.y - (m.top || m.r * 2) - lift - (age < 0.16 ? 0 : Math.round(Math.sin(age * 10) * 0.8))));
    ctx.scale(k, k);
    for (const dx of boss ? [-2, 2] : [0]) bang(ctx, dx, boss ? '#ff4040' : '#ffd84a', boss ? '#ffd0c8' : '#fff8d0');
    ctx.restore();
  }
}

// Gọi từ draw.js ở lớp trên cùng (sau vệt chém của mình)
export function drawMobFx(ctx, game) {
  if (game.fx.some(f => f.type === 'mhit')) {
    ctx.save(); pfxBegin(ctx, pxLightK(game));
    for (const f of game.fx) if (f.type === 'mhit' && K[f.k]) K[f.k](ctx, f, Math.min(0.999, f.t / f.life), pal(f.c));
    ctx.restore();
  }
  drawAlerts(ctx, game);
}
