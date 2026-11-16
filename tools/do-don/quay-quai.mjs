// Quay cảnh Bộ Quái Mới ở đúng cỡ điện thoại (chủ dự án 16/11/2026 15:07 "chuẩn bị đẩy lên game", hiệu ứng đòn quái, dấu chấm than, khung đỏ báo đòn boss):
//   node tools/do-don/quay-quai.mjs <thư mục ra> [cảnh …] [--giay=N] [--moi=K]
// Cảnh: gan (cận chiến: cào, cắn, chém, nện đất; cuối cảnh hạ từng con xem xác đứt đôi), gan2 (quất, đâm, gió xoáy, cào; cũng hạ cuối cảnh), xa (mũi tên, cầu phép, gai độc, cát, đá nóng),
// boss (hai dấu chấm than đỏ, khung đỏ chém vòng / làn lao / 14 tia vòng đạn / vòng lửa rơi). Không ghi cảnh thì quay cả bốn.
// Người chơi đứng yên giữa bãi cỏ trống (đảo Thanh Khê, như quay-canh.mjs), không chết (máu hồi đầy mỗi khung, quái đánh nhẹ); quái mọc quanh,
// nhận ra mình rồi đánh. Ra: <thư mục ra>/<cảnh>/f-0001.jpg… (60 khung / giây, dải ngang quanh người chơi, đúng cỡ điểm máy) + sfx.json; ghép mp4
// có tiếng: python3 -I tools/do-don/ghep-tieng.py <thư mục ra> <thư mục wav> <thư mục mp4>. --moi=K: chỉ giữ một khung mỗi K khung (soát nhanh).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve } from './may-chu.mjs';
const { chromium } = createRequire(import.meta.url)('playwright'); const stop = serve(8793);   // require: tìm cả NODE_PATH (Playwright cài sẵn toàn máy)
const SCENES = {
  gan: { secs: 7, kill: 5, mobs: [['ma-tieu', -62, -18], ['hoa-lang', 64, -12], ['ma-binh', -52, 40], ['tho-khoi', 56, 42]] },
  gan2: { secs: 7, kill: 5, mobs: [['moc-yeu', -60, -16], ['han-ma-ve', 62, -20], ['ma-phong-ve', -56, 38], ['kim-ma-ve', 58, 40]] },
  xa: { secs: 6, mobs: [['ma-cung', -78, -26], ['ma-phap', 78, -30], ['doc-dang', -80, 40], ['sa-ma', 80, 36], ['nham-xa', 4, -84]] },
  boss: { secs: 10, mobs: [['ma-ton', 118, -6]], boss: true },
};
const argv = process.argv.slice(2), opt = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [out, ...names0] = argv.filter(a => !a.startsWith('--')), names = names0.length ? names0 : Object.keys(SCENES), FPS = 60, EVERY = +(opt.moi || 1), HIGH = 900;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261116; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto('http://localhost:8793/?thu=1'); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.evaluate(async ({ HIGH }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.data.config.power_pop.min = 1e12;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  g.__MB = await import('/src/game/mobs.js'); g.__CB = await import('/src/game/combat.js'); await wait(1500);
  const pl = g.player, T = g.data.config.tile;
  g.__spot = { x: 9.5 * T, y: 13.5 * T };
  g.__log = []; g.__sim = 0;
  const sf = g.sfx; g.sfx = (n, v) => { g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = false;
  g.__hold = () => { pl.hp = pl.maxHp; pl.x = g.__spot.x; pl.y = g.__spot.y; pl.vx = pl.vy = 0; g.mobs = g.mobs.filter(m => m.__mine); };   // đứng yên, không chết, không cho quái bãi chen vào
  g.__killAt = null;   // từ giây này mỗi 0,4 giây hạ một con (xem xác đứt đôi của hình mới)
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; g.uiOpen = false; g.__hold(); up(1 / 60); g.__sim += 1 / 60; g.__n++;
    if (g.__killAt != null && g.__sim >= g.__killAt) { const m = g.mobs.find(x => x.__mine && !x.dead); if (m) g.__CB.hitMob(g, m, m.hp + 99, { canCrit: false }); g.__killAt += 0.4; } } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  const c = document.createElement('canvas');
  g.__grab = () => { const s = g.screen, P = s.toScreen(pl.x, pl.y - 6); c.width = s.canvas.width; c.height = HIGH;
    c.getContext('2d').drawImage(s.canvas, 0, Math.round(P.y * s.dpr - HIGH * 0.5), c.width, HIGH, 0, 0, c.width, HIGH); return c.toDataURL('image/jpeg', 0.92).slice(23); };
  g.__scene = (list, boss, kill) => {   // dọn quái cũ, đặt người chơi, mọc quái của cảnh (đánh nhẹ cho người chơi khỏi gục)
    for (const m of g.mobs) m.dead = true; g.mobs.length = 0; g.strikes.length = 0; g.bullets.length = 0; g.fx.length = 0;
    g.__hold(); pl.face = { x: 1, y: 0 };
    for (const [id, dx, dy] of list) {
      const m = g.__MB.spawnMob(g, id, pl.x + dx, pl.y + dy, { noQi: true }); m.__mine = 1; m.aggro = true; m.hurtT = g.time;   // noQi: hạ không lên tầng (khỏi thẻ mừng che cảnh)
      m.def = { ...m.def, atk: Math.max(0.1, Math.min(m.def.atk, pl.maxHp * 0.03)) };
      if (boss) { m.hp = m.maxHp * 0.45; m.summoned = 2; m.cd = 1.2; }
    }
    g.__sim = 0; g.__log.length = 0; g.__killAt = kill ?? null;
  };
}, { HIGH });
await p.evaluate(async () => { const g = window.__game; g.__scene([]); for (let i = 0; i < 90; i++) await g.__step(); });   // máy quay kịp theo chỗ đứng
for (const name of names) {
  const S = SCENES[name], dir = `${out}/${name}`, N = Math.round(+(opt.giay || S.secs) * FPS);
  mkdirSync(dir, { recursive: true });
  await p.evaluate(({ list, boss, kill }) => window.__game.__scene(list, boss, kill), { list: S.mobs, boss: !!S.boss, kill: S.kill ?? null });
  let n = 0;
  for (let i = 0; i < N; i += 12) {
    const res = await p.evaluate(async ({ m, every, i0 }) => {
      const g = window.__game, shots = [];
      for (let k = 0; k < m; k++) { await g.__step(); if ((i0 + k) % every === 0) shots.push(g.__grab()); }
      return { shots, mobs: g.mobs.map(x => [x.id, x.state, Math.round(x.x - g.player.x), Math.round(x.y - g.player.y), x.alert != null ? 1 : 0]) };
    }, { m: Math.min(12, N - i), every: EVERY, i0: i });
    for (const s of res.shots) writeFileSync(`${dir}/f-${String(++n).padStart(4, '0')}.jpg`, Buffer.from(s, 'base64'));
    if (i % 120 === 0) console.log(name, i, JSON.stringify(res.mobs));
  }
  const log = await p.evaluate(() => window.__game.__log);
  writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS / EVERY, n, log }));
  console.log(name, n, 'khung ·', log.length, 'tiếng ·', [...new Set(log.map(l => l[1]))].join(','));
}
console.log('lỗi JS', errs.length);
await b.close(); stop();
