// Quái chung, phần máy khách (chủ dự án 21/11/2026 02:02–02:07: "nếu người này farm thì người kia cũng thấy và có thể tranh nhau farm",
// công "chia theo sát thương"). Bật / tắt và số ở data/config.json → quai_chung; mặc định TẮT: quái riêng từng máy như cũ.
//
// Ai làm gì:
//   - Máy chủ phòng Cloudflare (cloud/src/quai.js) giữ phần quyết định của từng con: máu, lúc chết, giờ hồi sinh, có phải dị chủng, ai được công.
//   - Máy đang bị con quái nhắm chạy AI con đó như thường (mobs.js) và báo vị trí; máy khác thấy con đó là m.remote, chỉ trượt theo vị trí
//     được báo (cùng nhánh với quái của đội trưởng tổ đội). Quá own_ms không có tin thì nó tự do, ai bị nó nhắm kế tiếp thì giữ.
//   - Đòn của mình (combat.js hitMob → qcHit) gom gui_ms một lần gửi phòng; đòn kết liễu gửi ngay. Máu hiện trên đầu quái = máu phòng báo
//     (m.srv) trừ đòn mình đã đánh mà phòng chưa đáp (m.cho), nên vừa chém là thấy máu tụt, mà số thật vẫn là số của phòng.
//   - Phòng báo hạ quái (tin 'qk') kèm phần công từng người: linh khí, Linh Thạch nhân theo phần sát thương (combat.js killMob, shop.js
//     coinDrop đọc m.cong.k); đồ, nguyên liệu, linh thú dị chủng về người góp nhiều nhất (game.js onKill đọc m.cong.top); góp dưới
//     min_cong thì không tính hạ quái (m.cong.bo), chỉ nhận linh khí theo phần.
//
// Về quái riêng (không hỏi ai): chơi không tài khoản, máy chủ phòng bản cũ hoặc khác bản data/ (chữ ký bảng lệch), rớt mạng, bản đồ
// không khai trong quai_chung.maps. Nối lại được thì phòng gửi lại trạng thái, quái chung dựng lại từ đó.
// Chưa làm ở bản đầu (ghi ở docs/03-CAU-TRUC.md): con quái chỉ đánh người đang giữ nó; làm chậm, choáng của người không giữ chưa tới
// máy người giữ; trùm và bãi mở theo cờ truyện vẫn là quái riêng.
import { bangQuai, hatRnd, QC, O } from './quai-chung-bang.js';
import { killMob } from './combat.js';
import { scaleMobBy } from './mobs.js';
import { zonePower } from './mob-power.js';
import { lamHiem } from './pets.js';

const BO_SAU = 3, TIN_MAX = 24;   // giây chờ lời đáp một tin đòn; số mục tối đa mỗi tin (như cloud/src/quai.js)
const GAP_MIN = 0.06, NHAC = 0.5, XE = 2;   // tin gửi ngay cũng cách tin trước ít nhất chừng này giây; quái mình giữ đứng yên thì nhắc lại vị trí mỗi NHAC giây (phải dưới nửa own_ms); xê dịch quá XE đơn vị mới báo

// Tin từ máy chủ phòng (src/net/online-cf.js chuyển tới): w vào phòng, x rời / rớt mạng, b gói lô, qa lời đáp đòn, qk hạ quái.
// Tin là dữ liệu từ ngoài: mã ô phải có trong bảng của mình, số phải là số; sai thì bỏ.
export function qcTin(game, m) {
  if (m?.t === 'x') return roi(game);
  if (m?.t === 'w') return vao(game, m);
  const qc = game.qc;
  if (!qc) return;
  if (m.t === 'b') {
    for (const g of Array.isArray(m.q) ? m.q : []) if (Array.isArray(g)) giu(game, qc, g);
    for (const e of Array.isArray(m.qh) ? m.qh : []) if (Array.isArray(e)) mau(game, qc, e[0], e[1]);
  } else if (m.t === 'qa') dap(game, qc, m);
  else if (m.t === 'qk') ha(game, qc, m);
}

// Vào phòng: bảng của phòng khớp bảng của mình thì quái các bãi chung do phòng lo từ đây
function vao(game, w) {
  roi(game);
  const C = QC(game.data), q = w.q;
  if (!C?.on || !q || !game.map || game.map.id !== w.map || !game.online?.quai) return;
  const B = bangQuai(game.data, game.map.id);
  if (!B || q.v !== B.v) {   // máy chủ phòng và máy mình khác bản data/: không đoán, về quái riêng
    // tinh cầu tông môn: bảng phòng có thể cũ hơn bố cục mình vừa tải (tông chủ vừa bày lại công trình): xin phòng đọc lại dòng tinh cầu
    // một lần cho mỗi bảng của mình; phòng đổi bảng thì phát 'qv' cho cả tuyến (online-cf.js chuyển thành tin vào phòng mới)
    const hoi = B && game.map.def?.kh && `${w.map}:${B.v}`;
    if (hoi && game.qcHoi !== hoi) { game.qcHoi = hoi; game.online.quai({ n: 0, qr: 1 }, game.player); }
    return;
  }
  const qc = game.qc = { B, map: w.map, me: w.me, bai: new Map(), o: new Map(), cho: new Map(), don: new Map(), gui: [], n: 0, t: 0, luc: -1 };
  const d = new Map((Array.isArray(q.d) ? q.d : []).filter(Array.isArray).map(r => [r[0], r]));
  for (const [i, n] of B.s) {
    const sp = game.spawners[i];
    if (!sp) continue;
    for (const m of sp.alive) m.dead = true;   // quái riêng kịp mọc trước lúc vào phòng: dọn lặng lẽ, thay bằng quái chung
    sp.alive = []; sp.qc = true; qc.bai.set(i, sp);
    for (let j = 0; j < n; j++) {
      const slot = i * O + j, r = d.get(slot);
      if (r && r[1] < 0) qc.cho.set(slot, { at: game.time - r[1] / 1000, ra: r[2] ? 1 : 0, sd: r[3] | 0 });
      else moc(game, qc, slot, r?.[2], r?.[3], r?.[1]);
    }
  }
  game.mobs = game.mobs.filter(m => !m.dead);
}

// Bản đồ vừa nạp lại tại chỗ (game.js loadMap cùng bản đồ: tông chủ bày lại công trình, bay tới đúng tinh cầu đang đứng): máy vẫn ở phòng
// cũ nên không có tin chào mới, mà bãi và quái chung cũ đã bị dọn cùng bản đồ. Bỏ sổ cũ, xin phòng gửi lại trạng thái (phòng đáp 'qv',
// online-cf.js chuyển thành tin vào phòng); chưa có lời đáp thì các bãi tạm là quái riêng như lúc chưa vào phòng.
export function qcNapLai(game, cu) {
  if (!cu || game.qc !== cu || cu.map !== game.map?.id) return;
  game.qc = null; game.qcHoi = null;
  game.online?.quai?.({ n: 0, qr: 1 }, game.player);
}

// Rời phòng / rớt mạng: quái chung còn sống thành quái riêng, bãi của máy mình lo tiếp (hạ thì nhận trọn như chơi một mình)
function roi(game) {
  const qc = game.qc;
  game.qc = null;
  if (!qc) return;
  for (const [i, sp] of qc.bai) {
    sp.qc = false;
    if (game.spawners[i] !== sp) continue;   // đã sang bản đồ khác: quái cũ đã bị dọn cùng bản đồ
    for (let j = 0; j < O; j++) { const m = qc.o.get(i * O + j); if (m && !m.dead) { m.qc = null; m.remote = false; m.cong = null; sp.alive.push(m); } }
  }
}

// Cho một ô mọc quái: đúng các bước của bãi thường (game.js updateSpawners), chỗ mọc theo hạt phòng phát nên máy nào cũng thấy một chỗ
function moc(game, qc, slot, ra, sd, hp) {
  const sp = qc.bai.get(Math.floor(slot / O));
  if (!sp || qc.o.has(slot) || !game.data.mobs[sp.mob]) return null;
  const p = game.map.freeNear(sp.at[0], sp.at[1], sp.spread, 7, hatRnd(slot, sd | 0));
  const m = game.spawn(sp.mob, p.x, p.y, { qc: slot, sd: sd | 0 });
  zonePower(game, m, sp);
  if (sp.mul && sp.mul !== 1) scaleMobBy(game, m, sp.mul, sp.tag);
  if (sp.farm) { m.lootMul = game.data.planets.farm.loot; m.farm = true; }
  if (ra) lamHiem(game, m);
  m.srv = hp > 0 ? Math.min(hp, m.maxHp) : m.maxHp; m.cho = 0; m.hp = m.srv;
  qc.o.set(slot, m);
  return m;
}
const hen = (game, qc, slot, ms, ra, sd) => qc.cho.set(slot, { at: game.time + Math.max(0.3, (+ms || 0) / 1000), ra: ra ? 1 : 0, sd: sd | 0 });

// Đòn của mình vào một con quái chung (combat.js hitMob gọi). true: đã ghi, máu do phòng quyết; false: không phải quái chung
export function qcHit(game, m, dmg) {
  const qc = game.qc;
  if (!qc || m.qc == null || qc.o.get(m.qc) !== m) return false;
  qc.don.set(m.qc, (qc.don.get(m.qc) || 0) + dmg);
  m.cho += dmg; m.hp = Math.max(1, m.srv - m.cho);
  // đòn kết liễu theo số mình thấy: gửi ngay, không chờ nhịp gom. Mỗi con chỉ giục một lần (m.ket), kẻo chiêu vùng đánh dồn vào con
  // đang chờ phòng báo chết thành mỗi khung một tin, đụng luật tốc độ của phòng (cloud/src/proto.js RATE)
  if (m.srv - m.cho <= 0 && !m.ket) { m.ket = true; qc.t = Math.min(qc.t, Math.max(0, GAP_MIN - (game.time - qc.luc))); }
  return true;
}

// Máu phòng báo cho một ô. Ô mình tưởng đang chết mà phòng báo còn máu (phòng vừa ngủ dậy, quên hết): cho mọc lại ngay.
function mau(game, qc, slot, hp) {
  if (!(hp > 0)) return;
  let m = qc.o.get(slot);
  if (!m) { const c = qc.cho.get(slot); if (!c) return; qc.cho.delete(slot); m = moc(game, qc, slot, c.ra, c.sd, hp); }
  if (!m || m.dead) return;
  m.srv = Math.min(hp, m.maxHp); m.hp = Math.max(1, m.srv - m.cho); m.ket = m.srv - m.cho <= 0;
}

// Bỏ phần chờ của một tin đòn (đã được đáp, hoặc quá lâu không có lời đáp)
function xong(qc, g) { for (const [slot, d] of g.h) { const m = qc.o.get(slot); if (m) { m.cho = Math.max(0, m.cho - d); m.hp = Math.max(1, m.srv - m.cho); m.ket = m.srv - m.cho <= 0; } } }

// Lời đáp của phòng cho tin đòn số n: mọi tin tới n đã được xét; kèm máu thật sau đòn của mình (hoặc báo ô đó đã chết từ trước)
function dap(game, qc, msg) {
  while (qc.gui.length && qc.gui[0].n <= msg.n) xong(qc, qc.gui.shift());
  for (const e of Array.isArray(msg.h) ? msg.h : []) {
    if (!Array.isArray(e)) continue;
    if (e[1] > 0) { mau(game, qc, e[0], e[1]); continue; }
    const m = qc.o.get(e[0]);   // mình còn thấy nó sống mà phòng bảo đã chết: dọn lặng lẽ, hẹn giờ mọc theo phòng
    if (!m) continue;
    m.dead = true; qc.o.delete(e[0]); qc.don.delete(e[0]);
    hen(game, qc, e[0], -e[1], e[2], e[3]);
  }
}

// Phòng báo hạ quái: máy nào cũng cho con đó chết; phần thưởng theo phần công của mình
function ha(game, qc, k) {
  const slot = k.s, m = qc.o.get(slot), C = QC(game.data);
  if (!Number.isInteger(slot) || !qc.bai.has(Math.floor(slot / O))) return;
  qc.o.delete(slot); qc.don.delete(slot);
  hen(game, qc, slot, k.r, k.ra, k.sd);
  if (!m || m.dead) return;
  const c = Array.isArray(k.c) ? k.c : [], toi = c.find(e => e?.[0] === qc.me), phan = toi ? Math.min(1, Math.max(0, +toi[1] || 0)) : 0;
  m.remote = false; m.hp = 0;
  if (phan > 0) { m.cong = { k: phan, top: c[0]?.[0] === qc.me, bo: phan < (C.min_cong || 0) }; killMob(game, m); return; }
  // không góp đòn nào: chỉ thấy nó chết (xác tan), không tiếng, không thưởng
  m.dead = true;
  (game.corpses ??= []).push({ m, t0: game.time, x: m.x, y: m.y, ang: m.cutAng ?? 0, tilt: 0, wait: 0 });
}

// Vị trí quái người khác đang giữ: [mã người giữ, [ô, x, y, đang ra đòn], …]
function giu(game, qc, [id, ...es]) {
  if (id === qc.me) return;
  const W = game.map.w * game.map.T, H = game.map.h * game.map.T;
  for (const e of es) {
    const m = Array.isArray(e) ? qc.o.get(e[0]) : null;
    if (!m || m.dead || !Number.isFinite(e[1]) || !Number.isFinite(e[2])) continue;
    if (!m.remote) { m.remote = true; m.kx = m.ky = 0; m.tele = null; }
    m.tx = Math.max(0, Math.min(W, e[1])); m.ty = Math.max(0, Math.min(H, e[2])); m.xaT = game.time;
    m.state = e[3] ? 'windup' : 'idle';
  }
}

// Mỗi khung (game.js, cạnh updateSpawners): cho mọc ô tới giờ, trả tự do quái hết người giữ, gom đòn và vị trí quái mình giữ gửi phòng
export function qcTick(game, dt) {
  const qc = game.qc;
  if (!qc) return;
  const C = QC(game.data), now = game.time;
  for (const [slot, c] of qc.cho) if (now >= c.at) { qc.cho.delete(slot); moc(game, qc, slot, c.ra, c.sd); }
  for (const [slot, m] of qc.o) {
    if (m.dead) { qc.o.delete(slot); qc.don.delete(slot); hen(game, qc, slot, 2000, m.rare, m.sd); continue; }   // chết ngoài luồng (truyện dọn quái): mọc lại, máu theo phòng
    if (m.remote && now - (m.xaT || 0) > C.own_ms / 1000) { m.remote = false; m.state = 'idle'; m.cd = Math.max(m.cd, 0.5); }   // người giữ thôi báo: về AI của máy mình, ai bị nó nhắm thì giữ (nghỉ nửa giây, kẻo đòn đang vung dở của máy kia giáng luôn vào mình)
  }
  while (qc.gui.length && now - qc.gui[0].at > BO_SAU) xong(qc, qc.gui.shift());
  if ((qc.t -= dt) > 0) return;
  // quái mình đang giữ (nó đang nhắm mình): báo khi nó xê dịch, đổi dáng; đứng yên thì NHAC giây nhắc một lần cho phòng biết mình còn giữ
  const giuCua = [], bao = [];
  for (const [slot, m] of qc.o) {
    if (m.remote || !m.aggro || giuCua.length >= TIN_MAX) continue;
    const e = [slot, Math.round(m.x), Math.round(m.y), m.state === 'idle' ? 0 : 1], cu = m.bao;
    if (cu && now - cu.at < NHAC && cu.e[3] === e[3] && Math.abs(cu.e[1] - e[1]) <= XE && Math.abs(cu.e[2] - e[2]) <= XE) continue;
    giuCua.push(e); bao.push(m);
  }
  if (!giuCua.length && !qc.don.size) return;
  const h = [...qc.don].slice(0, TIN_MAX).map(([slot, d]) => [slot, Math.round(d)]), n = qc.n + 1;
  if (!game.online?.quai?.({ n, m: giuCua, h }, game.player)) return;   // chưa nối được: giữ đòn, khung sau thử lại
  qc.n = n; qc.t = (C.gui_ms || 250) / 1000; qc.luc = now;
  bao.forEach((m, i) => { m.bao = { at: now, e: giuCua[i] }; });
  if (h.length) qc.gui.push({ n, h, at: now });
  for (const [slot] of h) qc.don.delete(slot);
}
