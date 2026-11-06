// Bài thử máy chủ phòng Cloudflare (cloud/src) chạy trong Node, không cần wrangler: giả lập tối thiểu WebSocket Hibernation API.
// Chạy: node tools/cloud/phong.test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '../../cloud/src');
const dir = mkdtempSync(join(tmpdir(), 'phong-'));
writeFileSync(join(dir, 'proto.js'), readFileSync(join(root, 'proto.js'), 'utf8'));
writeFileSync(join(dir, 'mang-cfg.js'), readFileSync(join(root, 'mang-cfg.js'), 'utf8'));
writeFileSync(join(dir, 'pvp.js'), readFileSync(join(root, 'pvp.js'), 'utf8'));
const stubDO = 'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }';
writeFileSync(join(dir, 'phong.js'), readFileSync(join(root, 'phong.js'), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", stubDO));
writeFileSync(join(dir, 'mang.js'), readFileSync(join(root, 'mang.js'), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", stubDO));

// Giả lập
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
class FakeWS {
  constructor() { this.readyState = 1; this.out = []; this.att = null; this.closed = null; this.peer = null; }
  send(s) { if (this.readyState !== 1) throw new Error('closed'); this.out.push(JSON.parse(s)); }
  close(code) { this.readyState = 3; this.closed = code; }
  accept() {}
  serializeAttachment(a) { this.att = structuredClone(a); }
  deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
}
globalThis.WebSocketPair = class { constructor() { this[0] = new FakeWS(); this[1] = new FakeWS(); } };
globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };
const ctx = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
  getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
const timers = [];
globalThis.setTimeout = f => { timers.push(f); return timers.length; };
const tick = () => { while (timers.length) timers.shift()(); };

const P = await import(join(dir, 'proto.js'));
const { Phong } = await import(join(dir, 'phong.js'));

// proto
assert.equal(P.parseRoom('dao:thanh-khe', 3).name, 'dao:thanh-khe#3');
assert.equal(P.parseRoom('dao:x', 999).line, P.LINES_MAX);
assert.equal(P.parseRoom('to:ABCD').cap, 6);
assert.equal(P.parseRoom('evil:x'), null);
assert.equal(P.parseRoom('dao:<script>'), null);
assert.deepEqual(P.cleanMove({ x: 10.4, y: 20.6, fx: 2, fy: -0.333, sw: 1 }), [10, 21, 1, -0.33, 1, 0]);
assert.equal(P.cleanMove({ x: 'a', y: 1 }), null);
assert.equal(P.cleanProf({ name: '‮abc<b>' + 'x'.repeat(40), look: 'nam-1', outfit: '../../x' }).name.length, 24);
assert.equal(P.cleanProf({ outfit: '../../x' }).outfit, undefined);
assert.deepEqual(P.cleanSay({ m: '  chào   bạn ' }), { m: 'chào bạn' });
{ const c = { rate: 2, burst: 2 }, b = P.bucket(c, 0); assert.ok(P.take(b, c, 0)); assert.ok(P.take(b, c, 0)); assert.ok(!P.take(b, c, 0)); assert.ok(P.take(b, c, 600)); }

// phòng
const room = new Phong(ctx, {});
const enter = async (uid, kind = 'dao', cap = 3) => {
  const before = ctx.list.length;
  const r = await room.fetch({ headers: new Map([['x-uid', uid], ['x-kind', kind], ['x-cap', String(cap)]]) });
  const server = ctx.list.length > before ? ctx.list[ctx.list.length - 1] : null;
  return { r, server };
};
const send = (ws, obj) => room.webSocketMessage(ws, JSON.stringify(obj));

const a = await enter('A');
assert.equal(a.r.status, 101);
assert.deepEqual(a.server.out[0].l, []);
await send(a.server, { t: 'p', p: { name: 'An', look: 'nu-1' } });
await send(a.server, { t: 'm', x: 5, y: 6, fx: 1, fy: 0 });
const b = await enter('B');
assert.equal(b.server.out[0].t, 'w');
assert.equal(b.server.out[0].l[0].name, 'An');
assert.equal(b.server.out[0].l[0].x, 5);
await send(b.server, { t: 'p', p: { name: 'Bình' } });
assert.equal(a.server.out.at(-1).t, 'j');
await send(a.server, { t: 'm', x: 7, y: 6 });
await send(a.server, { t: 'm', x: 8, y: 6 });
await send(a.server, { t: 's', e: 'chao' });
tick();
const batch = b.server.out.at(-1);
assert.equal(batch.t, 'b');
assert.equal(batch.m.length, 1);
assert.equal(batch.m[0][1], 8);   // chỉ vị trí mới nhất
assert.deepEqual(batch.s[0], ['A', { e: 'chao' }]);
// đầy
await enter('C');
const d = await enter('D');
assert.equal(ctx.list.filter(w => w.tags?.includes('D')).length, 0);
assert.equal(d.r.webSocket.peer, null);   // không vào phòng (đóng 4009 ở phía server.accept)
// vào lại cùng tài khoản: đóng kết nối cũ
const a2 = await enter('A');
assert.equal(a.server.closed, 4000);
assert.equal(a2.server.out[0].t, 'w');
// rời
b.server.readyState = 3; await room.webSocketClose(b.server, 1000);
assert.equal(a2.server.out.at(-1).t, 'l');
// tổ đội chuyển tiếp ngay
const t1 = await enter('X', 'to', 6), t2 = await enter('Y', 'to', 6);
await send(t1.server, { t: 'r', d: { t: 'snap', m: [] } });
assert.deepEqual(t2.server.out.at(-1), { t: 'r', from: 'X', d: { t: 'snap', m: [] } });
// dồn dập: bị bỏ rồi đóng
const spam = await enter('S', 'dao', 99);
for (let i = 0; i < 400; i++) await send(spam.server, { t: 'm', x: i, y: 1 });
assert.equal(spam.server.closed, 4008);
console.log('phong.test: ok');

// vé đăng nhập ES256
{
  writeFileSync(join(dir, 'auth.js'), readFileSync(join(root, 'auth.js'), 'utf8'));
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
  const URL0 = 'https://x.supabase.co';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [{ ...jwk, kid: 'k1', alg: 'ES256' }] }) });
  const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const sign = async (body, kid = 'k1') => {
    const h = b64u({ alg: 'ES256', kid, typ: 'JWT' }), p = b64u(body);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${Buffer.from(sig).toString('base64url')}`;
  };
  const { verifyToken } = await import(join(dir, 'auth.js'));
  const good = { sub: 'u1', role: 'authenticated', iss: `${URL0}/auth/v1`, exp: Date.now() / 1000 + 600 };
  assert.equal(await verifyToken(await sign(good), URL0), 'u1');
  assert.equal(await verifyToken(await sign({ ...good, exp: 1 }), URL0), null);
  assert.equal(await verifyToken(await sign({ ...good, role: 'anon' }), URL0), null);
  assert.equal(await verifyToken(await sign({ ...good, iss: 'https://evil/auth/v1' }), URL0), null);
  const t = await sign(good); const [h, p] = t.split('.');
  assert.equal(await verifyToken(`${h}.${b64u({ ...good, sub: 'u2' })}.${t.split('.')[2]}`, URL0), null);   // sửa nội dung
  assert.equal(await verifyToken('rac', URL0), null);
  void p;
  console.log('auth.test: ok');
}

// boss thế giới: phòng kẹp sát thương theo lực chiến, lõi Mang cộng dồn và xếp hạng
{
  const { Mang } = await import(join(dir, 'mang.js'));
  const rows = [];
  const kv = new Map();
  const mctx = { storage: { sql: { exec: (q, ...a) => { if (q.startsWith('INSERT')) rows.push(a); return []; } }, getAlarm: async () => null, setAlarm: async () => {},
    get: async k => kv.get(k), put: async (k, v) => { kv.set(k, v); } },
    blockConcurrencyWhile: f => f() };
  const mang = new Mang(mctx, {});
  const r1 = await mang.add([{ id: 'u1', name: 'An', n: 500 }, { id: 'u2', name: 'Bình', n: 900 }]);
  assert.deepEqual(r1.top[0], ['Bình', 900]);
  assert.deepEqual(r1.ranks.u1, [2, 500]);
  assert.equal(r1.n, 2);
  await mang.add([{ id: 'u1', n: 1000 }]);
  const r2 = await mang.add([{ id: 'u1', n: 0 }]);
  assert.deepEqual(r2.ranks.u1, [1, 1500]);
  await mang.alarm(); assert.ok(rows.length >= 1 && rows.at(-1)[0].includes('"u1"'));   // cả bảng một dòng

  const ctx2 = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
    getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
  const env2 = { MANG: { idFromName: () => 'id', get: () => mang } };
  const room2 = new Phong(ctx2, env2);
  const h = (uid, pw, co = '0') => new Map([['x-uid', uid], ['x-kind', 'dao'], ['x-cap', '40'], ['x-map', 'vet-nut-ngoai'], ['x-name', encodeURIComponent('Tên ' + uid)], ['x-power', String(pw)], ['x-co', co]]);
  await room2.fetch({ headers: h('p1', 2000) }); const w1 = ctx2.list.at(-1);
  await room2.fetch({ headers: h('p2', 0, '1') }); const w2 = ctx2.list.at(-1);
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'p', p: { name: 'Giả Danh' } }));
  assert.equal(w2.out.at(-1).u.name, 'Tên p1');   // tên thật từ Supabase, không đổi được
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'd', n: 1e12 }));   // hack: kẹp còn ≤ 2000 × 5 × 2 giây
  await room2.webSocketMessage(w2, JSON.stringify({ t: 'd', n: 5000 }));   // cờ đỏ: không tính
  await room2.bossFlush();
  const bx = w1.out.at(-1);
  assert.equal(bx.t, 'bx');
  assert.ok(bx.me && bx.me[1] <= 20000, JSON.stringify(bx.me));
  assert.equal(w2.out.at(-1).me, null);
  assert.equal(bx.lt, 0);   // chưa gửi vị trí: không tính giây chém

  // Linh Thạch ×10: đứng gần đầu boss, chém 2 giây → 2 × farm vết nứt × 10; cờ đỏ, đứng xa: không
  const C = await import(join(dir, 'mang-cfg.js'));
  const TM = JSON.parse(readFileSync(resolve(root, '../../data/thien-mang.json'), 'utf8'));
  assert.equal(C.LT_MULT, TM.lt_mult);
  assert.equal(C.LT_BONUS, TM.lt_bonus);
  for (const [k, v] of Object.entries(TM.heads)) {
    assert.equal(C.FARM_LT_S[k], v.farm_lt_s, 'mang-cfg.js FARM_LT_S lệch data/thien-mang.json: ' + k);
    const g = JSON.parse(readFileSync(resolve(root, `../../data/maps/${k}.json`), 'utf8')).grid, cx = Math.floor(g[0].length / 2);
    let ry = 0; while (ry < g.length && g[ry][cx] === '~') ry++;
    assert.deepEqual(C.HEAD[k], [(cx + 0.5) * 16, (Math.max(0, ry - 1) + 0.5) * 16], 'mang-cfg.js HEAD lệch bản đồ: ' + k);
  }
  const [hx, hy] = C.HEAD['vet-nut-ngoai'];
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'm', x: hx, y: hy + 100 }));
  await room2.webSocketMessage(w2, JSON.stringify({ t: 'm', x: hx, y: hy + 50 }));
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'd', n: 100 }));
  await room2.webSocketMessage(w2, JSON.stringify({ t: 'd', n: 100 }));
  await room2.bossFlush();
  const lt1 = w1.out.at(-1).lt, want = 2 * C.FARM_LT_S['vet-nut-ngoai'] * C.LT_MULT * (1 + C.LT_BONUS);   // một mình đánh: mạnh nhất tuyến
  assert.ok(Math.abs(lt1 - Math.floor(want)) <= 1, `lt ${lt1} ≠ ${want}`);
  assert.equal(w2.out.at(-1).lt, 0);
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'm', x: hx, y: hy + 2000 }));   // chạy xa: không cộng thêm
  room2.dmg.get('p1') && (room2.dmg.get('p1').at -= 2000);
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'd', n: 100 }));
  await room2.bossFlush();
  assert.equal(w1.out.at(-1).lt, lt1);

  { // sát thương 100k và 1k cùng tuyến: chênh chưa tới 1,5 lần
    const mb = new Mang({ storage: { sql: { exec: () => [] }, getAlarm: async () => 1, setAlarm: async () => {}, get: async () => undefined }, blockConcurrencyWhile: f => f() }, {});
    const rb = await mb.add([{ id: 'a', n: 100000, s: 2, map: 'dao-moc' }, { id: 'b', n: 1000, s: 2, map: 'dao-moc' }]);
    const base = 2 * C.FARM_LT_S['dao-moc'] * C.LT_MULT;
    assert.ok(Math.abs(mb.pend.get('a') - base * 1.5) < 1e-6 && Math.abs(mb.pend.get('b') - base * 1.05) < 1e-6, JSON.stringify([...mb.pend]));
    void rb;
  }
  // gửi lô ký HMAC về Supabase: đăng ký khoá một lần, chữ ký khớp, gửi xong thì xoá nợ
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), key: init.headers.apikey }); return { ok: true, status: 200, text: async () => '1' }; };
  mang.env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'pk' };
  mang.payAt = 1;   // tới giờ gửi
  await mang.alarm();
  assert.ok(calls[0].url.endsWith('/rpc/p2d_mang_dang_ky') && calls[0].body.p_khoa.length >= 48);
  const pay = calls.find(c => c.url.endsWith('/rpc/p2d_mang_thuong'));
  const { createHmac, createHash } = await import('node:crypto');
  assert.equal(pay.body.p_ky, createHmac('sha256', calls[0].body.p_khoa).update(`${pay.body.p_ts}.${pay.body.p_ds}`).digest('hex'));
  assert.deepEqual(JSON.parse(pay.body.p_ds), [{ u: 'p1', lt: lt1 }]);
  assert.equal(await mang.vanTay(), createHash('sha256').update(calls[0].body.p_khoa).digest('hex'));
  assert.ok((mang.pend.get('p1') || 0) < 1);
  const n0 = calls.length; await mang.alarm();
  assert.equal(calls.filter(c => c.url.endsWith('dang_ky')).length, 1);   // không đăng ký lại
  assert.equal(calls.length, n0);   // hết nợ: không gửi
  { // khởi động lại: đọc lại đúng bảng từ một dòng đã lưu
    const saved = rows.at(-1)[0];
    const m2 = new Mang({ storage: { sql: { exec: q => (q.includes("FROM anh") ? [{ j: saved }] : []) }, getAlarm: async () => 1, setAlarm: async () => {}, get: async () => undefined }, blockConcurrencyWhile: f => f() }, {});
    assert.deepEqual(m2.tot.get('u1'), mang.tot.get('u1'));
    assert.equal(m2.sum, mang.sum);
  }
  console.log('mang.test: ok');
}

// PvP Ngoại Vực: chỉ khi cả hai tắt bảo vệ, trong tầm, máy chủ tính máu theo lực chiến; gục thì Mang báo Supabase
{
  const C = await import(join(dir, 'mang-cfg.js'));
  const PV = JSON.parse(readFileSync(resolve(root, '../../data/pvp.json'), 'utf8'));
  assert.deepEqual(C.PVP, PV.server, 'mang-cfg.js PVP lệch data/pvp.json server');
  const D0 = Date.now; let T = 1e12; Date.now = () => T;
  const ctx3 = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
    getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
  const kills = [];
  const pks = new Map();
  const env3 = { MANG: { idFromName: () => 'id', get: () => ({ pvp: async (k, v) => { kills.push([k, v]); return true; },
    pkGet: async u => pks.get(u) || { off: false, immune: 0 }, pkSet: async (u, off, immune) => { pks.set(u, { off, immune }); } }) } };
  const r3 = new Phong(ctx3, env3);
  const hh = (uid, pw, map = C.PVP.map) => new Map([['x-uid', uid], ['x-kind', 'dao'], ['x-cap', '40'], ['x-map', map], ['x-name', encodeURIComponent('N' + uid)], ['x-power', String(pw)], ['x-co', '0']]);
  await r3.fetch({ headers: hh('k1', 10000) }); const k1 = ctx3.list.at(-1);
  await r3.fetch({ headers: hh('v1', 100) }); const v1 = ctx3.list.at(-1);
  const m3 = (w, o) => r3.webSocketMessage(w, JSON.stringify(o));
  await m3(k1, { t: 'm', x: 100, y: 100 }); await m3(v1, { t: 'm', x: 150, y: 100 });
  await m3(k1, { t: 'bv', off: true });
  assert.deepEqual(v1.out.at(-1), { t: 'pk', id: 'k1', on: 1 });
  await m3(k1, { t: 'h', to: 'v1' });   // người kia còn bảo vệ: không trúng
  assert.ok(!v1.out.some(o => o.t === 'ph' || o.t === 'pd'));
  await m3(v1, { t: 'bv', off: true });
  await m3(v1, { t: 'm', x: 900, y: 100 }); T += 1000;
  await m3(k1, { t: 'h', to: 'v1' });   // ngoài tầm
  assert.ok(!v1.out.some(o => o.t === 'ph'));
  await m3(v1, { t: 'm', x: 150, y: 100 }); T += 1000;
  await m3(k1, { t: 'h', to: 'v1' });   // 10000 × 0,1 × 1 giây = 1000 ≥ máu 100 × 2 → gục
  const pd = v1.out.find(o => o.t === 'pd');
  assert.ok(pd && pd.to === 'v1' && pd.from === 'k1' && pd.loot === 1, JSON.stringify(v1.out.slice(-3)));
  assert.deepEqual(kills, [['k1', 'v1']]);
  assert.equal(v1.deserializeAttachment().pk, false);   // gục: bảo vệ bật lại
  await m3(v1, { t: 'bv', off: true });
  assert.equal(v1.out.at(-1).e, 'immune');
  // người yếu đánh người mạnh: trúng nhưng không chết ngay; vừa giao chiến thì chưa bật lại bảo vệ được
  T += C.PVP.immune_s * 1000 + 1;
  await m3(v1, { t: 'bv', off: true }); T += 1000;
  await m3(v1, { t: 'h', to: 'k1' });
  const ph = k1.out.filter(o => o.t === 'ph').at(-1);
  assert.ok(ph && ph.to === 'k1' && ph.r > 0.99, JSON.stringify(ph));
  const nph = k1.out.filter(o => o.t === 'ph').length;
  await m3(v1, { t: 'h', to: 'k1' });   // nhịp quá nhanh: bỏ
  assert.equal(k1.out.filter(o => o.t === 'ph').length, nph);
  await m3(v1, { t: 'bv', off: false });   // khiên chỉ bật lại khi chết
  assert.equal(v1.out.at(-1).e, 'only_death');
  // vào lại (đổi tuyến, mất mạng): vẫn tắt khiên
  await r3.fetch({ headers: hh('v1', 100) }); const v1b = ctx3.list.at(-1);
  assert.equal(v1b.deserializeAttachment().pk, true);
  assert.ok(v1b.out.some(o => o.t === 'pk' && o.id === 'v1' && o.on === 1));
  assert.equal(pks.get('k1').off, true);
  // bản đồ khác: không tắt bảo vệ được
  await r3.fetch({ headers: hh('z1', 100, 'thanh-khe') }); const z1 = ctx3.list.at(-1);
  await m3(z1, { t: 'bv', off: true });
  assert.equal(z1.out.at(-1).e, 'map');
  Date.now = D0;
  console.log('pvp.test: ok');
}
