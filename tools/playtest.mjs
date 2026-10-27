// Bài chơi thử tự động (chạy trong CI mỗi lần cập nhật): người mới chơi thử không tài khoản, bật Tự hành,
// giả ngày đang có lễ (mặc định Lễ Bí Ngô 30/10) để bắt lỗi kiểu "lễ làm kẹt truyện". Báo lỗi nếu trang có lỗi
// JavaScript hoặc truyện không đi tiếp đủ số bước trong thời gian chơi. Không gọi máy chủ thật (chặn thư viện Supabase).
// Chạy tay: npm i --no-save playwright && npx playwright install chromium && node tools/playtest.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const SEC = +(process.env.PLAY_SEC || 150), MIN_STEPS = +(process.env.PLAY_MIN_STEPS || 8);
const FAKE = process.env.PLAY_DATE || '2026-10-30T12:00:00Z', PORT = 8790;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(`window.__FAKE = ${JSON.stringify(FAKE)}`);
await ctx.addInitScript(() => { const D = Date, off = new D(window.__FAKE) - D.now();
  class F extends D { constructor(...a) { if (!a.length) super(D.now() + off); else super(...a); } static now() { return D.now() + off; } } window.Date = F; });
await ctx.route(/supabase-js/, r => r.abort());   // chơi không mạng, không đụng máy chủ thật
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]?.trim()));
await p.goto(`http://localhost:${PORT}/`);
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(800);
await p.tap('#btn-guest');
await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
const step0 = await p.evaluate(() => window.__game.save.step);
await p.tap('#btn-pilot');
const end = Date.now() + SEC * 1000;
while (Date.now() < end) {
  const c = await p.$('#dlg-choices .choice');
  if (c && await c.isVisible()) { const all = await p.$$('#dlg-choices .choice'); await all[Math.min(1, all.length - 1)].tap().catch(() => {}); continue; }
  if (await p.evaluate(() => window.__game.dialog.open)) { await p.mouse.click(195, 760); await p.waitForTimeout(200); continue; }
  if (!(await p.evaluate(() => !!window.__game.pilot))) await p.tap('#btn-pilot').catch(() => {});
  await p.waitForTimeout(500);
}
const r = await p.evaluate(() => { const g = window.__game; return { step: g.save.step, map: g.map.id, realm: g.save.realm, layer: g.save.layer, goal: g.story.current()?.goal || '' }; });
await b.close(); server.close();
const steps = r.step - step0;
console.log(`Chơi thử ${SEC} giây (ngày giả ${FAKE}): qua ${steps} bước truyện, đang ở bước ${r.step} (${r.map}, cảnh giới ${r.realm} tầng ${r.layer}). Mục tiêu: ${r.goal}`);
const bad = [...errs.map(e => 'Lỗi JavaScript: ' + e), ...(steps < MIN_STEPS ? [`Truyện chỉ đi ${steps} bước, cần ít nhất ${MIN_STEPS}: có thể bị kẹt.`] : [])];
if (bad.length) { console.error('❌ Chơi thử TRƯỢT:\n' + bad.map(x => ' - ' + x).join('\n')); process.exit(1); }
console.log('✅ Chơi thử đạt');
