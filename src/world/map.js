// Bản đồ dạng lưới ký tự (data/maps/*.json, chú giải ở data/tiles.json): tra ô, va chạm, tìm chỗ trống.
// Đồ lễ hội (khoá hoi, src/world/hoi-foot.js) chắn thêm ô dưới chân nhà, cột, cây; cầu mở lối qua ô vốn chắn.
import { hoiItems, hoiCells } from './hoi-foot.js';

// Tinh cầu tròn: mép đĩa vẽ thành vòng tròn điểm ảnh (src/world/draw-rim.js) thay cho bậc thang ô vuông. Bán kính lùi vào
// trong vòng ô ngoài cùng 0,71 ô nên mọi điểm ảnh trong vòng đều thuộc ô đất; ô có tâm sát mép hơn edge thì coi như vách.
export function discOf(def, T) {
  if (!def.planet) return null;
  const c = def.planet.d * T / 2, r = (def.planet.d / 2 - 1.21) * T;
  return { cx: c, cy: c, r, edge: r - 4 };
}

export function buildMap(def, tiles, T, data = null) {
  const w = Math.max(...def.grid.map(r => r.length));
  const g = def.grid.map(r => r.padEnd(w, '~'));
  const map = { id: def.id, def, w, h: g.length, g, T, locked: new Set() };
  map.hoi = data ? hoiItems(def, data, T) : [];
  const hc = hoiCells(map.hoi, T);
  const disc = discOf(def, T);
  const rimOut = (tx, ty) => disc && ((tx + 0.5) * T - disc.cx) ** 2 + ((ty + 0.5) * T - disc.cy) ** 2 > disc.edge * disc.edge;

  map.at = (tx, ty) => (ty < 0 || ty >= map.h || tx < 0 || tx >= w) ? '~' : g[ty][tx];
  map.type = (tx, ty) => tiles.types[map.at(tx, ty)] || tiles.types['~'];
  map.solidTile = (tx, ty) => { const k = tx + ',' + ty; return ((map.type(tx, ty).solid || hc.solid.has(k)) && !hc.open.has(k)) || map.locked.has(k) || rimOut(tx, ty); };
  map.edge = (tx, ty) => map.at(tx, ty) === '~' || !!rimOut(tx, ty);   // mép tinh cầu (câu cá được)
  // Đạn bay qua biển mây và dung nham nhưng vỡ khi chạm tường, cây, nhà
  map.wallTile = (tx, ty) => { const k = map.type(tx, ty), c = tx + ',' + ty; return (k.solid && !k.void && !k.low && !hc.open.has(c)) || hc.solid.has(c) || map.locked.has(c); };

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
    // Quanh đó kín cây, vách: dò dần ra xa tìm ô trống gần nhất, kẻo quái mọc giữa thân cây (chơi thử 28/10: tự hành đánh mãi
    // một con Độc đằng kẹt trong hàng cổ thụ ở Rừng Mê)
    for (let d = 1; d <= 10; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const p = map.center(tx + dx, ty + dy);
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
