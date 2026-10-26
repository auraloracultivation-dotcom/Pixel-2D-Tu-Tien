// Tự hành nâng động phủ, tiến hóa linh thú đang mang, nuôi thêm linh cầm (tùy chọn "nang"), luôn chừa pilot.garden_keep Linh Thạch.
import { caveNext, upgradeCave, canEvolve, evolvePet } from './evolve.js';
import { coins } from './shop.js';
import { pilotOpt } from './pilotopt.js';
import { buyCritter } from './critters.js';

// Linh Thạch đang để dành cho bậc động phủ kế tiếp (đủ cảnh giới rồi thì dược viên nhường tiền cho động phủ)
export const caveSaving = game => {
  const n = pilotOpt(game, 'nang') && game.save.flags['dong-phu'] && caveNext(game);
  return n && game.save.realm >= n.realm ? n.coins : 0;
};

export function autoGrow(game) {
  const s = game.save, keep = game.data.config.pilot.garden_keep, n = s.flags['dong-phu'] && caveNext(game);
  if (n?.ok && coins(s) - n.coins >= keep) { upgradeCave(game); return; }
  const E = game.data.pets.evolve;
  if (s.pet && canEvolve(game, s.pet) === 'ok' && coins(s) - E.coins >= keep + caveSaving(game)) { evolvePet(game, s.pet); return; }
  const L = s.flags['dong-phu'] && Object.entries(game.data.critters.list).filter(([id]) => !s.critters?.[id]).sort((a, b) => a[1].cost - b[1].cost)[0];   // nuôi thêm linh cầm rẻ nhất
  if (L && coins(s) - L[1].cost >= keep + caveSaving(game) && buyCritter(game, L[0])) game.toast(`Tự mua ${L[1].name} thả trong động phủ.`, 2);
}
