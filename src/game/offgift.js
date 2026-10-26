// Quà khi vắng mặt: linh thú tha đồ về (pets.json → fetch.away_hours), đạo lữ ở nhà câu cá giùm (fishing.json → away).
import { grant } from './daily.js';
import { daoLuHere } from './affinity.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();

// Linh thú: cứ away_hours giờ vắng tha về một món, không quá số lượt còn lại trong ngày
function petGifts(game, hours) {
  const pet = game.pet, c = game.data.pets.fetch, s = game.save;
  if (!pet || !c.away_hours) return null;
  if (s.fetch?.day !== today()) s.fetch = { day: today(), n: 0 };
  const n = Math.min(c.per_day - s.fetch.n, Math.floor(hours / c.away_hours));
  if (n <= 0) return null;
  s.fetch.n += n;
  const finds = Array.from({ length: n }, () => pick(c.finds)), got = finds.flatMap(f => grant(game, f.give));
  return `${finds[0].text.replace('{name}', pet.def.name)}${n > 1 ? ` Cả buổi nó đi ${n} chuyến.` : ''} (${got.join(', ')})`;
}

// Đạo lữ ở động phủ: cứ every_hours giờ câu được một con, tối đa max
function compFish(game, hours) {
  const a = game.data.fishing.away, who = daoLuHere(game);
  if (!a || !who || game.save.map !== game.data.home.map) return null;
  const n = Math.min(a.max, Math.floor(hours / a.every_hours));
  if (n <= 0) return null;
  const got = grant(game, { mats: { [a.mat]: n } });
  const line = pick(a.lines[who] || a.lines.default);
  return [game.data.npcs[who].name, `${line} (${got.join(', ')})`];
}

export function awayGifts(game, sec) {
  const h = sec / 3600, out = [], pet = petGifts(game, h), fish = compFish(game, h);
  if (pet) out.push(['', pet]);
  if (fish) out.push(fish);
  return out;
}
