// Sổ sưu tập cá (data/fishing.json → book): đếm số con mỗi loại, loại mới thì thưởng, đủ số loại thì thưởng mốc.
import { grant } from './daily.js';

const B = game => game.data.fishing.book;
export const bookOf = game => (game.save.fishBook ??= { n: {}, got: [] });
export const kinds = game => Object.keys(bookOf(game).n).length;

export function bookCatch(game, id) {
  const b = bookOf(game), fresh = !b.n[id];
  b.n[id] = (b.n[id] || 0) + 1;
  if (!fresh) return;
  const name = game.data.cave.materials[id].name;
  game.toast(B(game).new.replace('{name}', name).replace('{got}', grant(game, B(game).first).join(', ')), 2.6);
  B(game).milestones.forEach((m, i) => {
    if (kinds(game) < m.n || b.got.includes(i)) return;
    b.got.push(i);
    const got = grant(game, m.give);
    setTimeout(() => game.toast(B(game).done.replace('{n}', m.n).replace('{got}', got.join(', ')), 3), 2800);
  });
}

// Dòng gợi ý chỗ câu cho loại chưa có
export function hintOf(game, f) {
  const h = B(game).hint, se = game.data.weather.seasons;
  const parts = [];
  if (f.maps) parts.push(h.maps.replace('{maps}', f.maps.map(m => game.data.maps[m].name).join(', ')));
  if (f.night) parts.push(h.night);
  if (f.realm) parts.push(h.realm.replace('{realm}', game.data.realms.names[f.realm]));
  if (f.season) parts.push(h.season.replace('{season}', se.find(s => s.id === f.season).name));
  if (f.rain) parts.push(h.rain);
  return parts.join(' · ') || h.any;
}
