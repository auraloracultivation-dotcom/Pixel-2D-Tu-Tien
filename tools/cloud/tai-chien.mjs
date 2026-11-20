// Thử tải TRẬN ĐÔNG NGƯỜI trên ĐÚNG mã máy chủ phòng (cloud/src), không ra mạng, không chạm máy chủ thật (thiết kế máy chủ 1 000 người,
// 20/11/2026; Project: claude/thiet-ke-may-chu-1000-nguoi-20-11.md). Khác tai-thu.mjs: có người tắt khiên đánh nhau (tin 'bv', 'h'),
// ĐỒNG HỒ GIẢ điều khiển được (Date.now giả) nên luật chặn tốc độ, nhịp đánh PvP, hồi máu chạy đúng như thật.
// (tai-thu.mjs bản 18/11 bước thời gian giả nhưng luật tốc độ đọc đồng hồ thật: gần như mọi tin bị bỏ, số đo thấp giả.)
// Từ đêm 20/11/2026 có MẠNG GIẢ và MẮT MÁY KHÁCH GIẢ: tin lên / xuống tới trễ, chập chờn; mỗi người đánh thấy người khác qua ĐÚNG công thức đi
// mượt của game (src/game/others.js: hình đi sau khoảng hai nhịp gói tin), nên hình người đang chạy cũ hơn vị trí thật 0,5–0,8 giây, và
// chọn mục tiêu theo hình đó như người chơi thật. Bản đầu (tối 20/11) không có hai thứ này: báo 97% đòn được tính, thử thật trên game chỉ 56%.
//   node tools/cloud/tai-chien.mjs --nguoi 40 --danh 20 --doi 2 --giay 60 --vt 200
//     --nguoi  số người trong phòng        --danh số người tắt khiên đánh nhau (chia đều --doi phe); còn lại đi dạo
//     --vt     mili giây giữa hai lần gửi vị trí của người đang đánh (data/config.json → realtime.pvp_ms; trước 20/11: 2000 khi đông)
//     --kieu   bam   : hai phe bám kẻ địch gần nhất, lượn quanh ở tầm 70–110 (trận 10 vs 10)
//              ravao : từng cặp, mồi đứng yên, người đánh lao ra lao vào 40 ↔ 300 đơn vị quanh mép tầm đánh (đúng bài thử thật hai tài
//                      khoản 20/11/2026 trên game: 9/16 đòn = 56%)
//              duoi  : từng cặp, mồi chạy vòng tròn với tốc độ --toc, người đánh đuổi theo sau --cach đơn vị (đuổi đánh người bỏ chạy)
//     --toc    tốc độ chạy, đơn vị bản đồ mỗi giây (game: đi bộ 72–94, cưỡi thú 108–140, ngự kiếm bay 144–187)
//     --len 80 --rung 40   trễ mạng mỗi chiều (ms) và độ chập chờn ±; tin của một máy vẫn tới đúng thứ tự như TCP (--len 0 = mạng lý tưởng)
//     --kem 0  máy khách cũ: tin đòn đánh KHÔNG kèm vị trí người đánh (mặc định 1 = kèm, máy khách từ đợt sửa đêm 20/11/2026)
//     --muot 2 hệ số đi mượt của máy khách: hình người khác tới chỗ mới sau bao nhiêu nhịp gói tin (game: 2; nhỏ hơn thì hình bám sát hơn
//              nhưng dễ khựng khi gói tới trễ). Kết quả có thêm hinh_tre_ms (hình cũ hơn vị trí thật bao lâu) và hinh_khung_pct (phần
//              thời gian hình đứng khựng trong lúc người thật vẫn chạy), đo ở kiểu duoi
//     --hat 7  hạt giống số ngẫu nhiên: cùng hạt thì kết quả y hệt (tools/check.mjs dùng); bỏ trống = ngẫu nhiên thật
//     --rate   nới luật tốc độ (tin/giây) để thử     --cap trần người một phòng      --uuid 0 dùng mã người ngắn
//     --gop 1  thử bản vá "đòn PvP đi chung gói lô" (vá trên bản sao tạm của cloud/src, không sửa kho)
//   P2D_CLOUD_SRC=<thư mục> : chạy với mã máy chủ phòng khác (ví dụ bản đang chạy thật lấy từ nhánh main) để so trước / sau.
// In một dòng JSON: tin gửi lên, % tin bị luật tốc độ bỏ, số người bị đá, CPU phòng mỗi giây, số lần gửi xuống, KB xuống mỗi người,
// % đòn được máy chủ tính (đòn hợp lệ trên màn hình người đánh nhưng máy chủ bỏ thì không tính).
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { chepCloud } from './nap.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('nguoi', 40), TEAMS = +arg('doi', 2), FIGHT = +arg('danh', 20), SECS = +arg('giay', 60);
const VT = +arg('vt', 2000), VT_DAO = +arg('vtdao', 2000), GOP = arg('gop', '0') === '1', CAP = +arg('cap', Math.max(40, N));
const HIT_S = +arg('don', 2), CAST_S = +arg('chieu', 1), TOC = +arg('toc', 190), CACH = +arg('cach', 190), STEP = 20, BK = 400;
const LEN = +arg('len', 80), RUNG = +arg('rung', 40), KIEU = arg('kieu', 'bam'), KEM = arg('kem', '1') === '1', HAT = +arg('hat', 0), MUOT = +arg('muot', 2);
const RT = JSON.parse(readFileSync(join(import.meta.dirname, '../../data/config.json'), 'utf8')).realtime;   // hop, speed, gap_max: như máy khách thật
if (HAT) { let a = HAT | 0; Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, a | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const maNguoi = i => (arg('uuid', '1') !== '1' ? 'b' + i : HAT ? 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)) : crypto.randomUUID());

let NOW = 1_800_000_000_000;
const DAU = NOW;
Date.now = () => NOW;
const timers = [];
globalThis.setTimeout = (f, ms = 0) => { timers.push({ at: NOW + ms, f }); return timers.length; };
globalThis.clearTimeout = () => {};
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };

const dir = chepCloud('chien-');
// đếm tin bị luật tốc độ bỏ (chỉ thêm bộ đếm vào bản sao tạm)
const fp = join(dir, 'proto.js');
writeFileSync(fp, readFileSync(fp, 'utf8').replace('b.drop += 1;', 'b.drop += 1; globalThis.__bo = (globalThis.__bo || 0) + 1;'));
if (GOP) {   // bản vá thử: đòn PvP đi chung gói lô 200 ms, không ghi kèm kết nối mỗi đòn
  const pv = join(dir, 'pvp.js');
  let s = readFileSync(pv, 'utf8');
  const a0 = s.length;
  s = s.replace("ws.serializeAttachment(a); tw.serializeAttachment(b);\n  if (left > 0) { hp.set(id, { hp: left, at: now }); room.all({ t: 'ph', from: a.id, to: id, n, r: +(left / max).toFixed(3) }); return; }",
    "if (left > 0) { hp.set(id, { hp: left, at: now }); (room.hits ??= []).push([a.id, id, n, +(left / max).toFixed(3)]); room.later(); return; }\n  ws.serializeAttachment(a); tw.serializeAttachment(b);");
  if (s.length === a0) throw new Error('không vá được pvp.js');
  writeFileSync(pv, s);
  const ph = join(dir, 'phong.js');
  let t = readFileSync(ph, 'utf8');
  const b0 = t.length;
  t = t.replace('if (!this.moves.size && !this.says.length && !this.casts.length) return;\n    const s = JSON.stringify(makeBatch(this.moves, this.says, this.casts));',
    'if (!this.moves.size && !this.says.length && !this.casts.length && !this.hits?.length) return;\n    const o = makeBatch(this.moves, this.says, this.casts); if (this.hits?.length) { o.h = this.hits; this.hits = []; }\n    const s = JSON.stringify(o);');
  if (t.length === b0) throw new Error('không vá được phong.js');
  writeFileSync(ph, t);
}
const P = await import(join(dir, 'proto.js'));
const { Phong } = await import(join(dir, 'phong.js'));
P.CAP.dao = CAP;
if (+arg('rate', 0)) { P.RATE.dao.rate = +arg('rate', 0); P.RATE.dao.burst = +arg('rate', 0) * 3; }

const st = { up: 0, sends: 0, bytes: 0, ph: 0, pd: 0, hitTry: 0, kick: 0, cpu: 0 };
class FakeWS {
  constructor() { this.readyState = 1; this.att = null; this.bytes = 0; }
  send(s) { st.sends++; st.bytes += s.length; this.bytes += s.length; this.onSend?.(s); }
  close(c) { if (this.readyState === 1) { this.readyState = 3; this.code = c; if (c === 4008) st.kick++; } }
  accept() {}
  serializeAttachment(a) { this.att = structuredClone(a); }
  deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
}
globalThis.WebSocketPair = class { constructor() { this[0] = new FakeWS(); this[1] = new FakeWS(); } };
let alarmAt = 0;
const ctx = {
  list: [], tags: new Map(), setWebSocketAutoResponse() {},
  storage: { getAlarm: async () => alarmAt || null, setAlarm: async t => { alarmAt = t; } },
  acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); for (const t of tags) { if (!this.tags.has(t)) this.tags.set(t, []); this.tags.get(t).push(ws); } },
  getWebSockets(tag) { return (tag ? this.tags.get(tag) || [] : this.list).filter(w => w.readyState === 1); },
};
const mang = { pkGet: async () => ({ off: false, immune: 0, at: 0 }), pkSet: async () => {}, pvp: async () => true, nhipGop: async () => ({ khac: [] }), add: async () => ({ top: [], n: 0, total: 0, ranks: {}, lt: {}, mo: 0 }) };
const env = { SUPABASE_URL: 'http://x', SUPABASE_KEY: 'x', MANG: { idFromName: () => 'x', get: () => mang } };
const room = new Phong(ctx, env);

const bots = [], danhId = new Set();
const cpu = async f => { const t0 = performance.now(); await f(); st.cpu += performance.now() - t0; };
// MẠNG GIẢ. Mỗi chiều trễ LEN ± RUNG ms; tin của một máy tới đúng thứ tự gửi (TCP), nên chập chờn chỉ làm hai tin tới SÁT nhau hơn lúc
// gửi: đúng thứ khiến luật nhịp đòn của phòng bỏ oan đòn. ngay = true: tới liền (lúc dựng cảnh).
const tre = () => (LEN > 0 ? Math.max(0, LEN + (Math.random() * 2 - 1) * RUNG) : 0);
const len = [], xuong = [];   // tin đang trên đường lên phòng / xuống máy: { at, b, raw }
const den = q => { const r = q.filter(h => h.at <= NOW).sort((x, y) => x.at - y.at); if (r.length) for (let i = q.length - 1; i >= 0; i--) if (q[i].at <= NOW) q.splice(i, 1); return r; };
const say = (b, m, ngay = false) => {
  st.up++; b.up = (b.up || 0) + 1;
  const raw = JSON.stringify(m);
  if (ngay || !(LEN > 0)) return cpu(() => room.webSocketMessage(b.ws, raw));
  len.push({ at: b.toiL = Math.max(b.toiL || 0, NOW + tre()), b, raw });
};
// MẮT MÁY KHÁCH GIẢ: đúng công thức src/game/others.js (move, update). Gói vị trí tới thì đặt đích mới và chọn tốc độ để tới đích sau khoảng
// HAI nhịp gói tin (đi mượt, rớt một gói không khựng); xa quá hop thì đặt thẳng. Người đánh chọn mục tiêu theo hình này (b.thay).
let loRaw = null, lo = null;
const nhan = (b, raw) => {
  if (raw !== loRaw) { loRaw = raw; lo = JSON.parse(raw); }
  for (const [id, x, y] of lo.m || []) {
    if (id === b.id || !danhId.has(id)) continue;
    let o = b.thay.get(id); if (!o) b.thay.set(id, o = { x: null, y: null, tx: 0, ty: 0, spd: 0, at: 0 });
    if (o.x === null || Math.hypot(x - o.x, y - o.y) > (RT.hop || 140)) { o.x = x; o.y = y; }
    const gap = Math.min(RT.gap_max || 0.5, Math.max(0.1, (NOW - (o.at || NOW - 125)) / 1000));
    o.at = NOW; o.tx = x; o.ty = y; o.spd = Math.min(RT.speed || 260, Math.hypot(x - o.x, y - o.y) / (gap * MUOT));
  }
};
const hinh = { lech: 0, n: 0, khung: 0 };   // đo hình so với thật (kiểu duoi: người đuổi nhìn mồi đang chạy đều)
const nhin = b => { for (const [id, o] of b.thay) { if (o.x === null) continue; const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy), s = Math.max(o.spd, 30) * STEP / 1000; if (d <= s) { o.x = o.tx; o.y = o.ty; } else { o.x += dx / d * s; o.y += dy / d * s; }
  if (KIEU === 'duoi' && id === b.cap?.id && NOW > DAU + 3000) { hinh.n++; hinh.lech += Math.hypot(o.x - b.cap.x, o.y - b.cap.y); if (d <= s) hinh.khung++; } } };

for (let i = 0; i < N; i++) {
  const id = maNguoi(i), fight = i < FIGHT, team = fight ? i % TEAMS : -1;
  const h = new Map([['x-uid', id], ['x-kind', 'dao'], ['x-cap', String(CAP)], ['x-map', 'dao-moc'], ['x-name', 'Bot' + i], ['x-power', '40000']]);
  await room.fetch({ headers: { get: k => h.get(k) ?? null } });
  const ws = ctx.list[ctx.list.length - 1];
  const ang = team >= 0 ? team / TEAMS * Math.PI * 2 : Math.random() * Math.PI * 2;
  const b = { id, ws, fight, team, x: 700 + Math.cos(ang) * 320 + (Math.random() - 0.5) * 120, y: 700 + Math.sin(ang) * 320 + (Math.random() - 0.5) * 120, pk: false, wait: 0, mv: -Math.random() * VT, hit: -Math.random() * 500, nhipDon: 1000 / HIT_S, cast: -Math.random() * 1000, beat: -Math.random() * 5000, fx: 1, fy: 0, tx: 0, ty: 0, retarget: 0, thay: new Map() };
  if (fight) danhId.add(id);
  ws.onSend = s => {
    if (s.startsWith('{"t":"pd"')) { const m = JSON.parse(s); if (m.to === id) { b.pk = false; b.wait = NOW + 10500; } if (i === 0) st.pd++; }
    else if (i === 0 && s.startsWith('{"t":"ph"')) st.ph++;
    else if (s.startsWith('{"t":"b"')) {
      if (i === 0 && GOP && s.includes('"h":[')) st.ph += JSON.parse(s).h.length;
      if (fight) xuong.push({ at: b.toiX = Math.max(b.toiX || 0, NOW + tre()), b, raw: s });
    }
  };
  bots.push(b);
  await say(b, { t: 'p', p: { name: 'Bot' + i, element: 'kim', look: 'x', outfit: 'bo-1', ri: '3', vkl: 'kiem', pet: 'p1', comp: 'c1' } }, true);
}
for (const b of bots) if (b.fight) { await say(b, { t: 'bv', off: true }, true); b.pk = true; }
// ravao, duoi: xếp cặp (người chẵn đánh người lẻ kế bên; người lẻ là mồi, không đánh lại). ravao: mồi đứng yên; duoi: mồi chạy vòng bán kính BK
if (KIEU !== 'bam') for (let i = 0; i + 1 < FIGHT; i += 2) {
  const a = bots[i], c = bots[i + 1], k = i / 2;
  c.moi = true; a.cap = c; a.pha = Math.random() * 2;
  if (KIEU === 'ravao') { c.yen = true; c.x = 200 + (k % 6) * 700; c.y = 200 + Math.floor(k / 6) * 400; a.x = c.x + 170; a.y = c.y; }
  else { c.cx = 600 + (k % 5) * 1000; c.cy = 600 + Math.floor(k / 5) * 1000; c.goc = Math.random() * 6.283; }
}
st.up = 0; st.sends = 0; st.bytes = 0; st.cpu = 0; globalThis.__bo = 0;
for (const b of bots) { b.ws.bytes = 0; b.up = 0; }

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tren = (b, cx, cy, g) => { b.x = cx + Math.cos(g) * BK; b.y = cy + Math.sin(g) * BK; b.fx = -Math.sin(g); b.fy = Math.cos(g); };
for (let t = 0; t < SECS * 1000; t += STEP) {
  NOW += STEP;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= NOW) { const f = timers[i].f; timers.splice(i, 1); await cpu(async () => f()); }
  for (const h of den(len)) if (h.b.ws.readyState === 1) await cpu(() => room.webSocketMessage(h.b.ws, h.raw));
  if (alarmAt && NOW >= alarmAt) { alarmAt = 0; await cpu(() => room.alarm()); }
  for (const h of den(xuong)) nhan(h.b, h.raw);
  for (const b of bots) {
    if (b.ws.readyState !== 1) continue;
    if (b.fight) nhin(b);
    if (b.fight && !b.pk && NOW >= b.wait) { await say(b, { t: 'bv', off: true }); b.pk = true; }
    // đi (vị trí THẬT của từng người)
    if (b.cap && KIEU === 'duoi') tren(b, b.cap.cx, b.cap.cy, b.cap.goc - CACH / BK);
    else if (b.cap) { b.x = b.cap.x + 170 + 130 * Math.sin((t / 1000 + b.pha) * Math.PI); b.y = b.cap.y; b.fx = -1; b.fy = 0; }
    else if (b.moi) { if (!b.yen) { b.goc += TOC / BK * STEP / 1000; tren(b, b.cx, b.cy, b.goc); } }
    else if (b.fight) {   // bam: bám kẻ địch gần nhất, lượn quanh ở tầm 70–110
      if (t >= b.retarget) {
        b.retarget = t + 400; let best = null, bd = 1e9;
        for (const o of bots) if (o.fight && o.team !== b.team && o.pk) { const d = d2(b, o); if (d < bd) { bd = d; best = o; } }
        b.tg = best;
      }
      if (b.tg) { const d = d2(b, b.tg) || 1, want = d > 110 ? 1 : d < 70 ? -1 : 0; b.fx = (b.tg.x - b.x) / d; b.fy = (b.tg.y - b.y) / d;
        const sx = want ? b.fx * want : -b.fy * (b.team % 2 ? 1 : -1) * 0.6, sy = want ? b.fy * want : b.fx * (b.team % 2 ? 1 : -1) * 0.6;
        b.x += sx * TOC * STEP / 1000; b.y += sy * TOC * STEP / 1000; }
    } else if (Math.random() < 0.6) { if (Math.random() < 0.01) { const a = Math.random() * 6.283; b.fx = Math.cos(a); b.fy = Math.sin(a); } b.x = Math.max(20, Math.min(1400, b.x + b.fx * TOC * STEP / 1000)); b.y = Math.max(20, Math.min(1400, b.y + b.fy * TOC * STEP / 1000)); }
    const gap = b.fight ? VT : VT_DAO;
    if (t - b.mv >= gap && !(b.yen && b.daGui)) { b.mv = t; b.daGui = true; await say(b, { t: 'm', x: Math.round(b.x), y: Math.round(b.y), fx: +b.fx.toFixed(2), fy: +b.fy.toFixed(2), sw: b.fight ? 1 : 0 }); }
    if (b.fight && b.pk && !b.moi && t - b.hit >= b.nhipDon) {
      // như src/game/pvp.js pvpTryHit: người tắt khiên gần nhất trong 95% tầm, tính bằng HÌNH người đó trên máy mình và vị trí thật của mình
      let best = null, bd = 152;
      for (const o of (b.cap ? [b.cap] : bots)) if (o.fight && o.team !== b.team && o.pk) { const s = b.thay.get(o.id); if (!s || s.x === null) continue; const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < bd) { bd = d; best = o; } }
      if (best) { b.hit = t; b.nhipDon = 1000 / HIT_S + Math.random() * 100; st.hitTry++; await say(b, KEM ? { t: 'h', to: best.id, x: Math.round(b.x), y: Math.round(b.y) } : { t: 'h', to: best.id }); }
    }
    if (b.fight && t - b.cast >= 1000 / CAST_S) { b.cast = t; await say(b, { t: 'k', k: 'kiem-khi', x: Math.round(b.x), y: Math.round(b.y), fx: +b.fx.toFixed(2), fy: +b.fy.toFixed(2) }); }
    if (!b.fight && Math.random() < STEP / 8000) await say(b, { t: 'k', k: 'kiem-khi', x: Math.round(b.x), y: Math.round(b.y), fx: 1, fy: 0 });
    if (t - b.beat >= 5000) { b.beat = t; await say(b, { t: 'n', ph: 'x' }); }
  }
}
const r1 = v => Math.round(v * 10) / 10, live = bots.filter(b => b.ws.readyState === 1).length;
const fb = bots.filter(b => b.fight), wb = bots.filter(b => !b.fight);
const out = {
  nguoi: N, danh: FIGHT, doi: TEAMS, vt_ms: VT, gop_don: GOP, kieu: KIEU, toc: TOC, ...(KIEU === 'duoi' ? { cach: CACH } : {}), tre_moi_chieu_ms: LEN, rung_ms: RUNG, don_kem_vi_tri: KEM, ...(HAT ? { hat: HAT } : {}),
  tin_len_moi_nguoi_danh_s: r1(fb.reduce((a, b) => a + b.up, 0) / Math.max(1, fb.length) / SECS), tin_len_moi_nguoi_dao_s: r1(wb.reduce((a, b) => a + b.up, 0) / Math.max(1, wb.length) / SECS),
  tin_len_ca_phong_s: r1(st.up / SECS),
  bi_bo_vi_qua_nhanh_pct: r1(100 * (globalThis.__bo || 0) / st.up),
  bi_da: st.kick, con_trong_phong: live,
  cpu_ms_moi_giay: r1(st.cpu / SECS),
  lan_gui_xuong_s: Math.round(st.sends / SECS),
  kb_xuong_moi_nguoi_s: r1(st.bytes / N / SECS / 1024),
  kb_xuong_nguoi_danh_s: r1(fb.reduce((a, b) => a + b.ws.bytes, 0) / Math.max(1, fb.length) / SECS / 1024),
  ...(hinh.n ? { he_so_muot: MUOT, hinh_tre_ms: Math.round(hinh.lech / hinh.n / TOC * 1000), hinh_khung_pct: r1(100 * hinh.khung / hinh.n) } : {}),
  don_gui: st.hitTry, don_duoc_tinh: st.ph + st.pd, don_duoc_tinh_pct: st.hitTry ? r1(100 * (st.ph + st.pd) / st.hitTry) : null, ha_guc: st.pd,
};
console.log(JSON.stringify(out));
process.exit(0);
