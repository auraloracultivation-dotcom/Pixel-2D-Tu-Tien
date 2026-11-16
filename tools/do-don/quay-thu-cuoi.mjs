// Quay thử 16 thú cưỡi mới trong game ở đúng cỡ điện thoại (chủ dự án 16/11/2026 17:35 "Tạo đi, tạo 16 thú cưỡi"):
//   node tools/do-don/quay-thu-cuoi.mjs <thư mục ra> [mã thú …] [--giay=N] [--cao=N]
// Mỗi con: người chơi cưỡi đứng yên (đứng nghỉ 8 khung), chạy sang phải, quay đầu chạy sang trái; người cưỡi đứng theo yên từng khung
// (data/art.json → mount.<mã>.seat / seat_x). Thú chưa có trong data/pets.json (chờ chủ dự án chốt cách có thú) thì chỉ thêm tạm trong trang
// để quay. Ra: <thư mục ra>/<mã>/f-0001.jpg… (30 khung / giây, dải ngang quanh người chơi); ghép mp4 bằng ffmpeg.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve } from './may-chu.mjs';
const { chromium } = createRequire(import.meta.url)('playwright'); const stop = serve(8794);
const argv = process.argv.slice(2), opt = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [out, ...ids0] = argv.filter(a => !a.startsWith('--'));
const art = JSON.parse(readFileSync(new URL('../../data/art.json', import.meta.url), 'utf8')).sprites;
const ids = ids0.length ? ids0 : Object.keys(art).filter(k => k.startsWith('mount.') && art[k].idle).map(k => k.slice(6));
const FPS = 30, SECS = +(opt.giay || 4), HIGH = +(opt.cao || 520);   // --cao: chiều cao khung quay (điểm máy)
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto('http://localhost:8794/?thu=1'); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.evaluate(async ({ HIGH }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.data.config.power_pop.min = 1e12;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  await wait(1200);
  const pl = g.player, T = g.data.config.tile, up = g.update;
  g.__spot = { x: 9.5 * T, y: 13.5 * T }; g.__q = 0; g.__n = 0; g.__run = 0;
  g.update = dt => { if (g.__q > 0) { g.__q--; g.uiOpen = false; up(1 / 30); g.__n++;
    g.mobs = g.mobs.filter(m => m.__mine); pl.hp = pl.maxHp; pl.riding = true; pl.moving = !!g.__run; pl.vx = pl.vy = 0;
    if (g.__run) { pl.walkT += 1 / 30; pl.x += g.__run * 1.6; pl.face = { x: g.__run, y: 0 }; } else { pl.x = pl.x; } } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  const c = document.createElement('canvas');
  g.__grab = () => { const s = g.screen, P = s.toScreen(pl.x, pl.y - 14), W = Math.min(s.canvas.width, Math.round(HIGH * 1.4)); c.width = W; c.height = HIGH;   // khung quanh người chơi
    c.getContext('2d').drawImage(s.canvas, Math.round(P.x * s.dpr - W / 2), Math.round(P.y * s.dpr - HIGH * 0.5), W, HIGH, 0, 0, W, HIGH); return c.toDataURL('image/jpeg', 0.9).slice(23); };
}, { HIGH });
for (const id of ids) {
  await p.evaluate(id => {   // thú chưa có trong data/pets.json: thêm tạm trong trang để quay
    const g = window.__game, M = g.data.pets.mounts;
    if (!M[id]) M[id] = { look: 'deer', name: id, color: '#ffffff', accent: '#ffcf4a', speed: 0.5, desc: '' };
    g.save.mounts[id] = true; g.save.mount = id; const pl = g.player; pl.x = g.__spot.x - 40; pl.y = g.__spot.y; pl.riding = true; pl.face = { x: 1, y: 0 }; g.__run = 0;
  }, id);
  const dir = `${out}/${id}`; mkdirSync(dir, { recursive: true }); const N = SECS * FPS;
  for (let i = 0; i < N; i++) {
    const ph = i / N; await p.evaluate(r => { window.__game.__run = r; }, ph < 0.3 ? 0 : ph < 0.65 ? 1 : -1);
    await p.evaluate(() => window.__game.__step());
    writeFileSync(`${dir}/f-${String(i + 1).padStart(4, '0')}.jpg`, Buffer.from(await p.evaluate(() => window.__game.__grab()), 'base64'));
  }
  console.log(id, N, 'khung');
}
console.log(errs.length ? `LỖI JS: ${errs.length}` : 'không lỗi JS');
await b.close(); stop();
