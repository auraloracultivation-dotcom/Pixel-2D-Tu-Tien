// Tùy chọn tự hành (data/config.json → pilot.opts): người chơi bật tắt từng việc ở bảng Việc → tab Tự hành. Mặc định bật hết.
import { phase } from './daynight.js';

export const pilotOpt = (game, id) => game.save?.pilotOpt?.[id] !== false;
// Tối về nhà (tùy chọn "dem"): ban đêm tự hành không nhận việc mới, làm nốt việc đang dở rồi về động phủ
export const nightRest = game => pilotOpt(game, 'dem') && !!game.save.flags['dong-phu'] && phase(game).id === 'dem';
export function togglePilotOpt(game, id) {
  (game.save.pilotOpt ??= {})[id] = !pilotOpt(game, id);
  game.persist();
}
