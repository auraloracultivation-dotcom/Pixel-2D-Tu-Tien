// Chống kẹt khi Tự đánh (auto.js) và Tự hành (pilot.js). Báo lỗi #102, #117 (chủ dự án 04/11/2026): treo máy ở Thiên Kiếm Tinh,
// Hậu Thổ Tinh hay đứng rung một chỗ vì nhà, cây, đồ hội, cột đá chắn ngay hướng đi. Số ở data/config.json → unstuck.
// Cách làm: đang có hướng đi mà sec giây không nhích quá move đơn vị thì coi là kẹt, gọi onStuck (bên gọi tự bỏ mục tiêu / tìm lại đường)
// rồi bước ngang (vuông góc hướng đang đi) side giây cho thoát góc; lần kẹt sau bước sang phía kia.

// r: { ax, atk } bên gọi định trả về. Trả về r, hoặc hướng bước ngang nếu đang thoát kẹt.
export function unstuck(game, r, dt, onStuck) {
  const p = game.player, cfg = game.data.config.unstuck, u = game.unstuck ??= { x: p.x, y: p.y, t: 0, side: 0, dir: null, flip: 1 };
  if (u.side > 0) { u.side -= dt; return { ax: u.dir, atk: false }; }   // đang bước ngang
  const go = Math.hypot(r.ax.x, r.ax.y) > 0.1;
  if (!go || Math.hypot(p.x - u.x, p.y - u.y) > cfg.move) { u.x = p.x; u.y = p.y; u.t = 0; return r; }   // đứng yên có chủ ý, hoặc vẫn đi được
  if ((u.t += dt) < cfg.sec) return r;
  u.t = 0; onStuck?.();
  u.dir = sideDir(game, r.ax, u.flip); u.flip = -u.flip; u.side = cfg.side;
  return { ax: u.dir, atk: false };
}

// Hướng vuông góc với hướng đi; ưu tiên phía còn trống trước mặt một ô
function sideDir(game, ax, flip) {
  const p = game.player, T = game.map.T, d = Math.hypot(ax.x, ax.y) || 1;
  const a = { x: -ax.y / d * flip, y: ax.x / d * flip }, b = { x: -a.x, y: -a.y };
  return game.map.blocked(p.x + a.x * T, p.y + a.y * T, p.r) && !game.map.blocked(p.x + b.x * T, p.y + b.y * T, p.r) ? b : a;
}
