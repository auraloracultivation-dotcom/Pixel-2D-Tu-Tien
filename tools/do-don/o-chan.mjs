// In lưới ô bị chắn THẬT của một vùng bản đồ (gồm cả chân nhà, tượng, vật trang trí: thứ chỉ có lúc game chạy), để đặt ô đích và ô rải vật nhặt của
// nhiệm vụ chính (data/story.json) vào chỗ người chơi và Tự hành tới được. tools/truyen.test.mjs chỉ soát được nền đất, không biết chân nhà.
//   node tools/do-don/o-chan.mjs <mã bản đồ> <x0> <y0> <x1> <y1>      (cần Playwright; '#' là ô chắn, '.' là ô đi được)
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8796);
const [map, x0, y0, x1, y1] = process.argv.slice(2).map((v, i) => i ? +v : v);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
const p = await ctx.newPage(); p.on('pageerror', e => console.log('LỖI JS', e.message));
const cho = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:8796/?thu=1'); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 }); await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 }); await cho(1500);
const rows = await p.evaluate(async ([map, x0, y0, x1, y1]) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 40 && !g.save.gioi; i++) { document.querySelector('#dlg-choices .choice')?.click(); await wait(100); }
  if (g.map.id !== map) await g.travel(map, null, false);
  await wait(1200);
  const out = [];
  for (let y = y0; y <= y1; y++) { let s = ''; for (let x = x0; x <= x1; x++) { const c = g.map.center(x, y); s += g.map.blocked(c.x, c.y, 5) ? '#' : '.'; } out.push(String(y).padStart(3) + ' ' + s); }
  return out;
}, [map, x0, y0, x1, y1]);
console.log('    ' + Array.from({ length: x1 - x0 + 1 }, (_, i) => String((x0 + i) % 10)).join(''));
console.log(rows.join('\n'));
await b.close(); stop();
