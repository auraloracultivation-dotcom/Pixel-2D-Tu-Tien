// Thử tải TRẬN ĐÔNG NGƯỜI trên ĐÚNG mã máy chủ phòng (cloud/src), không ra mạng, không chạm máy chủ thật (thiết kế máy chủ 1 000 người,
// 20/11/2026; Project: claude/thiet-ke-may-chu-1000-nguoi-20-11.md). Khác tai-thu.mjs: có người tắt khiên đánh nhau (tin 'bv', 'h'),
// và ĐỒNG HỒ GIẢ điều khiển được (Date.now giả) nên luật chặn tốc độ, nhịp đánh PvP, hồi máu chạy đúng như thật.
// (tai-thu.mjs bản 18/11 bước thời gian giả nhưng luật tốc độ đọc đồng hồ thật: gần như mọi tin bị bỏ, số đo thấp giả.)
//   node tools/cloud/tai-chien.mjs --nguoi 40 --danh 20 --doi 2 --giay 60 --vt 2000
//     --nguoi  số người trong phòng        --danh số người tắt khiên đánh nhau (chia đều --doi phe); còn lại đi dạo
//     --vt     mili giây giữa hai lần gửi vị trí của người đang đánh (game hiện tại: 2000 khi đông; đề xuất: 200)
//     --rate   nới luật tốc độ (tin/giây) để thử     --cap trần người một phòng      --uuid 0 dùng mã người ngắn
//     --gop 1  thử bản vá "đòn PvP đi chung gói lô" (vá trên bản sao tạm của cloud/src, không sửa kho)
// In một dòng JSON: tin gửi lên, % tin bị luật tốc độ bỏ, số người bị đá, CPU phòng mỗi giây, số lần gửi xuống, KB xuống mỗi người,
// % đòn được máy chủ tính (đòn hợp lệ ở máy người đánh nhưng máy chủ bỏ vì vị trí nó giữ đã cũ thì không tính).
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { chepCloud } from './nap.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('nguoi', 40), TEAMS = +arg('doi', 2), FIGHT = +arg('danh', 20), SECS = +arg('giay', 60);
const VT = +arg('vt', 2000), VT_DAO = +arg('vtdao', 2000), GOP = arg('gop', '0') === '1', CAP = +arg('cap', Math.max(40, N));
const HIT_S = +arg('don', 2), CAST_S = +arg('chieu', 1), SPEED = 260, STEP = 20;

let NOW = 1_800_000_000_000;
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

const bots = [];
const cpu = async f => { const t0 = performance.now(); await f(); st.cpu += performance.now() - t0; };
const say = (b, m) => { st.up++; b.up = (b.up || 0) + 1; return cpu(() => room.webSocketMessage(b.ws, JSON.stringify(m))); };
for (let i = 0; i < N; i++) {
  const id = arg('uuid', '1') === '1' ? crypto.randomUUID() : 'b' + i, fight = i < FIGHT, team = fight ? i % TEAMS : -1;
  const h = new Map([['x-uid', id], ['x-kind', 'dao'], ['x-cap', String(CAP)], ['x-map', 'dao-moc'], ['x-name', 'Bot' + i], ['x-power', '40000']]);
  await room.fetch({ headers: { get: k => h.get(k) ?? null } });
  const ws = ctx.list[ctx.list.length - 1];
  const ang = team >= 0 ? team / TEAMS * Math.PI * 2 : Math.random() * Math.PI * 2;
  const b = { id, ws, fight, team, x: 700 + Math.cos(ang) * 320 + (Math.random() - 0.5) * 120, y: 700 + Math.sin(ang) * 320 + (Math.random() - 0.5) * 120, pk: false, wait: 0, mv: -Math.random() * VT, hit: -Math.random() * 500, cast: -Math.random() * 1000, beat: -Math.random() * 5000, fx: 1, fy: 0, tx: 0, ty: 0, retarget: 0 };
  ws.onSend = s => {
    if (s.startsWith('{"t":"pd"')) { const m = JSON.parse(s); if (m.to === id) { b.pk = false; b.wait = NOW + 10500; } if (i === 0) st.pd++; }
    else if (i === 0 && s.startsWith('{"t":"ph"')) st.ph++;
    else if (i === 0 && GOP && s.startsWith('{"t":"b"') && s.includes('"h":[')) st.ph += JSON.parse(s).h.length;
  };
  bots.push(b);
  await say(b, { t: 'p', p: { name: 'Bot' + i, element: 'kim', look: 'x', outfit: 'bo-1', ri: '3', vkl: 'kiem', pet: 'p1', comp: 'c1' } });
}
const seen = new Map();   // vị trí lần cuối mỗi người GỬI lên (thứ máy chủ và máy người khác biết)
for (const b of bots) if (b.fight) { await say(b, { t: 'bv', off: true }); b.pk = true; }
st.up = 0; st.sends = 0; st.bytes = 0; st.cpu = 0; globalThis.__bo = 0;
for (const b of bots) { b.ws.bytes = 0; b.up = 0; }

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
for (let t = 0; t < SECS * 1000; t += STEP) {
  NOW += STEP;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= NOW) { const f = timers[i].f; timers.splice(i, 1); await cpu(async () => f()); }
  if (alarmAt && NOW >= alarmAt) { alarmAt = 0; await cpu(() => room.alarm()); }
  for (const b of bots) {
    if (b.ws.readyState !== 1) continue;
    if (b.fight && !b.pk && NOW >= b.wait) { await say(b, { t: 'bv', off: true }); b.pk = true; }
    // đi: người đánh bám kẻ địch gần nhất (theo vị trí THẬT), người đi dạo đổi hướng thỉnh thoảng
    if (b.fight) {
      if (t >= b.retarget) {
        b.retarget = t + 400; let best = null, bd = 1e9;
        for (const o of bots) if (o.fight && o.team !== b.team && o.pk) { const d = d2(b, o); if (d < bd) { bd = d; best = o; } }
        b.tg = best;
      }
      if (b.tg) { const d = d2(b, b.tg) || 1, want = d > 110 ? 1 : d < 70 ? -1 : 0; b.fx = (b.tg.x - b.x) / d; b.fy = (b.tg.y - b.y) / d;
        const sx = want ? b.fx * want : -b.fy * (b.team % 2 ? 1 : -1) * 0.6, sy = want ? b.fy * want : b.fx * (b.team % 2 ? 1 : -1) * 0.6;
        b.x += sx * SPEED * STEP / 1000; b.y += sy * SPEED * STEP / 1000; }
    } else if (Math.random() < 0.6) { if (Math.random() < 0.01) { const a = Math.random() * 6.283; b.fx = Math.cos(a); b.fy = Math.sin(a); } b.x = Math.max(20, Math.min(1400, b.x + b.fx * SPEED * STEP / 1000)); b.y = Math.max(20, Math.min(1400, b.y + b.fy * SPEED * STEP / 1000)); }
    const gap = b.fight ? VT : VT_DAO;
    if (t - b.mv >= gap) { b.mv = t; seen.set(b.id, { x: Math.round(b.x), y: Math.round(b.y) }); await say(b, { t: 'm', x: Math.round(b.x), y: Math.round(b.y), fx: +b.fx.toFixed(2), fy: +b.fy.toFixed(2), sw: b.fight ? 1 : 0 }); }
    if (b.fight && b.pk && t - b.hit >= 1000 / HIT_S) {
      // máy khách chọn mục tiêu theo vị trí người khác mà nó NHẬN được (lần gửi cuối của họ) và vị trí thật của mình
      let best = null, bd = 152;
      for (const o of bots) if (o.fight && o.team !== b.team && o.pk) { const s = seen.get(o.id); if (!s) continue; const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < bd) { bd = d; best = o; } }
      if (best) { b.hit = t; st.hitTry++; await say(b, { t: 'h', to: best.id }); }
    }
    if (b.fight && t - b.cast >= 1000 / CAST_S) { b.cast = t; await say(b, { t: 'k', k: 'kiem-khi', x: Math.round(b.x), y: Math.round(b.y), fx: +b.fx.toFixed(2), fy: +b.fy.toFixed(2) }); }
    if (!b.fight && Math.random() < STEP / 8000) await say(b, { t: 'k', k: 'kiem-khi', x: Math.round(b.x), y: Math.round(b.y), fx: 1, fy: 0 });
    if (t - b.beat >= 5000) { b.beat = t; await say(b, { t: 'n', ph: 'x' }); }
  }
}
const r1 = v => Math.round(v * 10) / 10, live = bots.filter(b => b.ws.readyState === 1).length;
const fb = bots.filter(b => b.fight), wb = bots.filter(b => !b.fight);
const out = {
  nguoi: N, danh: FIGHT, doi: TEAMS, vt_ms: VT, gop_don: GOP,
  tin_len_moi_nguoi_danh_s: r1(fb.reduce((a, b) => a + b.up, 0) / Math.max(1, fb.length) / SECS), tin_len_moi_nguoi_dao_s: r1(wb.reduce((a, b) => a + b.up, 0) / Math.max(1, wb.length) / SECS),
  tin_len_ca_phong_s: r1(st.up / SECS),
  bi_bo_vi_qua_nhanh_pct: r1(100 * (globalThis.__bo || 0) / st.up),
  bi_da: st.kick, con_trong_phong: live,
  cpu_ms_moi_giay: r1(st.cpu / SECS),
  lan_gui_xuong_s: Math.round(st.sends / SECS),
  kb_xuong_moi_nguoi_s: r1(st.bytes / N / SECS / 1024),
  kb_xuong_nguoi_danh_s: r1(fb.reduce((a, b) => a + b.ws.bytes, 0) / Math.max(1, fb.length) / SECS / 1024),
  don_gui: st.hitTry, don_duoc_tinh: st.ph + st.pd, don_duoc_tinh_pct: st.hitTry ? r1(100 * (st.ph + st.pd) / st.hitTry) : null, ha_guc: st.pd,
};
console.log(JSON.stringify(out));
process.exit(0);
