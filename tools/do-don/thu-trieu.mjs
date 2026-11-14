// Phòng thử mục Triệu hồi chia bậc (docs/10-CAI-HON.md việc 6 dòng 18a): máy chủ giả thay src/net/he-thong.js, bật bac.on trong bộ nhớ, bấm triệu hồi theo kịch bản
// (Thường → Hiếm → Cực hiếm có bạo kích → Truyền thuyết) rồi chụp từng bước; không đụng máy chủ thật.
//   node tools/do-don/thu-trieu.mjs <thư mục ra> <file lưu> [ngôn ngữ: en | zh-Hant]
//   file lưu: bản lưu của một nhân vật đã qua chặng mở đầu, lấy bằng LUU=<file> node tools/do-don/di-tay.mjs
//   RONG=<rộng> CAO=<cao>: cỡ màn (mặc định 390 × 844) · TAT=1: để công tắc tắt (mục Triệu hồi phải y như bản đang chạy) · DO=1: chỉ in vị trí khung, sân khấu, nút rồi thoát
import { readFileSync, mkdirSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = 8771, [out, luu, ngon = ''] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright'); const stop = serve(PORT);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +(process.env.RONG || 390), height: +(process.env.CAO || 844) }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
const FAKE = `
let diem = 1500, bh2 = 7, bh3 = 41, k = 0;
const SEQ = [
  { qua: 'lt-20k', bac: 0, nd: { coins: 20000 } },
  { qua: 'ngoc-5', bac: 2, nd: { gem: { key: 'hong-ngoc:5', n: 1 } } },
  { qua: 'lt-500k', bac: 3, nd: { coins: 1500000, bk: 3 } },
  { qua: 'lt-2tr', bac: 4, nd: { coins: 2000000 } },
  { qua: 'cuoi-hoa-ky-lan', bac: 3, nd: { mount: 'hoa-ky-lan' } },
];
const wait = ms => new Promise(r => setTimeout(r, ms));
export const htStatus = async () => ({ diem, xong: [], so_lan: 12, bh2, bh3, ngay_xong: [] });
export const htSummon = async () => { await wait(250); const x = SEQ[k++ % SEQ.length]; diem -= 100; bh2 = x.bac >= 2 ? 0 : bh2 + 1; bh3 = x.bac >= 3 ? 0 : bh3 + 1; return { qua: x.qua, noi_dung: { ...x.nd, bac: x.bac, tieu_de: 'Quà triệu hồi hệ thống' }, diem, bk: x.nd.bk || 1, bac: x.bac, bh2, bh3 }; };
export const htFeed = async () => []; export const htMine = async () => []; export const htWelcome = async () => ({ them: 0 });
export const htClaim = async () => ({}); export const htAnswer = async () => ({}); export const htDaily = async () => ({});
export const askSystem = async () => {}; export const myQuestions = async () => [];
`;
await ctx.route('**/src/net/he-thong.js*', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
await ctx.addInitScript(([sv, ng]) => { try { const d = JSON.parse(sv); d.lastSeen = Date.now(); localStorage.setItem('p2d.save.v1:guest', JSON.stringify(d)); if (ng) localStorage.setItem('p2d_lang', ng); } catch { /* */ } }, [readFileSync(luu, 'utf8'), ngon]);
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto(`http://localhost:${PORT}/?thu=1&qua=1&mung=1${ngon ? '&lang=' + ngon : ''}`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(500); await p.click('#btn-guest');
await p.waitForFunction(() => !!window.__game?.save && !!window.__game.player, null, { timeout: 30000 });
await p.waitForTimeout(2500);
// đóng mọi thứ đang mở (thoại, nghi lễ, thẻ), bật bậc, giả có máy chủ, mở bảng Hệ Thống ở mục Triệu hồi
for (let i = 0; i < 40; i++) { const busy = await p.evaluate(() => { const g = window.__game; if (g.dialog.open) { document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; }
  for (const [id, btn] of [['qua', '.q-btn.go, .q-btn'], ['mung-canh', '.c-btn'], ['hen-mai', '.m-ok']]) { const Q = document.getElementById(id); if (Q && !Q.hidden) { Q.querySelector(btn)?.click(); return true; } }
  const dr = document.querySelector('.dr-panel'); if (dr && !dr.hidden) { [...dr.querySelectorAll('button')].at(-1)?.click(); return true; }
  return !!g.story.busy || !!g.traveling; }); if (!busy && i > 6) break; await p.waitForTimeout(400); }
await p.evaluate(tat => { const g = window.__game, nw = g.data.config.net_watch; for (const k of Object.keys(nw)) if (/_s$/.test(k) && typeof nw[k] === 'number') nw[k] = 1e9; g.data['he-thong'].bac.on = !tat; g.cloud = g.cloud || { fake: true }; g.toast = () => {}; const ic = document.getElementById('ht-icon'); ic.hidden = false; ic.click(); }, process.env.TAT === '1');
await p.waitForTimeout(900);
await p.evaluate(() => { const t = [...document.querySelectorAll('.ht-tab')]; (t.find(x => /Triệu hồi|Summon|召喚/.test(x.textContent)) || t[1]).click(); });
await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/1-mo.png` });
if (process.env.DO === '1') { console.log(JSON.stringify(await p.evaluate(() => { const r = q => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; }; return { vh: innerHeight, panel: r('.ht-panel, .ht-box, .ht-back > div'), body: r('.ht-body'), stage: r('.ht-chest-stage'), chest: r('.ht-chest'), btn: r('.ht-btn.big'), bh: r('.ht-bh') }; }))); await b.close(); stop(); process.exit(0); }
const pull = async (name, waitMs = 4300, extra) => { await p.evaluate(() => document.querySelector('.ht-btn.big').click()); await p.waitForTimeout(waitMs); await p.screenshot({ path: `${out}/${name}.png` }); if (extra) await extra(); };
const dong = async n => { if (process.env.TAT === '1') return; await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/${n}-le.png` }); await p.evaluate(() => { const Q = document.getElementById('qua'); Q?.querySelector('.q-btn.go, .q-btn:not([hidden])')?.click(); }); await p.waitForTimeout(700); };
await pull('2-thuong');
await pull('3-hiem', 4300, () => dong(3));
await pull('4-cuc-hiem', 4300, () => dong(4));
await pull('5-truyen-thuyet', 4300, () => dong(5));
await p.evaluate(() => { const b = document.querySelector('.ht-body'); b.scrollTop = b.scrollHeight; }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/6-ti-le.png` });
await p.evaluate(() => { const b = document.querySelector('.ht-body'); b.scrollTop = Math.max(0, b.scrollHeight - b.clientHeight * 2 + 40); }); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/7-ti-le-tren.png` });
console.log('lỗi JS', errs.length, errs.slice(0, 3).join(' | '));
await b.close(); stop();
