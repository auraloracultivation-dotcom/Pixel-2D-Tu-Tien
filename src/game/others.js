// Người chơi khác trên cùng đảo (net/online.js). Đi mượt bằng vận tốc: mỗi gói tin mới thì tính tốc độ để tới chỗ mới đúng lúc
// gói kế tiếp tới (giới hạn speed), nên thấy bước đi đều chứ không giật cục; xa quá hop (ngự kiếm bay, qua cổng) thì hiện vòng
// sáng ở chỗ cũ và chỗ mới rồi đặt thẳng. Vẽ bằng hình nhân vật theo hình dáng, thời trang người đó báo qua presence
// (render/draw.js drawOther), vung đòn thì chạy động tác đánh của nhân vật. Chủ dự án báo 29/10/2026: trước đây chỉ thấy cái bóng
// vẽ bằng khối, nhảy từ chỗ này sang chỗ khác như hack tốc độ.
// Realtime 05/11/2026 (data/config.json → realtime): tin từ máy người khác lọc ở game/others-net.js (tên bỏ ký tự lạ, lọc từ bậy,
// toạ độ kẹp trong bản đồ, mã hình dáng / hệ phải có trong data/); chỉ vẽ shown[mức nhẹ máy] người gần nhất; khoảng gửi vị trí
// của mình giãn theo số người cùng kênh, không ai gần thì gửi thưa, một mình thì không gửi (sendGap).
import { addFx } from './combat.js';
import { realmLabel } from './stats.js';
import { cleanText } from './social.js';
import { cleanPresence, cleanMove, sendGap, nearestN } from './others-net.js';
import { chargeHold } from './skill-charge.js';
import { castFx } from './others-cast.js';

const MIN_SPEED = 30;

// Hồ sơ gửi kèm khi vào kênh đảo: hệ, cảnh giới, hình dáng, thời trang (người khác vẽ đúng hình mình)
export const onlineLook = game => ({ element: game.save.element, realm: realmLabel(game.save, game.data.realms), look: game.save.look, outfit: game.save.outfit || null, mount: game.player?.riding ? game.save.mount || null : null });
const sigOf = p => `${p.element}|${p.realm}|${p.look}|${p.outfit}|${p.mount}`;
const perfLevel = () => +(document.body?.dataset?.perf || 0) || 0;

export function createOthers(game) {
  const list = new Map();
  const R = () => game.data.config.realtime || {};
  let chk = 3, sig = '', shown = [], pick = 0, sendNow = false;

  function puff(o, x, y) {
    const col = o.element ? game.data.elements[o.element]?.color : null;
    addFx(game, { type: 'ring', x, y, r: 14, color: col || '#bff4ff', life: 0.45 });
  }
  const bounds = () => (game.map ? { w: game.map.w * game.map.T, h: game.map.h * game.map.T } : null);
  function refresh() {
    const p = game.player, cap = (R().shown || [20])[Math.min(perfLevel(), (R().shown || [20]).length - 1)];
    shown = p ? nearestN([...list.values()], p.x, p.y, cap) : [...list.values()].filter(o => o.x !== null).slice(0, cap);
  }

  return {
    list,
    clear() { list.clear(); shown = []; },
    presence(entries) {
      const seen = new Set(), known = { elements: game.data.elements, looks: game.data.heroes.list, mounts: game.data.pets.mounts };
      for (const raw of entries.slice(0, R().max_list || 120)) {
        const e = cleanPresence(raw, known, R().name_max);
        if (!e) continue;
        seen.add(e.id);
        if (!list.has(e.id)) sendNow = true;   // người mới vào: gửi vị trí mình ngay để họ thấy cả người đang đứng yên
        const o = list.get(e.id) || { id: e.id, x: null, y: null, tx: 0, ty: 0, spd: 0, face: { x: 0, y: 1 }, walkT: 0, moving: false, r: 5, atkN: 0 };
        o.def = { name: cleanText(game, e.name) };
        o.element = e.element; o.realm = e.realm; o.look = e.look; o.outfit = e.outfit; o.mount = e.mount; o.pk = e.pk;
        list.set(e.id, o);
      }
      for (const id of [...list.keys()]) if (!seen.has(id)) list.delete(id);
      refresh();
    },
    // Chiêu người khác vừa dùng: chỉ vẽ hiệu ứng ở chỗ họ (không sát thương, không trúng ai) — game/others-cast.js
    cast(raw) { castFx(game, list.get(raw?.id), raw, bounds()); },
    move(raw) {
      const p = cleanMove(raw, bounds()), o = p && list.get(p.id);
      if (!o) return;
      const now = performance.now(), hop = R().hop || 140;
      const first = o.x === null;
      if (first) { o.x = p.x; o.y = p.y; }
      else if (Math.hypot(p.x - o.x, p.y - o.y) > hop) { puff(o, o.x, o.y); o.x = p.x; o.y = p.y; puff(o, p.x, p.y); }
      const gap = Math.min(R().gap_max || 0.5, Math.max(0.1, (now - (o.at || now - 125)) / 1000));
      o.at = now; o.tx = p.x; o.ty = p.y;
      o.spd = Math.min(R().speed || 260, Math.hypot(o.tx - o.x, o.ty - o.y) / (gap * 2));   // đi sau khoảng hai nhịp gói tin: liền mạch, rớt một gói vẫn không đứng khựng
      if (Math.abs(p.fx) + Math.abs(p.fy) > 0.1) o.face = { x: p.fx, y: p.fy };
      if (p.sw) { o.swingT = 0.18; o.swingNew = true; }   // vung đòn: lúc vẽ chọn động tác đánh kế tiếp của nhân vật (render/draw.js)
      if (first) refresh();
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
        if (o.charge) chargeHold(game, o, dt);   // đang tụ lực Phá Thiên (skill-charge.js): tới giờ thì vệt chém hiện ra (chỉ hình)
      }
      if ((pick -= dt) <= 0) { pick = 0.25; refresh(); }   // chọn lại người gần nhất 4 lần mỗi giây
      if ((chk -= dt) <= 0 && game.save && game.online?.setProfile) {   // đổi thời trang, hình dáng, lên cảnh giới: báo lại cho người cùng đảo
        chk = 1;   // lên / xuống thú cưỡi cũng báo lại (máy chủ phòng Cloudflare: tin rẻ)
        const p = onlineLook(game), s = sigOf(p);
        if (sig && s !== sig) game.online.setProfile(p);
        sig = s;
      }
    },
    // Người được vẽ (tối đa shown theo mức nhẹ máy, gần nhất trước)
    visible() { return shown; },
    count() { return list.size; },
    // Khoảng gửi vị trí của mình lúc này (mili giây; 0 = gửi ngay; Infinity = không gửi)
    sendGap() {
      if (sendNow && list.size) { sendNow = false; return 0; }
      const p = game.player;
      let near = Infinity;
      if (p) for (const o of list.values()) if (o.x !== null) near = Math.min(near, Math.hypot(o.x - p.x, o.y - p.y));
      const g = sendGap(R(), list.size, near === Infinity && list.size ? 0 : near, game.data.config.tile || 16);
      // Đứng gần đầu Thôn Thiên Mãng: máy chủ phòng cần vị trí để tính Linh Thạch chém boss (cloud/src/phong.js nearHead), nên kể cả
      // một mình trên tinh cầu cũng gửi, tối đa boss_ms một lần (06/11/2026: trước đây một mình thì không gửi → không được thưởng)
      const h = game.mang?.m, bm = R().boss_ms || 3000;
      return h && p && game.mobs.includes(h) && Math.hypot(h.x - p.x, h.y - p.y) < 26 * (game.data.config.tile || 16) ? Math.min(g, bm) : g;
    },
  };
}
