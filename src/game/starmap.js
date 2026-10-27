// Tinh đồ: vị trí các thiên thể của Thiên Kiếm Tinh Hệ (data/starmap.json) theo giờ thật, độ nguy hiểm, có bay tới được không.
import { demonWhy } from './demon.js';

const RAD = Math.PI / 180;
export const REF = 180; // size trong data tính theo điểm ảnh khi nửa bề rộng tinh đồ là 180

// Danh sách phẳng: mặt trời, tinh cầu, mặt trăng (có parent)
export function bodiesOf(sm, maps) {
  const out = [{ ...sm.sun, id: 'sun', sun: true }];
  for (const b of sm.bodies) {
    const p = { ...b, id: b.id || b.map, name: b.name || maps[b.map]?.name };
    out.push(p);
    for (const m of b.moons || []) out.push({ ...m, id: m.map, name: m.name || maps[m.map]?.name, parent: p });
  }
  return out;
}

export function orbitR(sm, orbit) { return sm.orbits.first + sm.orbits.step * (orbit - 1); }

// Toạ độ trên mặt phẳng tinh hệ, đơn vị = nửa bề rộng tinh đồ (chưa nghiêng); min = phút theo giờ thật
export function flatPos(sm, b, min) {
  if (b.sun) return { x: 0, y: 0 };
  if (b.parent) {
    const p = flatPos(sm, b.parent, min);
    const a = (b.angle + b.spin * min) * RAD, d = b.dist * b.parent.size / REF;
    return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
  }
  const a = (b.angle + sm.spin / Math.pow(b.orbit, sm.spin_pow) * min) * RAD, r = orbitR(sm, b.orbit);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

// Màu so cảnh giới: dễ / vừa / khó (không hiện số)
export function dangerOf(b, realm) {
  if (b.realm == null || b.kind === 'lost') return null;
  return realm > b.realm ? 'easy' : realm === b.realm ? 'fair' : 'hard';
}

// Lý do không bay tới được (null = bay được)
export function whyNot(game, b) {
  const sm = game.data.starmap, t = sm.texts, def = game.data.maps[b.map];
  if (b.sun || b.kind === 'lost') return t.lost;
  if (b.kind === 'soon' || !def) return t.soon;
  if (def.demon) return demonWhy(game);   // Phương Thiên Địa: mở theo cảnh giới, mỗi tuần một lần
  if (!game.save.visited?.[b.map]) return t.locked;
  if (!def.world) return t.moon.replace('{parent}', b.parent?.name || '');
  return null;
}

// Thiên thể của một bản đồ (mặt trăng có parent) và vòng quỹ đạo của nó (mặt trăng tính theo tinh cầu mẹ)
export function bodyOfMap(sm, id) {
  for (const b of sm.bodies) {
    if (b.map === id) return b;
    const m = (b.moons || []).find(x => x.map === id);
    if (m) return { ...m, parent: b };
  }
  return null;
}
export function orbitOf(sm, id) { const b = bodyOfMap(sm, id); return b ? b.orbit || b.parent?.orbit : null; }
