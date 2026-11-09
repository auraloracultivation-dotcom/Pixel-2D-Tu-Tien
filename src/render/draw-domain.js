// Hình lĩnh vực Vô Ảnh Trảm Vực (src/game/skill-domain.js), vẽ ở lớp mặt đất (draw.js, vòng vùng chiêu: z.draw) nên người, quái
// đứng trong vẫn sáng rõ trên nền tối. Mở: vòng tối lan nhanh từ chân, sóng sáng ở mép. Giữa: nền đen tím, viền sáng màu trang phục
// có quầng, trận đồ hai vòng khắc vạch xoay ngược nhau, đốm sáng chạy quanh mép. Kết: vết nứt sáng toả từ tâm, lĩnh vực nở nhẹ rồi tan.
// Nhát chém trong vùng là vệt chém chung (render/draw-slash.js, lớp trên).

const ease = k => 1 - (1 - Math.max(0, Math.min(1, k))) ** 3;

export function drawDomain(ctx, z, game) {
  const s = z.s, t = z.t, o2 = s.open + s.main, endK = t > o2 ? Math.min(1, (t - o2) / s.end) : 0;
  const R = z.radius * ease(t / s.open) * (1 + 0.08 * endK), fade = 1 - endK * endK;
  if (R < 1 || fade <= 0) return;
  const dd = Math.abs(ctx.getTransform().d) || 1, x = z.x, y = z.y, c = z.color;
  ctx.save();
  // nền tối: đậm ở giữa, nhạt dần ra mép
  const g = ctx.createRadialGradient(x, y, R * 0.05, x, y, R);
  g.addColorStop(0, 'rgba(3,1,9,0.9)'); g.addColorStop(0.8, 'rgba(6,3,16,0.84)'); g.addColorStop(1, 'rgba(10,6,24,0.45)');
  ctx.globalAlpha = fade; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  // trận đồ: hai vòng khắc vạch xoay ngược nhau
  ctx.strokeStyle = c; ctx.lineWidth = 0.8; ctx.shadowColor = c; ctx.shadowBlur = 4 * dd;
  for (const [rr, n, sp] of [[0.64, 16, 0.5], [0.34, 8, -0.8]]) {
    const r = R * rr, a0 = t * sp;
    ctx.globalAlpha = 0.28 * fade;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2, l = i % 2 ? 0.06 : 0.11; ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r * (1 + l), y + Math.sin(a) * r * (1 + l)); }
    ctx.stroke();
  }
  // viền: quầng màu + chỉ trắng
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8 * fade; ctx.lineWidth = 2; ctx.shadowBlur = 12 * dd;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.55 * fade; ctx.lineWidth = 0.6; ctx.shadowBlur = 3 * dd;
  ctx.beginPath(); ctx.arc(x, y, R - 0.8, 0, Math.PI * 2); ctx.stroke();
  // đốm sáng chạy quanh mép
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = c; ctx.shadowBlur = 6 * dd;
  for (let i = 0; i < 10; i++) {
    const a = t * (i % 2 ? 1.6 : -1.1) + i * 0.63, k = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.1);
    ctx.globalAlpha = (0.35 + 0.55 * k) * fade;
    ctx.fillRect(x + Math.cos(a) * R - 0.7, y + Math.sin(a) * R - 0.7, 1.4, 1.4);
  }
  // sóng sáng lúc mở
  if (t < s.open * 1.6) {
    const k = t / (s.open * 1.6);
    ctx.strokeStyle = '#ffffff'; ctx.shadowColor = c; ctx.shadowBlur = 10 * dd; ctx.lineWidth = 3 * (1 - k) + 0.5; ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(x, y, z.radius * ease(k * 1.3), 0, Math.PI * 2); ctx.stroke();
  }
  // vết nứt lúc kết: toả từ tâm theo hướng nhát chém lớn, dài dần
  if (endK > 0) {
    const base = z.cut || 0, L = R * ease(endK * 2.2);
    ctx.strokeStyle = '#ffffff'; ctx.shadowColor = c; ctx.shadowBlur = 8 * dd; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.9 * (1 - endK);
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = base + i / 9 * Math.PI * 2 + Math.sin(i * 7.3) * 0.25, mid = 0.45 + 0.2 * Math.sin(i * 3.1), bend = Math.sin(i * 5.7) * 0.18;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * L * mid, y + Math.sin(a) * L * mid);
      ctx.lineTo(x + Math.cos(a + bend) * L, y + Math.sin(a + bend) * L);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Người ra chiêu ẩn mình trong lĩnh vực (chủ dự án 09/11/2026 19:44): lúc vòng tối mở thì mờ dần, mở xong thì biến mất hẳn, hiện lại
// trong nửa đầu nhịp kết. 1: thấy rõ (không giữ lĩnh vực). Dùng ở drawHero (mình, người khác, bản sao) và drawPlayer (vũ khí, danh hiệu).
export function domainVis(game, a) {
  const z = a?.domain;
  if (!z || z.t >= z.dur || !game.zones.includes(z)) return 1;
  const s = z.s, o2 = s.open + s.main;
  if (z.t < s.open) return 1 - z.t / s.open;
  if (z.t < o2) return 0;
  return Math.min(1, (z.t - o2) / (s.end * 0.5));
}
