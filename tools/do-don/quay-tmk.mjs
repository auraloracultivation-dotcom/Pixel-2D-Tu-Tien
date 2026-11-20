// Chụp các màn của Trấn Ma Kỷ ở đúng cỡ điện thoại (docs/14-TRAN-MA-KY.md phần B; docs/10-CAI-HON.md: đo bằng hình ở 390×844 rồi chủ dự án xem):
//   node tools/do-don/quay-tmk.mjs <thư mục ra>        (NGON=en | zh-Hant: chụp bản dịch; clip đúng nhịp người chơi: quay-tmk-clip.mjs)
// Ra các ảnh: 01 bìa sổ · 02 một quyển · 03–05 thẻ mở quyển (0,4 / 1,0 / 2,5 giây) · 06 dàn cảnh đầu trang · 07 một câu thoại · 08 thẻ mừng đọc xong trang
// (có thiên quy) · 09 nghi lễ đột phá có dòng nghĩa cảnh giới · 10–12 Chín thiên quy, Khẩu quyết, Cấm Kỵ Các · 13 thẻ khép quyển · 14 khẩu quyết trên đầu.
// Kịch bản: người chơi thử không tài khoản, bản lưu dựng sẵn ở cuối phần mở đầu (Luyện Khí tầng 9, đã tới Xích Diễm Tinh), rồi "hạ Huyết Nha thật ở Hỏa Quật"
// bằng cách gọi thẳng móc của game. Không gọi máy chủ thật. Cuối bài in số lỗi JavaScript; có lỗi thì thoát mã 1.
import { mkdirSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8793);
const out = process.argv[2] || 'tmk-anh'; mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
if (process.env.NGON) await ctx.addInitScript(l => { try { localStorage.setItem('p2d_lang', l); } catch { /* không có kho nhớ */ } }, process.env.NGON);   // NGON=en | zh-Hant: chụp bản dịch
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
const ev = (f, a) => p.evaluate(f, a), cho = ms => new Promise(r => setTimeout(r, ms)), shot = n => p.screenshot({ path: `${out}/${n}.png` });
const vao = async () => { await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 }); await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 }); };
// Bấm qua mọi hộp thoại, lựa chọn đang mở như người chơi
const qua = () => ev(async () => { const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let quiet = 0, i = 0; i < 300 && quiet < 10; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); } });
const coMat = () => ev(() => window.dispatchEvent(new Event('pointerdown')));   // tính là người chơi vừa chạm màn
const the = () => ev(() => { const r = document.getElementById('the-quyen'); return r && !r.hidden ? r.textContent : ''; });

await p.goto('http://localhost:8793/?thu=1'); await vao(); await cho(1500);
await ev(async () => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)), s = g.save;
  for (let i = 0; i < 40 && !s.gioi; i++) { document.querySelector('#dlg-choices .choice')?.click(); await wait(100); }
  Object.assign(s, { step: 10, stepDone: true, storyV: 2, element: 'hoa', realm: 0, layer: 9, qi: 0, map: 'thien-kiem-phong', spawn: 'vao', weapon: 'kiem' });
  s.root ||= 'pham'; (s.ht ??= {}).intro = 1; s.visited = { 'thanh-khe': true, 'thien-kiem-phong': true, 'dao-xich-dien': true };
  Object.assign(s.flags, { 'lac-tuyet-vang': true, 'bac-xong': true, 'leo-bac': true, 'bac-mo-danh': true, 'bac-mo-hanh': true, 'mat-tieu-hoa': true });
  for (const k of Object.keys(s.flags)) if (k.startsWith('tmk')) delete s.flags[k];
  g.persist();
});
await cho(400); await p.reload(); await vao(); await cho(2500); await qua(); await cho(1500);
await ev(() => { window.__game.data['tran-ma-ky'].auto.gap_s = 3; });

await ev(() => window.__game.openKy()); await cho(700); await shot('01-bia-so');
await ev(() => [...document.querySelectorAll('.ky-q')][0].click()); await cho(400); await shot('02-quyen-mot');
await p.mouse.click(8, 420); await cho(900);

await ev(async () => { const T = await import('/src/game/tu-linh.js'), g = window.__game; g.player.mp = 999; T.startTuLinh(g, 'phi-kiem', () => 0, () => {}); });
await cho(350); await shot('14-khau-quyet'); await cho(2400);

// Hạ Huyết Nha thật ở Hỏa Quật → trang "Món nợ Huyết Nha" mở → tự kể vì đang rảnh tay và có mặt
await ev(async () => { const T = await import('/src/game/tran-ma-ky.js'), g = window.__game, id = g.map.id; g.map.id = 'hoa-quat'; T.tmkKill(g, { id: 'huyet-nha-that' }); g.map.id = id; });
for (let i = 0; i < 40 && !(await the()); i++) { await coMat(); await cho(400); }
await shot('03-the-mo-quyen-0.4s'); await cho(600); await shot('04-the-mo-quyen-1.0s'); await cho(1500); await shot('05-the-mo-quyen-2.5s');
await ev(() => document.querySelector('#the-quyen .q-btn')?.click()); await cho(500); await shot('06-dan-canh-dau-trang');
for (let i = 0, n = 0; i < 120; i++) {
  const s = await ev(() => ({ dlg: window.__game.dialog.open, tang: !document.getElementById('mung-tang')?.hidden && !!document.getElementById('mung-tang')?.textContent }));
  if (s.tang) { await cho(900); await shot('08-the-mung-trang'); break; }
  if (s.dlg) { await cho(1300); if (++n === 2) await shot('07-cau-thoai'); await ev(() => { const g = window.__game; g.dialog.skip(); g.dialog.skip(); }); await cho(250); } else await cho(150);
}
await cho(3200);

await ev(async () => { const L = await import('/src/game/len-tang.js'), g = window.__game, a = L.upSnap(g); g.save.realm = 1; g.save.layer = 1; g.refreshStats(); L.realmUp(g, a); });
await cho(3600); await shot('09-nghi-le-dot-pha'); await ev(() => document.querySelector('#mung-canh .c-btn')?.click());
for (let i = 0; i < 30 && !(await ev(() => window.__game.dialog.open)); i++) { await coMat(); await cho(400); }   // lên Trúc Cơ: trang "Cắm rễ" tự kể
await qua(); await cho(3000);

await ev(() => { const f = window.__game.save.flags; for (const id of ['q2-1', 'q2-4', 'q2-5', 'q2-6', 'q3-2', 'q3-3', 'q4-4']) f['tmkd-' + id] = f['tmkm-' + id] = true; });
for (const [id, n] of [['tmk:quy', '10-chin-thien-quy'], ['tmk:kq', '11-khau-quyet'], ['tmk:cam', '12-cam-ky-cac']]) { await ev(i => window.__game.openKy(i), id); await cho(600); await shot(n); }
await p.mouse.click(8, 420); await cho(900);

await ev(() => { window.__game.tmk.phat('q2-7'); }); await cho(600); await qua();   // trang cuối của quyển hai → thẻ khép quyển
for (let i = 0; i < 40 && !(await the()); i++) { await coMat(); await cho(400); }
await cho(2800); await shot('13-the-khep-quyen');
const so = await ev(async () => { const T = await import('/src/game/tran-ma-ky.js'), s = T.tmkSo(window.__game); return `${s.doc}/${s.tong} trang đã đọc`; });
await b.close(); stop();
console.log(`Ảnh ở ${out}/ · ${so} · ${errs.length} lỗi JavaScript`);
if (errs.length) process.exit(1);
