// Kỳ ngộ nhỏ (data/kyngo.json): đi ngoài trời lâu lâu gặp một chuyện nhỏ dễ chịu, được chút quà. Mỗi ngày vài lần.
import { phase, outdoor } from './daynight.js';
import { season } from './weather.js';
import { grant } from './daily.js';

const C = game => game.data.kyngo;
const today = () => new Date().toDateString();

export function updateKyNgo(game, dt) {
  const c = C(game), s = game.save;
  if (!outdoor(game) || game.dungeon || game.res || game.tower || game.arena || game.trib.active || game.mobs.some(m => !m.dead && m.def.ai === 'boss')) return;
  if ((game.kyT = (game.kyT ?? c.every) - dt) > 0) return;
  game.kyT = c.every;
  if (s.kyngo?.day !== today()) s.kyngo = { day: today(), n: 0 };
  if (s.kyngo.n >= c.per_day || Math.random() > c.chance) return;
  const ph = phase(game).id, se = season(game)?.id;
  const list = c.list.filter(k => (!k.phase || k.phase === ph) && (!k.season || k.season === se));
  const k = list[Math.floor(Math.random() * list.length)];
  s.kyngo.n++;
  const got = grant(game, k.give);
  game.sfx('pickup');
  game.toast(`Kỳ ngộ: ${k.text} (${got.join(', ')})`, 4.5);
}
