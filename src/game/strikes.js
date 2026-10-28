// Đòn từ trên trời: vòng đỏ báo trước rồi giáng xuống. Dùng cho lửa rơi của boss và sét thiên kiếp.
import { addFx, hitPlayer, dist } from './combat.js';
import { burstFx, boltFx } from './skill-fx.js';

// s: { x, y, r, delay, dmg, kind: 'meteor' | 'thunder', color }
export function addStrike(game, s) { game.strikes.push({ t: 0, color: '#ff4a5a', seed: Math.floor(Math.random() * 1e6), ...s }); }

export function updateStrikes(game, dt) {
  const p = game.player;
  for (const s of game.strikes) {
    s.t += dt;
    if (s.hit || s.t < s.delay) continue;
    s.hit = true;
    game.sfx(s.kind);
    game.screen.shake(s.kind === 'thunder' ? 4 : 3, 0.2);
    addFx(game, { type: 'ring', x: s.x, y: s.y, r: s.r, color: s.color, life: 0.35, fill: true });
    if (s.kind === 'thunder') boltFx(game, s.x, s.y, true, s.seed);   // sét từ trời: cùng hình với vệt tiên dẫn (src/render/draw-bolt.js)
    else burstFx(game, 'fire', s.x, s.y, s.r);   // lửa bằng hình pixel tại chỗ giáng
    if (dist(s, p) < s.r + p.r) { const hp = p.hp; hitPlayer(game, s.dmg, s); if (p.hp < hp) s.onHit?.(); }
  }
  game.strikes = game.strikes.filter(s => s.t < s.delay + 0.3);
}
