// Hạt thời tiết vẽ trên màn hình: cánh hoa, tuyết, lá, tro, bụi, mưa. Vị trí hạt tính từ thời gian, không lưu trạng thái.
import { weatherOf } from '../game/weather.js';

const SEED = Array.from({ length: 80 }, (_, i) => ({ x: Math.abs(Math.sin(i * 91.7) * 1e4) % 1, y: Math.abs(Math.sin(i * 47.3) * 1e4) % 1, k: 0.6 + (i % 5) * 0.12 }));

export function drawWeather(ctx, game, screen, t) {
  const w = weatherOf(game);
  if (!w) return;
  const cfg = game.data.weather, k = cfg.kinds[w.kind], W = screen.w, H = screen.h, z = screen.zoom;
  const cam = screen.camX * z * 0.3;
  if (k) for (let i = 0; i < k.n; i++) {
    const s = SEED[i], fy = ((s.y * H + t * k.fall * s.k * z) % (H + 20) + H + 20) % (H + 20) - 10;
    const fx = ((s.x * W + Math.sin(t * 0.8 + i) * k.drift * z - cam) % W + W) % W;
    ctx.globalAlpha = 0.75; ctx.fillStyle = k.color;
    const r = k.size * z * s.k;
    if (k.shape === 'petal' || k.shape === 'leaf') {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 1.5 + i);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (k.shape === 'ember') { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + i); ctx.fillRect(fx, fy, r, r); }
    else { ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill(); }
  }
  if (game.raining) {
    const R = cfg.rain;
    ctx.globalAlpha = 1; ctx.fillStyle = `rgba(20,30,50,${R.dark})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = R.color; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < R.n; i++) {
      const s = SEED[i % SEED.length], y = (s.y * H + t * R.speed * s.k + i * 37) % (H + 30) - 15, x = (s.x * W + i * 13 - y * 0.15) % W;
      ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 8);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
