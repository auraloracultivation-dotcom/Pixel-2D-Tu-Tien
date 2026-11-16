// Hiệu ứng đòn của quái và dấu chấm than (chủ dự án 16/11/2026 15:07: "nhớ tự code thêm hiệu ứng cho quái vật", "làm thêm hiệu ứng dấu chấm than
// khi nhận ra có người lại gần và chuẩn bị công kích"). File này chỉ ghi trạng thái; vẽ ở src/render/draw-mob-fx.js (đòn, đạn, dấu chấm than) và
// src/render/draw-tele.js (khung đỏ báo đòn của boss). Kiểu đòn từng con: data/mobs.json → fx {k, c} (Bộ Quái Mới, ghi ở
// tools/art/nguon/ai/quai-moi/ds.json): cao cào, can cắn, nen nện đất, chem chém, quat quất, dam đâm, xoay gió xoáy; quái bắn xa: ten mũi tên,
// cau cầu phép, gai gai độc, cat cát, da đá nóng. Riêng boss: vong chém vòng quanh mình, no nổ vòng đạn. Số ở data/juice.json → mob2.
import { addFx } from './combat.js';

const M2 = game => game.data.juice?.mob2;

// Đòn vừa ra (mobs.js): hình theo kiểu đòn của con quái, đặt ở chỗ đòn chạm (trong tầm vồ, phía mục tiêu). o: { k: kiểu khác kiểu của con quái,
// s: cỡ (boss to hơn), r: bán kính (đòn vòng), self: 1 (đặt ngay giữa con quái), old: hiệu ứng cũ khi con quái chưa khai kiểu đòn }.
export function mobHitFx(game, m, tgt, o = {}) {
  const K = m.def.fx, C = M2(game);
  if (!K || !C) { addFx(game, o.old || { type: 'bite', x: m.x + (m.fx || 0) * m.r, y: m.y + (m.fy || 0) * m.r, life: 0.15, color: m.def.color }); return; }
  const k = o.k || K.k, a = o.self ? 0 : Math.atan2(tgt.y - m.y, tgt.x - m.x), d = o.self ? 0 : Math.min(Math.hypot(tgt.x - m.x, tgt.y - m.y), m.r + (m.def.reach || 10));
  addFx(game, { type: 'mhit', k, c: K.c, a, x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, ox: m.x, oy: m.y, d, r: o.r || d + 2, s: o.s || C.s || 1,
    h: Math.min(18, (m.top || m.r * 2) * 0.45), dir: Math.random() < 0.5 ? 1 : -1, life: C.life?.[k] ?? 0.3 });
  snd(game, C, k);
}
const snd = (game, C, k) => { const S = C.sfx?.[k]; if (S) game.sfx(S[0], S[1]); };   // tiếng đòn theo kiểu (vút, nện đất, bắn tên…), nhỏ hơn tiếng chiêu của mình

// Quái bắn xa vừa bắn (mobs.js rangedThink): loé ở chỗ đạn rời tay. Đạn mang kiểu (mk) để vẽ theo kiểu (draw-mob-fx.js drawMobShot).
export function mobShotFx(game, m, a) {
  const K = m.def.fx, C = M2(game);
  if (!K || !C) return;
  addFx(game, { type: 'mhit', k: 'loe', c: K.c, a, x: m.x + Math.cos(a) * (m.r + 2), y: m.y + Math.sin(a) * (m.r + 2), s: 1, h: Math.min(18, (m.top || m.r * 2) * 0.45), life: C.life?.loe ?? 0.18 });
  snd(game, C, K.k);
}

// Quái vừa nhận ra mình (mobs.js updateMobs, sau khi tính aggro): dấu chấm than bật trên đầu, quay mặt về phía mình, kêu "tính" một tiếng.
// Quái thường: lúc nó quyết đánh mình (quái thế giới chỉ đánh khi mình vào tầm, mob-power.js aggroCheck; bị đánh thì đánh trả); boss luôn
// sẵn sàng nên tính lúc mình bước vào boss_r đơn vị (hai dấu đỏ). Đã thấy mình trong cd giây gần đây thì không bật lại (khỏi nhấp nháy khi
// mình đứng ở mép tầm). Quái của đội trưởng, Mộc Nhân, đầu boss thế giới, bản sao so tài: không có.
export function noticeTick(game, m, p, d) {
  const N = M2(game)?.notice;
  if (!N || !p || m.remote || m.dummy || m.wboss || m.def.ai === 'duel') return;
  const boss = m.def.ai === 'boss', on = !!m.aggro && d < (boss ? N.boss_r : N.r), now = m.ak || 0;
  if (on && !m.saw && now - (m.sawT ?? -1e9) > (boss ? N.boss_cd : N.cd)) {
    m.alert = now;
    if (Math.abs(p.x - m.x) > 2) m.fx = Math.sign(p.x - m.x);   // quay mặt về phía người vừa thấy (draw-mob-sprite.js lấy hướng từ fx)
    if (!game.ghost) game.sfx(boss ? N.sfx_boss : N.sfx);
  }
  if (on) m.sawT = now;
  m.saw = on;
}
