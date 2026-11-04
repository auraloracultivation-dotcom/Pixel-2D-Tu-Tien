// Linh lực (chủ dự án 04/11/2026 12:57): năng lượng dùng chiêu, khác Linh khí (tu vi để đột phá cảnh giới). Số ở data/config.json → mana.
// Không lưu vào bản lưu: vào game là đầy. Dùng ở src/game/player.js (trừ khi ra chiêu, hồi theo thời gian), src/ui/hud.js (thanh).
import { totalLayer } from './stats.js';

const M = game => game.data.config.mana;
// Gốc theo tầng tu; công pháp Linh lực cộng % (st.mpPct). Chiêu tốn theo linh lực GỐC, để linh lực tối đa tăng thì ra được nhiều chiêu hơn.
const manaBase = game => M(game).base + M(game).per_layer * totalLayer(game.save, game.data.realms);
export const manaMax = game => Math.round(manaBase(game) * (1 + (game.player?.st?.mpPct || 0)));
export const manaCost = (game, id) => { const c = M(game), s = game.data.skills[id]; return Math.round(manaBase(game) * Math.min(c.cap, c.per_cd * (s?.cd || 3))); };

export function manaTick(game, dt) {
  const p = game.player, mx = manaMax(game);
  if (p.mp == null || p.mpMax !== mx) { p.mp = p.mp == null ? mx : Math.min(mx, p.mp + Math.max(0, mx - (p.mpMax || mx))); p.mpMax = mx; }
  if (p.mp < mx) p.mp = Math.min(mx, p.mp + mx * (M(game).regen_pct + (p.st?.mpRegen || 0)) * dt * (p.meditating ? M(game).med_mul : 1));
}

// Đủ linh lực thì trừ và trả true; thiếu thì báo (cách nhau 1,5 giây) và trả false
export function spendMana(game, id) {
  const p = game.player, cost = manaCost(game, id);
  if ((p.mp ?? 0) >= cost) { p.mp -= cost; return true; }
  if ((game.time || 0) - (p.mpWarn || -9) > 1.5) { p.mpWarn = game.time || 0; game.number?.(p.x, p.y - 22, 'Thiếu linh lực', '#7ab8ff'); }
  return false;
}
