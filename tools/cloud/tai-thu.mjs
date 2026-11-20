// Thử tải máy chủ phòng (Giai đoạn 0 kế hoạch 1 000 khách, 18/11/2026): bot giả đăng nhập, chạy, chào, tung chiêu.
// Hai cách chạy, KHÔNG cách nào chạm máy chủ thật của người chơi:
//  1) Trong máy (mặc định): chạy chính mã cloud/src/phong.js trong Node với WebSocket giả (như phong.test.mjs), thời gian giả
//     (không chờ thật). Đo: thời gian máy (CPU) mỗi giây mỗi phòng, số byte phát xuống mỗi người, số tin gửi lên → ước tiền Cloudflare.
//       node tools/cloud/tai-thu.mjs --bot 300 --giay 60
//  2) Qua mạng tới một máy chủ thử chạy trên máy mình (wrangler dev --var DEV_NO_AUTH:1, cổng 8787), bot thật bằng WebSocket:
//       node tools/cloud/tai-thu.mjs --url ws://127.0.0.1:8787 --bot 100 --giay 30
//     Đo: thời gian vào phòng, độ trễ từ lúc gửi vị trí tới lúc nhận gói có vị trí đó, số kết nối rớt, số lần phòng đầy (4009).
//     Không dùng với địa chỉ máy chủ thật (công cụ từ chối địa chỉ không phải máy mình).
import { join } from 'node:path';
import { chepCloud } from './nap.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOTS = +arg('bot', 300), SECS = +arg('giay', 60), URL_ = arg('url', ''), MAP = arg('map', 'thanh-khe');
const CAST_S = +arg('chieu', 1 / 8);   // số lần tung chiêu mỗi giây mỗi bot (bang chiến: --chieu 2)
const MOVE_GAP = +arg('gap', 1000), ROOM_CAP = +arg('cap', 0);   // --cap: thử một phòng đông hơn 40 (bang hội chiến)   // ms giữa hai lần gửi vị trí khi đang chạy (src/net/online-cf.js send gap mặc định)
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const r1 = v => Math.round(v * 10) / 10;

// Một bot: đi lang thang, 1/20 giây đứng yên, thỉnh thoảng chào (1 lần / 40 giây) và tung chiêu (1 lần / 8 giây)
function botStep(b, t, send) {
  if (t - b.last >= MOVE_GAP) {
    b.last = t;
    if (Math.random() < 0.05) b.idle = t + 5000;
    if (t > b.idle) { b.x = Math.max(20, Math.min(900, b.x + (Math.random() - 0.5) * 80)); b.y = Math.max(20, Math.min(900, b.y + (Math.random() - 0.5) * 80)); }
    send({ t: 'm', x: Math.round(b.x), y: Math.round(b.y), fx: 1, fy: 0, sw: Math.random() < 0.3 ? 1 : 0, ts: t });
  }
  if (Math.random() < 1 / 40 / 10) send({ t: 's', e: 'chao' });
  if (Math.random() < CAST_S / 10) send({ t: 'k', k: 'kiem-khi', x: Math.round(b.x), y: Math.round(b.y), fx: 1, fy: 0 });
}

// ---------- 1) Trong máy ----------
async function local() {
  const dir = chepCloud('tai-');   // tools/cloud/nap.mjs
  globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
  class FakeWS {
    constructor() { this.readyState = 1; this.bytes = 0; this.n = 0; this.att = null; }
    send(s) { this.bytes += s.length; this.n++; }
    close(c) { this.readyState = 3; this.code = c; }
    accept() {}
    serializeAttachment(a) { this.att = structuredClone(a); }
    deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
  }
  globalThis.WebSocketPair = class { constructor() { this[0] = new FakeWS(); this[1] = new FakeWS(); } };
  globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };
  const timers = [];
  globalThis.setTimeout = f => { timers.push(f); return timers.length; };
  // Đồng hồ giả đi cùng bước thời gian giả (sửa 20/11/2026): luật chặn tốc độ của phòng đọc Date.now; để đồng hồ thật thì 60 giây giả trôi
  // trong chưa tới một giây thật, gần như mọi tin bị coi là gửi dồn dập và bị bỏ (bản 18/11 vì thế đo ra số thấp giả, bot nào cũng bị đá).
  let gio = Date.now(); Date.now = () => gio;
  const P = await import(join(dir, 'proto.js'));
  const { Phong } = await import(join(dir, 'phong.js'));
  if (ROOM_CAP) P.CAP.dao = ROOM_CAP;
  const CAP = P.CAP.dao, rooms = [];
  const env = { SUPABASE_URL: 'http://x', SUPABASE_KEY: 'x' };
  // chia tuyến như máy khách: đầy 40 người thì sang tuyến kế
  for (let i = 0; i < BOTS; i++) {
    let room = rooms.find(r => r.ctx.list.filter(w => w.readyState === 1).length < CAP);
    if (!room) {
      const ctx = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); }, getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
      room = { ctx, ph: new Phong(ctx, env), cpu: 0, up: 0 };
      rooms.push(room);
    }
    const id = 'bot-' + i, h = new Map([['x-uid', id], ['x-kind', 'dao'], ['x-cap', String(CAP)], ['x-map', MAP], ['x-name', 'Bot' + i]]);
    const t0 = performance.now();
    await room.ph.fetch({ headers: { get: k => h.get(k) ?? null } });
    room.cpu += performance.now() - t0;
    const ws = room.ctx.list[room.ctx.list.length - 1];
    room.ph.webSocketMessage(ws, JSON.stringify({ t: 'p', p: { name: 'Bot' + i, realm: 1, look: 'x' } }));
    rooms.find(r => r === room).bots = [...(room.bots || []), { ws, x: 100 + Math.random() * 600, y: 100 + Math.random() * 600, last: -Math.random() * MOVE_GAP, idle: 0 }];
  }
  for (const r of rooms) for (const w of r.ctx.list) { w.bytes = 0; w.n = 0; }
  // thời gian giả: bước 100 ms; mỗi 200 ms xả gói lô (BATCH_MS)
  const fl = Phong.prototype.flush;
  for (let t = 0; t < SECS * 1000; t += 100) {
    gio += 100;
    for (const r of rooms) {
      const t0 = performance.now();
      for (const b of r.bots) botStep(b, t, m => { r.up++; r.ph.webSocketMessage(b.ws, JSON.stringify(m)); });
      if (t % P.BATCH_MS === 0) { timers.length = 0; fl.call(r.ph); }
      r.cpu += performance.now() - t0;
    }
  }
  const per = rooms.map(r => ({ n: r.bots.length, cpuS: r.cpu / SECS, up: r.up, down: r.ctx.list.reduce((a, w) => a + w.bytes, 0) }));
  const people = per.reduce((a, r) => a + r.n, 0), up = per.reduce((a, r) => a + r.up, 0), down = per.reduce((a, r) => a + r.down, 0);
  const full = per.filter(r => r.n === CAP)[0] || per[0];
  console.log(`Thử tải trong máy: ${people} bot, ${rooms.length} tuyến (tối đa ${CAP}/tuyến), ${SECS} giây giả, gửi vị trí mỗi ${MOVE_GAP} ms`);
  console.log(`- CPU một tuyến ${full.n} người: ${r1(full.cpuS)} ms mỗi giây (${r1(full.cpuS / 10)}% một lõi)`);
  console.log(`- Phát xuống mỗi người: ${r1(down / people / SECS / 1024)} KB/giây; tin gửi lên cả máy chủ: ${r1(up / SECS)} tin/giây`);
  // Cloudflare Workers Paid: tin WebSocket gửi lên 20 tin = 1 yêu cầu (0,30 đô / 1 triệu sau 10 triệu miễn phí); phòng thức 128 MB:
  // 0,125 GB × giây thức (12,5 đô / 1 triệu GB-giây sau 400 000 miễn phí). Ước một tháng nếu giữ mức này cả ngày:
  const req = up / SECS * 86400 * 30 / 20, gbs = rooms.length * 0.125 * 86400 * 30;
  const usd = 5 + Math.max(0, req - 10e6) / 1e6 * 0.3 + Math.max(0, gbs - 400e3) / 1e6 * 12.5;
  console.log(`- Nếu giữ mức này 24/24 cả tháng: ~${r1(req / 1e6)} triệu yêu cầu, ~${r1(gbs / 1e6)} triệu GB-giây → ~${Math.round(usd)} đô/tháng`);
  const bad = rooms.flatMap(r => r.ctx.list).filter(w => w.code).length;
  console.log(`- Kết nối bị phòng đóng (quá nhanh / đầy): ${bad}`);
  return bad === 0;
}

// ---------- 2) Qua mạng (máy chủ thử trên máy mình) ----------
async function net() {
  const u = new URL(URL_);
  if (!['127.0.0.1', 'localhost', '::1'].includes(u.hostname)) { console.error('Chỉ thử với máy chủ chạy trên máy mình (wrangler dev), không thử vào máy chủ thật.'); return false; }
  const lat = [], join = [], st = { full: 0, drop: 0, fail: 0, recv: 0 };
  const bots = [];
  const open = (i, line = 1) => new Promise(res => {
    const id = 'bot-' + i, t0 = Date.now();
    const ws = new WebSocket(`${URL_}/ws?r=dao:${MAP}&l=${line}&dev_uid=${id}`, ['p2d']);
    const b = { id, ws, x: 100 + Math.random() * 600, y: 100 + Math.random() * 600, last: 0, idle: 0, sent: new Map(), ok: false };
    ws.onmessage = e => {
      st.recv++;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'w') { b.ok = true; join.push(Date.now() - t0); ws.send(JSON.stringify({ t: 'p', p: { name: id } })); res(b); }
      if (m.t === 'b') for (const [mid, x, y] of m.m || []) if (mid === id) { const s = b.sent.get(x + ',' + y); if (s) { lat.push(Date.now() - s); b.sent.delete(x + ',' + y); } }
    };
    ws.onclose = e => { if (e.code === 4009) { st.full++; res(open(i, line + 1)); } else if (b.ok) st.drop++; else { st.fail++; res(null); } };
    ws.onerror = () => {};
  });
  for (let i = 0; i < BOTS; i += 20) bots.push(...(await Promise.all(Array.from({ length: Math.min(20, BOTS - i) }, (_, k) => open(i + k)))));   // vào dồn 20 người một lúc
  const live = bots.filter(Boolean), start = Date.now();
  await new Promise(res => {
    const iv = setInterval(() => {
      const t = Date.now() - start;
      for (const b of live) if (b.ws.readyState === 1) botStep(b, t, m => { if (m.t === 'm') b.sent.set(m.x + ',' + m.y, Date.now()); delete m.ts; b.ws.send(JSON.stringify(m)); });
      if (t > SECS * 1000) { clearInterval(iv); res(); }
    }, 100);
  });
  for (const b of live) b.ws.close();
  console.log(`Thử tải qua mạng ${URL_}: ${live.length}/${BOTS} bot vào được, ${SECS} giây`);
  console.log(`- Vào phòng: trung vị ${pct(join, 50)} ms, 95% dưới ${pct(join, 95)} ms; phòng đầy chuyển tuyến ${st.full} lần`);
  console.log(`- Độ trễ vị trí (gửi → nhận gói): trung vị ${pct(lat, 50)} ms, 95% dưới ${pct(lat, 95)} ms (${lat.length} mẫu)`);
  console.log(`- Rớt kết nối giữa chừng: ${st.drop}; không vào được: ${st.fail}; tin nhận: ${st.recv}`);
  return st.fail === 0 && st.drop === 0;
}

const ok = await (URL_ ? net() : local());
process.exit(ok ? 0 : 1);
