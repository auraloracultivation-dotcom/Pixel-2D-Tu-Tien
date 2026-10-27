// Cấp chiêu (data/config.json → skill_lv): mỗi chiêu nâng riêng bằng Bí Kíp Chiêu và Linh Thạch, giá nhân lên mỗi cấp.
// Lưu ở save.skillLv { id: cấp }; chưa có thì cấp 1.
import { addCoins, coins } from './shop.js';

const L = game => game.data.config.skill_lv;

export const skillLv = (game, id) => Math.max(1, Math.min(L(game).max, game.save?.skillLv?.[id] || 1));

// Hệ số chiêu theo cấp: chiêu tấn công nhân sát thương, chiêu hồi máu, khiên, tăng lực nhân lượng
export function skillMul(game, id) {
  const c = L(game), s = game.data.skills[id], lv = skillLv(game, id) - 1;
  return 1 + lv * (s?.mult ? c.per : c.per_support);
}

// Giá nâng từ cấp lv lên lv + 1
export function levelCost(game, lv) {
  const c = L(game);
  return { book: Math.ceil(c.book_base * c.book_r ** (lv - 1) - 1e-9), coins: Math.round(c.coins_base * c.coins_r ** (lv - 1)) };
}

// Nâng một cấp; trả về false nếu đã tối đa hoặc thiếu nguyên liệu
export function levelUp(game, id) {
  const c = L(game), s = game.save, lv = skillLv(game, id);
  if (lv >= c.max) return false;
  const cost = levelCost(game, lv);
  if ((s.mats[c.mat] || 0) < cost.book || coins(s) < cost.coins) return false;
  s.mats[c.mat] -= cost.book;
  addCoins(game, -cost.coins);
  (s.skillLv ??= {})[id] = lv + 1;
  game.persist();
  return true;
}
