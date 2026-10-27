// Câu cá (data/fishing.json): đứng ở mép đảo cạnh biển mây, thả câu, chờ cá cắn rồi bấm kéo cần kịp lúc.
import { dailyEvent } from './daily.js';
import { outdoor } from './daynight.js';
import { daoLu } from './affinity.js';
import { bump } from './achieve.js';
import { season } from './weather.js';
import { bookCatch } from './fishbook.js';

const C = game => game.data.fishing;

// Ô biển mây sát bên người chơi (trả về hướng tới đó), chỉ ngoài trời
export function waterDir(game) {
  if (!outdoor(game) || game.map.def.no_fish) return null;
  const T = game.map.T, p = game.player, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    if (game.map.at(tx + dx, ty + dy) !== '~') continue;
    const c = game.map.center(tx + dx, ty + dy);
    if (Math.hypot(c.x - p.x, c.y - p.y) < T * 1.3) return { x: dx, y: dy };
  }
  return null;
}

// Cá cắn được ở đây, lúc này (cảnh giới, đảo, đêm, mùa, mưa)
export function fishOk(game, f) {
  return game.save.realm >= (f.realm || 0) && (!f.maps || f.maps.includes(game.map.id)) && (!f.night || game.isNight)
    && (!f.season || season(game)?.id === f.season) && (!f.rain || game.raining);
}

function roll(game) {
  const list = Object.entries(C(game).fish).filter(([, f]) => fishOk(game, f));
  let r = Math.random() * list.reduce((a, [, f]) => a + f.w, 0);
  for (const [id, f] of list) if ((r -= f.w) <= 0) return id;
  return list[0][0];
}

export const fishLabel = game => game.fish ? (game.fish.bite ? 'Kéo cần!' : 'Thu cần') : 'Câu cá';

// Bấm nút: thả câu, kéo cần khi cá cắn, hoặc thu cần
export function fishAct(game, dir) {
  const f = game.fish, w = C(game).wait;
  if (!f) {
    game.fish = { dir, t: w[0] + Math.random() * (w[1] - w[0]), bite: false, x: game.player.x, y: game.player.y };
    game.player.meditating = false; game.sfx('swing', 0.5);
    return;
  }
  game.fish = null;
  if (!f.bite) return;
  const id = roll(game), m = game.data.cave.materials[id], s = game.save;
  s.mats[id] = (s.mats[id] || 0) + 1;
  game.number(game.player.x, game.player.y - 20, `+1 ${m.name}`, m.color);
  game.toast(`Câu được ${m.name}!`, 1.6); game.sfx('pickup');
  dailyEvent(game, 'fish'); bump(game, 'fish'); bookCatch(game, id);
  together(game, id, m);
  game.persist();
}

// Đạo lữ đứng gần thì thỉnh thoảng câu thêm được một con, nói một câu
function together(game, id, m) {
  const tg = C(game).together, c = game.comp, p = game.player;
  if (!c || c.id !== daoLu(game) || Math.hypot(c.x - p.x, c.y - p.y) > tg.range || Math.random() >= tg.chance) return;
  game.save.mats[id] += 1;
  game.number(c.x, c.y - 20, `+1 ${m.name}`, m.color);
  const L = tg.lines[c.id] || tg.lines.default;
  game.say(c.npc.name, L[Math.floor(Math.random() * L.length)], 3.5);
}

export function updateFishing(game, dt) {
  const f = game.fish, p = game.player;
  if (!f) return;
  if (Math.hypot(p.x - f.x, p.y - f.y) > 4) { game.fish = null; return; }   // bước đi là thu cần
  if ((f.t -= dt) > 0) return;
  if (!f.bite) { f.bite = true; f.t = C(game).window; game.sfx('pickup', 0.4); game.toast('Cá cắn câu! Kéo cần!', 1); return; }
  game.fish = null; game.toast('Cá sổng mất rồi...', 1.2);
}
