// Thanh máu và lực chiến trên đầu quái (chủ dự án 09/11/2026 10:07: hiển thị thanh máu cho quái; mỗi loại quái có lực chiến như
// người chơi để biết đang đánh quái cỡ nào). Hiện khi quái gần người chơi (near đơn vị) hoặc đã bị đánh. Màu chữ lực chiến so với
// người chơi: yếu hơn nhiều (dưới weak) xám, xêm xêm vàng, mạnh hơn (trên strong) đỏ. Số ở data/config.json → mob_cp.bar.
import { mobPower } from '../game/mob-power.js';
import { power } from '../game/achieve.js';
import { shortNum } from '../game/fx-budget.js';

const INK = '#1b1830';

export function drawMobBar(ctx, game, m) {
  const B = game.data.config.mob_cp?.bar, p = game.player;
  if (!B || m.def.ai === 'boss' || m.dummy || m.wboss) return;
  const near = p && Math.abs(m.x - p.x) < B.near && Math.abs(m.y - p.y) < B.near;
  if (!near && !(m.hp < m.maxHp)) return;
  const w = B.w, hy = m.y - (m.top || m.r * 2) - 5, k = Math.max(0, m.hp / m.maxHp);
  ctx.fillStyle = INK; ctx.fillRect(m.x - w / 2 - 0.5, hy - 0.5, w + 1, 3.5);
  ctx.fillStyle = '#3a1820'; ctx.fillRect(m.x - w / 2, hy, w, 2.5);
  ctx.fillStyle = k > 0.5 ? '#e0484a' : k > 0.25 ? '#e8823a' : '#f2c94c'; ctx.fillRect(m.x - w / 2, hy, w * k, 2.5);
  if (!B.cp) return;
  const cp = mobPower(game, m), me = power(game) || 1, r = cp / me;
  ctx.font = `${B.font}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const t = `${B.label} ${shortNum(cp, 10000)}`;
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeText(t, m.x, hy - 1);
  ctx.fillStyle = r < B.weak ? '#b8b4c8' : r > B.strong ? '#ff6a5a' : '#ffe27a'; ctx.fillText(t, m.x, hy - 1);
}
