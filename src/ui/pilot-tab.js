// Tab Tự hành trong bảng Việc: bật tắt từng việc tự hành được làm (data/config.json → pilot.opts).
import { pilotOpt, togglePilotOpt } from '../game/pilotopt.js';

export function renderPilotOpts(game, list, { card, mini }) {
  const opts = game.data.config.pilot.opts;
  document.getElementById('daily-sub').textContent = `Tự hành đang làm ${opts.filter(o => pilotOpt(game, o.id)).length}/${opts.length} việc`;
  for (const o of opts) {
    const on = pilotOpt(game, o.id);
    list.append(card(on ? '#5fd07a' : '#c8c4d0', o.name, [o.desc], mini(on ? 'Đang bật' : 'Đang tắt', () => togglePilotOpt(game, o.id))));
  }
}
