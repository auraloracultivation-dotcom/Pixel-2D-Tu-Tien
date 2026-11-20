// Bài thử trọng tài PvP của máy chủ phòng (cloud/src/pvp.js và tin 'bv', 'h' ở phong.js) chạy trong Node, đồng hồ giả, không cần wrangler.
// Tách khỏi phong.test.mjs ngày 21/11/2026 khi thêm ba luật mới: đòn kèm vị trí người đánh, bù trễ mạng cho mục tiêu, nới nhịp đòn.
// Chạy: node tools/cloud/pvp.test.mjs
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chepCloud, GOC_CLOUD as root } from './nap.mjs';

const dir = chepCloud('pvp-');
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
class FakeWS {
  constructor() { this.readyState = 1; this.out = []; this.att = null; this.ghi = 0; }
  send(s) { if (this.readyState !== 1) throw new Error('closed'); this.out.push(JSON.parse(s)); }
  close(code) { this.readyState = 3; this.closed = code; }
  accept() {}
  serializeAttachment(a) { this.att = structuredClone(a); this.ghi++; }
  deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
}
globalThis.WebSocketPair = class { constructor() { this[0] = new FakeWS(); this[1] = new FakeWS(); } };
globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };
const timers = [];
globalThis.setTimeout = f => { timers.push(f); return timers.length; };
const tick = () => { while (timers.length) timers.shift()(); };   // xả gói lô 200 ms

const { Phong } = await import(join(dir, 'phong.js'));
const C = await import(join(dir, 'mang-cfg.js'));
const PV = JSON.parse(readFileSync(resolve(root, '../../data/pvp.json'), 'utf8'));
assert.deepEqual(C.PVP, PV.server, 'mang-cfg.js PVP lệch data/pvp.json server');
let T = 1e12; Date.now = () => T;

// Một phòng mới với lõi Mang giả (giữ khiên theo tài khoản, ghi lại lần hạ gục). ngu(): phòng ngủ rồi thức (Cloudflare dựng lại lớp Phong:
// mọi thứ trong bộ nhớ mất, kết nối và phần đính kèm của từng kết nối thì còn)
function phongMoi() {
  const ctx = { list: [], setWebSocketAutoResponse() {}, acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
    getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
  const kills = [], pks = new Map();
  const env = { MANG: { idFromName: () => 'id', get: () => ({ pvp: async (k, v, n) => { kills.push([k, v, n]); return true; },
    pkGet: async u => pks.get(u) || { off: false, immune: 0, at: 0 }, pkSet: async (u, off, immune, at) => { pks.set(u, { off, immune, at }); } }) } };
  let r = new Phong(ctx, env);
  const hh = (uid, pw, map) => new Map([['x-uid', uid], ['x-kind', 'dao'], ['x-cap', '40'], ['x-map', map], ['x-name', encodeURIComponent('N' + uid)], ['x-power', String(pw)], ['x-co', '0']]);
  const vao = async (uid, pw, map = C.PVP.map) => { await r.fetch({ headers: hh(uid, pw, map) }); return ctx.list.at(-1); };
  const gui = (w, o) => r.webSocketMessage(w, JSON.stringify(o));
  return { get r() { return r; }, ctx, kills, pks, vao, gui, ngu() { timers.length = 0; r = new Phong(ctx, env); } };
}
const trung = w => w.out.filter(o => o.t === 'ph');   // tin "trúng đòn" kết nối này đã nhận

// 1. Luật gốc (06/11 và 19/11/2026): chỉ khi cả hai tắt bảo vệ, trong tầm, máy chủ tính máu theo lực chiến; gục thì Mang báo Supabase;
//    đánh được ở mọi tinh cầu trừ vòng pháp trận Thiên Kiếm Tinh
{
  const { r: r3, kills, pks, vao, gui: m3 } = phongMoi();
  const k1 = await vao('k1', 10000), v1 = await vao('v1', 100);
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
  assert.deepEqual(kills, [['k1', 'v1', 'ngoai']]);
  assert.equal(v1.deserializeAttachment().pk, false);   // gục: bảo vệ bật lại
  await m3(v1, { t: 'bv', off: true });
  assert.equal(v1.out.at(-1).e, 'immune');
  // người yếu đánh người mạnh: trúng nhưng không chết ngay; vừa giao chiến thì chưa bật lại bảo vệ được
  T += C.PVP.immune_s * 1000 + 1;
  await m3(v1, { t: 'bv', off: true }); T += 1000;
  await m3(v1, { t: 'h', to: 'k1' });
  const ph = trung(k1).at(-1);
  assert.ok(ph && ph.to === 'k1' && ph.r > 0.99, JSON.stringify(ph));
  const nph = trung(k1).length;
  await m3(v1, { t: 'h', to: 'k1' });   // nhịp quá nhanh: bỏ
  assert.equal(trung(k1).length, nph);
  await m3(v1, { t: 'bv', off: false });   // Ngoại Vực: khiên chỉ bật lại khi chết
  assert.equal(v1.out.at(-1).e, 'only_death');
  // vào lại (đổi tuyến, mất mạng): vẫn tắt khiên
  const v1b = await vao('v1', 100);
  assert.equal(v1b.deserializeAttachment().pk, true);
  assert.ok(v1b.out.some(o => o.t === 'pk' && o.id === 'v1' && o.on === 1));
  assert.equal(pks.get('k1').off, true);
  // tinh cầu khác (19/11/2026): đánh được, rơi kiểu 'thuong'; khiên bật lại sau reshield_s giây không giao chiến
  const z1 = await vao('z1', 100, 'thanh-khe');
  await m3(z1, { t: 'bv', off: true });
  assert.deepEqual(z1.out.at(-1), { t: 'pk', id: 'z1', on: 1 });
  const z2 = await vao('z2', 99999, 'thanh-khe');
  await m3(z1, { t: 'm', x: 10, y: 10 }); await m3(z2, { t: 'm', x: 20, y: 10 }); await m3(z2, { t: 'bv', off: true }); T += 1000;
  await m3(z2, { t: 'bv', off: false });   // vừa tắt: chưa đủ giờ
  assert.equal(z2.out.at(-1).e, 'wait_on');
  await m3(z2, { t: 'h', to: 'z1' });
  assert.ok(z1.out.some(o => o.t === 'pd' && o.to === 'z1'));
  assert.deepEqual(kills.at(-1), ['z2', 'z1', 'thuong']);
  await m3(z2, { t: 'm', x: 22, y: 10 });
  assert.equal(r3.vet.has('z2'), true);   // đang tắt khiên: phòng ghi vết vị trí (để bù trễ mạng)
  T += C.PVP.reshield_s * 1000 + 1;
  await m3(z2, { t: 'bv', off: false });
  assert.deepEqual(z2.out.at(-1), { t: 'pk', id: 'z2', on: 0 });
  assert.equal(r3.vet.has('z2'), false, 'bật lại khiên rồi mà vết vị trí còn');
  assert.equal(pks.get('z2').off, false);
  // vòng pháp trận Thiên Kiếm Tinh: không tính đòn khi một trong hai đứng trong vòng
  const S = C.PVP.safe;
  const s1 = await vao('s1', 99999, S.map), s2 = await vao('s2', 100, S.map);
  await m3(s1, { t: 'm', x: S.x + S.r + 60, y: S.y }); await m3(s2, { t: 'm', x: S.x + S.r - 10, y: S.y });
  await m3(s1, { t: 'bv', off: true }); await m3(s2, { t: 'bv', off: true }); T += 1000;
  await m3(s1, { t: 'h', to: 's2' });
  assert.ok(!s2.out.some(o => (o.t === 'ph' || o.t === 'pd') && o.to === 's2'), 'trong vòng pháp trận vẫn bị đánh');
  await m3(s2, { t: 'm', x: S.x + S.r + 20, y: S.y }); T += 1000;
  await m3(s1, { t: 'h', to: 's2' });
  assert.ok(s2.out.some(o => o.t === 'pd' && o.to === 's2'), 'ra khỏi vòng mà không bị đánh');
  assert.equal(r3.vet.has('s2'), false, 'gục rồi mà vết vị trí còn');
}

// 2. Đòn kèm vị trí người đánh (21/11/2026): phòng xét tầm theo vị trí lúc ra đòn, không theo lần gửi vị trí gần nhất (đã cũ)
{
  const { r, vao, gui } = phongMoi();
  const a = await vao('a1', 1000, 'thanh-khe'), b = await vao('b1', 1e6, 'thanh-khe');   // b máu rất dày: không gục giữa bài
  await gui(a, { t: 'bv', off: true }); await gui(b, { t: 'bv', off: true });
  await gui(a, { t: 'm', x: 1000, y: 100, fx: 1, fy: 0 }); await gui(b, { t: 'm', x: 100, y: 100 }); T += 1000;
  await gui(a, { t: 'h', to: 'b1' });   // máy khách cũ, không kèm vị trí: phòng dùng vị trí đang giữ (cách 900) → bỏ
  assert.equal(trung(b).length, 0);
  await gui(a, { t: 'h', to: 'b1', x: 'abc', y: 5 });   // vị trí rác: coi như không kèm
  assert.equal(trung(b).length, 0);
  assert.deepEqual(r.pos.get('a1').slice(0, 2), [1000, 100]);
  tick();
  await gui(a, { t: 'h', to: 'b1', x: 200.4, y: 100 });   // vừa lao tới cách 100: tính, dù lần gửi vị trí gần nhất còn ở xa
  assert.equal(trung(b).length, 1, 'đòn kèm vị trí trong tầm mà không được tính');
  assert.deepEqual(r.pos.get('a1'), [200, 100, 1, 0, 0, 0]);   // toạ độ mới, hướng nhìn giữ như cũ, không tự thêm cờ vung đòn
  tick();
  assert.deepEqual(b.out.filter(o => o.t === 'b').at(-1).m, [['a1', 200, 100, 1, 0, 0, 0]], 'vị trí kèm đòn phải vào gói lô cho người khác thấy');
  // cờ vung đòn (sw) đang chờ trong lô thì giữ, kẻo đòn đè mất hình vung đòn; lô sau thì không lặp lại
  T += 1000;
  await gui(a, { t: 'm', x: 210, y: 100, fx: 1, fy: 0, sw: 1 }); await gui(a, { t: 'h', to: 'b1', x: 212, y: 100 });
  assert.equal(r.moves.get('a1')[4], 1);
  tick(); T += 1000;
  await gui(a, { t: 'h', to: 'b1', x: 214, y: 100 });
  assert.equal(r.moves.get('a1')[4], 0);
  assert.equal(trung(b).length, 3);
  // người đánh báo vị trí trong vòng pháp trận thì không tính; rời phòng thì vết vị trí bị xoá
  await r.webSocketClose(a, 1000);
  assert.equal(r.vet.has('a1'), false);
  assert.equal(r.pos.has('a1'), false);
}

// 3. Bù trễ mạng cho mục tiêu (21/11/2026): trong lag_s giây vừa qua người kia TỪNG ở trong tầm là tính; quá lag_s thì thôi;
//    đã bước vào vòng pháp trận là an toàn ngay (không bù trễ); quãng đường dài giữa hai lần báo chỉ lấy phần trong lag_s giây
{
  const { r, vao, gui } = phongMoi(), L = C.PVP.lag_s * 1000, R = C.PVP.range + C.PVP.range_tol;
  const a = await vao('a2', 1000, 'thanh-khe'), b = await vao('b2', 1e6, 'thanh-khe');
  await gui(a, { t: 'bv', off: true }); await gui(b, { t: 'bv', off: true });
  await gui(a, { t: 'm', x: 200, y: 100 }); await gui(b, { t: 'm', x: 300, y: 100 }); T += 200;
  await gui(b, { t: 'm', x: 200 + R + 60, y: 100 }); T += 100;   // b vừa chạy ra ngoài tầm 0,1 giây trước
  await gui(a, { t: 'h', to: 'b2', x: 200, y: 100 });
  assert.equal(trung(b).length, 1, 'người kia vừa rời tầm 0,1 giây (máy người đánh còn thấy trong tầm) mà đòn bị bỏ');
  T += L + 100;   // b đứng yên ngoài tầm đã hơn lag_s giây
  await gui(a, { t: 'h', to: 'b2', x: 200, y: 100 });
  assert.equal(trung(b).length, 1, 'người kia rời tầm quá lag_s giây mà vẫn bị tính đòn');
  // đi ngang qua: hai lần báo vị trí đều ngoài tầm nhưng quãng đường giữa chúng cắt qua tầm đánh
  T += 5000;
  await gui(b, { t: 'm', x: 200 - R - 40, y: 130 }); T += 200; await gui(b, { t: 'm', x: 200 + R + 40, y: 130 }); T += 100;
  await gui(a, { t: 'h', to: 'b2', x: 200, y: 100 });
  assert.equal(trung(b).length, 2, 'người kia vừa chạy ngang qua trước mặt mà đòn bị bỏ');
  // hai lần báo cách nhau lâu (5 giây) và xa: chỉ phần đường đi trong lag_s giây cuối được xét, chỗ đứng 5 giây trước thì không
  T += 5000;
  await gui(b, { t: 'm', x: 300, y: 100 }); T += 5000; await gui(b, { t: 'm', x: 2300, y: 100 }); T += 100;
  await gui(a, { t: 'h', to: 'b2', x: 200, y: 100 });
  assert.equal(trung(b).length, 2, 'chỗ đứng 5 giây trước vẫn bị tính là trong tầm');
  assert.ok(r.vet.get('b2').length <= 3, 'vết vị trí không được dọn');
  // chạy về phía người đánh rồi DỪNG ngoài tầm đã lâu: không được kéo dài quãng đường cũ tới chỗ người đánh
  T += 5000;
  await gui(b, { t: 'm', x: 1200 - 2 * R - 300, y: 100 }); T += 200; await gui(b, { t: 'm', x: 1200 - R - 150, y: 100 }); T += L + 200;
  await gui(a, { t: 'h', to: 'b2', x: 1200, y: 100 });   // kéo dài đoạn đường cũ thêm đúng quãng thời gian đã trôi thì tới ngay chỗ người đánh
  assert.equal(trung(b).length, 2, 'người kia dừng ngoài tầm đã lâu mà vẫn bị tính đòn');
  // vòng pháp trận thắng bù trễ: vừa ở ngoài vòng (trong tầm), bước vào vòng là không ai đánh được nữa
  const S = C.PVP.safe, s = phongMoi();
  const c = await s.vao('c', 1000, S.map), d = await s.vao('d', 1e6, S.map);
  await s.gui(c, { t: 'bv', off: true }); await s.gui(d, { t: 'bv', off: true });
  await s.gui(c, { t: 'm', x: S.x + S.r + 60, y: S.y }); await s.gui(d, { t: 'm', x: S.x + S.r + 20, y: S.y }); T += 600;
  await s.gui(c, { t: 'h', to: 'd', x: S.x + S.r + 60, y: S.y });
  assert.equal(trung(d).length, 1);
  await s.gui(d, { t: 'm', x: S.x + S.r - 10, y: S.y }); T += 600;
  await s.gui(c, { t: 'h', to: 'd', x: S.x + S.r + 60, y: S.y });
  assert.equal(trung(d).length, 1, 'vừa bước vào vòng pháp trận mà vẫn bị đánh');
  await s.gui(c, { t: 'h', to: 'd', x: S.x + S.r - 5, y: S.y });   // người đánh báo mình đứng trong vòng: cũng không tính
  assert.equal(trung(d).length, 1);
  // người chưa tắt khiên thì không ghi vết (đỡ việc cho phòng đông người đi dạo)
  const e = await s.vao('e', 100, S.map);
  await s.gui(e, { t: 'm', x: 5, y: 5 });
  assert.equal(s.r.vet.has('e'), false);
}

// 4. Nhịp đòn nới cho mạng chập chờn (21/11/2026): hai đòn gửi cách 0,5 giây tới phòng cách nhau 0,35 giây vẫn tính; gửi dồn dập thì
//    không lợi gì vì sát thương mỗi đòn tỉ lệ với số giây từ đòn được tính trước
{
  const { vao, gui } = phongMoi(), G = C.PVP.gap_s * 1000, TOL = C.PVP.gap_tol_s * 1000, PW = 20000;
  const danh = async (nhipMs, soGiay) => {
    const p = phongMoi(), a = await p.vao('x', PW, 'thanh-khe'), b = await p.vao('y', 1e9, 'thanh-khe');
    await p.gui(a, { t: 'bv', off: true }); await p.gui(b, { t: 'bv', off: true });
    await p.gui(a, { t: 'm', x: 10, y: 10 }); await p.gui(b, { t: 'm', x: 50, y: 10 }); T += 60000;
    await p.gui(a, { t: 'h', to: 'y' });   // đòn mở đầu (không tính vào tổng)
    const n0 = trung(b).length;
    for (let t = nhipMs; t <= soGiay * 1000; t += nhipMs) { T += nhipMs; await p.gui(a, { t: 'h', to: 'y' }); }
    const ds = trung(b).slice(n0);
    return { don: ds.length, tong: ds.reduce((s, o) => s + o.n, 0) };
  };
  const a = await vao('a4', PW, 'thanh-khe'), b = await vao('b4', 1e9, 'thanh-khe');
  await gui(a, { t: 'bv', off: true }); await gui(b, { t: 'bv', off: true });
  await gui(a, { t: 'm', x: 10, y: 10 }); await gui(b, { t: 'm', x: 50, y: 10 }); T += 60000;
  await gui(a, { t: 'h', to: 'b4' });
  T += G - TOL + 50; await gui(a, { t: 'h', to: 'b4' });   // tới sớm hơn nhịp chuẩn nhưng trong mức nới: tính, sát thương theo đúng số giây
  assert.equal(trung(b).length, 2, 'đòn tới sớm trong mức nới mà bị bỏ');
  assert.equal(trung(b)[1].n, Math.round(PW * C.PVP.dps_k * (G - TOL + 50) / 1000));
  T += G - TOL - 50; await gui(a, { t: 'h', to: 'b4' });   // sớm quá mức nới: bỏ
  assert.equal(trung(b).length, 2);
  const chuan = await danh(G, 30), don = await danh(G - TOL, 30), cham = await danh(1000, 30);
  assert.equal(chuan.don, 60); assert.equal(don.don, 100);
  const dung = PW * C.PVP.dps_k * 30;   // 30 giây đánh đều: tổng sát thương như nhau dù gửi nhịp nào
  for (const [ten, k] of [['nhịp chuẩn', chuan], ['gửi dồn dập', don], ['gửi thưa', cham]]) assert.ok(Math.abs(k.tong - dung) <= dung * 0.001, `${ten}: tổng sát thương ${k.tong}, phải là ${dung}`);
}
// 5. Phòng ngủ là quên vị trí (thử thật 21/11/2026: im 12 giây là mất): người tắt khiên đứng yên vẫn phải bị đánh trúng được, nhờ chỗ đứng
//    ghi trong phần đính kèm kết nối (a.xy). Bật lại khiên / gục thì xoá, kẻo lần tắt khiên sau xét nhầm chỗ cũ.
{
  const p = phongMoi(), { vao, gui } = p;
  const a = await vao('a5', 1000, 'thanh-khe'), b = await vao('b5', 1e6, 'thanh-khe'), c = await vao('c5', 100, 'thanh-khe');
  await gui(a, { t: 'bv', off: true }); await gui(b, { t: 'bv', off: true });
  await gui(a, { t: 'm', x: 400, y: 300 }); await gui(b, { t: 'm', x: 460, y: 300 });
  const ghiC = c.ghi; await gui(c, { t: 'm', x: 5, y: 5 });
  assert.equal(c.ghi, ghiC, 'người còn khiên đi lại mà phòng ghi phần đính kèm mỗi bước (tốn việc vô ích)');
  assert.deepEqual(b.deserializeAttachment().xy, [460, 300]);
  T += 60000; p.ngu();
  assert.equal(p.r.pos.size, 0);
  await gui(a, { t: 'h', to: 'b5', x: 400, y: 300 });   // máy khách mới: đòn kèm vị trí mình; chỗ của b lấy từ phần đính kèm
  assert.equal(trung(b).length, 1, 'phòng ngủ dậy: người tắt khiên đứng yên không bị đánh trúng được');
  T += 60000; p.ngu();
  await gui(a, { t: 'h', to: 'b5' });   // máy khách cũ, không kèm vị trí: chỗ của cả hai lấy từ phần đính kèm
  assert.equal(trung(b).length, 2, 'phòng ngủ dậy, đòn không kèm vị trí: phải dùng chỗ ghi trong phần đính kèm của người đánh');
  // tắt khiên lúc đang đứng yên: máy khách mới gửi kèm chỗ đứng; máy khách cũ thì lấy vị trí phòng đang giữ
  const d = await vao('d5', 1e6, 'thanh-khe'), e = await vao('e5', 1e6, 'thanh-khe');
  await gui(d, { t: 'bv', off: true, x: 430, y: 340 });
  assert.deepEqual(d.deserializeAttachment().xy, [430, 340]);
  await gui(e, { t: 'm', x: 380, y: 260, fx: 0, fy: 1 }); await gui(e, { t: 'bv', off: true });
  assert.deepEqual(e.deserializeAttachment().xy, [380, 260]);
  assert.deepEqual(p.r.pos.get('e5'), [380, 260, 0, 1, 0, 0]);
  T += 60000; p.ngu();
  await gui(a, { t: 'h', to: 'd5', x: 400, y: 300 }); T += 1000; await gui(a, { t: 'h', to: 'e5', x: 400, y: 300 });
  assert.equal(trung(d).filter(o => o.to === 'd5').length, 1, 'tắt khiên kèm chỗ đứng rồi đứng yên: phải bị đánh trúng được');
  assert.equal(trung(e).filter(o => o.to === 'e5').length, 1, 'tắt khiên lúc phòng đang giữ vị trí rồi đứng yên: phải bị đánh trúng được');
  await gui(d, { t: 'bv', off: false, x: 1, y: 1 });   // bật khiên không nhận vị trí kèm; chưa đủ giờ nên bị từ chối, a.xy giữ nguyên
  assert.deepEqual(d.deserializeAttachment().xy, [430, 340]);
  T += C.PVP.reshield_s * 1000 + 1;
  await gui(d, { t: 'bv', off: false });
  assert.equal(d.deserializeAttachment().pk, false);
  assert.equal(d.deserializeAttachment().xy, undefined, 'bật lại khiên mà chỗ đứng cũ còn ghi');
  // gục: xoá chỗ đứng cũ
  const k = await vao('k5', 9e9, 'thanh-khe'), v = await vao('v5', 100, 'thanh-khe');
  await gui(k, { t: 'bv', off: true, x: 100, y: 100 }); await gui(v, { t: 'bv', off: true, x: 120, y: 100 }); T += 1000;
  await gui(k, { t: 'h', to: 'v5', x: 100, y: 100 });
  assert.ok(v.out.some(o => o.t === 'pd' && o.to === 'v5'));
  assert.equal(v.deserializeAttachment().xy, undefined, 'gục rồi mà chỗ đứng cũ còn ghi');
}
console.log('pvp.test: ok');
