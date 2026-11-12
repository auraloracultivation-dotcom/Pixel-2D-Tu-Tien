// Bài thử nhịp sống qua phòng (cloud/src/nhip.js): giây tính theo đồng hồ phòng, gửi nhanh không được thêm, gom gửi một lần,
// lỗi mạng giữ giây, báo "kh" đúng máy. Chạy: node tools/cloud/nhip.test.mjs
import assert from 'node:assert/strict';
import { nhipVao, nhipGom, GOM_MS } from '../../cloud/src/nhip.js';

let now = 1_000_000;
Date.now = () => now;
const mkWs = a => { const w = { a: structuredClone(a), sent: [], readyState: 1 }; w.deserializeAttachment = () => structuredClone(w.a); w.serializeAttachment = x => { w.a = structuredClone(x); }; w.send = s => w.sent.push(s); return w; };
const calls = [];
let reply = { khac: [] };
const room = (socks) => ({
  ctx: { alarm: null, getWebSockets: () => socks, storage: { getAlarm: async function () { return room.alarm; }, setAlarm: async t => { room.alarm = t; } } },
  env: { MANG: { idFromName: () => 1, get: () => ({ nhipGop: async rows => { calls.push(rows); if (reply === 'loi') throw new Error('mang'); return reply; } }) } },
});

const A = mkWs({ id: 'u1', at: now, ip: '1.2.3.4' }), B = mkWs({ id: 'u2', at: now });
const R = room([A, B]); room.alarm = null;
now += 5000; await nhipVao(R, A, A.deserializeAttachment(), 'ph1');
assert.equal(A.sent.at(-1), '{"t":"n1"}', 'trả n1');
assert.equal(room.alarm, now + GOM_MS, 'hẹn gom');
assert.equal(A.a.g, 5);
for (let i = 0; i < 50; i++) await nhipVao(R, A, A.deserializeAttachment(), 'ph1');   // gửi dồn dập cùng lúc: không thêm giây
assert.equal(A.a.g, 5, 'gửi nhanh không thêm giây');
now += 20000; await nhipVao(R, A, A.deserializeAttachment(), 'ph1');   // cách 20 giây (>15): không tính
assert.equal(A.a.g, 5, 'quá 15 giây không tính');
now += 10000; await nhipVao(R, A, A.deserializeAttachment(), 'ph1');
assert.equal(A.a.g, 15);
now += 3000; await nhipVao(R, B, B.deserializeAttachment(), 'ph2');   // B: lúc vào cách 38 giây → không tính
assert.equal(B.a.g, 0);

reply = 'loi'; await nhipGom(R);
assert.equal(calls.length, 1); assert.deepEqual(calls[0], [['u1', 15, 'ph1', '1.2.3.4']], 'chỉ gửi người có giây');
assert.equal(A.a.g, 15, 'lỗi mạng giữ giây');
reply = { khac: ['u1'] }; await nhipGom(R);
assert.equal(A.a.g, 0, 'gửi xong trừ giây'); assert.equal(A.sent.at(-1), '{"t":"kh"}', 'báo máy bị thay');
assert.equal(room.alarm, now + GOM_MS, 'còn người thì hẹn tiếp');
console.log('nhip.test: đạt');
