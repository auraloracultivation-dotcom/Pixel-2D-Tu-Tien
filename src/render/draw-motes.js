// Đốm linh khí li ti lơ lửng khắp màn (chủ dự án 08/11/2026 16:52: "hiệu ứng đốm nhỏ li ti" như video tham khảo): hạt 1 điểm ảnh
// cộng sáng, bay lên chậm, lắc ngang, chớp tắt từng hạt; trôi theo máy quay chậm hơn cảnh (có chiều sâu). Đêm, hầm tối thì sáng và
// nhiều hơn. Màu theo đảo (data/weather.json → motes.colors), mặc định vàng nhạt. Vị trí tính từ thời gian, không lưu trạng thái.
const SEED = Array.from({ length: 64 }, (_, i) => ({ x: Math.abs(Math.sin(i * 12.9898) * 43758.5) % 1, y: Math.abs(Math.sin(i * 78.233) * 43758.5) % 1, k: 0.5 + (i % 7) / 12, p: i * 1.7 }));

export function drawMotes(ctx, game, screen, t) {
  const M = game.data.weather.motes;
  if (!M || M.off?.includes(game.map?.id)) return;
  const low = +(document.body.dataset.perf || 0) >= 3;
  const dark = game.isNight || game.dark > 0.3, n = Math.min(SEED.length, Math.round(M.n * (dark ? M.night_mul : 1) * (low ? 0.5 : 1)));
  const W = screen.w, H = screen.h, z = screen.zoom, px = Math.max(1, Math.round(z * 2)), color = M.colors?.[game.map?.id] || M.color;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const s = SEED[i], par = 0.35 + s.k * 0.5;   // hạt gần trôi nhanh hơn theo máy quay
    const x = ((s.x * W + Math.sin(t * 0.4 * s.k + s.p) * M.drift * z - screen.camX * z * par) % W + W) % W;
    const y = ((s.y * H - t * M.rise * s.k * z - screen.camY * z * par) % H + H) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + s.k * 2) + s.p * 3);   // chớp tắt
    if (tw < 0.15) continue;
    const a = tw * (dark ? M.alpha_night : M.alpha), big = i % 5 === 0 ? 2 : 1;
    ctx.globalAlpha = a * 0.22; ctx.fillRect(Math.round(x) - px, Math.round(y) - px, px * (2 + big), px * (2 + big));   // quầng
    ctx.globalAlpha = a; ctx.fillRect(Math.round(x), Math.round(y), px * big, px * big);
  }
  ctx.restore();
}
