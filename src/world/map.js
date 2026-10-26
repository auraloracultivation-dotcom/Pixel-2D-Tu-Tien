// Bản đồ dạng lưới ký tự (data/maps/*.json, chú giải ở data/tiles.json): tra ô, va chạm, tìm chỗ trống.
export function buildMap(def, tiles, T) {
  const w = Math.max(...def.grid.map(r => r.length));
  const g = def.grid.map(r => r.padEnd(w, '~'));
  const map = { id: def.id, def, w, h: g.length, g, T, locked: new Set() };

  map.at = (tx, ty) => (ty < 0 || ty >= map.h || tx < 0 || tx >= w) ? '~' : g[ty][tx];
  map.type = (tx, ty) => tiles.types[map.at(tx, ty)] || tiles.types['~'];
  map.solidTile = (tx, ty) => map.type(tx, ty).solid || map.locked.has(tx + ',' + ty);
  // Đạn bay qua biển mây nhưng vỡ khi chạm tường, cây, nhà
  map.wallTile = (tx, ty) => (map.type(tx, ty).solid && !map.type(tx, ty).void) || map.locked.has(tx + ',' + ty);

  map.blocked = (x, y, r) => {
    const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T);
    const y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (map.solidTile(tx, ty)) return true;
    return false;
  };

  // Đi từng trục để trượt dọc tường
  map.move = (e, dx, dy) => {
    if (dx && !map.blocked(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && !map.blocked(e.x, e.y + dy, e.r)) e.y += dy;
  };

  map.center = (tx, ty) => ({ x: (tx + 0.5) * T, y: (ty + 0.5) * T });

  // Tìm điểm trống quanh ô (tx,ty) trong bán kính spread ô
  map.freeNear = (tx, ty, spread, r, rnd = Math.random) => {
    for (let i = 0; i < 40; i++) {
      const p = map.center(tx + Math.round((rnd() * 2 - 1) * spread), ty + Math.round((rnd() * 2 - 1) * spread));
      if (!map.blocked(p.x, p.y, r)) return p;
    }
    return map.center(tx, ty);
  };

  map.findTiles = ch => {
    const out = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < w; x++) if (g[y][x] === ch) out.push([x, y]);
    return out;
  };
  return map;
}
