// Quay mục Triệu hồi chia bậc từng khung 1/30 giây ở điểm máy × 2 (docs/10-CAI-HON.md việc 6 dòng 18a): giờ của trang là đồng hồ ảo Playwright (hẹn giờ, rAF),
// animation / transition CSS của sân khấu rương tự bước bằng tay (document.getAnimations), nên clip ra đúng nhịp thật dù mỗi khung chụp mất 0,2 giây.
// Kịch bản: hai lượt Thường → lượt bảo hiểm ra Hiếm → lượt bảo hiểm ra Cực hiếm → Truyền thuyết → vuốt xuống bảng tỉ lệ. Máy chủ giả, không đụng máy chủ thật.
//   node tools/do-don/quay-trieu.mjs <thư mục ra>/<tên> <file lưu> [ngôn ngữ]      RONG / CAO: cỡ màn
//   ghép tiếng: python3 -I tools/do-don/ghep-tieng.py <thư mục ra> <thư mục wav> <thư mục mp4>
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = 8773, [out, luu, ngon = ''] = process.argv.slice(2), FPS = 30; mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright'); const stop = serve(PORT);
const W = +(process.env.RONG || 390), H = +(process.env.CAO || 844);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
const FAKE = `
let diem = 900, bh2 = 7, bh3 = 76, k = 0;
const SEQ = [
  { qua: 'dan-hoi-xuan-dan', bac: 0, nd: { pill: { id: 'hoi-xuan-dan', n: 10 } } },
  { qua: 'lt-50k', bac: 0, nd: { coins: 50000 } },
  { qua: 'ngoc-5', bac: 2, nd: { gem: { key: 'hong-ngoc:5', n: 1 } } },
  { qua: 'cuoi-hoa-ky-lan', bac: 3, nd: { mount: 'hoa-ky-lan' } },
  { qua: 'lt-2tr', bac: 4, nd: { coins: 2000000 } },
];
const wait = ms => new Promise(r => setTimeout(r, ms));
export const htStatus = async () => ({ diem, xong: [], so_lan: 12, bh2, bh3, ngay_xong: [] });
export const htSummon = async () => { await wait(250); const x = SEQ[k++ % SEQ.length]; diem -= 100; bh2 = x.bac >= 2 ? 0 : bh2 + 1; bh3 = x.bac >= 3 ? 0 : bh3 + 1; return { qua: x.qua, noi_dung: { ...x.nd, bac: x.bac, tieu_de: 'Quà triệu hồi hệ thống' }, diem, bk: x.nd.bk || 1, bac: x.bac, bh2, bh3 }; };
export const htFeed = async () => [
  { ten: 'Thử Nghiệm A', qua: 'lt-1tr', luc: '2026-11-15T02:00:00Z', nd: { coins: 1000000, bac: 4 } },
  { ten: 'Thử Nghiệm B', qua: 'khoi-thach-sinh', luc: '2026-11-15T01:50:00Z', nd: { comp: 'thach-sinh', bac: 3 } },
  { ten: 'Thử Nghiệm C', qua: 'lt-100k', luc: '2026-11-15T01:40:00Z', nd: { coins: 500000, bk: 5, bac: 1 } },
];
export const htMine = async () => []; export const htWelcome = async () => ({ them: 0 });
export const htClaim = async () => ({}); export const htAnswer = async () => ({}); export const htDaily = async () => ({});
export const askSystem = async () => {}; export const myQuestions = async () => [];
`;
await ctx.route('**/src/net/he-thong.js*', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
await ctx.addInitScript(([sv, ng]) => { try { const d = JSON.parse(sv); d.lastSeen = Date.now(); localStorage.setItem('p2d.save.v1:guest', JSON.stringify(d)); if (ng) localStorage.setItem('p2d_lang', ng); } catch { /* */ } }, [readFileSync(luu, 'utf8'), ngon]);
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.clock.install();
await p.goto(`http://localhost:${PORT}/?thu=1&qua=1&mung=1`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.clock.pauseAt(new Date(Date.now() + 2000));
await p.click('#btn-guest');
for (let i = 0; i < 600 && !(await p.evaluate(() => !!window.__game?.save && !!window.__game.player)); i++) await p.clock.runFor(50);
const run = async ms => { for (let t = 0; t < ms; t += 50) await p.clock.runFor(50); };
await run(2500);
for (let i = 0; i < 60; i++) { const busy = await p.evaluate(() => { const g = window.__game; if (g.dialog.open) { document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; }
  for (const [id, btn] of [['qua', '.q-btn.go, .q-btn'], ['mung-canh', '.c-btn'], ['hen-mai', '.m-ok']]) { const Q = document.getElementById(id); if (Q && !Q.hidden) { Q.querySelector(btn)?.click(); return true; } }
  const dr = document.querySelector('.dr-panel'); if (dr && !dr.hidden) { [...dr.querySelectorAll('button')].at(-1)?.click(); return true; }
  return !!g.story.busy || !!g.traveling; }); if (!busy && i > 8) break; await run(400); }
await p.evaluate(() => { const g = window.__game, nw = g.data.config.net_watch; for (const k of Object.keys(nw)) if (/_s$/.test(k) && typeof nw[k] === 'number') nw[k] = 1e9;
  g.data['he-thong'].bac.on = true; g.cloud = g.cloud || { fake: true }; g.data['he-thong'].idle_s = 1e9; g.data.config.perf.slow_ms = 1e9;
  window.__n = 0; window.__sfx = []; const sf = g.sfx; g.sfx = (n, v) => { if (n) window.__sfx.push([window.__n / 30, n, v ?? 1]); return sf(n, v); };
  const ic = document.getElementById('ht-icon'); ic.hidden = false; ic.click(); });
await run(900);
await p.evaluate(() => { const t = [...document.querySelectorAll('.ht-tab')]; (t.find(x => /Triệu hồi|Summon|召喚/.test(x.textContent)) || t[1]).click(); });
await run(1200);
// từ đây: mỗi khung = 1/30 giây ảo; animation CSS bước theo
let n = 0;
const frame = async () => {
  await p.clock.runFor(1000 / FPS);
  await p.evaluate(dt => { window.__n++; for (const a of document.getAnimations()) { if (a.__t == null) { a.pause(); a.__t = +a.currentTime || 0; } a.__t += dt; const end = a.effect?.getComputedTiming().endTime; if (Number.isFinite(end) && a.__t >= end) { try { a.finish(); } catch { /* */ } } else a.currentTime = a.__t; } }, 1000 / FPS);
  await p.screenshot({ path: `${out}/f-${String(++n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
};
const hold = async s => { for (let i = 0; i < Math.round(s * FPS); i++) await frame(); };
const pull = () => p.evaluate(() => document.querySelector('.ht-btn.big').click());
const le = async s => {   // chờ nghi lễ hiện đủ, đứng s giây rồi bấm nút
  for (let i = 0; i < 12 * FPS; i++) { await frame(); if (await p.evaluate(() => { const Q = document.getElementById('qua'); return !!(Q && !Q.hidden && Q.classList.contains('ready')); })) break; }
  await hold(s);
  await p.evaluate(() => { const Q = document.getElementById('qua'); Q?.querySelector('.q-btn.go, .q-btn:not([hidden])')?.click(); });
  await hold(0.9);
};
await hold(1.5);
await pull(); await hold(4.4);            // Thường
await pull(); await hold(4.4);            // Thường
await pull(); await hold(3.4); await le(1.5);   // Hiếm (bảo hiểm lượt thứ 10)
await pull(); await hold(3.4); await le(1.7);   // Cực hiếm (bảo hiểm lượt thứ 80)
await pull(); await hold(3.4); await le(2.0);   // Truyền thuyết
await hold(0.8);
for (let i = 1; i <= 44; i++) { await p.evaluate(k => { const b = document.querySelector('.ht-body'); b.scrollTop = Math.min(b.scrollHeight, k * 13); }, i); await frame(); await frame(); }   // vuốt xuống bảng tỉ lệ theo bậc
await hold(2);
const sfx = await p.evaluate(() => window.__sfx);
writeFileSync(`${out}/sfx.json`, JSON.stringify({ fps: FPS, n, log: sfx.map(([t, s, v]) => [+t.toFixed(3), s, v]) }));
console.log('khung', n, '· giây', (n / FPS).toFixed(1), '· tiếng', sfx.length, [...new Set(sfx.map(x => x[1]))].join(','), '· lỗi JS', errs.length);
await b.close(); stop();
