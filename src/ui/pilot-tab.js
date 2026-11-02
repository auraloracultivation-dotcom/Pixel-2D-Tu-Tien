// Mục Tự động trong Menu (src/ui/side-nav.js): bật tắt từng việc tự hành được làm (data/config.json → pilot.opts).
import { pilotOpt, togglePilotOpt } from '../game/pilotopt.js';

export function renderPilotOpts(game, list, { card, mini, sub }) {
  const opts = game.data.config.pilot.opts;
  sub(`Tự động đang làm ${opts.filter(o => pilotOpt(game, o.id)).length}/${opts.length} việc`);
  // Ô chọn bãi treo máy đã bỏ (chủ dự án 02/11/2026: bỏ mục trên cùng, tự hành áp cho nhiệm vụ ngày)
  for (const o of opts) {
    const on = pilotOpt(game, o.id);
    list.append(card(on ? '#5fd07a' : '#c8c4d0', o.name, [o.desc], mini(on ? 'Đang bật' : 'Đang tắt', () => togglePilotOpt(game, o.id))));
  }
}
