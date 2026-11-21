// Bài thử quái chung trên tinh cầu tông môn (chủ dự án 22/11/2026 00:1x "Máu theo cấp tinh cầu"), chạy trong Node, không cần wrangler.
// Soát ba điều, trên các tinh cầu giả mọi mặt đất × mọi cấp, có và không có công trình:
//   1. Máy khách (kh-gen.js genPlanet → quai-chung-bang.js bangQuai) và máy chủ phòng (QUAI.kh trong cloud/src/quai-cfg.js → kh-bai.js
//      khBangQuai) ra CÙNG một bảng, cùng chữ ký.
//   2. Máu một con quái mọc trên máy khách (mob-power.js zonePower, mobs.js scaleMobBy) đúng bằng máu trong bảng, với MỌI cảnh giới người
//      nhìn (trước 22/11 mỗi người thấy một mức máu); tắt quai_chung.kh thì về đo theo người nhìn như cũ.
//   3. Phòng (cloud/src/phong.js + quai-kh.js) đọc dòng tinh cầu qua p2d_kh_ds (fetch giả): chào kèm đúng bảng, bố cục đổi thì máy khách
//      xin đọc lại và phòng phát 'qv', luật cách quãng đọc lại, đọc hỏng thì không có quái chung, ngủ dậy thì đọc lại.
// Chạy: node tools/cloud/quai-kh.test.mjs
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chepCloud } from './nap.mjs';
import { napData } from '../quai-chung.mjs';
import { genPlanet } from '../../src/game/kh-gen.js';
import { bangQuai } from '../../src/game/quai-chung-bang.js';
import { zonePower } from '../../src/game/mob-power.js';
import { scaleMobBy } from '../../src/game/mobs.js';
import { khBangQuai } from '../../src/game/kh-bai.js';

const doc = f => JSON.parse(readFileSync(new URL(`../../data/${f}.json`, import.meta.url), 'utf8'));
const data = napData();
data.npcs = doc('npcs'); data.tiles = doc('tiles');
const K = data['khai-hoang'];
const dir = chepCloud('quai-kh-');
const { QUAI } = await import(join(dir, 'quai-cfg.js'));
const KBmay = JSON.parse(JSON.stringify(QUAI.kh));   // như máy chủ phòng đọc (qua JSON)
assert.ok(KBmay && data.config.quai_chung.kh, 'quai_chung.kh phải bật và QUAI.kh phải có');

// Tinh cầu giả: mỗi mặt đất × mỗi cấp; một nửa có công trình (mã ct có thật + một công trình riêng)
const ctMa = Object.keys(K.ct);
const tinhCau = [];
let so = 0;
for (const mat of Object.keys(K.grounds)) for (const L of K.levels) {
  so++;
  const id = `00000000-0000-4000-8000-${String(so).padStart(12, '0')}`, hat = 1000 + so * 7919;
  const bay = so % 2 ? [] : [[ctMa[so % ctMa.length], 20 + (so % 5), 18, 0, { n: 'Thử' }], ['u.thu', 30, 28, 0], [ctMa[(so + 3) % ctMa.length], 14, 30, 0]];
  tinhCau.push({ id, ten: 'Thử ' + so, mat_dat: mat, hat, cap: L.cap, bay, rieng: { 'u.thu': { ten: 'Lầu thử', loai: 'nha', npc: 'Người thử' } } });
}

// Đưa một tinh cầu vào data như khai-hoang.js inject
function inject(p) {
  const { def, mobCp } = genPlanet(K, p, { data });
  data.maps[def.id] = def;
  data.config.mob_cp.maps[def.id] = mobCp;
  return def;
}

// Máu con quái mọc ở bãi i trên máy khách có cảnh giới realm (như quai-chung.js moc)
function mauMay(def, i, realm) {
  const game = { data, map: { id: def.id, def }, save: { realm } };
  const sp = def.spawners[i], m = { def: { ...data.mobs[sp.mob] } };
  m.hp = m.maxHp = m.def.hp;
  zonePower(game, m, sp);
  if (sp.mul && sp.mul !== 1) scaleMobBy(game, m, sp.mul, sp.tag);
  return m.maxHp;
}

// 1 + 2
let bai = 0, coCt = 0;
for (const p of tinhCau) {
  const def = inject(p), B = bangQuai(data, p.id), Bm = khBangQuai(KBmay, p);
  assert.ok(B && B.s.length, `tinh cầu ${p.mat_dat} cấp ${p.cap}: không có bãi quái chung`);
  assert.deepEqual(Bm, B, `tinh cầu ${p.mat_dat} cấp ${p.cap}: bảng máy chủ phòng khác bảng máy khách`);
  if (p.bay.length && def.spawners.length < K.gen.rings.reduce((a, r) => a + r.n, 0)) coCt++;
  assert.equal(B.s.length, def.spawners.length, `${p.mat_dat} cấp ${p.cap}: số bãi trong bảng khác số bãi trên bản đồ máy khách`);
  for (const r of B.s) {
    const sp = def.spawners[r[0]], T = data.config.tile || 16;
    assert.deepEqual([r[4], r[5]], [Math.round((sp.at[0] + 0.5) * T), Math.round((sp.at[1] + 0.5) * T)], `${p.mat_dat} cấp ${p.cap} bãi ${r[0]}: chỗ bãi khác bản đồ máy khách`);
    for (const realm of [0, 1, 2, 3, 4, 6]) assert.equal(mauMay(def, r[0], realm), r[3], `${p.mat_dat} cấp ${p.cap} bãi ${r[0]} cảnh giới ${realm}: máu máy khách ${mauMay(def, r[0], realm)} khác bảng ${r[3]}`);
    bai++;
  }
}
assert.ok(coCt > 0, 'bài thử phải có tinh cầu bị công trình che mất bãi (soát vùng che chở)');
// tắt kh: bảng tinh cầu tông môn không còn, máu lại theo cảnh giới người nhìn
{
  const C = data.config.quai_chung, p = tinhCau.find(x => x.cap === 3), def = data.maps[p.id];
  C.kh = false;
  assert.equal(bangQuai(data, p.id), null);
  const a = mauMay(def, 0, 0), b = mauMay(def, 0, 6);
  assert.notEqual(a, b, 'tắt kh thì máu phải theo cảnh giới người nhìn như cũ');
  C.kh = true;
}
// trận Khai Tinh: không có bảng
{
  const p = tinhCau[0];
  const { def } = genPlanet(K, { ...p, id: 'kt-thu' }, { fight: true, cap: p.cap, ticket: 'x', data });
  data.maps['kt-thu'] = def;
  assert.equal(bangQuai(data, 'kt-thu'), null);
}
console.log(`✅ ${tinhCau.length} tinh cầu giả, ${bai} bãi: bảng máy khách = bảng máy chủ phòng, máu không đổi theo cảnh giới người nhìn`);

// 3. Phòng thật (mã cloud/src) với fetch giả
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
class FakeWS {
  constructor() { this.readyState = 1; this.out = []; this.att = null; }
  send(s) { if (this.readyState !== 1) throw new Error('closed'); this.out.push(JSON.parse(s)); }
  close(code) { this.readyState = 3; this.closed = code; }
  accept() {}
  serializeAttachment(a) { this.att = structuredClone(a); }
  deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
}
globalThis.WebSocketPair = class { constructor() { this[0] = new FakeWS(); this[1] = new FakeWS(); } };
globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };
globalThis.setTimeout = () => 0;
let T = 1e12; Date.now = () => T;
let ds = tinhCau.map(p => ({ ...p, vong: 1, goc: 0, trong: false, bang: 'T' })), hong = false, goi = 0;
globalThis.fetch = async (url, init) => {
  if (!String(url).endsWith('/rest/v1/rpc/p2d_kh_ds')) throw new Error('fetch lạ: ' + url);
  assert.equal(init.method, 'POST'); assert.equal(init.headers.apikey, 'khoa-cong-khai');
  goi++;
  if (hong) return { ok: false, json: async () => null };
  return { ok: true, json: async () => JSON.parse(JSON.stringify(ds)) };
};
const { Phong } = await import(join(dir, 'phong.js'));
const ctx = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
  getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
const env = { SUPABASE_URL: 'https://gia', SUPABASE_KEY: 'khoa-cong-khai', MANG: { idFromName: () => 'id', get: () => ({ pkGet: async () => ({ off: false }), pkSet: async () => {} }) } };
let r = new Phong(ctx, env);
const vao = async (uid, map) => {
  await r.fetch({ headers: new Map([['x-uid', uid], ['x-kind', 'dao'], ['x-cap', '40'], ['x-map', map], ['x-power', '100000'], ['x-co', '0']]) });
  return ctx.list.at(-1);
};
const gui = (w, o) => r.webSocketMessage(w, JSON.stringify(o));
const cuoi = (w, t) => w.out.filter(o => o.t === t).at(-1);
const p = tinhCau.find(x => x.bay.length && x.cap === 2), Bdau = bangQuai(data, p.id);

// chào kèm đúng bảng của tinh cầu; người vào sau trong 60 giây không đọc lại
const a = await vao('a', p.id);
assert.equal(cuoi(a, 'w').q?.v, Bdau.v, 'tin chào phải mang chữ ký bảng tinh cầu tông môn');
assert.equal(goi, 1);
T += 30e3;
const b = await vao('b', p.id);
assert.equal(cuoi(b, 'w').q?.v, Bdau.v); assert.equal(goi, 1, 'người vào trong 60 giây dùng bảng đã đọc');
// đánh được: con ở bãi đầu, đứng ngay chỗ nó
const [i0, , , hp0, x0, y0] = Bdau.s[0], slot = i0 * 64;
await gui(a, { t: 'q', n: 1, x: x0, y: y0, h: [[slot, 50]] });
assert.deepEqual(cuoi(a, 'qa').h, [[slot, hp0 - 50]], 'phòng phải trừ máu theo bảng tinh cầu tông môn');

// tông chủ bày lại công trình: dòng tinh cầu đổi, máy khách có bố cục mới thấy lệch thì xin đọc lại
const p2 = { ...p, bay: [[ctMa[1], 33, 22, 0]] };
ds = ds.map(x => (x.id === p.id ? { ...x, bay: p2.bay } : x));
inject(p2);
const Bmoi = bangQuai(data, p.id);
assert.notEqual(Bmoi.v, Bdau.v, 'bài thử cần bố cục mới đổi bảng');
T += 5e3;
await gui(b, { t: 'q', n: 0, x: 0, y: 0, qr: 1 });
assert.equal(goi, 2, 'xin đọc lại thì phòng đọc lại (đã quá 10 giây từ lần trước)');
for (const w of [a, b]) assert.equal(cuoi(w, 'qv')?.q?.v, Bmoi.v, 'bảng đổi thì phát qv cho cả tuyến');
assert.equal(cuoi(a, 'qv').q.d.length, 0, 'bảng mới: sổ quái làm lại từ đầu');
const qvCua = w => w.out.filter(o => o.t === 'qv').length;
await gui(b, { t: 'q', n: 0, x: 0, y: 0, qr: 1 });
assert.equal(goi, 2, 'xin đọc lại liên tục: cách nhau ít nhất 10 giây');
assert.equal(qvCua(b), 2, 'không đọc lại thì vẫn đáp riêng người xin trạng thái hiện tại');
assert.equal(cuoi(b, 'qv').q.v, Bmoi.v);
T += 11e3;
await gui(b, { t: 'q', n: 0, x: 0, y: 0, qr: 1 });
assert.equal(goi, 3);
assert.equal(qvCua(a), 1, 'bảng không đổi thì không phát qv cho cả tuyến');
assert.equal(qvCua(b), 3, 'bảng không đổi: chỉ người xin nhận qv');

// phòng ngủ rồi dậy (bộ nhớ mất): tin 'q' kế tiếp đọc lại bảng rồi mới xét đòn
r = new Phong(ctx, env);
await gui(a, { t: 'q', n: 2, x: Bmoi.s[0][4], y: Bmoi.s[0][5], h: [[Bmoi.s[0][0] * 64, 10]] });
assert.equal(goi, 4); assert.deepEqual(cuoi(a, 'qa').h, [[Bmoi.s[0][0] * 64, Bmoi.s[0][3] - 10]]);

// đọc Supabase hỏng: người vào không có quái chung (về quái riêng), không vỡ phòng
ctx.list = [];
r = new Phong(ctx, env);
hong = true;
const c = await vao('c', p.id);
assert.equal(cuoi(c, 'w').q, undefined, 'đọc hỏng: chào không kèm bảng');
await gui(c, { t: 'q', n: 1, x: 0, y: 0, h: [[slot, 5]] });
assert.equal(cuoi(c, 'qa'), undefined);
// tinh cầu không có trong danh sách (đã bỏ): không có quái chung
hong = false; T += 61e3;
const d = await vao('d', '11111111-2222-4333-8444-555555555555');
assert.equal(cuoi(d, 'w').q, undefined);
// bản đồ thường không gọi Supabase; máy khách nạp lại bản đồ tại chỗ (qr) thì được đáp trạng thái quái chung hiện tại
const g0 = goi;
ctx.list = []; r = new Phong(ctx, env);
const e = await vao('e', 'dao-xich-dien'), f = await vao('f', 'dao-xich-dien');
const Bx = QUAI.maps['dao-xich-dien'], sx = Bx.s[0][0] * 64;
await gui(e, { t: 'q', n: 1, x: Bx.s[0][4], y: Bx.s[0][5], h: [[sx, 1]] });
await gui(e, { t: 'q', n: 0, x: 0, y: 0, qr: 1 });
assert.equal(goi, g0, 'bản đồ thường không đọc p2d_kh_ds');
assert.equal(cuoi(e, 'qv')?.q?.v, Bx.v, 'bản đồ thường: xin lại thì được đáp qv đúng bảng');
assert.deepEqual(cuoi(e, 'qv').q.d.find(x => x[0] === sx)?.[1], Bx.s[0][3] - 1, 'qv mang máu hiện tại');
assert.equal(qvCua(f), 0, 'chỉ người xin nhận');
console.log('✅ phòng: chào đúng bảng, đọc lại khi bố cục đổi (phát qv), cách quãng đọc lại, ngủ dậy đọc lại, đọc hỏng thì về quái riêng');
