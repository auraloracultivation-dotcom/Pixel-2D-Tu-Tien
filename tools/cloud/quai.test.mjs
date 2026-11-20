// Bài thử trọng tài quái chung của máy chủ phòng (cloud/src/quai.js và tin 'q' ở phong.js) chạy trong Node, đồng hồ giả, không cần wrangler.
// Bảng bãi dùng trong bài thử là bảng riêng ghi đè cloud/src/quai-cfg.js trong thư mục tạm (máu to, số tròn cho dễ tính); bảng thật của
// game được tools/quai-chung.mjs soát khớp data/ (tools/check.mjs).
// Chạy: node tools/cloud/quai.test.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chepCloud } from './nap.mjs';

const dir = chepCloud('quai-');
// bãi 0: 2 con, hồi 4 giây, máu 100, ở (100, 100), có thể dị chủng; bãi 2: 3 con, hồi 2 giây, máu 1 triệu, ở (500, 500)
const BANG = { tam: 480, dps_k: 5, bud_s: 10, own_ms: 1500, dong: [3, 5], hiem: [0.5, 3], maps: { thu: { v: 'chu-ky', s: [[0, 2, 4000, 100, 100, 100, 1], [2, 3, 2000, 1e6, 500, 500, 0]] } } };
writeFileSync(join(dir, 'quai-cfg.js'), `export const QUAI = ${JSON.stringify(BANG)};\n`);

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
const timers = [];
globalThis.setTimeout = f => { timers.push(f); return timers.length; };
const tick = () => { while (timers.length) timers.shift()(); };   // xả gói lô 200 ms
let T = 1e12; Date.now = () => T;

const { Phong } = await import(join(dir, 'phong.js'));
const P = await import(join(dir, 'proto.js'));

// Một phòng mới. ngu(): phòng ngủ rồi thức (Cloudflare dựng lại lớp Phong: bộ nhớ mất, kết nối còn). rnd: dãy số "ngẫu nhiên" cho phòng.
function phongMoi(rnd = []) {
  const ctx = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
    getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
  const env = { MANG: { idFromName: () => 'id', get: () => ({ pkGet: async () => ({ off: false, immune: 0, at: 0 }), pkSet: async () => {} }) } };
  let r = new Phong(ctx, env);
  const day = () => { r.qRnd = () => (rnd.length ? rnd.shift() : 0.99); };
  day();
  const vao = async (uid, pw = 1000, map = 'thu', kind = 'dao') => {
    await r.fetch({ headers: new Map([['x-uid', uid], ['x-kind', kind], ['x-cap', '40'], ['x-map', map], ['x-power', String(pw)], ['x-co', '0']]) });
    return ctx.list.at(-1);
  };
  const gui = (w, o) => r.webSocketMessage(w, JSON.stringify(o));
  return { get r() { return r; }, ctx, vao, gui, ngu() { timers.length = 0; r = new Phong(ctx, env); day(); } };
}
const cuoi = (w, t) => w.out.filter(o => o.t === t).at(-1);
const lo = w => { tick(); return cuoi(w, 'b'); };

// 1. Bản đồ không có quái chung: tin chào không có q, tin 'q' bị bỏ qua; phòng tổ đội cũng vậy
{
  const { vao, gui } = phongMoi();
  const a = await vao('a', 1000, 'ban-do-khac');
  assert.equal(cuoi(a, 'w').q, undefined);
  await gui(a, { t: 'q', n: 1, x: 100, y: 100, h: [[0, 50]], m: [[0, 100, 100, 0]] });
  assert.equal(cuoi(a, 'qa'), undefined);
  const { vao: vao2, gui: gui2 } = phongMoi();
  const d = await vao2('d', 1000, 'thu', 'to');
  assert.equal(cuoi(d, 'w').q, undefined);
  await gui2(d, { t: 'q', n: 1, x: 100, y: 100, h: [[0, 50]] });
  assert.equal(cuoi(d, 'qa'), undefined);
}

// 2. Tin chào mang chữ ký bảng; đòn trừ máu chung; người đánh nhận lời đáp kèm số thứ tự tin, cả tuyến nhận máu mới trong gói lô
{
  const { vao, gui } = phongMoi();
  const a = await vao('a'), b = await vao('b');
  assert.deepEqual(cuoi(a, 'w').q, { v: 'chu-ky', d: [] });
  await gui(a, { t: 'q', n: 7, x: 110, y: 100, h: [[0, 30]] });
  assert.deepEqual(cuoi(a, 'qa'), { t: 'qa', n: 7, h: [[0, 70]] });
  assert.deepEqual(lo(b).qh, [[0, 70]]);
  assert.ok(lo(b).m.some(e => e[0] === 'a' && e[1] === 110), 'chỗ đứng kèm trong tin q cũng tới người khác (đang đánh quái thì người khác vẫn thấy mình)');
  await gui(b, { t: 'q', n: 1, x: 90, y: 100, h: [[0, 20]] });
  assert.deepEqual(cuoi(b, 'qa').h, [[0, 50]], 'máu là máu chung: người sau đánh tiếp từ chỗ người trước');
  // người vào sau thấy đúng máu đang có
  const c = await vao('c');
  assert.deepEqual(cuoi(c, 'w').q.d, [[0, 50, 0, 0]]);
}

// 3. Chết: công chia theo sát thương, không tính quá máu còn lại; báo cả phòng giờ hồi, con kế có dị chủng không, hạt chỗ mọc
{
  const { vao, gui } = phongMoi([0.9, 0.5]);   // 0.9 ≥ 0.5: con kế không dị chủng; hạt = 1 + floor(0.5 × 999) = 500
  const a = await vao('a'), b = await vao('b');
  await gui(a, { t: 'q', n: 1, x: 100, y: 100, h: [[1, 75]] });
  await gui(b, { t: 'q', n: 1, x: 100, y: 100, h: [[1, 999]] });   // chỉ còn 25 máu: chỉ được tính 25
  const k = cuoi(a, 'qk');
  assert.deepEqual(k, { t: 'qk', s: 1, r: 4000, ra: 0, sd: 500, c: [['a', 0.75], ['b', 0.25]] });
  assert.deepEqual(cuoi(b, 'qk'), k, 'cả phòng nhận cùng một tin hạ quái');
  assert.deepEqual(cuoi(b, 'qa'), { t: 'qa', n: 1, h: [] }, 'đòn kết liễu vẫn có lời đáp (rỗng), kẻo máy khách lệch số thứ tự');
  // đánh tiếp vào ô đã chết: lời đáp báo đã chết, còn bao lâu thì hồi; không có tin hạ quái thứ hai
  T += 1000;
  await gui(a, { t: 'q', n: 2, x: 100, y: 100, h: [[1, 10]] });
  assert.deepEqual(cuoi(a, 'qa'), { t: 'qa', n: 2, h: [[1, -3000, 0, 500]] });
  assert.equal(a.out.filter(o => o.t === 'qk').length, 1);
  // người vào lúc này thấy ô đó đang chết
  const c = await vao('c');
  assert.deepEqual(cuoi(c, 'w').q.d, [[1, -3000, 0, 500]]);
  // tới giờ: sống lại đầy máu, đánh được; công của mạng trước không dính sang
  T += 3000;
  await gui(b, { t: 'q', n: 2, x: 100, y: 100, h: [[1, 100]] });
  assert.deepEqual(cuoi(b, 'qk').c, [['b', 1]]);
}

// 4. Dị chủng do phòng quyết lúc chết, mạng sau máu gấp hiem[1] lần; bãi không có dị chủng thì không bao giờ
{
  const { vao, gui } = phongMoi([0.1, 0, 0.1, 0]);   // 0.1 < 0.5: dị chủng
  const a = await vao('a', 1e6);
  await gui(a, { t: 'q', n: 1, x: 100, y: 100, h: [[0, 100]] });
  assert.equal(cuoi(a, 'qk').ra, 1);
  T += 4000;
  await gui(a, { t: 'q', n: 2, x: 100, y: 100, h: [[0, 100]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 200]], 'dị chủng: máu 100 × 3');
  const c = await vao('c');
  assert.deepEqual(cuoi(c, 'w').q.d, [[0, 200, 1, 1]], 'người vào sau biết con này là dị chủng và mọc theo hạt nào');
  await gui(a, { t: 'q', n: 3, x: 500, y: 500, h: [[128, 1e6]] });   // bãi 2 không có dị chủng (cột cuối 0)
  assert.equal(cuoi(a, 'qk').s, 128);
  assert.equal(cuoi(a, 'qk').ra, 0);
}

// 5. Kẹp theo lực chiến: thùng dps_k × lực chiến mỗi giây (ít nhất 1 000 lực chiến), lúc đầu 2 giây, dồn tối đa bud_s giây
{
  const { vao, gui } = phongMoi();
  const a = await vao('a', 2000);   // 10 000 mỗi giây, lúc đầu 20 000, tối đa 100 000
  await gui(a, { t: 'q', n: 1, x: 500, y: 500, h: [[128, 1e9]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[128, 1e6 - 20000]]);
  await gui(a, { t: 'q', n: 2, x: 500, y: 500, h: [[128, 1e9]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[128, 1e6 - 20000]], 'hết thùng: đòn không được tính');
  T += 500;
  await gui(a, { t: 'q', n: 3, x: 500, y: 500, h: [[128, 1e9]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[128, 1e6 - 25000]]);
  T += 3600e3;   // nghỉ một giờ cũng chỉ dồn được bud_s giây
  await gui(a, { t: 'q', n: 4, x: 500, y: 500, h: [[128, 1e9]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[128, 1e6 - 125000]]);
  const y = await vao('y', 0);   // lực chiến 0: tính như 1 000
  await gui(y, { t: 'q', n: 1, x: 500, y: 500, h: [[129, 1e9]] });
  assert.deepEqual(cuoi(y, 'qa').h, [[129, 1e6 - 10000]]);
}

// 6. Tầm: đứng xa con quái quá tam thì đòn không tính (lời đáp vẫn trả máu thật); chỗ đứng lấy từ chính tin đòn
{
  const { vao, gui } = phongMoi();
  const a = await vao('a');
  await gui(a, { t: 'q', n: 1, x: 100 + 481, y: 100, h: [[0, 50]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 100]]);
  await gui(a, { t: 'q', n: 2, x: 100 + 480, y: 100, h: [[0, 50]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 50]]);
  await gui(a, { t: 'q', n: 3, h: [[0, 10]] });   // tin không kèm chỗ đứng: dùng chỗ lần trước
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 40]]);
  const b = await vao('b');
  await gui(b, { t: 'q', n: 1, h: [[0, 10]] });   // chưa từng báo chỗ đứng: không tính, vẫn đáp
  assert.deepEqual(cuoi(b, 'qa'), { t: 'qa', n: 1, h: [] });
}

// 7. Giữ quái: người báo vị trí đầu tiên giữ con đó, người khác báo đè bị bỏ; quá own_ms không có tin thì người khác giữ được.
//    Tầm đánh xét theo chỗ con quái đang được báo; hết người giữ thì coi như nó về bãi.
{
  const { vao, gui } = phongMoi();
  const a = await vao('a'), b = await vao('b');
  await gui(a, { t: 'q', n: 1, x: 900, y: 100, m: [[0, 880, 100, 1]] });
  assert.deepEqual(lo(b).q, [['a', [0, 880, 100, 1]]]);
  T += 300;
  await gui(b, { t: 'q', n: 1, x: 100, y: 100, m: [[0, 120, 100, 0]], h: [[0, 10]] });
  assert.equal(lo(a).q, undefined, 'người khác đang giữ: tin vị trí của b bị bỏ');
  assert.deepEqual(cuoi(b, 'qa').h, [[0, 100]], 'con quái đang ở (880, 100) theo người giữ: b đứng ở bãi là ngoài tầm');
  await gui(a, { t: 'q', n: 2, x: 900, y: 100, h: [[0, 10]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 90]]);
  T += 1500;
  await gui(b, { t: 'q', n: 2, x: 100, y: 100, h: [[0, 10]] });
  assert.deepEqual(cuoi(b, 'qa').h, [[0, 80]], 'a thôi báo quá own_ms: con quái coi như về bãi, b đánh được');
  await gui(b, { t: 'q', n: 3, x: 100, y: 100, m: [[0, 120, 100, 0]] });
  assert.deepEqual(lo(a).q, [['b', [0, 120, 100, 0]]], 'giờ b giữ');
  // con đã chết thì không ai giữ được
  await gui(b, { t: 'q', n: 4, x: 100, y: 100, h: [[0, 80]] });
  tick();
  await gui(a, { t: 'q', n: 3, x: 100, y: 100, m: [[0, 100, 100, 0]] });
  tick();
  assert.equal(cuoi(b, 'b').q?.some(g => g[0] === 'a'), undefined);
}

// 8. Tuyến đông thì quái hồi nhanh: giờ hồi chia cho (số người / ref), nhanh nhất max lần
{
  const { vao, gui } = phongMoi();
  const a = await vao('a');
  for (let i = 0; i < 8; i++) await vao('n' + i);   // 9 người, ref 3: nhanh gấp 3
  await gui(a, { t: 'q', n: 1, x: 100, y: 100, h: [[0, 100]] });
  assert.equal(cuoi(a, 'qk').r, Math.round(4000 / 3));
  for (let i = 8; i < 30; i++) await vao('n' + i);   // 31 người: chạm trần max 5
  await gui(a, { t: 'q', n: 2, x: 100, y: 100, h: [[1, 100]] });
  assert.equal(cuoi(a, 'qk').r, 800);
}

// 9. Dữ liệu lạ: không ném lỗi, không đổi gì; tin dài bị cắt còn 24 mục
{
  const { vao, gui, r } = phongMoi();
  const a = await vao('a');
  const rac = [null, 1, 'x', [], [-1, 5], [0.5, 5], [63, 5], [2, 5], [64, 5], [130 + 1, 5], [0, NaN], [0, -5], [0, '5'], [0, Infinity], ['0', 5], [{}, 5], [1e9, 5]];
  await gui(a, { t: 'q', n: 'x', x: 100, y: 100, h: rac, m: rac });
  assert.deepEqual(cuoi(a, 'qa'), { t: 'qa', n: 0, h: [[0, 100], [0, 100], [0, 100], [0, 100]] }, 'chỉ ô 0 hợp lệ được đáp, đòn rác không trừ máu');
  await gui(a, { t: 'q', n: 1, x: 100, y: 100, h: 'abc', m: { 0: 1 } });
  await gui(a, { t: 'q', n: 2, x: 100, y: 100, m: [[0, 1e9, 5, 0], [0, 'a', 5, 0], [0, 5, null, 0]] });
  tick();
  assert.equal(cuoi(a, 'b')?.q, undefined, 'vị trí quái ngoài bản đồ / không phải số: bỏ');
  await gui(a, { t: 'q', n: 3, x: 500, y: 500, h: Array.from({ length: 100 }, () => [128, 1]) });
  assert.equal(cuoi(a, 'qa').h.length, 24);
  assert.equal(cuoi(a, 'qa').h.at(-1)[1], 1e6 - 24);
  assert.equal(r.q.o.size, 2, 'ô không có trong bảng không được tạo');
}

// 10. Phòng ngủ rồi thức: quên hết, mọi con coi như sống đầy máu (máy khách tự khớp); người rời phòng thì thùng và tin chờ của họ được dọn
{
  const p = phongMoi();
  const a = await p.vao('a'), b = await p.vao('b');
  await p.gui(a, { t: 'q', n: 1, x: 100, y: 100, h: [[0, 100]] });
  assert.equal(cuoi(a, 'qk').s, 0);
  p.ngu();
  await p.gui(a, { t: 'q', n: 2, x: 100, y: 100, h: [[0, 10]] });
  assert.deepEqual(cuoi(a, 'qa').h, [[0, 90]]);
  await p.gui(b, { t: 'q', n: 1, x: 100, y: 100, m: [[1, 100, 100, 0]] });
  assert.equal(p.r.q.mv.has('b'), true);
  await p.r.webSocketClose(b, 1000);
  assert.equal(p.r.q.mv.has('b'), false);
  assert.equal(p.r.q.bud.has('a'), true);
  await p.r.webSocketClose(a, 1000);
  assert.equal(p.r.q.bud.has('a'), false);
}

// 11. Gói lô chỉ có phần quái chung vẫn được phát; máy khách bản cũ đọc gói này không vướng (không có m, s, k thì thôi)
{
  assert.deepEqual(P.makeBatch(new Map(), [], [], { q: [['a', [0, 1, 2, 0]]], h: [[0, 5]] }), { t: 'b', q: [['a', [0, 1, 2, 0]]], qh: [[0, 5]] });
  assert.deepEqual(P.makeBatch(new Map(), [], [], null), { t: 'b' });
  assert.deepEqual(P.makeBatch(new Map(), [], [], { q: [], h: [] }), { t: 'b' });
}

console.log('quai.test: ok');
