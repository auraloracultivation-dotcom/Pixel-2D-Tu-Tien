// Tỉ lệ của món may rủi trong quầy Tiên Ngọc (data/topup.json → odds), tính thẳng từ data/items.json
// theo đúng cách game bốc đồ (items.js: rollItem, rollGem) để con số công bố luôn khớp với thật.
const pct = x => (x * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';

export function giveOdds(data, give) {
  const O = data.topup.odds, items = data.items, out = [];
  if (give.item) {
    const rars = items.rarities.slice(Math.max(0, items.rarities.findIndex(r => r.id === give.item)));
    const sum = rars.reduce((a, r) => a + r.weight, 0);
    out.push(O.rarity.replace('{list}', rars.map(r => `${r.name} ${pct(r.weight / sum)}`).join(', ')));
    const n = Object.values(items.bases).filter(b => !b.set).length;
    out.push(O.base.replace('{n}', n).replace('{p}', pct(1 / n)), O.lines);
  }
  if (give.gem) {
    const types = Object.values(items.gems.types);
    out.push(O.gem.replace('{list}', types.map(t => `${t.name} ${pct(1 / types.length)}`).join(', ')));
  }
  return out.length ? `${O.head} ${out.join('; ')}.` : '';
}
