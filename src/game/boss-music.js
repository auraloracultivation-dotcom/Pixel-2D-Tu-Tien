// Nhạc trận (data/sounds.json → music.maps.boss): đang độ kiếp, hoặc boss đã nhắm mình ở gần, thì đổi sang khúc nhanh, trầm;
// hết thì về nhạc của bản đồ. Xét mỗi CHECK giây cho khỏi đổi qua lại.
import { dist } from './combat.js';

const CHECK = 0.5, NEAR = 260;

export function updateBossMusic(game, dt) {
  if ((game.bossMusicT = (game.bossMusicT || 0) - dt) > 0) return;
  game.bossMusicT = CHECK;
  const p = game.player;
  const fight = game.trib.active || game.mobs.some(m => !m.dead && m.def.ai === 'boss' && m.aggro && dist(m, p) < NEAR);
  game.music(fight ? 'boss' : game.map.id);
}
