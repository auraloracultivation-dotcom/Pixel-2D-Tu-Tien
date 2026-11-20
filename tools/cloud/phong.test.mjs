// Bài thử máy chủ phòng Cloudflare (cloud/src) chạy trong Node, không cần wrangler: giả lập tối thiểu WebSocket Hibernation API.
// Chạy: node tools/cloud/phong.test.mjs
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import v8 from 'node:v8';
import assert from 'node:assert/strict';
import { chepCloud, GOC_CLOUD as root } from './nap.mjs';

const dir = chepCloud();   // mọi tệp cloud/src, 'cloudflare:workers' thay bằng lớp giả

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
// Hồ sơ theo bảng data/dong-bo.json → ho_so: trường nào khai trong bảng cũng phải qua được máy chủ phòng (20/11/2026: pt, vk, st, ri
// từng bị bỏ ở đây nên người khác không thấy pháp tượng, vũ khí); thứ phòng tự gắn thì máy khách gửi lên cũng bỏ
{
  const { docBang, daiCua, sinh, TEP } = await import('../dong-bo.mjs');
  const H = docBang().ho_so;
  assert.equal(readFileSync(resolve(root, '../..', TEP), 'utf8'), sinh(), `${TEP} lệch data/dong-bo.json: chạy node tools/dong-bo.mjs --ghi`);
  const mau = d => (d.kieu === 'ten' ? 'Lạc Tuyết' : d.kieu === 'so' ? '1'.repeat(d.dai) : d.kieu === 'chon' ? d.gia_tri[0] : d.kieu === 'co' ? 1 : 'ma-thu_1');
  const gui = Object.fromEntries(Object.entries(H).map(([k, d]) => [k, mau(d)])), ra = P.cleanProf(gui);
  for (const [k, d] of Object.entries(H)) {
    if (d.ai === 'may-chu') assert.equal(ra[k], undefined, `máy chủ phòng tự gắn "${k}", không nhận từ máy khách`);
    else assert.equal(ra[k], gui[k], `trường "${k}" trong bảng bị máy chủ phòng bỏ`);
  }
  const la = P.cleanProf({ ...gui, id: 'ke-khac', x: 1, y: 2, joined: 5, la: 'x', constructor: 'x', __proto__: { look: 'y' } });
  for (const k of ['id', 'x', 'y', 'joined', 'la', 'pk']) assert.equal(Object.hasOwn(la, k), false, `khoá lạ "${k}" lọt qua hồ sơ`);
  assert.equal(Object.hasOwn(la, 'constructor'), false);
  assert.equal(P.cleanProf({ st: 'bay-len-troi' }).st, undefined);   // dài quá mức của trường
  // Hồ sơ nằm trong phần đính kèm kết nối (serializeAttachment, Cloudflare giới hạn 2 048 byte): trường nào cũng dài tối đa vẫn phải vừa
  const dayDu = Object.fromEntries(Object.entries(H).filter(([, d]) => d.ai !== 'may-chu').map(([k, d]) => [k, d.kieu === 'ten' ? 'Ạ'.repeat(d.dai) : 'w'.repeat(daiCua(d))]));
  const att = { id: 'a'.repeat(36), kind: 'dao', at: Date.now(), ip: 'f'.repeat(45), nm: 'Ạ'.repeat(24), pw: 123456789, co: false, map: 'm'.repeat(80), pk: true, immune: Date.now(), pvpAt: Date.now(), pkSaved: Date.now(), xy: [99999, 99999], g: 12.5, nt: Date.now(), ph: 'p'.repeat(64), p: { ...P.cleanProf(dayDu), pk: 1 } };
  const cỡ = v8.serialize(att).length;
  assert.ok(cỡ < 1900, `hồ sơ đầy đủ làm phần đính kèm kết nối nặng ${cỡ} byte (giới hạn Cloudflare 2 048): bớt trường hoặc rút "dai" trong data/dong-bo.json`);
}
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
    get: async k => kv.get(k), put: async (k, v) => { kv.set(k, v); }, delete: async k => kv.delete(k) },
    blockConcurrencyWhile: f => f() };
  const mang = new Mang(mctx, {});
  mang.moTo = Date.now() + 1e9;   // boss đang mở
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
  { const hm = t => t.split(':').reduce((h, m) => h * 60 + +m); assert.deepEqual(C.LICH, { tz: TM.lich.tz, from: hm(TM.lich.from), to: hm(TM.lich.to) }, 'mang-cfg.js LICH lệch data/thien-mang.json lich'); }
  for (const [k, v] of Object.entries(TM.heads)) {
    assert.equal(C.FARM_LT_S[k], v.farm_lt_s, 'mang-cfg.js FARM_LT_S lệch data/thien-mang.json: ' + k);
    const g = JSON.parse(readFileSync(resolve(root, `../../data/maps/${k}.json`), 'utf8')).grid, cx = Math.floor(g[0].length / 2);
    let ry = 0; while (ry < g.length && g[ry][cx] === '~') ry++;
    assert.deepEqual(C.HEAD[k], [(cx + 0.5) * 16, (Math.max(0, ry - 1) + 0.5) * 16], 'mang-cfg.js HEAD lệch bản đồ: ' + k);
  }
  { // vùng không gian: chín đầu khớp hình boss và bản đồ, farm như nhau
    const ar = TM.arena, spr = JSON.parse(readFileSync(resolve(root, '../../data/art.json'), 'utf8')).sprites['boss.mang'];
    const mg = JSON.parse(readFileSync(resolve(root, `../../data/maps/${ar.map}.json`), 'utf8')).grid, W = mg[0].length * 16, H = mg.length * 16;
    const bx = W * ar.x, by = H * ar.y, w = ar.h * spr.w / spr.h;
    TM.sky.mouths.forEach(([mx, my], i) => { const q = C.HEAD[ar.map][i]; assert.ok(Math.abs(q[0] - (bx + (mx - 0.5) * w)) < 0.2 && Math.abs(q[1] - (by - (1 - my) * ar.h)) < 0.2, 'mang-cfg.js HEAD vùng lệch: đầu ' + i); });
    assert.equal(C.FARM_LT_S[ar.map], ar.farm_lt_s);
  }
  const [hx, hy] = C.HEAD['vet-nut-ngoai'];
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'm', x: hx, y: hy + 100 }));
  await room2.webSocketMessage(w2, JSON.stringify({ t: 'm', x: hx, y: hy + 50 }));
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'd', n: 100 }));
  await room2.webSocketMessage(w2, JSON.stringify({ t: 'd', n: 100 }));
  await room2.bossFlush();
  const lt1 = w1.out.at(-1).lt, want = 2 * C.FARM_LT_S['vet-nut-ngoai'] * C.LT_MULT * (1 + C.LT_BONUS);   // một mình đánh: mạnh nhất tuyến
  const base0 = want / (1 + C.LT_BONUS);   // thùng trần lực chiến có thể cắt bớt sát thương: thưởng nằm giữa phần cố định và tối đa
  assert.ok(lt1 >= Math.floor(base0) - 1 && lt1 <= Math.floor(want) + 1, `lt ${lt1} ngoài [${base0}, ${want}]`);
  assert.equal(w2.out.at(-1).lt, 0);
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'm', x: hx, y: hy + 2000 }));   // chạy xa: không cộng thêm
  room2.dmg.get('p1') && (room2.dmg.get('p1').at -= 2000);
  await room2.webSocketMessage(w1, JSON.stringify({ t: 'd', n: 100 }));
  await room2.bossFlush();
  assert.equal(w1.out.at(-1).lt, lt1);

  { // sát thương 100k và 1k cùng tuyến: chênh chưa tới 1,5 lần
    const mb = new Mang({ storage: { sql: { exec: () => [] }, getAlarm: async () => 1, setAlarm: async () => {}, get: async () => undefined }, blockConcurrencyWhile: f => f() }, {}); mb.moTo = Date.now() + 1e9;
    const rb = await mb.add([{ id: 'a', n: 100000, s: 2, map: 'dao-moc', pw: 1e6 }, { id: 'b', n: 1000, s: 2, map: 'dao-moc', pw: 1e6 }]);
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
  { // lệnh quản trị có ký: sai chữ ký thì từ chối; 'bang' trả cả bảng; 'xong' cất lịch sử, xoá bảng
    const { createHmac } = await import('node:crypto');
    const khoa = kv.get('khoa'), ts = Date.now(), ky = a => createHmac('sha256', khoa).update(`${ts}.${a}`).digest('hex');
    assert.equal(await mang.lenh('bang', ts, 'sai'), null);
    const b = await mang.lenh('bang', ts, ky('bang'));
    assert.ok(b.d.length >= 2 && b.d[0][2] >= b.d[1][2]);
    const x = await mang.lenh('xong', ts, ky('xong'));
    assert.ok(x.ok && mang.tot.size === 0 && mang.sum === 0);
  }
  { // trần theo lực chiến dùng chung mọi tuyến, gửi dồn dập không vượt
    const mt = new Mang({ storage: { sql: { exec: () => [] }, getAlarm: async () => 1, setAlarm: async () => {}, get: async () => undefined }, blockConcurrencyWhile: f => f() }, {}); mt.moTo = Date.now() + 1e9;
    for (let i = 0; i < 50; i++) await mt.add([{ id: 'x', n: 1e9, pw: 1000, s: 0 }]);
    assert.ok(mt.tot.get('x').v <= 1000 * 5 * 2.5, String(mt.tot.get('x').v));   // 2 giây đầu + chút thời gian thật trôi trong vòng lặp
  }
  { // boss tắt: không nhận sát thương, không Linh Thạch; lệnh mo / tat có ký
    const { createHmac } = await import('node:crypto');
    const khoa = kv.get('khoa'), ts = Date.now(), ky = x => createHmac('sha256', khoa).update(`${ts}.${x}`).digest('hex');
    const v0 = mang.tot.get('u1')?.v || 0;
    assert.ok((await mang.lenh('tat', ts, ky('tat'))).ok);
    const D1 = Date.now, vn = (h, m) => Date.UTC(2026, 10, 6, h - 7, m);   // giờ VN → ms (lịch boss 20:30–21:00 giờ VN)
    Date.now = () => vn(10, 0);
    const rt = await mang.add([{ id: 'u1', n: 500, s: 2, map: 'dao-moc', pw: 1e6 }]);
    assert.equal(mang.tot.get('u1')?.v || 0, v0); assert.equal(rt.mo, 0);
    Date.now = () => vn(20, 45);   // trong lịch: tắt tay vẫn mở theo giờ
    const rl = await mang.add([{ id: 'u1', n: 500, s: 2, map: 'dao-moc', pw: 1e6 }]);
    assert.ok((mang.tot.get('u1')?.v || 0) > v0, 'trong lịch phải nhận sát thương'); assert.equal(rl.mo, vn(21, 0));
    Date.now = D1;
    assert.equal(await mang.lenh('mo', ts, ky('mo'), '30'), null);   // thiếu tham số trong chữ ký
    const r = await mang.lenh('mo', ts, ky('mo.30'), '30');
    assert.ok(r.ok && r.mo > Date.now() + 29 * 60000);
  }
  { // tổng kết hằng ngày: gửi bảng ký HMAC tới p2d_mang_tong_ket rồi xoá bảng; Supabase báo đã phát thì cũng xoá
    const F0 = globalThis.fetch, sent = [];
    globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200, text: async () => '1' }; };
    mang.env = { ...(mang.env || {}), SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' };
    const n0 = [...mang.tot.values()].filter(x => x.v > 0).length;
    const r = await mang.tongKet();
    const tk = sent.find(c => c.url.endsWith('/p2d_mang_tong_ket'));
    assert.ok(r.ok && r.n === n0 && n0 > 0 && tk, JSON.stringify(r));
    const ds = JSON.parse(tk.body.p_ds); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(ds.ngay) && ds.d[0][0] === 'u1');
    assert.equal(mang.tot.size, 0); assert.equal(mang.sum, 0);
    assert.deepEqual(await mang.tongKet(), { ok: true, n: 0 });   // bảng trống: không gửi
    globalThis.fetch = F0;
  }
  console.log('mang.test: ok');
}

// Trọng tài PvP (cloud/src/pvp.js): bài thử riêng ở tools/cloud/pvp.test.mjs
