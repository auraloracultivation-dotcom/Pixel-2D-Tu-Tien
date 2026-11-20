// Quay clip sổ Trấn Ma Kỷ ở cỡ điện thoại cho chủ dự án xem (docs/10-CAI-HON.md: thứ làm ra phải xem được bằng clip; docs/14-TRAN-MA-KY.md phần B):
//   node tools/do-don/quay-tmk-clip.mjs <tệp ra .mp4>      (cần Playwright và ffmpeg; NGON=en | zh-Hant: quay bản dịch; RONG=<bề ngang clip, mặc định 540>)
// Đúng nhịp người chơi thấy: không tua, không cắt, không có tiếng. Hình lấy từ chính trình duyệt (Page.startScreencast), khung nào đứng bao lâu thì trong clip
// đứng đúng bấy lâu, rồi ffmpeg ghép lại. Mỗi câu thoại được để yên tới khi gõ xong chữ + 1,5 giây rồi mới chạm.
// Cảnh: 1 Hệ Thống nhắc "có N trang chưa đọc", chạm vào · 2 bìa sổ, quyển một · 3 tung Phi Kiếm, nhân vật hô đoản quyết · 4 hạ Huyết Nha thật: thẻ MỞ QUYỂN
// HAI, trang "Món nợ Huyết Nha", thẻ mừng lĩnh ngộ thiên quy · 5 đột phá Trúc Cơ có dòng nghĩa cảnh giới, trang "Cắm rễ" tự kể · 6 Chín thiên quy, Khẩu quyết,
// Cấm Kỵ Các · 7 đọc trang cuối quyển hai từ trong sổ, thẻ KHÉP QUYỂN HAI. Bản lưu dựng sẵn như quay-tmk.mjs; không gọi máy chủ thật.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8795);
const E = process.env, out = process.argv[2] || 'tmk.mp4', dir = out.replace(/\.mp4$/i, '') + '-khung', W = +(E.RONG || 540), H = Math.round(W * 844 / 390 / 2) * 2;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
if (E.NGON) await ctx.addInitScript(l => { try { localStorage.setItem('p2d_lang', l); } catch { /* không có kho nhớ */ } }, E.NGON);
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
const ev = (f, a) => p.evaluate(f, a), cho = ms => new Promise(r => setTimeout(r, ms));
const vao = async () => { await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 }); await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 }); };
const qua = () => ev(async () => { const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let quiet = 0, i = 0; i < 300 && quiet < 10; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); } });
const coMat = () => ev(() => window.dispatchEvent(new Event('pointerdown')));   // tính là người chơi vừa chạm màn
const the = () => ev(() => { const r = document.getElementById('the-quyen'); return r && !r.hidden ? r.textContent : ''; });
const choThe = async () => { for (let i = 0; i < 80 && !(await the()); i++) { await coMat(); await cho(300); } };
// Cuộn bảng Hệ Thống mượt như ngón tay kéo
const cuon = (y, ms = 900) => ev(async ([y, ms]) => { const e = document.querySelector('.ht-body'); if (!e) return; const a = e.scrollTop, to = Math.min(y, e.scrollHeight - e.clientHeight), t0 = performance.now();
  await new Promise(r => { const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); e.scrollTop = a + (to - a) * k * (2 - k); if (k < 1) requestAnimationFrame(f); else r(); }; f(); }); }, [y, ms]);
// Đọc trang đang kể theo nhịp người đọc cho tới khi trang ghi là đã đọc: mỗi câu chờ gõ xong chữ (chữ đứng yên 0,6 giây) + 1,5 giây rồi chạm.
// toiDa: sau ngần ấy câu thì lật nhanh phần còn lại (clip khỏi dài).
const docTrang = (id, toiDa = 99) => ev(async ([id, toiDa]) => {
  const g = window.__game, d = g.dialog, wait = ms => new Promise(r => setTimeout(r, ms)), len = () => document.getElementById('dlg-text')?.textContent.length || 0;
  let n = 0;
  for (const t0 = performance.now(); !g.save.flags['tmkd-' + id] && performance.now() - t0 < 120000;) {
    const c = document.querySelector('#dlg-choices .choice');
    if (c) { await wait(2200); c.click(); continue; }
    if (!d.open) { await wait(100); continue; }
    const no = d.lineNo;
    if (n >= toiDa) { d.skip(); d.skip(); await wait(140); continue; }
    for (let a = -1, same = 0; same < 6 && d.open && d.lineNo === no;) { await wait(100); const b = len(); same = b === a ? same + 1 : 0; a = b; }
    await wait(1500);
    if (d.open && d.lineNo === no) d.skip();
    n++; await wait(160);
  }
  return n;
}, [id, toiDa]);

// ---- dựng bản lưu: cuối phần mở đầu, Luyện Khí tầng 9, đã tới Xích Diễm Tinh, chưa có sổ ----
await p.goto('http://localhost:8795/?thu=1'); await vao(); await cho(1500);
await ev(async () => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)), s = g.save;
  for (let i = 0; i < 40 && !s.gioi; i++) { document.querySelector('#dlg-choices .choice')?.click(); await wait(100); }
  Object.assign(s, { step: 10, stepDone: true, storyV: 2, element: 'hoa', realm: 0, layer: 9, qi: 0, map: 'thien-kiem-phong', spawn: 'vao', weapon: 'kiem' });
  s.root ||= 'pham'; (s.ht ??= {}).intro = 1; s.visited = { 'thanh-khe': true, 'thien-kiem-phong': true, 'dao-xich-dien': true };
  Object.assign(s.flags, { 'lac-tuyet-vang': true, 'bac-xong': true, 'leo-bac': true, 'bac-mo-danh': true, 'bac-mo-hanh': true, 'mat-tieu-hoa': true });
  for (const k of Object.keys(s.flags)) if (k.startsWith('tmk')) delete s.flags[k];
  g.persist();
});
await cho(400); await p.reload(); await vao(); const t0 = Date.now();
await cho(2500); await qua(); await cho(1500);
await ev(async () => { const g = window.__game, P = await import('/src/game/phap-bao.js'); g.data['tran-ma-ky'].auto.gap_s = 3;
  if (!P.pbWorn(g)[0]) P.pbAdd(g, 'phi-kiem', g.data['phap-bao'].grades[0].id); g.player.mp = g.player.maxMp || 999; });
await cho(Math.max(0, 17000 - (Date.now() - t0)));   // dòng nhắc người chơi cũ hiện ở giây 20 của buổi chơi: bắt đầu quay trước đó vài giây

// ---- quay: mỗi khung trình duyệt vẽ ra ghi thành một ảnh kèm giờ ----
const cdp = await ctx.newCDPSession(p), khung = [];
cdp.on('Page.screencastFrame', f => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  const n = `f-${String(khung.length + 1).padStart(6, '0')}.jpg`; writeFileSync(`${dir}/${n}`, Buffer.from(f.data, 'base64')); khung.push([n, f.metadata.timestamp]); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: W, maxHeight: H, everyNthFrame: 2 });

// 1. Hệ Thống nhắc, người chơi chạm vào dòng nhắc
await p.waitForFunction(() => { const t = document.querySelector('.ht-tip'); return t && !t.hidden && t.dataset.go === 'tmk'; }, null, { timeout: 40000 });
await cho(3000); await p.tap('.ht-tip'); await cho(2200);
// 2. Bìa sổ → quyển một
await cuon(9999, 1500); await cho(1700); await cuon(0, 800); await cho(500);
await p.tap('.ky-q'); await cho(3000);
await p.mouse.click(8, 420); await cho(1200);
// 3. Tung Phi Kiếm: tụ linh, hô đoản quyết
await p.tap('#btn-s0'); await cho(3200);
// 4. Hạ Huyết Nha thật ở Hỏa Quật (gọi thẳng móc của game) → thẻ mở quyển hai → trang tự kể → thẻ mừng
await ev(async () => { const T = await import('/src/game/tran-ma-ky.js'), g = window.__game, id = g.map.id; g.map.id = 'hoa-quat'; T.tmkKill(g, { id: 'huyet-nha-that' }); g.map.id = id; });
await choThe(); await cho(4200); await p.tap('#the-quyen .q-btn');
await docTrang('q2-2'); await cho(4300);
// 5. Đột phá Trúc Cơ → trang "Cắm rễ" tự kể (đọc ba câu đầu)
await ev(async () => { const L = await import('/src/game/len-tang.js'), g = window.__game, a = L.upSnap(g); g.save.realm = 1; g.save.layer = 1; g.refreshStats(); L.realmUp(g, a); });
await cho(5200); await p.tap('#mung-canh .c-btn');
for (let i = 0; i < 60 && !(await ev(() => window.__game.dialog.open)); i++) { await coMat(); await cho(300); }
await docTrang('q2-3', 3); await cho(3600);
// 6. Ba mục của sổ (các trang khác của quyển hai coi như đã đọc, để thiên quy và Cấm Kỵ Các có chữ)
await ev(() => { const f = window.__game.save.flags; for (const id of ['q2-1', 'q2-4', 'q2-5', 'q2-6', 'q3-2', 'q3-3', 'q4-4']) f['tmkd-' + id] = f['tmkm-' + id] = true; f['tmkm-q2-7'] = true; });
for (const [k, y, ms] of [[7, 560, 1700], [8, 460, 1500], [9, 760, 2300]]) {
  await ev(() => window.__game.openKy()); await cho(700); await cuon(9999, 700); await cho(500);
  await p.locator('.ky-q').nth(k).tap(); await cho(1300); await cuon(y, ms); await cho(1500);
}
// 7. Mở quyển hai trong sổ, bấm Đọc trang cuối → thẻ khép quyển
await ev(() => window.__game.openKy('tmk:q:q2')); await cho(1400); await cuon(9999, 900); await cho(900);
await p.locator('.ky-tr.moi .ky-nut').last().tap();
await docTrang('q2-7'); await choThe(); await cho(6500);

await cdp.send('Page.stopScreencast'); await cho(300);
const so = await ev(async () => { const T = await import('/src/game/tran-ma-ky.js'), s = T.tmkSo(window.__game); return `${s.doc}/${s.tong} trang đã đọc`; });
await b.close(); stop();
if (!khung.length) { console.log('Không thu được khung hình nào'); process.exit(1); }
const ds = khung.map(([n, t], i) => `file '${n}'\nduration ${Math.max(0.01, (khung[i + 1]?.[1] ?? t + 0.5) - t).toFixed(4)}`).join('\n') + `\nfile '${khung.at(-1)[0]}'\n`;
writeFileSync(`${dir}/ds.txt`, ds);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/ds.txt`, '-vf', `fps=30,scale=${W}:${H}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', E.CRF || '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
const dai = khung.at(-1)[1] - khung[0][1];
if (!E.GIU) rmSync(dir, { recursive: true, force: true });   // GIU=1: giữ lại các khung hình rời
console.log(`Clip ${out}: ${dai.toFixed(1)} giây, ${khung.length} khung · ${so} · ${errs.length} lỗi JavaScript`);
if (errs.length) process.exit(1);
