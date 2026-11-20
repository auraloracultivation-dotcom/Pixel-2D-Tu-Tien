// Người khác thấy mình độ kiếp, lên tầng (chủ dự án 20/11/2026 17:12: "lúc người ta đột phá lại không xem được… người chơi
// mặc gì, trạng thái gì thì mọi người đều thấy"). Trước đây chỉ nghi lễ kết đan (ket-dan.js, Trúc Cơ trở lên) báo cả tinh cầu; kiếp
// Luyện Khí → Trúc Cơ, cột sáng lên tầng, nhịp tụ linh trước pháp bảo chỉ máy mình thấy.
// Tin gửi qua một cửa phat.js, nhận qua others-nhan.js (nhóm ks trong data/dong-bo.json → hieu_ung), không đổi máy chủ phòng:
//   ks-bd  kiếp bắt đầu                ks-w   một đợt sét: fx = số tia / 20, fy = hạt / 100 (máy người xem rải tia theo hạt quanh họ)
//   ks-ok  chịu đủ sét: tụ linh rồi bùm  ks-hong gục giữa kiếp
//   ks-up  vừa lên tầng (fx 0) hoặc vừa lên cảnh giới (fx 1)          (tụ linh trước pháp bảo: hiệu ứng viết một lần hu-tu-linh, tu-linh.js)
// Máy người xem: sét giáng cả vào mình nếu đứng gần (chủ dự án 20/11/2026 17:5x "đánh như Kết Đan": người lạ trong ket_dan.gan.r quanh người
// độ kiếp bị sét chính đánh cùng, đau gấp gan.k; trúng tia phụ cũng đau; cùng tổ đội / tông môn thì không), bùm không đẩy quái. Tin là dữ liệu lạ: người gửi phải đang thấy
// trên tinh cầu, toạ độ lệch xa chỗ đang thấy thì bỏ, mỗi loại tin có nhịp tối thiểu (kẻo gửi dồn làm rung màn người khác mãi).
import { addStrike } from './strikes.js';
import { tribBolt } from './trib-sky.js';
import { celeSeeStart } from './trib-cele.js';
import { juiceUp } from './juice.js';
import { hitPlayer, addFx } from './combat.js';
import { ban } from './ket-dan.js';
import { phat } from './phat.js';

const GAP = { 'ks-bd': 20, 'ks-w': 0.6, 'ks-ok': 20, 'ks-hong': 1, 'ks-up': 1 };
const SKY = game => game.data.config.trib_fx?.sky || {};

// Một đợt sét của mình: n tia, hạt để máy người xem rải tia giống nhịp mình (gửi qua một cửa phat.js)
export const kiepWave = (game, n) => phat(game, 'ks-w', Math.min(20, n) / 20, Math.floor(Math.random() * 100) / 100);

const rng = s => () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const realmOf = o => Math.max(0, Math.min(8, +o.ri || 0));
const auraCol = (game, o) => game.data.status.auras?.[realmOf(o)]?.color || game.data.realms.tribulation.kinds?.set?.color || '#bff4ff';
function pal(game, o, r) { const P = SKY(game).pals || [], n = Math.min(P.length, realmOf(o) + 1); return n ? P[Math.floor(r() * n)] : null; }

// true: tin này là tin kiếp / lên tầng (đã xử lý hoặc bỏ); false: tin khác
export function kiepSeen(game, o, raw) {
  const k = raw?.k;
  if (typeof k !== 'string' || !Object.hasOwn(GAP, k)) return false;
  if (!o || o.x === null) return true;
  const x = +raw.x, y = +raw.y;
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - o.x, y - o.y) > 200) return true;   // lệch xa chỗ đang thấy người đó: bỏ
  const at = (o.ksAt ||= {}), now = game.time || 0;
  if (now - (at[k] ?? -99) < GAP[k]) return true;
  at[k] = now;
  const fx = Math.max(0, Math.min(1, +raw.fx || 0)), fy = Math.max(0, Math.min(1, +raw.fy || 0)), T = game.data.realms.tribulation;
  if (k === 'ks-bd') { o.ksWave = 0; o.kiepT = now + (T.waves || 9) * (T.interval || 1.5) + 6; game.sfx?.('roar', 0.6); }
  else if (k === 'ks-w') {
    o.kiepT = Math.max(o.kiepT || 0, now + (T.interval || 1.5) * 3);   // lỡ tin bắt đầu (mới vào tinh cầu) vẫn thấy trời giáng sét
    const r = rng(Math.round(fy * 100) + 7), n = Math.max(1, Math.min(8, Math.round(fx * 20))), wave = (o.ksWave = (o.ksWave || 0) + 1);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = i ? 18 + r() * 40 : 0;
      addStrike(game, { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, r: T.r || 15, delay: T.delay || 1.05, trib: true, pal: pal(game, o, r), dmg: 0, kind: 'thunder', see: true, who: o, follow: i ? null : o, hitSee: s => hitNear(game, o, s, wave) });
    }
  } else if (k === 'ks-ok') { o.kiepT = 0; game.strikes = game.strikes.filter(s => s.who !== o); celeSeeStart(game, o, auraCol(game, o)); }
  else if (k === 'ks-hong') { o.kiepT = 0; game.strikes = game.strikes.filter(s => s.who !== o); }
  else if (k === 'ks-up') { juiceUp(game, fx > 0.5, auraCol(game, o), o); game.sfx?.(fx > 0.5 ? 'breakthrough' : 'layer_up', 0.6); }
  return true;
}

// Sét của người khác giáng xuống trên máy mình: sét chính (bám họ) đánh mình nếu đứng trong gan.r quanh họ, tia phụ đánh nếu trúng chỗ mình
// đứng. Đau như sét kiếp của họ (máu tối đa của mình × dmg_pct × dmg_mul cảnh giới họ × tăng theo đợt) × gan.k; không có Thanh Tâm vì đan
// đó chỉ cho kiếp của mình. Đang tự độ kiếp, đang so tài, đang gục thì thôi.
function hitNear(game, o, s, wave) {
  const G = game.data.config.ket_dan?.gan, p = game.player, T = game.data.realms.tribulation;
  if (!G || game.ghost || game.duel || game.kd || game.trib?.active || !(p.hp > 0) || ban(game, o)) return;
  if (Math.hypot(p.x - s.x, p.y - s.y) > (s.follow ? G.r : s.r + (p.r || 5))) return;
  const by = T.by_realm[realmOf(o)] || T.by_realm[0];
  addFx(game, { type: 'ring', x: p.x, y: p.y - 12, r: 15, color: s.pal?.[1] || '#bff4ff', life: 0.3, fill: true });
  hitPlayer(game, p.maxHp * (T.dmg_pct || 0.16) * (by?.dmg_mul || 1) * (1 + wave * (T.grow || 0)) * G.k, { x: o.x, y: o.y - 80, soft: true });
}

// Mỗi khung: người đang độ kiếp thì trời quanh họ mưa sét (chỉ hình, như trib-sky.js tribSkyTick của mình, thưa hơn)
export function kiepTick(game, o, dt) {
  if (!(o.kiepT > (game.time || 0)) || o.x === null) return;
  const C = SKY(game), rate = ((C.rate || 2) + realmOf(o) * (C.rate_realm || 0.6)) * 0.6, r = Math.random;
  o.kiepAcc = (o.kiepAcc || 0) + rate * dt;
  while (o.kiepAcc >= 1) {
    o.kiepAcc -= 1;
    const a = r() * Math.PI * 2, d = (C.near || 40) + r() * (C.far || 170), x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d * 0.75;
    if (game.map?.edge?.(Math.floor(x / game.map.T), Math.floor(y / game.map.T))) continue;
    tribBolt(game, x, y, { boom: r() < 0.5, pal: pal(game, o, r), fade: C.fade || 3 });
    if (r() < (C.sound_p || 0.35) * 0.6) game.sfx?.('thunder', 0.35);
  }
}
