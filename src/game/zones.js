// Vùng chiêu kéo dài (lửa cháy đất, cát lún, kim luân quanh người...): mỗi nhịp gây sát thương,
// làm chậm quái bên trong, có thể hồi máu khi người chơi đứng trong vùng.
import { hitMob } from './combat.js';

export function addZone(game, z) {
  game.zones.push({ t: 0, next: 0, ...z });
}

export function updateZones(game, dt) {
  const p = game.player;
  for (const z of game.zones) {
    z.t += dt; z.next -= dt;
    if (z.follow) { z.x = (z.foe || p).x; z.y = (z.foe || p).y; }
    if (z.next > 0) continue;
    z.next = z.tick;
    if (z.foe) { z.onTick(z); continue; }   // vùng chiêu của bản sao so tài (game/duel-cast.js): đánh người chơi, hồi máu bản sao
    for (const m of game.mobs) {
      if (m.dead || Math.hypot(m.x - z.x, m.y - z.y) > z.radius + m.r) continue;
      hitMob(game, m, z.dmg, { slow: z.slow, color: z.color, canCrit: true, fromX: z.x, fromY: z.y, soft: true });
    }
    if (z.heal && Math.hypot(p.x - z.x, p.y - z.y) < z.radius) {
      const amt = Math.round(p.maxHp * z.heal);
      if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + amt); game.number(p.x, p.y - 16, '+' + amt, '#9af0a8'); }
    }
  }
  game.zones = game.zones.filter(z => z.t < z.dur);
}
