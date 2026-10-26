// Thời tiết (data/weather.json): hạt bay theo đảo, mưa theo giờ thật. Chỉ ngoài trời.
import { outdoor } from './daynight.js';

const C = game => game.data.weather;

// Cùng giờ, cùng đảo thì cùng kết quả mưa (băm theo ngày giờ và tên đảo)
function rolls(key) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export const weatherOf = game => (outdoor(game) && C(game).maps[game.map.id]) || null;

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
}
