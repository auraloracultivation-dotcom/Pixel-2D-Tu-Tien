// Áp chế lực chiến (chủ dự án 09/11/2026 16:19: "tôi 16k mà cùng lúc đánh được mấy con 45k, cơ chế game phải sửa"): đánh nhau với
// quái thì so lực chiến hai bên (người chơi: achieve.js power; quái: mob-power.js mobPower), r = quái / người chơi.
// - Người chơi đánh quái: sát thương × r^-out (quái mạnh gấp 3 thì còn 1/3), kẹp out_min…out_max.
// - Quái đánh người chơi: sát thương (sau phòng ngự) × r^in, kẹp in_min…in_max.
// Ngang lực chiến thì như cũ; quái yếu hơn thì mình đánh đau hơn, bị đánh nhẹ hơn (có trần). Mộc Nhân, đầu boss thế giới, bản sao
// so tài không áp; vùng tân thủ (free: Thiên Kiếm Tinh, Mảnh Vỡ Thanh Khê) không áp để người mới học đánh. Lực chiến người chơi tính lại mỗi giây. Số ở data/config.json → cp_press.
import { power } from './achieve.js';
import { mobPower } from './mob-power.js';

const C = game => game.data.config.cp_press;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const skip = (game, m) => !m?.def || m.dummy || m.wboss || m.duel || m.tower || C(game).free?.includes(game.map?.id);   // tháp, tâm ma độ kiếp: độ khó đã đặt riêng; free: vùng tân thủ

function myCp(game) {
  const c = game.cpCache ??= { t: -9, v: 1 };
  if ((game.time || 0) - c.t > 1) { c.t = game.time || 0; c.v = Math.max(1, power(game)); }
  return c.v;
}

const ratio = (game, m) => mobPower(game, m) / myCp(game);

// Nhân sát thương người chơi đánh quái m
export function cpOut(game, m) {
  const c = C(game);
  if (!c?.on || skip(game, m)) return 1;
  return clamp(ratio(game, m) ** -c.out, c.out_min, c.out_max);
}

// Nhân sát thương quái m đánh người chơi
export function cpIn(game, m) {
  const c = C(game);
  if (!c?.on || skip(game, m)) return 1;
  return clamp(ratio(game, m) ** c.in, c.in_min, c.in_max);
}
