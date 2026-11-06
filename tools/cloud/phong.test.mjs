// Bài thử máy chủ phòng Cloudflare (cloud/src) chạy trong Node, không cần wrangler: giả lập tối thiểu WebSocket Hibernation API.
// Chạy: node tools/cloud/phong.test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '../../cloud/src');
const dir = mkdtempSync(join(tmpdir(), 'phong-'));
writeFileSync(join(dir, 'proto.js'), readFileSync(join(root, 'proto.js'), 'utf8'));
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
  const mctx = { storage: { sql: { exec: (q, ...a) => { if (q.startsWith('INSERT')) rows.push(a); return []; } }, getAlarm: async () => null, setAlarm: async () => {} },
    blockConcurrencyWhile: f => f() };
  const mang = new Mang(mctx, {});
  const r1 = await mang.add([{ id: 'u1', name: 'An', n: 500 }, { id: 'u2', name: 'Bình', n: 900 }]);
  assert.deepEqual(r1.top[0], ['Bình', 900]);
  assert.deepEqual(r1.ranks.u1, [2, 500]);
  assert.equal(r1.n, 2);
  await mang.add([{ id: 'u1', n: 1000 }]);
  const r2 = await mang.add([{ id: 'u1', n: 0 }]);
  assert.deepEqual(r2.ranks.u1, [1, 1500]);
  await mang.alarm(); assert.ok(rows.length >= 2);

  const ctx2 = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
    getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
  const env2 = { MANG: { idFromName: () => 'id', get: () => mang } };
  const room2 = new Phong(ctx2, env2);
  const h = (uid, pw, co = '0') => new Map([['x-uid', uid], ['x-kind', 'dao'], ['x-cap', '40'], ['x-name', encodeURIComponent('Tên ' + uid)], ['x-power', String(pw)], ['x-co', co]]);
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
  console.log('mang.test: ok');
}
