// Lực chiến tăng thì nổ chữ to giữa màn (chủ dự án 08/11/2026 16:27, theo video tham khảo "Chiến Lực: 579A"): mặc đồ tốt hơn,
// cường hóa, khảm ngọc, lên tầng, linh thú… đều thấy ngay mình mạnh lên. Đo lực chiến mỗi config.power_pop.every giây; lần đo đầu
// (vừa vào game, vừa đổi nhân vật) chỉ ghi nhớ, không nổ. Tăng liền nhau thì cộng dồn vào chữ đang hiện. Giảm thì lặng lẽ ghi nhận.
// Vẽ ở src/render/draw-power-pop.js.
import { power } from './achieve.js';

export function updatePowerPop(game, dt) {
  const C = game.data.config.power_pop;
  if (!C || !game.player || (game.powerPopT = (game.powerPopT || 0) - dt) > 0) return;
  game.powerPopT = C.every;
  const p = power(game), seen = game.powerSeen;
  game.powerSeen = p;
  if (seen == null || game.player !== game.powerSeenOf) { game.powerSeenOf = game.player; return; }
  if (p - seen < Math.max(C.min, seen * C.min_rate)) return;
  const old = game.powerPop, live = old && game.time - old.at < C.life - C.fade;
  game.powerPop = live ? { from: old.shown ?? old.to, to: p, d: old.d + p - seen, at: game.time - C.pop } : { from: seen, to: p, d: p - seen, at: game.time };
  game.sfx?.(C.sfx);
}
