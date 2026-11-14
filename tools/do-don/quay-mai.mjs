// Quay thẻ "Hẹn ngày mai" cả màn hình điện thoại, từng khung 1/60 giây (docs/10-CAI-HON.md việc 5b):
//   node tools/do-don/quay-mai.mjs <thư mục ra> <tên> [giây=6] [dpr=2]
// Kịch bản: người mới vừa đi hết truyện mở đầu. CANH=<cảnh giới 0…8, mặc định 0 Luyện Khí>, TANG=<tầng, mặc định 4>, KHI=<linh khí đang có, mặc định 30>.
// TK=1 (mặc định): coi như đã có tài khoản và đã điểm danh NGAY ngày thứ nhất (bảng điểm danh giả, thay src/game/checkin.js bằng bản đóng thế trong
// phòng đo, không gọi máy chủ); TK=0: khách. Giây 0,6 mở thẻ; chờ CHO giây (mặc định 2,2) sau khi nút sáng thì bấm Chơi tiếp.
// VE=<số giờ đã vắng>: quay thẻ "Xuất quan" lúc quay lại (chạy đúng hàm offlineGains của game); DD=0: hôm nay chưa điểm danh.
// Ra: f-0001.jpg… + sfx.json (ghép tiếng: ghep-tieng.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG || 8797);
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [out, name, secs = '6', dpr = '2'] = process.argv.slice(2), E = process.env, FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
const O = { realm: +(E.CANH ?? 0), layer: +(E.TANG ?? 4), qi: +(E.KHI ?? 30), hold: +(E.CHO ?? 2.2), ve: +(E.VE ?? 0) }, ACC = E.TK !== '0', DD = E.DD !== '0';
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
if (ACC) await ctx.route(/\/src\/game\/checkin\.js/, r => r.fulfill({ contentType: 'text/javascript', body: `const st = { vi_tri: 1, hom_nay: ${DD}, ngay: 'x' };
export const checkinOn = game => !!game.save; export const checkinCached = () => st; export async function loadCheckin() { return { data: st }; } export async function doCheckin() { return { data: st }; }` }));
await ctx.addInitScript(() => { let s = 20261114; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto(`http://localhost:${PORT}/?thu=1&mai=1`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
const info = await p.evaluate(async O => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.save.ht = { ...(g.save.ht || {}), intro: 1 }; if (g.data['he-thong']) g.data['he-thong'].idle_s = 1e9;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  await wait(1200);
  g.save.realm = O.realm; g.save.layer = O.layer; g.save.qi = O.qi; g.refreshStats?.(); g.maiSeen = true;   // thẻ do kịch bản mở, không tự hiện
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  g.__log = []; g.__sim = 0;
  const sf = g.sfx; g.sfx = (n, v) => { if (n === 'pickup' && new Error().stack.includes('/ui/he-thong.js')) return; if (n) g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = true;
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  g.__live = false;
  for (let i = 0; i < 40; i++) await g.__step();
  g.__sim = 0; g.__log.length = 0;
  const HM = await import('/src/game/hen-mai.js');
  return { nghi: HM.restForecast(g), ke: HM.nextStep(g), qua: HM.giftTomorrow(g), lc: document.getElementById('power')?.textContent };
}, O);
console.log(JSON.stringify(info));
let n = 0, ready = -1, clicked = -1;
while (n < NMAX) {
  const st = await p.evaluate(async O => {
    const g = window.__game;
    if (g.__sim >= 0.6 && !g.__opened) { g.__opened = 1; if (O.ve) import('/src/game/offline.js').then(M => M.offlineGains(g, Date.now() - O.ve * 3600000)); else g.henMaiShow(); }
    const ok = document.querySelector('#hen-mai .m-ok');
    if (ok?.classList.contains('ready') && g.__ready == null) g.__ready = g.__sim;
    if (g.__ready != null && g.__clicked == null && g.__sim - g.__ready >= O.hold) { g.__clicked = g.__sim; ok.click(); }
    await g.__step();
    return { ready: g.__ready ?? -1, clicked: g.__clicked ?? -1, t: g.__sim };
  }, O);
  ready = st.ready; clicked = st.clicked;
  await p.screenshot({ path: `${dir}/f-${String(++n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
  if (clicked >= 0 && st.t - clicked > 0.9) break;
}
const log = await p.evaluate(() => window.__game.__log);
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log, ready, clicked }));
console.log(name, n, 'khung · nút sáng', ready, '· bấm', clicked, '· lỗi JS', errs.length, '·', log.map(l => `${l[0]}:${l[1]}`).join(' '));
await b.close(); stop();
