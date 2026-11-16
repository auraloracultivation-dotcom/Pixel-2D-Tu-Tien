// Thử nhanh đợt đổi mới 16/11/2026 (nhân vật trang phục mới, pháp tượng thay Ngọc bội, thú cưỡi mới, nút Cưỡi / Xuống) ở cỡ điện thoại:
//   node tools/do-don/thu-doi-moi.mjs <thư mục ra> [bộ trang phục tp-NN] [mã thú] [pháp tượng pt-…]
// Chụp: đứng, chạy, cưỡi đứng yên, cưỡi + thú đánh, ngồi đả tọa; in lỗi JavaScript.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve } from './may-chu.mjs';
const { chromium } = createRequire(import.meta.url)('playwright'); const stop = serve(8796);
const [out = '/tmp/thu-doi-moi', tp = 'tp-02', thu = 'cuu-vi-ho', pt = 'pt-kim-diem-quan'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); });
await p.goto('http://localhost:8796/?thu=1'); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.player, null, { timeout: 30000 });
await p.evaluate(async ({ tp, thu, pt }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  for (let quiet = 0, i = 0; i < 300 && quiet < 10; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(50); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.persist = () => {};
  const s = g.save, M = await import('/src/game/items.js');
  const it = M.rollItem(g.data, s, { base: pt, rarity: 'thien', lvl: 10 }); M.addItem(g.data, s, it); M.equip(s, g.data, it.uid);
  s.outfits = { ...(s.outfits || {}), [tp + ':' + s.look]: true }; s.outfit = tp;
  s.mounts = { [thu]: true }; s.mount = thu; s.ride = false; g.refreshStats?.();
  g.mobs.length = 0;
}, { tp, thu, pt });
const shot = async (name, fn, ms = 600) => { await p.evaluate(fn); await p.waitForTimeout(ms); await p.screenshot({ path: `${out}/${name}.png` }); };
await shot('1-dung', () => { const g = window.__game; g.player.moving = false; });
await shot('2-cuoi', () => { const g = window.__game; g.save.ride = true; }, 900);
await shot('3-cuoi-danh', () => { const g = window.__game; g.input.held.add('atk'); }, 380);
await p.evaluate(() => window.__game.input.held.delete('atk'));
await shot('4-xuong-dat', () => { const g = window.__game; g.save.ride = false; g.player.meditating = true; }, 900);
await shot('5-danh-thuong', () => { const g = window.__game; g.player.meditating = false; g.input.held.add('atk'); }, 300);
await p.evaluate(() => window.__game.input.held.delete('atk'));
await p.evaluate(() => { const g = window.__game; g.save.ride = false; g.player.meditating = false; });
for (const [btn, name] of [['btn-bag', '6-tui'], ['btn-pets', '7-thu'], ['btn-achv', '8-thoi-trang']]) {   // bảng Túi đồ (ô Pháp tượng), Thú cưỡi, Thời trang
  await p.evaluate(b => { document.getElementById('btn-menu')?.click(); document.getElementById(b)?.click(); }, btn); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${name}.png` }); await p.evaluate(() => window.__game.closeAll?.()); await p.waitForTimeout(300);
}
console.log(errs.length ? `LỖI JS: ${errs.length}` : 'không lỗi JS');
await b.close(); stop();
