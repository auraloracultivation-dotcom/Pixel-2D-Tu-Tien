// Tab Dược viên trong bảng động phủ: khai hoang luống mới, đổi cây, nâng cấp từng luống.
import { herbs, owned, cropOf, plotLv, growMin, plotGrowth, openCost, openPlot, nextLv, upgradePlot, cropOk, plant } from '../game/garden.js';
import { costText } from '../game/cave.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// say(msg) ghi dòng báo, redo() vẽ lại bảng
export function renderGarden(game, list, say, redo) {
  const { data } = game, G = data.garden, coin = data.shop.name;
  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off; b.onclick = () => { fn(); redo(); }; return b; };
  const h = herbs(game), oc = openCost(game);
  const head = el('div', 'skill-card wide-card'); head.style.borderLeftColor = '#7af0a0';
  head.append(el('b', null, `Dược viên · ${h.n}/${G.plots.length} luống`), el('small', null, 'Đứng cạnh luống bấm Dược viên để thu hoạch. Có đạo lữ thì đạo lữ thu giúp.'));
  if (oc != null) { const row = el('div', 'card-acts'); row.append(mini(`Khai hoang luống mới (${oc} ${coin})`, () => say(openPlot(game) ? 'Khai hoang xong một luống mới!' : `Không đủ ${coin}.`), (game.save.lingshi || 0) < oc)); head.append(row); }
  list.append(head);
  G.plots.forEach(([x, y], i) => {
    if (!owned(game, i)) return;
    const c = cropOf(game, i), lv = G.levels[plotLv(game, i)], g = plotGrowth(game, x, y), n = nextLv(game, i);
    const card = el('div', 'skill-card wide-card'); card.style.borderLeftColor = c.color;
    const left = Math.ceil((1 - g) * growMin(game, i));
    card.append(el('b', null, `Luống ${i + 1} · ${c.name} · ${lv.name}`), el('small', null, g >= 1 ? 'Đã chín, ra thu hoạch thôi.' : `Chín sau khoảng ${left} phút`));
    const row = el('div', 'card-acts wrap');
    for (const [id, cr] of Object.entries(G.crops)) {
      if (id === c.id) continue;
      const lock = !cropOk(game, id);
      row.append(mini(lock ? `${cr.name} (cần ${data.realms.names[cr.realm]})` : `Trồng ${cr.name}${cr.seed ? ` (${costText(data, cr.seed)})` : ''}`, () => say(plant(game, i, id) ? `Luống ${i + 1} gieo ${cr.name}.` : 'Thiếu hạt giống.'), lock));
    }
    if (n) row.append(mini(`Lên ${n.name} (${n.cost.coins} ${coin}, ${costText(data, n.cost.mats)})`, () => say(upgradePlot(game, i) ? `Luống ${i + 1} thành ${n.name}!` : 'Chưa đủ nguyên liệu.')));
    card.append(row); list.append(card);
  });
}
