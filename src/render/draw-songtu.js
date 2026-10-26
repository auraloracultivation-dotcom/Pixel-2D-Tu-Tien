// Song tu ở nhà: vòng sáng quanh đạo lữ và dải linh quang uốn lượn nối hai người, đốm sáng trôi qua lại.
import { songTuNpc } from '../game/home.js';

export function drawSongTu(ctx, game, t) {
  const n = songTuNpc(game);
  if (!n) return;
  const p = game.player, col = game.data.home.song_tu.color;
  const ax = p.x, ay = p.y - 7, bx = n.x, by = n.y - 7, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;   // pháp tuyến để uốn dải sáng
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 3 + 1);
  ctx.beginPath(); ctx.arc(n.x, n.y - 6, 12 + Math.sin(t * 2 + 1) * 2, 0, Math.PI * 2); ctx.stroke();
  for (const ph of [0, Math.PI]) {   // hai sợi quấn nhau
    ctx.globalAlpha = 0.35; ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const k = i / 16, w = Math.sin(k * Math.PI) * 5 * Math.sin(t * 2 + k * 6 + ph);
      const x = ax + dx * k + nx * w, y = ay + dy * k + ny * w;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = col;
  for (let i = 0; i < 5; i++) {   // đốm linh khí chạy qua lại
    const k = (t * 0.35 + i / 5) % 1, kk = i % 2 ? k : 1 - k, w = Math.sin(kk * Math.PI) * 5 * Math.sin(t * 2 + kk * 6);
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
    ctx.fillRect(ax + dx * kk + nx * w - 1, ay + dy * kk + ny * w - 1, 2, 2);
  }
  for (let i = 0; i < 4; i++) {   // hơi ấm bay lên giữa hai người
    const k = (t * 0.25 + i / 4) % 1;
    ctx.globalAlpha = (1 - k) * 0.6;
    ctx.fillRect(ax + dx / 2 + Math.sin(t + i * 2) * 6 - 1, ay - k * 22, 2, 2);
  }
  ctx.restore();
}
