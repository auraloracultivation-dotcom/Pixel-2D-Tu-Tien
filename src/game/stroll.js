// NPC đi dạo (npcs.json → stroll số ô, nhịp ở data/chatter.json → stroll): đi chậm quanh chỗ đứng, đứng nghỉ rồi đi tiếp.
// Người chơi tới gần thì đứng lại, quay về phía người chơi.
import { updateKhach } from './hoi-khach.js';
const C = game => game.data.chatter.stroll;

export function updateStroll(game, dt) {
  updateKhach(game, dt);   // khách đi hội trên tinh cầu đang mở hội (hoi-khach.js)
  const c = C(game), p = game.player, T = game.map.T;
  for (const n of game.npcs) {
    const r = n.def.stroll;
    if (!r || n.home || n.visit) continue;
    n.hx ??= n.x; n.hy ??= n.y; n.walkT = (n.walkT || 0) + dt;
    const px = p.x - n.x, py = p.y - n.y;
    if (Math.hypot(px, py) < c.stop || game.dialog.open) { n.moving = false; n.face = { x: Math.sign(px) * 0.8, y: py > 0 ? 1 : -0.3 }; continue; }
    if ((n.wait = (n.wait || 0) - dt) > 0) { n.moving = false; continue; }
    if (!n.to) {
      const tx = Math.floor((n.hx + (Math.random() * 2 - 1) * r * T) / T), ty = Math.floor((n.hy + (Math.random() * 2 - 1) * r * T) / T);
      if (game.map.solidTile(tx, ty)) { n.wait = 0.5; continue; }
      n.to = game.map.center(tx, ty);
    }
    const dx = n.to.x - n.x, dy = n.to.y - n.y, d = Math.hypot(dx, dy), step = c.speed * dt;
    if (d < step + 0.5) { n.to = null; n.moving = false; n.wait = c.wait[0] + Math.random() * (c.wait[1] - c.wait[0]); continue; }
    const ox = n.x, oy = n.y;
    game.map.move(n, dx / d * step, dy / d * step);
    if (n.x === ox && n.y === oy) { n.to = null; n.wait = 1; continue; }   // vướng thì đổi hướng
    n.moving = true; n.face = { x: dx / d, y: dy / d };
  }
}
