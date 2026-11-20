// Người chơi khác trên cùng đảo (net/online.js). Đi mượt bằng vận tốc: mỗi gói tin mới thì tính tốc độ để tới chỗ mới đúng lúc
// gói kế tiếp tới (giới hạn speed), nên thấy bước đi đều chứ không giật cục; xa quá hop (ngự kiếm bay, qua cổng) thì hiện vòng
// sáng ở chỗ cũ và chỗ mới rồi đặt thẳng. Vẽ bằng hình nhân vật theo hình dáng, thời trang người đó báo qua presence
// (render/draw-nguoi.js, cùng một hàm với nhân vật của mình), vung đòn thì chạy động tác đánh của nhân vật. Chủ dự án báo 29/10/2026: trước đây chỉ thấy cái bóng
// vẽ bằng khối, nhảy từ chỗ này sang chỗ khác như hack tốc độ.
// Realtime 05/11/2026 (data/config.json → realtime): tin từ máy người khác lọc ở game/others-net.js (tên bỏ ký tự lạ, lọc từ bậy,
// toạ độ kẹp trong bản đồ, mã hình dáng / hệ phải có trong data/); chỉ vẽ shown[mức nhẹ máy] người gần nhất; khoảng gửi vị trí
// của mình giãn theo số người cùng kênh, không ai gần thì gửi thưa, một mình thì không gửi (sendGap).
import { addFx } from './combat.js';
import { cleanText } from './social.js';
import { cleanPresence, cleanMove, sendGap, nearestN } from './others-net.js';
import { chuKy, apHoSo, bangHoSo } from './ho-so-phong.js';   // một nguồn cho hồ sơ gửi / nhận (data/dong-bo.json)
import { stepTheo } from './others-theo.js';
import { pvpSafe } from './pvp.js';   // vòng pháp trận an toàn: trong đó không ai đánh được ai
import { drawKiemKhi } from '../render/draw-kiem-khi.js';
// Người khác chém thường: lưỡi kiếm khí bay ra theo hướng nhìn như của mình (player.js strike, data/config.json → kiem_khi)
function kiemKhiOf(game, o) {
  const KK = game.data.config.kiem_khi;
  if (!KK?.on || o.x === null || o.riding) return;
  addFx(game, { draw: drawKiemKhi, x: o.x, y: o.y - 8, ang: Math.atan2(o.face?.y || 0, o.face?.x || 1), from: 20 * KK.from, len: KK.len, r: KK.r, half: KK.half, life: KK.life, color: (o.element && game.data.elements[o.element]?.color) || '#9ad8ff' });
}
import { chargeHold } from './skill-charge.js';
import { kiepTick } from './kiep-see.js';   // người đang độ kiếp: trời quanh họ mưa sét
import { nhanHieuUng } from './others-nhan.js';   // một cửa nhận tin chiêu, pháp bảo, kiếp, kết đan, nhặt nguyên liệu, hiệu ứng viết một lần
import { celeSeeTick } from './trib-cele.js';

const MIN_SPEED = 30;

const perfLevel = () => +(document.body?.dataset?.perf || 0) || 0;

export function createOthers(game) {
  const list = new Map();
  const R = () => game.data.config.realtime || {};
  let chk = 1, sig = null, shown = [], pick = 0, sendNow = false;   // sig: chữ ký hồ sơ đã báo cho phòng (null: chưa báo lần nào)

  // Bài thử hai máy (tools/hai-may.mjs đặt game.thuDoc = new Set()): ghi lại trường nào của người khác được mã phía người xem ĐỌC tới,
  // để bắt trường khai trong data/dong-bo.json, gửi đi đàng hoàng mà không nơi nào vẽ / dùng. Người chơi thật: không bọc gì.
  const soi = o => (game.thuDoc ? new Proxy(o, { get(t, k, r) { if (typeof k === 'string') game.thuDoc?.add(k); return Reflect.get(t, k, r); } }) : o);
  function puff(o, x, y) {
    const col = o.element ? game.data.elements[o.element]?.color : null;
    addFx(game, { type: 'ring', x, y, r: 14, color: col || '#bff4ff', life: 0.45 });
  }
  // Chưa có toạ độ của người đó (họ đứng yên từ lúc mình vào): lấy toạ độ ghi trong tin chiêu / kiếp, kẻo bỏ mất tin (20/11/2026 17:12)
  function placeFrom(o, raw) {
    if (!o || o.x !== null) return;
    const p = cleanMove({ id: o.id, x: raw?.x, y: raw?.y, fx: 0, fy: 0 }, bounds());
    if (p) { o.x = o.tx = p.x; o.y = o.ty = p.y; refresh(); }
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
      const seen = new Set(), bang = bangHoSo(game);
      for (const raw of entries.slice(0, R().max_list || 120)) {
        const e = cleanPresence(raw, bang, game.data, R().name_max);   // dữ liệu lạ: lọc theo bảng data/dong-bo.json và data/ (others-net.js)
        if (!e) continue;
        seen.add(e.id);
        if (!list.has(e.id)) sendNow = true;   // người mới vào: gửi vị trí mình ngay để họ thấy cả người đang đứng yên
        const o = list.get(e.id) || soi({ id: e.id, x: null, y: null, tx: 0, ty: 0, spd: 0, face: { x: 0, y: 1 }, walkT: 0, moving: false, r: 5, atkN: 0 });
        o.def = { name: cleanText(game, e.name) };
        apHoSo(game, o, e);   // mọi trường trong bảng (hệ, hình dáng, thời trang, thú cưỡi, pháp tượng, vũ khí, kẻ đi theo, trạng thái…)
        o.riding = !!(o.mount && game.data.pets.mounts[o.mount]); o.flying = o.st === 'bay'; o.meditating = o.st === 'toa';   // trạng thái theo hồ sơ họ báo (vẽ: render/draw-nguoi.js)
        list.set(e.id, o);
      }
      for (const id of [...list.keys()]) if (!seen.has(id)) list.delete(id);
      refresh();
    },
    // Tin "vừa xảy ra" của người khác (chiêu, đòn pháp bảo, kiếp, kết đan, lên tầng, nhặt nguyên liệu…): chia theo nhóm ở others-nhan.js.
    // Chỉ vẽ hiệu ứng ở chỗ họ; người chưa có toạ độ thì lấy chỗ ghi trong tin (placeFrom).
    cast(raw) { const o = list.get(raw?.id); placeFrom(o, raw); nhanHieuUng(game, o, raw, bounds()); },
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
      if (p.sw) { o.swingT = 0.18; o.swingNew = true; kiemKhiOf(game, o); }   // vung đòn: lúc vẽ chọn động tác đánh kế tiếp của nhân vật (render/draw.js)
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
        o.flyT = o.flying ? (o.flyT || 0) + dt : 0;   // vừa cất cánh: nhấc dần khỏi đất như máy họ (draw-fly.js)
        stepTheo(game, o, dt);   // linh thú, khôi lỗi của họ đi theo (others-theo.js)
        if (o.charge) chargeHold(game, o, dt);   // đang tụ lực Phá Thiên (skill-charge.js): tới giờ thì vệt chém hiện ra (chỉ hình)
        kiepTick(game, o, dt);   // đang độ kiếp: trời quanh họ mưa sét (kiep-see.js)
      }
      celeSeeTick(game, dt);
      if ((pick -= dt) <= 0) { pick = 0.25; refresh(); }   // chọn lại người gần nhất 4 lần mỗi giây
      if ((chk -= dt) <= 0 && game.save && game.online?.setProfile) {   // đổi thời trang, hình dáng, lên cảnh giới: báo lại cho người cùng đảo
        chk = 1;   // lên / xuống thú cưỡi cũng báo lại (máy chủ phòng Cloudflare: tin rẻ)
        const s = chuKy(game, game.hoSo);   // game.hoSo: hồ sơ của mình, làm mới mỗi khung ở nhip-mang.js
        if (sig !== null && s !== sig) { game.online.setProfile(game.hoSo); sig = s; }
      }
    },
    // Người được vẽ (tối đa shown theo mức nhẹ máy, gần nhất trước)
    // Hồ sơ gửi lúc vào tinh cầu lần đầu (game.js joinOnline) là mốc so sánh: từ đó đổi gì là báo lại trong 1 giây. Các lần vào sau giữ
    // mốc cũ (lệch thì chỉ báo thừa một lần). Trước 20/11/2026 mốc chỉ ghi ở lần soát đầu, 3 giây sau khi vào game: đổi gì trong 3 giây đó
    // (vừa vào đã cưỡi thú chẳng hạn) là không bao giờ được báo.
    daBao(h) { sig ??= chuKy(game, h); },
    visible() { return shown; },
    count() { return list.size; },
    // Khoảng gửi vị trí của mình lúc này (mili giây; 0 = gửi ngay; Infinity = không gửi)
    sendGap() {
      if (sendNow && list.size) { sendNow = false; return 0; }
      const p = game.player, T = game.data.config.tile || 16;
      let near = Infinity, pk = Infinity;   // pk: người đang tắt khiên gần nhất
      if (p) for (const o of list.values()) if (o.x !== null) { const d = Math.hypot(o.x - p.x, o.y - p.y); near = Math.min(near, d); if (o.pk) pk = Math.min(pk, d); }
      let g = sendGap(R(), list.size, near === Infinity && list.size ? 0 : near, T);
      // Đang tắt khiên và có người tắt khiên trong pvp_tiles ô: gửi vị trí pvp_ms một lần. Máy chủ phòng là trọng tài PvP, nó kiểm tầm đánh
      // theo vị trí nó đang giữ (cloud/src/pvp.js); gửi thưa như lúc đi dạo (2 giây khi đông, 15 giây khi không ai sát bên) thì nó bỏ oan
      // khoảng một phần ba số đòn hợp lệ trong trận 10 vs 10 (đo 20/11/2026, tools/cloud/tai-chien.mjs: 65% → 98% đòn được tính).
      // Đứng trong vòng pháp trận an toàn thì không đánh, không bị đánh: giữ nhịp thưa (chỗ đó đông người tắt khiên đứng chờ).
      if (game.pvp?.off && R().pvp_ms > 0 && pk <= (R().pvp_tiles || 40) * T && !pvpSafe(game, p.x, p.y)) g = Math.min(g, R().pvp_ms);
      // Đứng gần đầu Thôn Thiên Mãng: máy chủ phòng cần vị trí để tính Linh Thạch chém boss (cloud/src/phong.js nearHead), nên kể cả
      // một mình trên tinh cầu cũng gửi, tối đa boss_ms một lần (06/11/2026: trước đây một mình thì không gửi → không được thưởng)
      const h = game.mang?.m, bm = R().boss_ms || 3000;
      return h && p && game.mobs.includes(h) && Math.hypot(h.x - p.x, h.y - p.y) < 26 * T ? Math.min(g, bm) : g;
    },
  };
}
