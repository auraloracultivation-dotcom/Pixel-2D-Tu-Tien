// Bài thử Ô GÕ TRONG THẺ LƯỚI (src/ui/grid-cards.js): thẻ trong các bảng lưới (tông môn, linh thú, động phủ…) hiện thành ô, chạm ô mở
// tấm chi tiết là BẢN SAO của thẻ. Bản sao của ô gõ không mang hàm oninput của ô gốc: gõ vào tấm chi tiết thì ô gốc vẫn trống, bấm nút
// (nút sao bấm hộ nút gốc) là gửi chữ rỗng. 21/11/2026 một người chơi gõ tên "Lập tông môn" 6 lần trong 6 phút, máy chủ lần nào cũng
// nhận tên rỗng ('ten_sai'); cả máy chủ không có tông môn mới nào từ 12/11.
// Bài này mở bảng Tông môn thật trong trình duyệt (khách chơi thử, thư viện Supabase thay bằng bản giả ghi lại lời gọi), mở tấm
// "Lập tông môn", gõ tên + lời giới thiệu, bấm Lập, rồi soát chữ máy chủ giả nhận được. Thêm: gõ tiếng Việt kiểu bàn phím điện thoại
// (đang ghép chữ, chưa chốt) rồi bấm nút luôn; bảng dựng lại lúc đang gõ; Tông chủ sửa lời giới thiệu.
// Chạy ở gốc kho: node tools/kiem/o-go-luoi.thu.mjs   (cần playwright; NODE_PATH nếu cài chỗ khác)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }
const PORT = 8794;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

// Thư viện Supabase giả: mọi rpc ghi vào window.__rpc; bang_toi trả null (chưa có tông môn), bang_lap trả như máy chủ thật
const GIA = `
const ghi = (fn, a) => { (window.__rpc ??= []).push({ fn, a: JSON.parse(JSON.stringify(a ?? null)) }); };
const tra = fn => fn === 'p2d_bang_ds' ? [] : fn === 'p2d_bang_lap' ? { id: 'b1', ten: 'x', gia: 20000, phien_ban: 2 } : fn === 'p2d_bang_toi' ? (window.__toi ?? null) : null;
export function createClient() {
  const sess = { user: { id: 'u-thu' }, access_token: 't' };
  return {
    rpc: async (fn, a) => { ghi(fn, a); const d = tra(fn); return { data: d, error: null }; },
    auth: { getSession: async () => ({ data: { session: sess } }), getUser: async () => ({ data: { user: sess.user } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), refreshSession: async () => ({ data: { session: sess } }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; }, send() {}, unsubscribe() {} }), removeChannel() {},
    from: () => ({ select() { return this; }, eq() { return this; }, then: r => r({ data: [], error: null }) }),
  };
}`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'vi-VN' });   // tiếng Việt: chữ trên ô là "Lập tông môn"
await ctx.addInitScript(() => { const t = setInterval(() => { if (window.__game) { window.__game.khoaBo = true; clearInterval(t); } }, 20); });
await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GIA }));
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/?thu=1`);
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(800);
await p.tap('#btn-guest');
await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 });
async function dongThoai() {   // bấm qua hội thoại truyện đầu game (chọn lựa thì chọn cái đầu)
  for (let i = 0; i < 40 && await p.evaluate(() => window.__game.dialog.open); i++) {
    const c = await p.$('#dlg-choices .choice');
    if (c && await c.isVisible()) await c.tap().catch(() => {}); else await p.mouse.click(195, 760);
    await p.waitForTimeout(250);
  }
}
await dongThoai();

let hong = 0;
const thu = (dk, ten) => { console.log(`${dk ? 'ĐẠT ' : 'HỎNG'}  ${ten}`); if (!dk) hong++; };

// Đủ điều kiện lập: Kim Đan, đủ Linh Thạch; bản lưu máy chủ giả để bảng Tông môn chạy (canGuild)
await p.evaluate(() => {
  const g = window.__game;
  g.save.realm = Math.max(g.save.realm, g.data.guild.need_realm); g.save.lingshi = 1e6;
  g.online = g.online || new Proxy({ me: { id: 'u-thu' }, id: 'u-thu' }, { get: (t, k) => (k in t ? t[k] : () => {}) });   // mọi lệnh mạng thành rỗng
  g.cloud = { run: async (job, mirror) => { const r = await job(); mirror?.(r); return r; }, flush: async () => {}, save() {}, mark() {} };
  window.__rpc = [];
});
async function moLap() {
  await dongThoai();
  await p.evaluate(() => window.__game.openGuild('find'));
  await p.waitForFunction(() => [...document.querySelectorAll('#guild-list .gc-tile b')].some(x => x.textContent.includes('Lập tông môn')), null, { timeout: 8000 });
  await p.evaluate(() => [...document.querySelectorAll('#guild-list .gc-tile')].find(t => t.textContent.includes('Lập tông môn')).click());
  await p.waitForSelector('#guild .gc-sheet input', { timeout: 5000 });
  await p.waitForTimeout(500);   // bảng còn dựng lại một lần khi tải xong tông môn của mình (tấm chi tiết tự mở lại)
}
const o = i => p.locator('#guild .gc-sheet input').nth(i);   // tìm lại mỗi lần: bảng dựng lại thì tấm chi tiết là bản mới
const lap = () => p.evaluate(() => { const b = [...document.querySelectorAll('#guild .gc-sheet button')].find(x => x.textContent.includes('Lập tông môn')); b.click(); });
const lanLap = () => p.evaluate(() => (window.__rpc || []).filter(r => r.fn === 'p2d_bang_lap').map(r => r.a));

// 1. Gõ bình thường trong tấm chi tiết
await moLap();
const so = await p.locator('#guild .gc-sheet input').count();
thu(so === 2, `tấm chi tiết có 2 ô gõ (${so})`);
await o(0).tap(); await p.keyboard.type('Văn Lang Tông');
await o(1).tap(); await p.keyboard.type('Tu tiên 5.0');
await lap(); await p.waitForTimeout(600);
let l = await lanLap();
thu(l.length === 1, `bấm Lập gọi máy chủ một lần (${l.length})`);
thu(l[0]?.p_ten === 'Văn Lang Tông', `tên gửi lên đúng chữ đã gõ (${JSON.stringify(l[0]?.p_ten)})`);
thu(l[0]?.p_mo_ta === 'Tu tiên 5.0', `lời giới thiệu gửi lên đúng (${JSON.stringify(l[0]?.p_mo_ta)})`);

// 2. Bàn phím điện thoại: chữ đang ghép (chưa chốt) rồi chạm nút luôn
await p.evaluate(() => { window.__rpc = []; window.__game.guild.mine = null; });
await moLap();
await o(0).tap();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Input.insertText', { text: 'Thiên ' });
await cdp.send('Input.imeSetComposition', { text: 'Kiếm', selectionStart: 4, selectionEnd: 4 });
await p.waitForTimeout(100);
await lap(); await p.waitForTimeout(600);
l = await lanLap();
thu(l[0]?.p_ten?.startsWith('Thiên Kiếm'), `chữ đang ghép cũng được gửi (${JSON.stringify(l[0]?.p_ten)})`);

// 3. Tấm chi tiết mở lại (bảng dựng lại) vẫn giữ chữ đang gõ, gõ tiếp vẫn đúng
await p.evaluate(() => { window.__rpc = []; window.__game.guild.mine = null; });
await moLap();
await o(0).tap(); await p.keyboard.type('Ma Đạo');
await p.evaluate(() => window.__game.openGuild('find'));   // dựng lại bảng như lúc tải danh sách xong
await p.waitForTimeout(400);
const giu = await p.evaluate(() => [...document.querySelectorAll('#guild .gc-sheet input')].map(x => x.value));
thu(giu[0] === 'Ma Đạo' || giu.length === 0, `bảng dựng lại: chữ đang gõ còn nguyên hoặc tấm chi tiết đã đóng (${JSON.stringify(giu)})`);

// 4. Tông chủ sửa lời giới thiệu (tab Tông môn, thẻ "Sửa"): ô gõ trong thẻ cũng phải tới máy chủ
await p.evaluate(() => {
  window.__rpc = [];
  window.__toi = { bang: { id: 'b1', ten: 'Thử Tông', mo_ta: 'cũ', mo: true, diem_tuan: 0 }, chuc: 'chu', toi: { gop_diem: 0, cong_tuan: 0, diem_danh: true, thuong: [] }, tv: [{ k: 'u-thu', ten: 'Thử', chuc: 'chu' }], xin: [], tuan: {} };
  window.__game.guild.mine = window.__toi;
});
await dongThoai();
await p.evaluate(() => window.__game.openGuild('home'));
const T = await p.evaluate(() => window.__game.data.guild.text.edit);
await p.waitForFunction(t => [...document.querySelectorAll('#guild-list .gc-tile b')].some(x => x.textContent.includes(t)), T, { timeout: 8000 }).catch(() => {});
const coO = await p.evaluate(t => { const x = [...document.querySelectorAll('#guild-list .gc-tile')].find(e => e.querySelector('b')?.textContent.includes(t)); x?.click(); return !!x; }, T);
thu(coO, `có ô "${T}" ở tab Tông môn`);
if (coO) {
  await p.waitForSelector('#guild .gc-sheet input', { timeout: 5000 });
  await p.waitForTimeout(500);
  await o(0).tap(); await p.keyboard.press('Control+A'); await p.keyboard.type('Đoàn kết tu tiên');
  await p.evaluate(t => [...document.querySelectorAll('#guild .gc-sheet button')].find(x => x.textContent === t)?.click(), T);
  await p.waitForTimeout(600);
  const sua = await p.evaluate(() => (window.__rpc || []).filter(r => r.fn === 'p2d_bang_sua').map(r => r.a));
  thu(sua[0]?.p_mo_ta === 'Đoàn kết tu tiên', `sửa lời giới thiệu gửi đúng chữ đã gõ (${JSON.stringify(sua[0]?.p_mo_ta)})`);
}

if (errs.length) { console.log('LỖI TRANG:', errs.slice(0, 3)); hong++; }
console.log(hong ? `o-go-luoi.thu: HỎNG ${hong}` : 'o-go-luoi.thu: ok');
await b.close(); server.close(); process.exit(hong ? 1 : 0);
