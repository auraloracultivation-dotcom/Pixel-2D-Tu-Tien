// Người chơi khác trên cùng đảo: nhận vị trí qua mạng, đi mượt tới vị trí mới.
export function createOthers(game) {
  const list = new Map();

  return {
    list,
    clear() { list.clear(); },
    presence(entries) {
      const seen = new Set();
      for (const e of entries) {
        seen.add(e.id);
        const o = list.get(e.id) || { id: e.id, x: null, y: null, tx: 0, ty: 0, face: { x: 0, y: 1 }, walkT: 0, moving: false, r: 5 };
        o.def = { name: e.name || 'Đạo hữu' };
        o.element = e.element; o.realm = e.realm;
        list.set(e.id, o);
      }
      for (const id of [...list.keys()]) if (!seen.has(id)) list.delete(id);
    },
    move(p) {
      const o = list.get(p.id);
      if (!o) return;
      if (o.x === null) { o.x = p.x; o.y = p.y; }
      o.tx = p.x; o.ty = p.y; o.face = { x: p.fx || 0, y: p.fy || 1 };
      if (p.sw) o.swingT = 0.18;
    },
    update(dt) {
      for (const o of list.values()) {
        if (o.x === null) continue;
        const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy);
        if (d > 80) { o.x = o.tx; o.y = o.ty; }
        else { const k = Math.min(1, dt * 10); o.x += dx * k; o.y += dy * k; }
        o.moving = d > 1.5;
        if (o.moving) o.walkT += dt;
        if (o.swingT > 0) o.swingT -= dt;
      }
    },
    visible() { return [...list.values()].filter(o => o.x !== null); },
  };
}
