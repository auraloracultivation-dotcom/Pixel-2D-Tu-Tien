// Tùy chọn tự hành (data/config.json → pilot.opts): người chơi bật tắt từng việc ở bảng Việc → tab Tự hành. Mặc định bật hết.
import { hourNow } from './daynight.js';

export const pilotOpt = (game, id) => game.save?.pilotOpt?.[id] !== false;
// Tối về nhà (tùy chọn "dem"): từ pilot.rest[0] giờ tới rest[1] giờ sáng tự hành không nhận việc mới, làm nốt việc đang dở rồi về động phủ
export const nightRest = game => {
  const [a, b] = game.data.config.pilot.rest, h = hourNow(game);
  return pilotOpt(game, 'dem') && !!game.save.flags['dong-phu'] && (h >= a || h < b);
};
// Loài quái tự hành đang tạm tránh (vừa hạ mình, pilot.js → pilotDied)
export const avoided = (game, id) => (game.pilot?.avoid?.[id] || 0) > Date.now();
export function togglePilotOpt(game, id) {
  (game.save.pilotOpt ??= {})[id] = !pilotOpt(game, id);
  game.persist();
}
