// Quái chung (chủ dự án 21/11/2026 02:02–02:07: "người này farm thì người kia cũng thấy và có thể tranh nhau farm", công "chia theo
// sát thương"). Phòng bản đồ làm trọng tài cho quái của các bãi chung: giữ MÁU, lúc CHẾT, giờ HỒI SINH, con nào là dị chủng, AI ĐƯỢC CÔNG.
// Phòng KHÔNG chạy AI quái: máy của người đang bị con quái đuổi chạy AI con đó và báo vị trí (tin 'q' → m), phòng chỉ ghi ai đang giữ
// con nào rồi phát cho cả tuyến; quá own_ms không có tin thì con quái tự do, ai bị nó nhắm kế tiếp thì giữ.
// Bảng bãi (số con, giờ hồi, máu, chỗ) là bản sao sinh tự động ./quai-cfg.js (tools/quai-chung.mjs); máy khách: src/game/quai-chung.js.
// Tinh cầu tông môn: bảng dựng từ dòng tinh cầu trên Supabase (./quai-kh.js, cùng mã dựng bãi với máy khách ./kh-bai.js).
//
// Tin máy khách gửi lên: { t: 'q', n: số thứ tự, x, y, m: [[ô, x, y, đang ra đòn]], h: [[ô, sát thương]] }   (x, y: chỗ người gửi đứng)
// Tin phòng phát xuống:
//   trong tin chào 'w':  q: { v: chữ ký bảng, d: [[ô, máu | −ms còn tới lúc hồi, dị chủng, hạt chỗ mọc]] }  (chỉ ô khác mặc định)
//   trong gói lô 'b':    q: [[mã người giữ, [ô, x, y, đang ra đòn], …]],  qh: [[ô, máu]]
//   riêng người gửi:     { t: 'qa', n, h: [[ô, máu]] hoặc [[ô, −ms, dị chủng, hạt]] nếu ô đó đã chết }   (đáp mỗi tin có đòn; n = số thứ tự tin đó)
//   cả phòng:            { t: 'qk', s: ô, r: ms tới lúc hồi, ra: con kế là dị chủng, sd: hạt chỗ mọc con kế, c: [[mã người, phần công 0…1]] }
//
// Mọi thứ nằm trong bộ nhớ phòng: phòng ngủ (không ai gửi gì chừng 10 giây) là quên, coi như mọi con sống lại đầy máu. Máy khách tự khớp:
// ô nó tưởng đã chết mà phòng báo máu thì nó cho mọc lại, ô nó tưởng còn sống mà phòng đáp đã chết thì nó dọn.
// Chống gian lận ở mức phòng làm được: sát thương mỗi người kẹp theo lực chiến (thùng dps_k × lực chiến mỗi giây, dồn bud_s giây, như
// boss thế giới ở mang.js), không vượt máu còn lại, phải đứng trong tầm tam của con quái. Linh khí, Linh Thạch, đồ rơi vẫn do Supabase
// kẹp như cũ (hạn mức theo giờ online), phòng chỉ quyết AI được tính công.
import { QUAI } from './quai-cfg.js';

const O = 64, TIN_MAX = 24, CONG_MAX = 12, HOI_MIN = 500;
const so = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const gon = v => Math.round(v * 10) / 10;

// Sổ quái chung mới cho một bảng bãi (null: không có quái chung)
export const soMoi = B => (B ? { B, bai: new Map(B.s.map(r => [r[0], r])), o: new Map(), bud: new Map(), mv: new Map(), hp: new Map() } : null);

// Sổ quái chung của phòng (null: bản đồ này không có quái chung). Tinh cầu tông môn không có bảng sẵn: quai-kh.js đọc dòng tinh cầu
// trên Supabase rồi đặt room.q trước khi gọi tới đây
export function quaiOf(room, map) {
  if (room.q === undefined) room.q = soMoi(QUAI.maps[map]);
  return room.q;
}

// Một ô (tạo khi đụng tới lần đầu: sống, đầy máu). Tới giờ thì hồi sinh tại đây, không cần hẹn giờ: máy khách tự cho mọc theo số ms đã báo.
function oCua(Q, slot, now) {
  if (!Number.isInteger(slot) || slot < 0) return null;
  const b = Q.bai.get(Math.floor(slot / O));
  if (!b || slot % O >= b[1]) return null;
  let s = Q.o.get(slot);
  if (!s) { s = { hp: b[3], max: b[3], ra: 0, sd: 0, het: 0, nra: 0, nsd: 0, own: null, at: 0, x: b[4], y: b[5], cong: new Map() }; Q.o.set(slot, s); }
  if (s.het && now >= s.het) {
    s.ra = s.nra; s.sd = s.nsd; s.max = b[3] * (s.ra ? QUAI.hiem[1] : 1); s.hp = s.max;
    s.het = 0; s.own = null; s.x = b[4]; s.y = b[5]; s.cong.clear();
  }
  return s;
}
const daChet = (slot, s, now) => [slot, -Math.max(1, Math.round(s.het - now)), s.nra, s.nsd];

// Trạng thái gửi kèm tin chào: chỉ các ô khác mặc định (đã chết, mất máu, dị chủng, mọc ở chỗ khác chỗ đầu)
export function quaiChao(room, map, now) {
  const Q = quaiOf(room, map);
  if (!Q) return undefined;
  const d = [];
  for (const slot of Q.o.keys()) {
    const s = oCua(Q, slot, now);
    if (s.het) d.push(daChet(slot, s, now));
    else if (s.hp < s.max || s.ra || s.sd) d.push([slot, gon(s.hp), s.ra, s.sd]);
  }
  return { v: Q.B.v, d };
}

function chet(room, Q, slot, s, now) {
  const b = Q.bai.get(Math.floor(slot / O)), rnd = room.qRnd || Math.random;
  const tong = [...s.cong.values()].reduce((a, n) => a + n, 0) || 1;
  const c = [...s.cong].sort((a, z) => z[1] - a[1]).slice(0, CONG_MAX).map(([id, n]) => [id, +(n / tong).toFixed(3)]);
  // tuyến càng đông quái hồi càng nhanh (dong: [ref, max]): kẻo 40 người tranh một bãi 5 con
  const dong = Math.min(QUAI.dong[1], Math.max(1, room.ctx.getWebSockets().length / QUAI.dong[0]));
  const r = Math.max(HOI_MIN, Math.round(b[2] / dong));
  s.hp = 0; s.het = now + r; s.own = null; s.cong.clear();
  s.nra = b[6] && rnd() < QUAI.hiem[0] ? 1 : 0; s.nsd = 1 + Math.floor(rnd() * 999);
  Q.hp.delete(slot);
  for (const m of Q.mv.values()) m.delete(slot);
  room.all({ t: 'qk', s: slot, r, ra: s.nra, sd: s.nsd, c });
}

// Tin 'q' của một người (phong.js đã ghi chỗ đứng kèm trong tin vào room.pos)
export function quaiTin(room, ws, a, msg, now) {
  const Q = quaiOf(room, a.map);
  if (!Q) return;
  // 1) quái mình đang giữ: vị trí, đang ra đòn hay không
  if (Array.isArray(msg.m)) for (const e of msg.m.slice(0, TIN_MAX)) {
    const slot = e?.[0], s = oCua(Q, slot, now), x = so(e?.[1]), y = so(e?.[2]);
    if (!s || s.het || x === null || y === null || x < -1 || y < -1 || x > 1e5 || y > 1e5) continue;
    if (s.own && s.own !== a.id && now - s.at < QUAI.own_ms) continue;   // người khác đang giữ
    s.own = a.id; s.at = now; s.x = Math.round(x); s.y = Math.round(y);
    let mv = Q.mv.get(a.id);
    if (!mv) Q.mv.set(a.id, mv = new Map());
    mv.set(slot, [slot, s.x, s.y, e[3] ? 1 : 0]);
  }
  // 2) đòn đánh
  const me = room.pos.get(a.id), tra = [];
  if (Array.isArray(msg.h) && me) {
    const K = Math.max(1000, a.pw || 0) * QUAI.dps_k;
    let bu = Q.bud.get(a.id);
    if (!bu) Q.bud.set(a.id, bu = { b: K * 2, at: now });
    bu.b = Math.min(K * QUAI.bud_s, bu.b + K * Math.max(0, now - bu.at) / 1000); bu.at = now;
    for (const e of msg.h.slice(0, TIN_MAX)) {
      const slot = e?.[0], s = oCua(Q, slot, now);
      if (!s) continue;
      if (s.het) { tra.push(daChet(slot, s, now)); continue; }   // máy khách còn tưởng nó sống: bảo nó dọn
      if (s.own && now - s.at >= QUAI.own_ms) { const b = Q.bai.get(Math.floor(slot / O)); s.own = null; s.x = b[4]; s.y = b[5]; }   // hết người giữ: coi như về bãi
      let n = so(e?.[1]);
      n = n > 0 && Math.hypot(me[0] - s.x, me[1] - s.y) <= QUAI.tam ? Math.min(n, bu.b, s.hp) : 0;
      if (n > 0) { bu.b -= n; s.hp -= n; s.cong.set(a.id, (s.cong.get(a.id) || 0) + n); }
      if (s.hp <= 0) { chet(room, Q, slot, s, now); continue; }   // tin 'qk' tới cả phòng, kể cả người đánh
      tra.push([slot, gon(s.hp)]);
      if (n > 0) Q.hp.set(slot, gon(s.hp));
    }
  }
  // Đáp mọi tin có đòn, kèm số thứ tự n của tin đó: máy khách biết đòn tới n đã được xét (tin bị luật tốc độ bỏ thì không có lời đáp,
  // lời đáp của tin sau xoá luôn phần chờ của nó)
  if (Array.isArray(msg.h) && msg.h.length) { try { ws.send(JSON.stringify({ t: 'qa', n: so(msg.n) ?? 0, h: tra })); } catch { /* đã đóng */ } }
  if (Q.mv.size || Q.hp.size) room.later();
}

// Phần quái chung của gói lô 200 ms (proto.js makeBatch); null khi không có gì mới
export function quaiLo(room) {
  const Q = room.q;
  if (!Q || (!Q.mv.size && !Q.hp.size)) return null;
  const q = [...Q.mv].filter(([, m]) => m.size).map(([id, m]) => [id, ...m.values()]), h = [...Q.hp];
  Q.mv = new Map(); Q.hp = new Map();
  return { q, h };
}

// Người rời phòng: quên thùng sát thương và tin vị trí đang chờ của họ (con quái họ giữ tự do sau own_ms)
export function quaiRoi(room, id) {
  room.q?.bud.delete(id);
  room.q?.mv.delete(id);
}
