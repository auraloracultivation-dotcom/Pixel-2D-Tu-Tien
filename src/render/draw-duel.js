// Bản sao so tài (game/duel.js): vẽ bằng hình nhân vật theo hình dáng, thời trang trong hồ sơ người kia (draw-hero.js),
// khiên, tăng lực như người chơi; trên đầu luôn có tên và thanh máu. Chưa có hình thì trả false để draw.js vẽ hình khối.
import { drawHero } from './draw-hero.js';
import { ring, disc } from './pixel-shapes.js';
import { textQ } from './draw-focus.js';

const INK = '#1b1830';

export function drawDuelist(ctx, game, m, t) {
  if (!drawHero(ctx, game, m, t, m.flash > 0, m.save)) return false;
  if (m.shield > 0) { ctx.globalAlpha = 0.7; ring(ctx, m.x, m.y - 6, 10, m.shieldColor); }
  if (m.buffT > 0) { ctx.globalAlpha = 0.25; disc(ctx, m.x, m.y - 6, 10, m.buffColor); }
  ctx.globalAlpha = 1;
  const top = m.y - (m.top || 24) - 5, w = 22;
  ctx.fillStyle = INK; ctx.fillRect(m.x - w / 2 - 0.5, top - 0.5, w + 1, 3.5);
  ctx.fillStyle = '#e0484a'; ctx.fillRect(m.x - w / 2, top, w * Math.max(0, m.hp / m.maxHp), 2.5);
  if (m.shield > 0) { ctx.fillStyle = '#7ad0ff'; ctx.fillRect(m.x - w / 2, top, w * Math.min(1, m.shield / m.maxHp), 1); }
  const q = textQ(game, 6);
  ctx.font = `bold ${6 * q}px system-ui`; ctx.textAlign = 'center';
  ctx.lineWidth = 2 * q; ctx.strokeStyle = INK; ctx.strokeText(m.def.name, m.x, top - 2);
  ctx.fillStyle = '#ffb0a8'; ctx.fillText(m.def.name, m.x, top - 2);
  return true;
}
