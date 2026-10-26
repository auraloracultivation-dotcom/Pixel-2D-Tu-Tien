// Thời tiết (data/weather.json): hạt bay theo đảo, đổi theo mùa (tháng thật), mưa theo giờ thật. Chỉ ngoài trời.
import { outdoor } from './daynight.js';

const C = game => game.data.weather;

// Cùng giờ, cùng đảo thì cùng kết quả mưa (băm theo ngày giờ và tên đảo)
function rolls(key) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export const season = game => { const m = new Date().getMonth() + 1; return C(game).seasons.find(s => s.months.includes(m)); };

export function weatherOf(game) {
  const w = outdoor(game) && C(game).maps[game.map.id];
  if (!w) return null;
  const k = season(game)?.swap[w.kind];
  return k ? { ...w, kind: k } : w;
}

export function isRaining(game) {
  const w = weatherOf(game);
  if (!w?.rain) return false;
  const d = new Date();
  return rolls(`${d.toDateString()}:${d.getHours()}:${game.map.id}`) < w.rain;
}

export function updateWeather(game, dt) {
  if ((game.wxT = (game.wxT || 0) - dt) > 0) return;
  game.wxT = 5;
  const on = isRaining(game), was = game.raining;
  game.raining = on;
  game.rain?.(on);
  if (was != null && was !== on && game.wxMap === game.map.id) game.toast(on ? C(game).rain.start : C(game).rain.stop, 2.6);
  game.wxMap = game.map.id;
  const se = season(game), s = game.save;   // sang mùa mới thì báo một câu
  if (se && s.season !== se.id) { if (s.season) game.toast(se.intro, 3); s.season = se.id; }
}
