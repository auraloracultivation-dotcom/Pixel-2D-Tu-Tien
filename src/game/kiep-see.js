// Người khác thấy mình độ kiếp, lên tầng, tụ linh (chủ dự án 20/11/2026 17:12: "lúc người ta đột phá lại không xem được… người chơi
// mặc gì, trạng thái gì thì mọi người đều thấy"). Trước đây chỉ nghi lễ kết đan (ket-dan.js, Trúc Cơ trở lên) báo cả tinh cầu; kiếp
// Luyện Khí → Trúc Cơ, cột sáng lên tầng, nhịp tụ linh trước pháp bảo chỉ máy mình thấy.
// Đi đường tin chiêu sẵn có (máy chủ phòng cloud/src/proto.js cleanCast: k chữ, x y toạ độ, fx fy số -1…1), không đổi máy chủ phòng:
//   ks-bd  kiếp bắt đầu                ks-w   một đợt sét: fx = số tia / 20, fy = hạt / 100 (máy người xem rải tia theo hạt quanh họ)
//   ks-ok  chịu đủ sét: tụ linh rồi bùm  ks-hong gục giữa kiếp
//   ks-up  vừa lên tầng (fx 0) hoặc vừa lên cảnh giới (fx 1)          ks-tl  tụ linh trước pháp bảo: fx = thứ tự loại pháp bảo / 20
// Máy người xem chỉ vẽ và kêu: sét không trúng ai (strikes.js see), bùm không đẩy quái. Tin là dữ liệu lạ: người gửi phải đang thấy
// trên tinh cầu, toạ độ lệch xa chỗ đang thấy thì bỏ, mỗi loại tin có nhịp tối thiểu (kẻo gửi dồn làm rung màn người khác mãi).
import { addStrike } from './strikes.js';
import { tribBolt } from './trib-sky.js';
import { celeSeeStart } from './trib-cele.js';
import { juiceUp } from './juice.js';
import { tuLinhSee } from './tu-linh.js';

const GAP = { 'ks-bd': 20, 'ks-w': 0.6, 'ks-ok': 20, 'ks-hong': 1, 'ks-up': 1, 'ks-tl': 0.15 };
const SKY = game => game.data.config.trib_fx?.sky || {};

// Máy mình báo cho người cùng tinh cầu (src/net/online-cf.js cast)
export function kiepSend(game, k, fx = 0, fy = 0) {
  const p = game.player;
  if (!p || !game.online?.cast) return;
  game.online.cast({ k, x: Math.round(p.x), y: Math.round(p.y), fx: +Math.max(-1, Math.min(1, fx)).toFixed(2), fy: +Math.max(-1, Math.min(1, fy)).toFixed(2) });
}

// Một đợt sét của mình: n tia, hạt để máy người xem rải tia giống nhịp mình
export const kiepWave = (game, n) => kiepSend(game, 'ks-w', Math.min(20, n) / 20, Math.floor(Math.random() * 100) / 100);

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
  if (k === 'ks-bd') { o.kiepT = now + (T.waves || 9) * (T.interval || 1.5) + 6; game.sfx?.('roar', 0.6); }
  else if (k === 'ks-w') {
    o.kiepT = Math.max(o.kiepT || 0, now + (T.interval || 1.5) * 3);   // lỡ tin bắt đầu (mới vào tinh cầu) vẫn thấy trời giáng sét
    const r = rng(Math.round(fy * 100) + 7), n = Math.max(1, Math.min(8, Math.round(fx * 20)));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = i ? 18 + r() * 40 : 0;
      addStrike(game, { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, r: T.r || 15, delay: T.delay || 1.05, trib: true, pal: pal(game, o, r), dmg: 0, kind: 'thunder', see: true, who: o, follow: i ? null : o });
    }
  } else if (k === 'ks-ok') { o.kiepT = 0; game.strikes = game.strikes.filter(s => s.who !== o); celeSeeStart(game, o, auraCol(game, o)); }
  else if (k === 'ks-hong') { o.kiepT = 0; game.strikes = game.strikes.filter(s => s.who !== o); }
  else if (k === 'ks-up') { juiceUp(game, fx > 0.5, auraCol(game, o), o); game.sfx?.(fx > 0.5 ? 'breakthrough' : 'layer_up', 0.6); }
  else if (k === 'ks-tl') { const ty = Object.values(game.data['phap-bao'].types)[Math.round(fx * 20)]; tuLinhSee(game, o, ty?.color || '#bff4ff'); }
  return true;
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
