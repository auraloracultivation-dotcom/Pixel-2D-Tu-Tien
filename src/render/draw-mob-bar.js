// Thanh máu và lực chiến trên đầu quái (chủ dự án 09/11/2026 10:07: hiển thị thanh máu cho quái; mỗi loại quái có lực chiến như
// người chơi để biết đang đánh quái cỡ nào). Hiện khi quái gần người chơi (near đơn vị) hoặc đã bị đánh. Màu chữ lực chiến so với
// người chơi: yếu hơn nhiều (dưới weak) xám, xêm xêm vàng, mạnh hơn (trên strong) đỏ. Số ở data/config.json → mob_cp.bar.
import { mobPower } from '../game/mob-power.js';
import { power } from '../game/achieve.js';
import { shortNum } from '../game/fx-budget.js';

const INK = '#1b1830';

// Nhãn loại quái (chủ dự án 16/11/2026 16:04: "gắn chữ lên trên quái, thêm màu làm điểm nhấn để người chơi dễ nhận diện boss, tinh
// anh hay quái thường"): Tinh Anh lam, Thủ Lĩnh tím, Boss cam, Boss Tổ Đội đỏ (data/he-chien.json → nhan, vai trò theo bảng mobs);
// quái thường, Mộc Nhân, đầu boss thế giới, bản sao so tài không nhãn. Nhãn luôn hiện (nhìn từ xa đã biết), viền thanh máu cùng màu.
export function rankOf(game, m) {
  const H = game.data['he-chien'];
  if (!H?.nhan || m.dummy || m.wboss || m.duel || H.skip_mobs?.includes(m.id)) return null;
  const role = m.def.hc?.role || H.mobs?.[m.id]?.[1] || (m.def.ai === 'boss' ? 'boss_dao' : null);
  return (role && H.nhan[role]) || null;
}

function drawRank(ctx, R, x, y, size) {
  ctx.font = `${size}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const tw = ctx.measureText(R.t).width, dx = x - tw / 2 - 3;   // hạt kim cương màu trước chữ
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeText(R.t, x + 2, y);
  ctx.fillStyle = R.c; ctx.fillText(R.t, x + 2, y);
  const cy = y - size * 0.45;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(dx, cy - 2.6); ctx.lineTo(dx + 2.6, cy); ctx.lineTo(dx, cy + 2.6); ctx.lineTo(dx - 2.6, cy); ctx.fill();
  ctx.fillStyle = R.c; ctx.beginPath(); ctx.moveTo(dx, cy - 1.6); ctx.lineTo(dx + 1.6, cy); ctx.lineTo(dx, cy + 1.6); ctx.lineTo(dx - 1.6, cy); ctx.fill();
}

export function drawMobBar(ctx, game, m) {
  const B = game.data.config.mob_cp?.bar, p = game.player, R = rankOf(game, m);
  if (!B || m.dummy || m.wboss) return;
  const top = m.y - (m.top || m.r * 2) - 5;
  const head = top + 4;   // sát đỉnh đầu (không có thanh máu ở giữa)
  if (m.def.ai === 'boss') { if (R) drawRank(ctx, R, m.x, head, B.font + (R.big ?? 1)); return; }   // trùm: thanh máu lớn ở đầu màn hình, trên đầu chỉ nhãn
  const near = p && Math.abs(m.x - p.x) < B.near && Math.abs(m.y - p.y) < B.near;
  if (!near && !(m.hp < m.maxHp)) { if (R) drawRank(ctx, R, m.x, head, B.font + (R.big ?? 1)); return; }
  const w = B.w, hy = top, k = Math.max(0, m.hp / m.maxHp);
  ctx.fillStyle = R ? R.c : INK; ctx.fillRect(m.x - w / 2 - 0.5, hy - 0.5, w + 1, 3.5);   // viền thanh máu theo màu nhãn
  ctx.fillStyle = '#3a1820'; ctx.fillRect(m.x - w / 2, hy, w, 2.5);
  ctx.fillStyle = k > 0.5 ? '#e0484a' : k > 0.25 ? '#e8823a' : '#f2c94c'; ctx.fillRect(m.x - w / 2, hy, w * k, 2.5);
  if (m.bk > k) {   // khúc máu vừa mất (m.bk, m.bt do src/game/hit-feel.js ghi): hiện trắng bar_hold giây cho thấy mất bao nhiêu, rồi rút dần về mức thật
    const h = game.data.juice.hit2, now = game.time;
    if (now - m.bt > h.bar_hold) m.bk = Math.max(k, m.bk - h.bar_drain * Math.max(0, now - (m.bd ?? now)));
    m.bd = now;
    ctx.fillStyle = '#fff'; ctx.fillRect(m.x - w / 2 + w * k, hy, w * (m.bk - k), 2.5);
  }
  if (!B.cp) { if (R) drawRank(ctx, R, m.x, hy - 1, B.font + (R.big ?? 1)); return; }
  const cp = mobPower(game, m), me = power(game) || 1, r = cp / me;
  ctx.font = `${B.font}px "Unifont VN", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const t = `${B.label} ${shortNum(cp, 10000)}`;
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeText(t, m.x, hy - 1);
  ctx.fillStyle = r < B.weak ? '#b8b4c8' : r > B.strong ? '#ff6a5a' : '#ffe27a'; ctx.fillText(t, m.x, hy - 1);
  if (R) drawRank(ctx, R, m.x, hy - 2 - B.font, B.font + (R.big ?? 1));
}
