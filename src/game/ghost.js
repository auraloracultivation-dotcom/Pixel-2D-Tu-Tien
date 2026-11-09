// Gục thì hoá bong bóng linh hồn chờ hồi sinh (chủ dự án 09/11/2026 10:42: "lúc chết thì đợi hồi sinh 3 giây, trong 3 giây này hoá
// thành bong bóng linh hồn"). Người chơi đứng yên, không trúng đòn, quái vẫn chạy; hết sec giây thì bong bóng vỡ và hồi sinh như cũ
// (game.js respawn). Vẽ ở src/render/draw-ghost.js. Số ở data/config.json → ghost.
export function startGhost(game) {
  const G = game.data.config.ghost || { sec: 3 }, p = game.player;
  game.ghost = { t: 0, sec: G.sec, x: p.x, y: p.y };
  p.invT = G.sec + 2; p.kx = p.ky = 0; p.dashT = 0;
  game.sfx?.('hurt');
}

// true khi hết giờ chờ (game.js gọi respawn)
export function ghostTick(game, dt) {
  const g = game.ghost;
  if (!g) return false;
  g.t += dt;
  game.player.x = g.x; game.player.y = g.y;
  if (g.t < g.sec) return false;
  game.ghost = null;
  return true;
}
