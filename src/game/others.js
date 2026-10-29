// Người chơi khác trên cùng đảo (net/online.js): vị trí đến ~8 lần mỗi giây. Đi mượt bằng vận tốc: mỗi gói tin mới thì tính tốc
// độ để tới chỗ mới đúng lúc gói kế tiếp tới (giới hạn MAX), nên thấy bước đi đều chứ không giật cục; xa quá HOP (ngự kiếm bay,
// qua cổng) thì hiện vòng sáng ở chỗ cũ và chỗ mới rồi đặt thẳng. Vẽ bằng hình nhân vật theo hình dáng, thời trang người đó
// báo qua presence (render/draw.js drawOther), vung đòn thì chạy động tác đánh của nhân vật. Chủ dự án báo 29/10/2026: trước
// đây chỉ thấy cái bóng vẽ bằng khối, nhảy từ chỗ này sang chỗ khác như hack tốc độ.
import { addFx } from './combat.js';
import { realmLabel } from './stats.js';

const MAX = 260, HOP = 140, MIN_SPEED = 30;

// Hồ sơ gửi kèm khi vào kênh đảo: hệ, cảnh giới, hình dáng, thời trang (người khác vẽ đúng hình mình)
export const onlineLook = game => ({ element: game.save.element, realm: realmLabel(game.save, game.data.realms), look: game.save.look, outfit: game.save.outfit || null });
const sigOf = p => `${p.element}|${p.realm}|${p.look}|${p.outfit}`;

export function createOthers(game) {
  const list = new Map();
  let chk = 3, sig = '';

  function puff(o, x, y) {
    const col = o.element ? game.data.elements[o.element]?.color : null;
    addFx(game, { type: 'ring', x, y, r: 14, color: col || '#bff4ff', life: 0.45 });
  }

  return {
    list,
    clear() { list.clear(); },
    presence(entries) {
      const seen = new Set();
      for (const e of entries) {
        seen.add(e.id);
        const o = list.get(e.id) || { id: e.id, x: null, y: null, tx: 0, ty: 0, spd: 0, face: { x: 0, y: 1 }, walkT: 0, moving: false, r: 5, atkN: 0 };
        o.def = { name: e.name || 'Đạo hữu' };
        o.element = e.element; o.realm = e.realm;
        o.look = game.data.heroes.list[e.look] ? e.look : null; o.outfit = e.outfit || null;
        list.set(e.id, o);
      }
      for (const id of [...list.keys()]) if (!seen.has(id)) list.delete(id);
    },
    move(p) {
      const o = list.get(p.id);
      if (!o) return;
      const now = performance.now();
      if (o.x === null) { o.x = p.x; o.y = p.y; }
      else if (Math.hypot(p.x - o.x, p.y - o.y) > HOP) { puff(o, o.x, o.y); o.x = p.x; o.y = p.y; puff(o, p.x, p.y); }
      const gap = Math.min(0.5, Math.max(0.1, (now - (o.at || now - 125)) / 1000));
      o.at = now; o.tx = p.x; o.ty = p.y;
      o.spd = Math.min(MAX, Math.hypot(o.tx - o.x, o.ty - o.y) / (gap * 2));   // đi sau khoảng hai nhịp gói tin: liền mạch, rớt một gói vẫn không đứng khựng
      if (Math.abs(p.fx || 0) + Math.abs(p.fy || 0) > 0.1) o.face = { x: p.fx || 0, y: p.fy || 0 };
      if (p.sw) { o.swingT = 0.18; o.swingNew = true; }   // vung đòn: lúc vẽ chọn động tác đánh kế tiếp của nhân vật (render/draw.js)
    },
    update(dt) {
      for (const o of list.values()) {
        if (o.x === null) continue;
        const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy), step = Math.max(o.spd, MIN_SPEED) * dt;
        if (d <= step) { o.x = o.tx; o.y = o.ty; } else { o.x += dx / d * step; o.y += dy / d * step; }
        o.moveT = d > 0.6 ? 0.15 : (o.moveT || 0) - dt;   // giữ dáng đi thêm một chút giữa hai gói tin cho khỏi nháy
        o.moving = o.moveT > 0;
        if (o.moving) o.walkT += dt;
        if (o.swingT > 0) o.swingT -= dt;
      }
      if ((chk -= dt) <= 0 && game.save && game.online?.setProfile) {   // đổi thời trang, hình dáng, lên cảnh giới: báo lại cho người cùng đảo
        chk = 3;
        const p = onlineLook(game), s = sigOf(p);
        if (sig && s !== sig) game.online.setProfile(p);
        sig = s;
      }
    },
    visible() { return [...list.values()].filter(o => o.x !== null); },
  };
}
