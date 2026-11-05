// Thử Realtime bằng hai trang Chromium không giao diện (chạy tay: node tools/thu-realtime.mjs; cần playwright có sẵn trong máy).
// Khách chơi thử không vào được Realtime thật, nên thư viện supabase-js được thay bằng bản giả: kênh, presence, broadcast, rpc chạy
// qua một "máy chủ" nhỏ trong Node này (đếm tin như Supabase tính: 1 gửi + 1 mỗi người nhận). Code thật của game được thử:
// src/net/online.js, src/net/push.js, src/game/others.js (lọc tin lạ, đi mượt, giới hạn số người vẽ, khoảng gửi),
// src/game/chat-push.js + world-chat.js (tin đẩy, bỏ trùng, đọc bù khi rớt kênh). In kết quả, trượt thì mã thoát 1.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const PORT = 8793, SHOT = process.env.SHOT || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

// supabase-js giả: mọi việc mạng đi qua window.__bus (Node), tin về qua window.__busIn
const FAKE = `
const chans = new Set(); let seq = 0;
const out = m => window.__bus(JSON.stringify(m));
window.__busIn = m => { for (const c of chans) if (c.topic === m.topic) c._in(m); };
window.__rpcLog = [];
export function createClient() {
  const sb = {
    auth: { getSession: async () => ({ data: { session: { access_token: 't', user: { id: window.__uid } } } }), refreshSession: async () => ({ data: {} }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    realtime: { setAuth: async () => {}, isConnected: () => true },
    async rpc(fn, args) { window.__rpcLog.push(fn); const r = JSON.parse(await window.__bus(JSON.stringify({ t: 'rpc', fn, args, uid: window.__uid }))); return r; },
    channel(topic, opts) {
      const ons = [], c = { topic, state: 'closed', key: opts?.config?.presence?.key || ('k' + (++seq)), pres: {},
        on(type, f, cb) { ons.push({ type, ev: f?.event, cb }); return c; },
        subscribe(cb) { c.cb = cb; chans.add(c); out({ t: 'sub', topic, key: c.key }); c.state = 'joined'; setTimeout(() => cb?.('SUBSCRIBED'), 20); return c; },
        track(meta) { out({ t: 'track', topic, key: c.key, meta }); return Promise.resolve('ok'); },
        send(m) { out({ t: 'bc', topic, key: c.key, event: m.event, payload: m.payload }); return Promise.resolve('ok'); },
        presenceState() { return c.pres; },
        _drop() { c.state = 'errored'; c.cb?.('CHANNEL_ERROR'); },
        _in(m) {
          if (m.t === 'sync') { c.pres = m.state; for (const o of ons) if (o.type === 'presence' && o.ev === 'sync') o.cb(); }
          if (m.t === 'bc' && m.key !== c.key) for (const o of ons) if (o.type === 'broadcast' && (o.ev === '*' || o.ev === m.event)) o.cb({ event: m.event, payload: m.payload });
        } };
      window.__chans = chans;
      return c;
    },
    async removeChannel(c) { chans.delete(c); c.state = 'closed'; out({ t: 'unsub', topic: c.topic, key: c.key }); },
  };
  return sb;
}`;

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));   // cài toàn máy: NODE_PATH=$(npm root -g)
const b = await chromium.launch();
const pages = [], topics = new Map(), count = { sent: 0, recv: 0, byTopic: {} }, chat = [];
let chatId = 100;
const deliver = (m, except) => { for (const p of pages) if (p !== except) p.evaluate(x => window.__busIn?.(x), m).catch(() => {}); };
function syncTopic(topic) {
  const T = topics.get(topic) || new Map(), state = {};
  for (const [key, v] of T) if (v.meta) state[key] = [v.meta];
  for (const [, v] of T) v.page.evaluate(x => window.__busIn?.(x), { t: 'sync', topic, state }).catch(() => {});
}
async function onBus(page, raw) {
  const m = JSON.parse(raw);
  if (m.t === 'rpc') {
    if (m.fn === 'p2d_doc_chat') return JSON.stringify({ data: chat.filter(r => r.kenh === m.args.p_kenh && r.id > (m.args.p_sau || 0)).map(r => ({ ...r, la_toi: r.uid === m.uid })), error: null });
    if (m.fn === 'p2d_gui_chat') {
      const r = { id: ++chatId, kenh: m.args.p_kenh, ten: m.uid, chu: m.args.p_noi_dung, luc: new Date().toISOString(), canh_gioi: 1, k: (m.uid + '000000000000').slice(0, 12).replace(/[^0-9a-f]/g, 'a'), uid: m.uid };
      chat.push(r);
      const { uid, ...pub } = r;   // trigger p2d_chat_day: đẩy lên p2dc:<kênh>
      busSend({ t: 'bc', topic: 'p2dc:' + r.kenh, key: 'server', event: 'tin', payload: pub });
      return JSON.stringify({ data: r.id, error: null });
    }
    return JSON.stringify({ data: [], error: null });
  }
  if (m.t === 'sub') { if (!topics.has(m.topic)) topics.set(m.topic, new Map()); topics.get(m.topic).set(m.key, { page, meta: null }); syncTopic(m.topic); }
  if (m.t === 'unsub') { topics.get(m.topic)?.delete(m.key); syncTopic(m.topic); }
  if (m.t === 'track') { const v = topics.get(m.topic)?.get(m.key); if (v) { v.meta = m.meta; syncTopic(m.topic); } }
  if (m.t === 'bc') busSend(m);
  return 'null';
}
function busSend(m) {
  const T = topics.get(m.topic) || new Map();
  const n = [...T.keys()].filter(k => k !== m.key).length;
  count.sent++; count.recv += n; count.byTopic[m.topic] = (count.byTopic[m.topic] || 0) + 1 + n;
  for (const [k, v] of T) if (k !== m.key) v.page.evaluate(x => window.__busIn?.(x), m).catch(() => {});
}

async function openPage(uid, name) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  pages.push(p);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.exposeFunction('__bus', raw => onBus(p, raw));
  await p.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE }));
  await p.addInitScript(id => { window.__uid = id; }, uid);
  await p.goto(`http://localhost:${PORT}/?thu=1`);
  await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
  await p.waitForTimeout(600);
  await p.click('#btn-guest');
  await p.waitForSelector('#dlg-choices .choice', { timeout: 30000 });
  await (await p.$$('#dlg-choices .choice'))[0].dispatchEvent('pointerdown');
  await p.waitForTimeout(500);
  // Qua hết lời thoại mở đầu để vòng game chạy (game.update đứng khi hộp thoại mở)
  for (let i = 0; i < 80 && await p.evaluate(() => window.__game.dialog.open); i++) {
    await p.evaluate(() => { const c = document.querySelector('#dlg-choices .choice'); if (c && c.offsetParent) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await p.waitForTimeout(60);
  }
  await p.evaluate(async ({ uid, name }) => {
    const g = window.__game;
    const { createOnline } = await import('/src/net/online.js');
    g.online = createOnline({ id: uid, name }, { onPresence: l => g.others.presence(l), onMove: m => g.others.move(m), onClear: () => g.others.clear() });
    g.cloud = new Proxy({ name }, { get: (t, k) => (k in t ? t[k] : k === 'then' ? undefined : () => Promise.resolve(null)) });   // giả đã đăng nhập (chat-push cần)
  }, { uid, name });
  return { p, errs };
}

const results = [];
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log(`${pass ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); };

const A = await openPage('aaaaaaaa-0000-4000-8000-00000000000a', 'Alice');
const B = await openPage('bbbbbbbb-0000-4000-8000-00000000000b', 'Bob');
ok('Qua lời thoại mở đầu', !(await A.p.evaluate(() => window.__game.dialog.open)) && !(await B.p.evaluate(() => window.__game.dialog.open)));
const mapId = await A.p.evaluate(() => window.__game.map.id);
const topic = 'p2d:' + mapId;

// 1. Một mình trên kênh: không gửi vị trí
await A.p.evaluate(async id => { const g = window.__game; await g.online.join(id, { look: g.save.look, element: g.save.element, realm: 'Luyện Khí' }); g.input.axis = () => ({ x: 1, y: 0 }); }, mapId);
await A.p.waitForTimeout(1500);
ok('Một mình trên kênh thì không gửi vị trí', !count.byTopic[topic], `tin: ${count.byTopic[topic] || 0}`);

// 2. B vào cùng kênh: thấy Alice, đi mượt
await B.p.evaluate(async id => {
  const g = window.__game; if (g.map.id !== id) await g.travel?.(id);
  await g.online.join(id, { look: g.save.look, element: g.save.element, realm: 'Luyện Khí' });
  g.input.axis = () => ({ x: 0, y: 0 });
  window.__track = []; let last = performance.now();
  const loop = now => { const o = g.others.visible()[0]; if (o) window.__track.push([now - last, o.x, o.y]); last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}, mapId);
const t0 = count.byTopic[topic] || 0, sendsBefore = count.sent;
await B.p.waitForTimeout(400);
// Alice đi tới đi lui quanh chỗ Bob để luôn "ở gần"
await A.p.evaluate(() => { const g = window.__game; let k = 0; window.__walk = setInterval(() => { k++; g.input.axis = () => (k % 16 < 8 ? { x: 1, y: 0 } : { x: -1, y: 0 }); }, 250); });
const bpos = await B.p.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
await A.p.evaluate(p => { const g = window.__game; g.player.x = p.x + 40; g.player.y = p.y; }, bpos);
await B.p.waitForTimeout(5000);
const seen = await B.p.evaluate(() => { const o = window.__game.others.visible()[0]; return o && { name: o.def.name, x: o.x, y: o.y, look: o.look, n: window.__game.others.count() }; });
ok('Bob thấy Alice với tên và hình dáng', seen?.name === 'Alice' && seen.n === 1 && !!seen.look, JSON.stringify(seen));
const apos = await A.p.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
await A.p.evaluate(() => { clearInterval(window.__walk); window.__game.input.axis = () => ({ x: 0, y: 0 }); });
await B.p.waitForTimeout(1200);
const fin = await B.p.evaluate(() => { const o = window.__game.others.visible()[0]; return { x: o.x, y: o.y }; });
const apos2 = await A.p.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
ok('Alice dừng thì Bob thấy đứng đúng chỗ', Math.hypot(fin.x - apos2.x, fin.y - apos2.y) < 3, `lệch ${Math.hypot(fin.x - apos2.x, fin.y - apos2.y).toFixed(1)} điểm ảnh (lúc đang đi ${Math.hypot(seen.x - apos.x, seen.y - apos.y).toFixed(0)})`);
const track = await B.p.evaluate(() => window.__track);
let maxStep = 0, jumps = 0;
for (let i = 1; i < track.length; i++) { const d = Math.hypot(track[i][1] - track[i - 1][1], track[i][2] - track[i - 1][2]), lim = 260 * Math.max(track[i][0], 16) / 1000 + 0.5; maxStep = Math.max(maxStep, d); if (d > lim) jumps++; }
ok('Đi mượt: không bước nào vượt tốc độ tối đa', jumps === 0, `${track.length} khung, bước lớn nhất ${maxStep.toFixed(2)} điểm ảnh`);
const moveMsgs = count.sent - sendsBefore, rate = moveMsgs / 6.6;
ok('Tần số gửi khi có người gần ≤ 4,5 tin/giây', rate <= 4.5 && rate >= 2, `${rate.toFixed(2)} tin gửi/giây, tổng tin tính tiền kênh đảo ${(count.byTopic[topic] - t0)}`);

// 3. Tin lạ: tên, toạ độ, mã hình
const bad = await B.p.evaluate(() => {
  const g = window.__game, O = g.others;
  O.presence([...g.online ? [] : [], { id: 'aaaaaaaa-0000-4000-8000-00000000000a', name: 'Alice' }, { id: 'evil-1', name: '\u202eli<b>ve</b>\u0000 ' + 'x'.repeat(80), look: '__proto__', element: 'constructor', outfit: '<img onerror=1>' }, { id: '../../x', name: 'bad id' }]);
  O.move({ id: 'evil-1', x: 1e12, y: -5, fx: 99, fy: 'a' });
  O.move({ id: 'evil-1', x: NaN, y: 3 });
  const e = O.list.get('evil-1');
  return { name: e.def.name, look: e.look, element: e.element, outfit: e.outfit, x: e.x, y: e.y, face: e.face, badId: O.list.has('../../x'), w: g.map.w * g.map.T };
});
ok('Tên lạ bị lọc, cắt ngắn; mã hình / hệ lạ bỏ; toạ độ kẹp trong bản đồ', !/[\u202e\u0000<>]/.test(bad.name) && Array.from(bad.name).length <= 24 && bad.look === null && bad.element === null && bad.outfit === null && bad.x === bad.w && bad.y === 0 && !bad.badId, JSON.stringify(bad));

// 4. Giới hạn số người vẽ theo mức nhẹ máy
const cap = await B.p.evaluate(() => {
  const g = window.__game, O = g.others, p = g.player, L = [];
  for (let i = 0; i < 30; i++) L.push({ id: 'npc-' + i, name: 'Khách ' + i });
  O.presence(L);
  for (let i = 0; i < 30; i++) O.move({ id: 'npc-' + i, x: p.x + i * 10, y: p.y });
  O.update(0.3);
  const lv = +(document.body.dataset.perf || 0), want = g.data.config.realtime.shown[lv];
  const v = O.visible();
  return { n: v.length, want, lv, nearest: v.every(o => +o.id.slice(4) < want), gap: O.sendGap() };
});
ok('Chỉ vẽ người gần nhất theo mức nhẹ máy', cap.n === cap.want && cap.nearest, JSON.stringify(cap));
await B.p.evaluate(() => window.__game.others.presence([]));
if (SHOT) {
  await B.p.evaluate(async id => { const g = window.__game; await g.online.leave(); await g.online.join(id, { look: g.save.look, element: g.save.element, realm: 'Luyện Khí' }); }, mapId);
  await A.p.evaluate(p => { const g = window.__game; g.player.x = p.x + 30; g.player.y = p.y; g.input.axis = () => ({ x: 0, y: 0.01 }); }, bpos);
  await B.p.waitForTimeout(1500);
  await B.p.screenshot({ path: SHOT });
}

// 5. Chat máy chủ đẩy
await A.p.waitForTimeout(3500);   // chat-push vào kênh sau vòng sync 3 giây
const st = await B.p.evaluate(() => window.__game.pushState?.());
ok('Đăng nhập thì nghe kênh chat thế giới và truyền âm', st?.length >= 2 && st.every(s => s.live), JSON.stringify(st));
const rpcBefore = await B.p.evaluate(() => window.__rpcLog.filter(f => f === 'p2d_doc_chat').length);
const sentAt = Date.now();
const note = await A.p.evaluate(async () => { const { sendWorld } = await import('/src/game/world-chat.js'); return sendWorld(window.__game, 'Chào cả nhà'); });
await B.p.waitForFunction(() => window.__game.chats?.['the-gioi']?.list.some(m => m.chu === 'Chào cả nhà'), null, { timeout: 3000 }).catch(() => {});
const got = await B.p.evaluate(() => window.__game.chats['the-gioi'].list.filter(m => m.chu === 'Chào cả nhà'));
const mine = await A.p.evaluate(() => window.__game.chats['the-gioi'].list.filter(m => m.chu === 'Chào cả nhà'));
ok('Tin chat tới máy khác ngay, không cần đọc lại', got.length === 1 && !got[0].la_toi, `${Date.now() - sentAt} ms, lời nhắc gửi: "${note}"`);
ok('Tin của mình được nhận là của mình, không trùng', mine.length === 1 && mine[0].la_toi === true, JSON.stringify(mine.map(m => m.la_toi)));
await B.p.evaluate(async () => { const { pullWorld } = await import('/src/game/world-chat.js'); await pullWorld(window.__game); await pullWorld(window.__game); });
const rpcAfter = await B.p.evaluate(() => window.__rpcLog.filter(f => f === 'p2d_doc_chat').length);
ok('Đang nghe Realtime thì vòng đọc cũ không gọi máy chủ', rpcAfter === rpcBefore, `${rpcAfter - rpcBefore} lần p2d_doc_chat`);
await B.p.evaluate(async () => { for (const c of window.__chans) if (c.topic === 'p2dc:the-gioi') c._drop(); const { pullWorld } = await import('/src/game/world-chat.js'); await pullWorld(window.__game); });
const rpcDrop = await B.p.evaluate(() => window.__rpcLog.filter(f => f === 'p2d_doc_chat').length);
ok('Rớt kênh thì quay về đọc qua máy chủ', rpcDrop === rpcAfter + 1, `${rpcDrop - rpcAfter} lần`);
const dup = await B.p.evaluate(() => window.__game.chats['the-gioi'].list.filter(m => m.chu === 'Chào cả nhà').length);
ok('Đọc bù không làm trùng tin đã đẩy', dup === 1);

ok('Không có lỗi JavaScript', !A.errs.length && !B.errs.length, [...A.errs, ...B.errs].slice(0, 3).join(' | '));
await b.close(); server.close();
const fail = results.filter(r => !r.pass).length;
console.log(fail ? `❌ ${fail}/${results.length} bài trượt` : `✅ ${results.length} bài đạt`);
process.exit(fail ? 1 : 0);
