// Bí cảnh: các phòng nối nhau, cửa khoá tới khi dọn sạch phòng, phòng cuối có boss.
export function createDungeon(game) {
  const map = game.map, T = map.T;
  const rooms = (map.def.rooms || []).map(r => ({ ...r, entered: false, cleared: false, mobs: [] }));
  if (!rooms.length) return null;

  // Khoá mọi cửa lúc vào
  const doors = map.findTiles('D');
  for (const [x, y] of doors) map.locked.add(x + ',' + y);

  function inside(r, p) {
    const [x, y, w, h] = r.rect;
    return p.x >= x * T && p.x <= (x + w) * T && p.y >= y * T && p.y <= (y + h) * T;
  }

  function enter(r) {
    r.entered = true;
    const [x, y, w, h] = r.rect;
    for (const spec of map.def.rooms[rooms.indexOf(r)].mobs || []) {
      for (let i = 0; i < spec.n; i++) {
        const cx = r.boss ? x + w * 0.7 : x + w / 2, cy = y + h / 2;
        const p = map.freeNear(Math.floor(cx), Math.floor(cy), r.boss ? 1 : Math.min(w, h) / 2 - 1, 6);
        const m = game.spawn(spec.mob, p.x, p.y);
        m.aggro = true; m.room = r;
        r.mobs.push(m);
      }
    }
    if (r.boss) game.toast('Huyết Nha xuất hiện!');
  }

  return {
    rooms,
    update() {
      const p = game.player;
      for (const r of rooms) {
        if (!r.entered && inside(r, p)) enter(r);
        if (r.entered && !r.cleared) {
          r.mobs = r.mobs.filter(m => !m.dead);
          const summonsLeft = r.boss && game.mobs.some(m => !m.dead);
          if (!r.mobs.length && !summonsLeft) {
            r.cleared = true;
            if (r.door_x != null) {
              for (const [x, y] of doors) if (x === r.door_x) map.locked.delete(x + ',' + y);
              game.toast('Cửa đã mở!');
            }
          }
        }
      }
    },
  };
}
