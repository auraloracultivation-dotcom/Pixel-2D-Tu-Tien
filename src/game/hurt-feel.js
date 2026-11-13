// Cảm giác BỊ ĐÁNH kiểu mới (docs/10-CAI-HON.md việc 3; chủ dự án 14/11/2026 00:46: "chưa cảm thấy đang đánh, và bị đánh, chưa thấy khó"). Bản cũ lúc trúng
// đòn chỉ có số đỏ, vài tia li ti, người chớp nhẹ, rung 1,5 đơn vị; quái đứng yên mà cắn nên không biết lúc nào sắp ăn đòn. Bản mới:
//   · quái đánh gần RA DẤU: lùi lấy đà, ba vạch báo đòn bật ra bên đầu chĩa về phía mình (hình pfx 'bao-don'), rồi chồm tới đúng lúc đòn trúng (lungeOff);
//     thấy dấu mà lùi ra khỏi tầm là né được;
//   · trúng đòn: hình khựng một nhịp, người giật lùi rồi rung, loé trắng giữ viền mực; vết đau đỏ có hướng ngay chỗ trúng (hình pfx 'dau' / 'dau-to');
//     máy quay hích theo hướng đòn; viền đỏ quanh màn (đòn nào cũng có, đòn nặng đậm hơn); số máu mất nảy to trên đầu;
//   · thanh Sinh lực góc trên rung, hiện khúc trắng vừa mất rồi rút dần (src/ui/hud-hurt.js);
//   · máu thấp: tim đập (tiếng 'tim'), viền đỏ phập phồng theo nhịp, máu càng cạn nhịp càng dồn.
// Số ở data/juice.json → hurt2. Công tắc cho mọi người: hurt2.on; riêng một máy: địa chỉ ?dau=1 / ?dau=0, nhớ trên máy đó.
import { pxAdd, pxOn } from './pfx.js';
import { fxOk } from './fx-budget.js';

const H = game => game.data.juice?.hurt2;
let ON = null;   // một trang một game: hỏi một lần rồi nhớ
export function hurt2On(game) {
  if (ON != null) return ON;
  let v = null;
  try { const q = new URLSearchParams(location.search).get('dau'); if (q != null) localStorage.setItem('p2d-dau', q); v = localStorage.getItem('p2d-dau'); } catch { /* không có kho nhớ: theo mặc định */ }
  ON = !!H(game) && (v != null ? v === '1' : !!H(game).on) && pxOn(game);
  game.hurt2 = ON;   // bộ vẽ hỏi nhanh
  if (ON) import('../render/vfx/pfx.js').then(m => { for (const n of ['dau', 'dau-to', 'bao-don']) m.pfxWarm(game.data.art, n); }).catch(() => {});   // nạp sẵn hình: đòn đầu tiên không hụt khung
  return ON;
}

// Mình vừa mất dmg máu vì đòn theo hướng ang (radian, từ kẻ đánh tới mình; null: không rõ từ đâu). Gọi từ hitPlayer (src/game/combat.js) khi công tắc bật.
export function hurtFeel(game, dmg, ang) {
  const h = H(game), p = game.player, big = dmg / p.maxHp >= h.big, stop = big ? h.stop_big : h.stop, ca = ang == null ? 0 : Math.cos(ang), sa = ang == null ? 0 : Math.sin(ang);
  p.jolt = { x: ca, y: sa, t: game.time, d: big ? h.jolt_big : h.jolt, T: stop + h.jolt_t };   // giật lùi rồi rung tại chỗ (src/render/draw-hero.js)
  if (game.time - (game.h2stop ?? -9) >= h.stop_gap) { game.h2stop = game.time; game.hitstop = Math.max(game.hitstop, stop); }
  const k = big ? h.kick_big : h.kick;
  game.screen.kick?.(ca * k, sa * k, h.kick_t);
  game.h2vig = { t: game.time, a: big ? h.vig_big : h.vig };   // viền đỏ (src/render/draw-juice.js)
  game.h2bar = { t: game.time, from: Math.min(1, (Math.max(0, p.hp) + dmg) / p.maxHp) };   // thanh Sinh lực rung + khúc trắng (src/ui/hud-hurt.js)
  if (big && h.sfx_big) game.sfx(h.sfx_big[0], h.sfx_big[1]);
  if (ang != null && fxOk(game, 'hurt')) pxAdd(game, { s: big ? 'dau-to' : 'dau', x: p.x - ca * 3, y: p.y - (p.top || 24) * 0.45 - sa * 3, dir: ang, snap: 1 });   // vết đau ngang ngực, hơi lệch về phía kẻ đánh
}

// Số máu mình mất: hiện trên đầu (không đè mặt), nảy to lúc vừa hiện (src/render/draw-numbers.js)
export const hurtUp = game => (hurt2On(game) ? H(game).num_up : 14);
export const hurtPop = (game, n) => (n.hurt && game.hurt2 ? (n.t < H(game).num_pop ? H(game).num_pop_k : 1.2) : 1);   // số máu mình mất to hơn số thường một chút, lúc vừa hiện nảy to hẳn

// Quái đánh gần lấy đà: gọi lúc nó bắt đầu lấy đà (src/game/mobs.js). Ba vạch báo đòn bật ra bên đầu, chĩa về phía người sắp bị đánh.
export function teleStart(game, m, tgt) {
  if (!hurt2On(game) || !H(game).tele.tick || m.remote || !fxOk(game, 'tele')) return;
  const a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  pxAdd(game, { s: 'bao-don', x: m.x + Math.cos(a) * (m.r + 3), y: m.y - (m.top || m.r * 2) * 0.75 + Math.sin(a) * 3, dir: a, snap: 1 });
}

// Quái đánh gần lệch khỏi chỗ đứng bao nhiêu đơn vị về phía mục tiêu (âm: lùi lấy đà): trong lúc lấy đà lùi dần `back`, lunge_t giây cuối chồm tới `lunge`
// (đúng lúc đòn trúng thì đang chồm hết cỡ, và đứng nguyên thế suốt lúc khựng hình vì đồng hồ quái cũng đứng), rồi thu về trong ret_t giây.
export function lungeOff(game, m) {
  const T = H(game)?.tele, w = m.def.windup;
  if (!game.hurt2 || !T || !w || !m.lun) return 0;
  if (m.state === 'windup') { const s = Math.max(0.01, w - T.lunge_t); return m.t < s ? -T.back * (m.t / s) ** 0.6 : -T.back + (T.back + T.lunge) * Math.min(1, (m.t - s) / (w - s)); }
  const a = m.def.cd - m.cd;   // giây (theo đồng hồ quái) kể từ lúc ra đòn
  return a >= 0 && a < T.ret_t ? T.lunge * (1 - a / T.ret_t) ** 2 : 0;
}

// Máu thấp: tim đập. Gọi mỗi khung (src/game/juice.js updateJuice). game.h2low.beat = giờ nhịp gần nhất (viền đỏ, thanh máu phập phồng theo).
export function hurtTick(game, dt) {
  if (!hurt2On(game)) return;
  const L = H(game).low, p = game.player, k = p.hp / p.maxHp, S = (game.h2low ??= { on: false, t: 0, beat: -9 });
  if (p.hp <= 0 || game.paused) { S.on = false; return; }
  if (!S.on && k < L.at) { S.on = true; S.t = 0; } else if (S.on && k > L.off) S.on = false;
  if (!S.on) return;
  S.t -= dt;
  if (S.t <= 0) { S.t = L.beat * (L.fast + (1 - L.fast) * Math.min(1, k / L.at)); S.beat = game.time; game.sfx(L.sfx, L.vol); }
}
