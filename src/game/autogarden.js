// Tự hành chăm dược viên (tùy chọn "vuon"): gieo cây nấu ăn đang thiếu, dư Linh Thạch thì khai thêm luống, rồi nâng đất luống thấp nhất.
// Luôn chừa lại pilot.garden_keep Linh Thạch (và tiền đang để dành nâng động phủ) và herb_keep mỗi loại nguyên liệu.
import { herbs, openCost, openPlot, nextLv, upgradePlot, plotLv, cropOf, cropOk, plant, plotGrowth } from './garden.js';
import { coins } from './shop.js';
import { caveSaving } from './autogrow.js';

// Cây nấu ăn đang cần: theo món ngon nhất mà nguyên liệu ngoài vườn (cá) đã đủ, thiếu cây nào thì cần cây đó
function wantedCrops(game) {
  const s = game.save, G = game.data.garden.crops, want = [];
  const recipes = Object.values(game.data.cooking.recipes).sort((a, b) => b.buff.qi - a.buff.qi);
  for (const r of recipes) {
    const need = Object.entries(r.need);
    if (need.some(([k, n]) => !G[k]?.cook && (s.mats[k] || 0) < n)) continue;
    for (const [k, n] of need) if (G[k]?.cook && cropOk(game, k) && (s.mats[k] || 0) < n * 2 && !want.includes(k)) want.push(k);
  }
  return want;
}

// Gieo cây nấu ăn đang thiếu vào luống vừa thu (tối đa cook_plots luống), chừa herb_keep mỗi loại hạt
function autoCookPlant(game) {
  const s = game.save, d = game.data, g = d.garden, keep = d.config.pilot.herb_keep;
  const want = wantedCrops(game), n = herbs(game).n;
  const plots = [...Array(n).keys()], cookOn = plots.filter(i => g.crops[cropOf(game, i).id].cook);
  const id = want.find(k => !cookOn.some(i => cropOf(game, i).id === k));
  if (!id) return;
  const fresh = i => plotGrowth(game, ...g.plots[i]) < 0.25;
  const spot = cookOn.length < g.cook_plots
    ? plots.find(i => !cookOn.includes(i) && cropOf(game, i).id === 'linh-thao' && fresh(i) && n - cookOn.length > 2)
    : cookOn.find(i => !want.includes(cropOf(game, i).id) && fresh(i));
  if (spot == null || Object.entries(g.crops[id].seed || {}).some(([k, c]) => (s.mats[k] || 0) - c < keep)) return;
  if (plant(game, spot, id)) game.toast(`Tự gieo ${g.crops[id].name} ở luống ${spot + 1} để nấu ăn.`, 2);
}

export function autoGarden(game) {
  const s = game.save, d = game.data, P = d.config.pilot, g = d.garden;
  if (!s.flags['dong-phu']) return;
  autoCookPlant(game);
  const spare = coins(s) - P.garden_keep - caveSaving(game), oc = openCost(game);
  if (oc != null) {   // còn luống chưa khai: khai trước, chưa đủ tiền thì để dành
    if (spare >= oc && openPlot(game)) game.toast(`Tự khai thêm một luống dược viên (${herbs(game).n} luống).`, 2);
    return;
  }
  const n = herbs(game).n, i = [...Array(n).keys()].sort((a, b) => plotLv(game, a) - plotLv(game, b))[0], nx = i != null && nextLv(game, i);
  if (!nx || spare < nx.cost.coins || Object.entries(nx.cost.mats || {}).some(([k, c]) => (s.mats[k] || 0) - c < P.herb_keep)) return;
  if (upgradePlot(game, i)) game.toast(`Tự nâng một luống dược viên lên ${nx.name}.`, 2);
}
