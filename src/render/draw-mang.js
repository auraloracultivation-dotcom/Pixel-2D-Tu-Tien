// Đầu Cửu Đầu Thôn Thiên Mãng ở mép tinh cầu (game/thien-mang.js): vẽ bằng khối trước (chưa có hình pixel riêng, theo thứ tự
// chủ dự án chốt: chơi được trước, hình mượt sau). Cổ rắn to cuộn từ tinh hà phía trên xuống, đầu dẹt có sừng, mắt và vảy sáng
// theo hệ của đầu đó, miệng há thè lưỡi, thở phập phồng; trúng đòn chớp trắng, lắc nhẹ. Tên đầu hiện phía trên.
import { textQ } from './draw-focus.js';

const INK = '#140c22';
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

export function drawMang(ctx, game, m, t) {
  if (m.wboss?.arena) return arenaHead(ctx, game, m, t);
  const el = game.data.elements[m.wboss?.el]?.color || '#b07ad8', hit = m.flash > 0;
  const body = hit ? '#fff' : '#3a2458', belly = hit ? '#fff' : '#6a4a8a', scale = hit ? '#fff' : shade(el, 0.8), glow = hit ? '#fff' : el;
  const breathe = Math.sin(t * 1.6) * 2, wob = hit ? Math.sin(t * 60) * 1.2 : 0;
  ctx.save();
  ctx.translate(m.x + wob, m.y + breathe);
  ctx.scale(1.4, 1.4);   // to hơn người chơi nhiều lần (đầu một con rắn quấn quanh tinh hà)
  // cổ: các đốt tròn nối từ trên cao xuống, lắc lư chậm
  for (let i = 9; i >= 1; i--) {
    const k = i / 9, sway = Math.sin(t * 0.9 + i * 0.55) * 10 * k;
    const cx = -18 * k + sway, cy = -26 - i * 13, r = 15 - k * 2;
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = scale; ctx.globalAlpha = 0.55; ctx.fillRect(cx - r * 0.6, cy - 2, r * 1.2, 2); ctx.globalAlpha = 1;
  }
  // bóng dưới cằm
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 22, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  // đầu: khối dẹt nhọn mõm
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-30, -14); ctx.lineTo(18, -18); ctx.lineTo(34, -4); ctx.lineTo(18, 6); ctx.lineTo(-30, 10); ctx.closePath(); ctx.fill();
  // hàm dưới há ra
  const open = 4 + (Math.sin(t * 2.2) + 1) * 3;
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.moveTo(-26, 8); ctx.lineTo(16, 6 + open * 0.4); ctx.lineTo(28, 10 + open); ctx.lineTo(-24, 16 + open * 0.3); ctx.closePath(); ctx.fill();
  // miệng tối, răng nanh, lưỡi chẻ
  ctx.fillStyle = hit ? '#fff' : '#1a0610';
  ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(30, -2); ctx.lineTo(28, 9 + open); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4ecd8';
  for (const x of [8, 18]) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 3, 4); ctx.lineTo(x + 1.5, 10); ctx.fill(); }
  if (Math.sin(t * 3) > 0.3) { ctx.strokeStyle = '#ff4a6a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(28, 4 + open * 0.5); ctx.lineTo(40, 6 + open * 0.5); ctx.lineTo(44, 3 + open * 0.5); ctx.moveTo(40, 6 + open * 0.5); ctx.lineTo(44, 9 + open * 0.5); ctx.stroke(); }
  // vảy sáng theo hệ trên sống đầu
  ctx.fillStyle = scale;
  for (let i = 0; i < 5; i++) ctx.fillRect(-24 + i * 9, -14 + i * 0.3, 6, 3);
  // sừng
  ctx.fillStyle = hit ? '#fff' : '#d8c8a8';
  ctx.beginPath(); ctx.moveTo(-20, -14); ctx.lineTo(-34, -32); ctx.lineTo(-14, -16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-12, -36); ctx.lineTo(2, -17); ctx.fill();
  // mắt phát sáng
  ctx.fillStyle = glow; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4);
  ctx.beginPath(); ctx.arc(6, -8, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(6, -8, 5, 3.5, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(5.2, -11, 1.6, 6);   // đồng tử dọc
  ctx.restore();
  m.top = 96;
  const name = m.wboss?.n && game.data['thien-mang']?.heads ? (Object.values(game.data['thien-mang'].heads).find(h => h.n === m.wboss.n)?.name || m.def.name) : m.def.name;
  const q = textQ(game, 7), ny = m.y - 82 + breathe;
  ctx.font = `bold ${7 * q}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2.5 * q; ctx.strokeStyle = INK;
  ctx.strokeText(name, m.x, ny); ctx.fillStyle = el; ctx.fillText(name, m.x, ny);
  return true;
}

// Đầu trong vùng không gian (cả con rắn vẽ ở draw-mang-arena.js): chỉ vẽ tên đầu, vòng sáng theo hệ khi trúng đòn
function arenaHead(ctx, game, m, t) {
  const el = game.data.elements[m.wboss.el]?.color || '#b07ad8';
  if (m.flash > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, m.flash * 6) * 0.7; ctx.strokeStyle = el; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (0.8 + Math.sin(t * 30) * 0.05), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const q = textQ(game, 8), ny = m.y - m.r - 6;
  ctx.font = `bold ${9 * q}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2.5 * q; ctx.strokeStyle = INK;
  ctx.strokeText(m.wboss.name || m.def.name, m.x, ny); ctx.fillStyle = el; ctx.fillText(m.wboss.name || m.def.name, m.x, ny);
  return true;
}
