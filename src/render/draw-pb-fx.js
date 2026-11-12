// Hào quang, đuôi sáng, tia li ti cho đòn pháp bảo theo phẩm (chủ dự án 12/11/2026 04:14: "hào quang, đuôi sáng, code hiệu ứng xịn";
// data/phap-bao.json → fx.grade: trail, aura, spark, gold). Mọi pháp bảo, kể cả loại thêm sau, tự có theo phẩm. Gọi từ draw-phap-bao.js.
const TAU = Math.PI * 2;
const rgba = (hex, a) => { const n = parseInt((hex || '#ffffff').slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
const GOLD = '#ffd25a';
export const visOf = e => 2 * (e.cast?.vis || 1);   // hình to gấp đôi bản đầu (04:14), nhân thêm theo phẩm, cấp
const lookOf = e => e.cast?.look || {};

function dot(ctx, x, y, r, c, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${Math.min(1, a)})`); g.addColorStop(0.4, rgba(c, a * 0.7)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// Đạn bay: bóng mờ nối đuôi (trail), quầng (aura), tia bắn ra (spark), viền vàng (gold)
export function shotFx(ctx, e, c, t) {
  const L = lookOf(e), k = visOf(e), sp = Math.hypot(e.vx, e.vy) || 1, ux = e.vx / sp, uy = e.vy / sp;
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 1; j <= (L.trail || 0); j++) dot(ctx, e.x - ux * j * 7 * k, e.y - uy * j * 7 * k, (4 + 2 * (L.trail - j)) * k * 0.5, c, 0.45 * (1 - j / (L.trail + 1)));
  if (L.aura) dot(ctx, e.x, e.y, (8 + 6 * L.aura) * k * 0.6, L.gold ? GOLD : c, 0.18 + 0.08 * L.aura + 0.06 * Math.sin(t * 14));
  if (L.spark) for (let i = 0; i < 4; i++) { const a = t * 9 + i * 1.7 + e.x * 0.05, d = (6 + (t * 40 + i * 5) % 10) * k * 0.6; dot(ctx, e.x - ux * d + Math.cos(a) * 3 * k, e.y - uy * d + Math.sin(a) * 3 * k, 1.6 * k, L.gold ? GOLD : '#ffffff', 0.8); }
  ctx.globalCompositeOperation = 'source-over';
}

// Đòn vùng (nổ, sóng vòng, trận, ấn): vòng hào quang thêm, tia bay quanh mép; k (0..1) tiến độ, R bán kính
export function areaFx(ctx, e, x, y, R, c, t, k = 0.5) {
  const L = lookOf(e);
  if (!L.aura && !L.spark && !L.gold) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (L.aura || 0); i++) {
    const rr = R * (1.05 + i * 0.12 + 0.05 * Math.sin(t * 6 + i));
    ctx.strokeStyle = rgba(L.gold && i === L.aura - 1 ? GOLD : c, (0.5 - i * 0.12) * (1 - k * 0.6)); ctx.lineWidth = 2.2 - i * 0.5;
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU); ctx.stroke();
  }
  if (L.spark) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 2.2, d = R * (0.7 + 0.4 * ((t * 1.7 + i * 0.37) % 1)); dot(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - 6 * ((t * 2 + i * 0.3) % 1), 2.2, L.gold ? GOLD : '#ffffff', 0.7 * (1 - k * 0.5)); }
  ctx.globalCompositeOperation = 'source-over';
}
