// Tab Tự hành trong bảng Việc: bật tắt từng việc tự hành được làm (data/config.json → pilot.opts).
import { pilotOpt, togglePilotOpt } from '../game/pilotopt.js';
import { farmPlanets } from '../game/farmjob.js';

export function renderPilotOpts(game, list, { card, mini }) {
  const opts = game.data.config.pilot.opts;
  document.getElementById('daily-sub').textContent = `Tự hành đang làm ${opts.filter(o => pilotOpt(game, o.id)).length}/${opts.length} việc`;
  // Đề xuất #38: chọn tinh cầu treo máy (bấm để đổi lần lượt: Tự chọn → từng tinh cầu có bãi đã tới)
  const F = game.data.config.pilot.farm_pick, list2 = farmPlanets(game), cur = game.save.pilotFarm;
  const name = id => game.data.maps[id]?.name || id, now = list2.some(b => b.map === cur) ? name(cur) : F.auto;
  list.append(card('#f2c94c', `${F.title}: ${now}`, [F.desc], mini(F.btn, () => {
    const ids = [null, ...list2.map(b => b.map)], i = ids.indexOf(list2.some(b => b.map === cur) ? cur : null);
    game.save.pilotFarm = ids[(i + 1) % ids.length]; if (game.pilot) { game.pilot.path = null; game.pilot.key = ''; } game.persist();
  })));
  for (const o of opts) {
    const on = pilotOpt(game, o.id);
    list.append(card(on ? '#5fd07a' : '#c8c4d0', o.name, [o.desc], mini(on ? 'Đang bật' : 'Đang tắt', () => togglePilotOpt(game, o.id))));
  }
}
