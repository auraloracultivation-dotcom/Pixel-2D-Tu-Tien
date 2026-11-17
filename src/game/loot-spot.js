// Chỗ đồ rơi người chơi chạy tới được (chủ dự án 17/11/2026 12:35: "có mấy trang bị rơi ở ao, người chơi không nhặt được;
// tự thiết kế xem nên rơi chỗ nào mà người ta chạy tới được"). Quái chết trên ao, sát vách, giữa hàng cây: đồ bay vòng cung
// sang ô đất gần nhất cùng vùng đi lại với người chơi (dò từ chân người chơi qua các ô đi được). Không tìm được thì rơi cạnh chân.
// Số ở data/config.json → loot (spot_ring: dò xa bao nhiêu ô quanh chỗ quái chết; spot_bfs: trần số ô dò vùng đi lại).

let cache = null;   // { map, key, t, set } vùng đi lại của người chơi, tính lại khi đổi ô hoặc sau 2 giây

function reachable(game) {
  const m = game.map, T = m.T, p = game.player, C = game.data.config.loot || {};
  const px = Math.floor(p.x / T), py = Math.floor(p.y / T), key = px + ',' + py, now = performance.now();
  if (cache && cache.map === m && cache.key === key && now - cache.t < 2000) return cache.set;
  const set = new Set([key]), q = [[px, py]], max = C.spot_bfs || 4000;
  for (let i = 0; i < q.length && set.size < max; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (set.has(k) || m.solidTile(nx, ny)) continue;
      set.add(k); q.push([nx, ny]);
    }
  }
  cache = { map: m, key, t: now, set };
  return set;
}

// Điểm (x, y) hợp lệ để nằm: ô không chắn và người chơi đi tới được. Vùng dò chưa phủ tới (bản đồ rộng) thì chỉ cần không chắn.
export function okSpot(game, x, y) {
  const m = game.map, T = m?.T;
  if (!m || m.blocked(x, y, 3)) return false;
  const set = reachable(game), C = game.data.config.loot || {};
  return set.size >= (C.spot_bfs || 4000) || set.has(Math.floor(x / T) + ',' + Math.floor(y / T));
}

// Chỗ rơi cho một món: gần (x, y) nhất trong spot_ring ô; lệch ngẫu nhiên chút cho các món không chồng lên nhau
export function lootSpot(game, x, y) {
  const m = game.map, p = game.player;
  if (!m) return { x, y };
  const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 10, jx = x + Math.cos(a) * s, jy = y + Math.sin(a) * s;
  if (okSpot(game, jx, jy)) return { x: jx, y: jy };
  if (okSpot(game, x, y)) return { x, y };
  const T = m.T, tx = Math.floor(x / T), ty = Math.floor(y / T), R = game.data.config.loot?.spot_ring || 6;
  // ô đi được ở vòng gần nhất và vòng kế đó: chọn ngẫu nhiên một ô cho nhiều món toả ra bờ, không chồng một chỗ
  const cand = [];
  let first = 0;
  for (let d = 1; d <= R && (!first || d <= first + 1); d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
    const c = m.center(tx + dx, ty + dy);
    if (okSpot(game, c.x, c.y)) { cand.push(c); first ||= d; }
  }
  const best = cand[Math.floor(Math.random() * cand.length)];
  if (best) return { x: best.x + (Math.random() - 0.5) * T * 0.6, y: best.y + (Math.random() - 0.5) * T * 0.6 };
  return { x: p.x + (Math.random() - 0.5) * 12, y: p.y + 4 };   // quanh đó kín hết: rơi cạnh chân người chơi
}
