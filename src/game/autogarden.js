// Tự hành chăm dược viên (tùy chọn "vuon"): dư Linh Thạch thì khai thêm luống, rồi nâng đất luống thấp nhất.
// Luôn chừa lại pilot.garden_keep Linh Thạch (và tiền đang để dành nâng động phủ) và herb_keep mỗi loại nguyên liệu.
import { herbs, openCost, openPlot, nextLv, upgradePlot, plotLv } from './garden.js';
import { coins } from './shop.js';
import { caveSaving } from './autogrow.js';

export function autoGarden(game) {
  const s = game.save, d = game.data, P = d.config.pilot, g = d.garden;
  if (!s.flags['dong-phu']) return;
  const spare = coins(s) - P.garden_keep - caveSaving(game), oc = openCost(game);
  if (oc != null) {   // còn luống chưa khai: khai trước, chưa đủ tiền thì để dành
    if (spare >= oc && openPlot(game)) game.toast(`Tự khai thêm một luống dược viên (${herbs(game).n} luống).`, 2);
    return;
  }
  const n = herbs(game).n, i = [...Array(n).keys()].sort((a, b) => plotLv(game, a) - plotLv(game, b))[0], nx = i != null && nextLv(game, i);
  if (!nx || spare < nx.cost.coins || Object.entries(nx.cost.mats || {}).some(([k, c]) => (s.mats[k] || 0) - c < P.herb_keep)) return;
  if (upgradePlot(game, i)) game.toast(`Tự nâng một luống dược viên lên ${nx.name}.`, 2);
}
