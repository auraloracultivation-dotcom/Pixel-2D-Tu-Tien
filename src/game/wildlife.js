// Thú hiền trên tinh cầu (data/wildlife.json): đi dạo, thấy người đi tới thì chạy (chim bay vụt đi), người đứng yên thì hết sợ,
// con gần nhất lại gần dụi đầu, hiện tim. Không lưu, không đánh. Vẽ ở src/render/draw-critter.js (drawWild).
const C = game => game.data.wildlife;

function freeSpot(game, near, r) {
  const map = game.map, T = map.T;
  for (let i = 0; i < 40; i++) {
    const tx = near ? Math.floor(near.x / T + (Math.random() * 2 - 1) * r) : Math.floor(Math.random() * map.w);
    const ty = near ? Math.floor(near.y / T + (Math.random() * 2 - 1) * r) : Math.floor(Math.random() * map.h);
    const k = map.type(tx, ty);
    if (!k.solid && !k.void && !map.solidTile(tx, ty) && map.at(tx, ty) !== 'P') return map.center(tx, ty);   // solidTile: cả chân đồ lễ hội
  }
  return near ? { x: near.x, y: near.y } : null;
}

export function spawnWild(game) {
  game.wild = [];
  for (const [kind, n] of C(game).maps[game.map.id] || []) {
    for (let i = 0; i < n; i++) {
      const p = freeSpot(game, null);
      if (p) game.wild.push({ kind, x: p.x, y: p.y, r: 3, face: Math.random() < 0.5 ? 1 : -1, wait: Math.random() * 3, to: null, runT: 0, h: 0, heart: 0 });
    }
  }
}

export function updateWild(game, dt) {
  if (!game.wild?.length) return;
  const cfg = C(game), p = game.player;
  game.stillT = p.moving || p.swingT > 0 ? 0 : (game.stillT || 0) + dt;
  const calm = game.stillT > cfg.still;
  let pal = null, pd = cfg.pet.range;   // con gần nhất lại gần khi người chơi đứng yên
  if (calm) for (const a of game.wild) { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < pd && !a.h) { pd = d; pal = a; } }
  for (const a of game.wild) {
    const k = cfg.kinds[a.kind], dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy) || 1;
    a.heart = Math.max(0, a.heart - dt);
    if (a.h > 0 || a.flying) {   // chim đang bay: lên cao, bay ngang, hạ xuống chỗ mới
      a.flyT += dt;
      a.h = Math.sin(Math.min(1, a.flyT / 1.4) * Math.PI) * 26;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.flyT >= 1.4) { a.flying = false; a.h = 0; const q = freeSpot(game, a, 2); a.x = q.x; a.y = q.y; a.wait = 2 + Math.random() * 3; }
      continue;
    }
    if (!calm && p.moving && d < k.flee) {   // sợ: chạy ra xa người chơi
      if (k.fly) { a.flying = true; a.flyT = 0; a.vx = dx / d * k.run; a.vy = dy / d * k.run - 20; a.face = Math.sign(a.vx) || 1; continue; }
      a.runT = 0.8; a.to = null; a.rx = dx / d; a.ry = dy / d;
    }
    if (a.runT > 0) {
      a.runT -= dt; a.face = Math.sign(a.rx) || a.face;
      game.map.move(a, a.rx * k.run * dt, a.ry * k.run * dt); a.moving = true; continue;
    }
    if (a === pal) {   // lại gần dụi đầu
      if (d > cfg.pet.near) { game.map.move(a, -dx / d * k.speed * dt, -dy / d * k.speed * dt); a.face = Math.sign(-dx) || a.face; a.moving = true; }
      else { a.moving = false; if (!a.heart) a.heart = cfg.pet.heart; }
      continue;
    }
    if ((a.wait -= dt) > 0) { a.moving = false; continue; }
    if (!a.to) a.to = freeSpot(game, a, 3);
    const tx = a.to.x - a.x, ty = a.to.y - a.y, td = Math.hypot(tx, ty);
    if (td < 1.5) { a.to = null; a.wait = 1 + Math.random() * 4; a.moving = false; continue; }
    const s = Math.min(td, k.speed * dt), ox = a.x, oy = a.y;
    game.map.move(a, tx / td * s, ty / td * s); a.face = Math.sign(tx) || a.face; a.moving = true;
    if (a.x === ox && a.y === oy) { a.to = null; a.wait = 0.5; }   // vướng thì đổi chỗ khác
  }
}
