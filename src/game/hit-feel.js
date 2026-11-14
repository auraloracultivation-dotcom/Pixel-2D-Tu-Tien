// Cảm giác ra đòn kiểu mới (docs/10-CAI-HON.md việc 2; chủ dự án 14/11/2026 00:46: "chưa cảm thấy đang đánh"). Đo bản cũ từng khung ở cỡ điện thoại:
// lúc chạm, quầng trắng (vệt đâm dày, tia vẽ nét mượt, đèn chiêu) phủ kín con quái ~0,3 giây nên không thấy nó bị đánh. Bản mới, mỗi đòn của mình:
//   · khựng hình (thường / chí mạng / kết liễu dài dần); trong lúc khựng chỉ con quái giật lùi rồi rung tại chỗ (joltOff), loé trắng hẳn nhưng giữ viền mực
//     (src/render/sprites.js flashImage) và được vẽ đè lên vũ khí, vệt chém (src/render/draw.js) → thấy rõ nó bị nện;
//   · tia lửa chạm bằng điểm ảnh, có hướng, đặt đúng mũi kiếm (hình pfx 'trung' / 'trung-cm', tools/art/pfx/fx/trung.js), mang màu linh căn người chơi;
//     một nhát trúng nhiều con đứng chụm chỉ một tia lửa; hết khựng thì vỡ thành mảnh văng theo hướng đòn; bụi bật hai bên chân ('bui-chan');
//   · máy quay hích theo hướng đòn; số sát thương nảy to, nằm trên bảng tên; thanh máu quái hiện khúc trắng vừa mất rồi rút dần (draw-mob-bar.js);
//   · vệt chém mảnh lại, tan nhanh, bớt quầng (slashCfg); nhát kết liễu thêm tiếng nện trầm, xác chờ hết khựng mới văng và đứt đôi (draw-mob-sprite.js),
//     vụn đúng màu hình con quái (spriteTone).
// Số ở data/juice.json → hit2. Công tắc cho mọi người: hit2.on (chủ dự án xem clip rồi duyệt "Đưa lên" 14/11/2026 06:22); riêng một máy: địa chỉ ?don=1 / ?don=0, nhớ trên máy đó.
import { pxAdd, pxOn } from './pfx.js';
import { fxOk } from './fx-budget.js';

const H = game => game.data.juice?.hit2;
let ON = null, SL = null;   // một trang một game: hỏi một lần rồi nhớ
export function hit2On(game) {
  if (ON != null) return ON;
  let v = null;
  try { const q = new URLSearchParams(location.search).get('don'); if (q != null) localStorage.setItem('p2d-don', q); v = localStorage.getItem('p2d-don'); } catch { /* không có kho nhớ: theo mặc định */ }
  ON = !!H(game) && (v != null ? v === '1' : !!H(game).on) && pxOn(game);
  game.hit2 = ON;   // bộ vẽ hỏi nhanh (hạt vừa sinh lúc khựng hình chưa hiện: src/render/draw-sparks.js, draw-juice.js)
  if (ON) import('../render/vfx/pfx.js').then(m => { for (const n of ['trung', 'trung-cm', 'bui-chan']) m.pfxWarm(game.data.art, n); }).catch(() => {});   // nạp sẵn hình: nhát đầu tiên không bị hụt khung
  return ON;
}

// Đòn của mình trúng quái m theo hướng ang (radian), mất dmg máu; dead: đòn này kết liễu. Trả về số giây khựng hình.
export function hitFeel(game, m, ang, crit, dead, dmg = 0) {
  const h = H(game), ca = Math.cos(ang), sa = Math.sin(ang), big = crit || dead, k = big ? h.kick_crit : h.kick;
  const stop = dead ? h.stop_kill : crit ? h.stop_crit : h.stop;
  if (!m.duel && !m.dummy && !m.wboss) {   // quái thường (bản sao so tài, Mộc Nhân, đầu trùm thế giới có bộ vẽ riêng)
    m.jolt = { x: ca, y: sa, t: game.time, d: big ? h.jolt_crit : h.jolt, T: stop + h.jolt_t, w: dead ? stop : 0 };   // giật lùi rồi rung tại chỗ suốt lúc khựng, loé trắng hẳn, vẽ đè lên vũ khí (src/render/draw.js); w: xác chờ hết khựng mới đứt đôi
    m.bk = Math.max(m.bk || 0, Math.min(1, (Math.max(0, m.hp) + dmg) / m.maxHp)); m.bt = game.time;   // khúc máu vừa mất còn hiện trắng một nhịp rồi mới rút (src/render/draw-mob-bar.js)
  }
  game.screen.kick?.(ca * k, sa * k, h.kick_t);
  if (big) game.screen.shake(game.data.config.feel.shake * h.crit_shake, 0.14);
  if (dead && h.kill_sfx) game.sfx(h.kill_sfx[0], h.kill_sfx[1]);   // nhát kết liễu: thêm tiếng nện trầm
  // Tia lửa chạm: một nhát trúng nhiều con đứng chụm thì chỉ một ngôi sao ở chỗ đó (các con khác vẫn loé trắng, nảy lùi, có số); con nào chí mạng / chết thì sao ấy thành sao lớn
  const S = (game.h2s ??= { t: -1, p: [] }), x = m.x - ca * m.r * h.at, y = m.y - Math.min(h.up, (m.top || m.r * 2) * 0.6) - sa * m.r * h.at;   // ngang tầm lưỡi kiếm (tay người chơi cao 8 đơn vị), quái thấp thì ngang thân nó
  if (S.t !== game.time) { S.t = game.time; S.p.length = 0; }
  const q = S.p.find(o => (o.x - x) ** 2 + (o.y - y) ** 2 < h.star_gap ** 2);
  if (q) { if (big) q.f.s = 'trung-cm'; }
  else if (dead || fxOk(game, crit ? 'crit' : 'hit')) {   // đánh đông quái: tia lửa trong hạn mức (src/game/fx-budget.js); đòn kết liễu luôn hiện
    const el = game.save?.element;
    S.p.push({ x, y, f: pxAdd(game, { s: big ? 'trung-cm' : 'trung', x, y, dir: ang, snap: 1, pal: game.data.vfx.pb?.ramps?.[el] ? el : null }) });   // tia lửa mang màu linh căn của mình (chưa có linh căn: vàng)
    if (h.dust) pxAdd(game, { s: 'bui-chan', x: m.x, y: m.y + 2 });   // bụi bật ra hai bên chân, vẽ nổi trên con quái
  }
  return stop;
}

// Số sát thương của mình: hiện cao hơn bảng tên quái bao nhiêu đơn vị, và nảy to trong bao nhiêu giây đầu (src/render/draw-numbers.js)
export const numUp = game => (hit2On(game) ? H(game).num_up : 6);
export const numPop = (game, n) => (hit2On(game) && n.v != null && n.t < H(game).num_pop ? H(game).num_pop_k : 1);

// Quái vừa trúng đòn lệch khỏi chỗ đứng bao nhiêu đơn vị theo hướng đòn (0: hết): giật lùi d rồi rung tới lui jolt_hz lần mỗi giây, tắt dần trong j.T giây.
// Giờ game vẫn chạy trong lúc khựng hình nên con quái rung thật trong khi mọi thứ khác đứng yên: thấy nó bị nện chứ không phải máy đứng hình.
export function joltOff(game, j) {
  const a = j ? game.time - j.t : 1e9;
  return a < j?.T ? j.d * (0.55 + 0.45 * Math.cos(a * 2 * Math.PI * (H(game).jolt_hz || 30))) * (1 - a / j.T) : 0;
}

// Vệt chém khi bật bản mới: tan nhanh, bớt quầng (hit2.slash ghi đè lên config.slash)
export function slashCfg(game) {
  const C = game.data.config.slash;
  if (!hit2On(game)) return C;
  return (SL ||= { ...C, ...(H(game).slash || {}) });
}
