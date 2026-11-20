// Đòn từ trên trời: vòng đỏ báo trước rồi giáng xuống. Dùng cho lửa rơi của boss và sét thiên kiếp.
import { addFx, hitPlayer, dist } from './combat.js';
import { burstFx, boltFx } from './skill-fx.js';
import { tribBolt } from './trib-sky.js';

// s: { x, y, r, delay, dmg, kind: 'meteor' | 'thunder', color }
export function addStrike(game, s) { game.strikes.push({ t: 0, color: '#ff4a5a', seed: Math.floor(Math.random() * 1e6), ...s }); }

export function updateStrikes(game, dt) {
  const p = game.player;
  for (const s of game.strikes) {
    s.t += dt;
    if (s.follow && !s.hit) { s.x = s.follow.x; s.y = s.follow.y; }   // sét kiếp chính bám người tới lúc giáng (tribulation.js)
    if (s.hit || s.t < s.delay) continue;
    s.hit = true;
    game.sfx(s.kind, s.see ? 0.6 : 1);
    game.screen.shake(s.see ? 2 : s.kind === 'thunder' ? 4 : 3, 0.2);
    addFx(game, { type: 'ring', x: s.x, y: s.y, r: s.r, color: s.color, life: 0.35, fill: true });
    if (s.trib) tribBolt(game, s.x, s.y, { pal: s.pal, fade: s.see ? 3 : undefined });   // sét thiên kiếp: to, màu theo cảnh giới, vùng nổ, vết cháy (trib-sky.js)
    else if (s.kind === 'thunder') boltFx(game, s.x, s.y, true, s.seed);   // sét từ trời: cùng hình với vệt tiên dẫn (src/render/draw-bolt.js)
    else burstFx(game, 'fire', s.x, s.y, s.r);   // lửa bằng hình pixel tại chỗ giáng
    if (s.see) s.hitSee?.(s);   // sét kiếp của người khác (kiep-see.js): đứng gần thì bị đánh cùng
    else if (dist(s, p) < s.r + p.r) {
      const hp = p.hp; hitPlayer(game, s.dmg, s); if (p.hp < hp) s.onHit?.(); }
  }
  game.strikes = game.strikes.filter(s => s.t < s.delay + 0.3);
}
