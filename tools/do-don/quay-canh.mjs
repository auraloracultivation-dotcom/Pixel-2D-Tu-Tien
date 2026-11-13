// Quay cảnh "chém từng nhát" ở đúng cỡ điện thoại (docs/10-CAI-HON.md việc 2): node tools/do-don/quay-canh.mjs <thư mục ra> <tên> <q: don=0|don=1> [giây tối đa=14] [cao=720]
// Ra: <thư mục ra>/<tên>/f-0001.png… (60 khung / giây, cả bề ngang màn) + sfx.json (tiếng game phát theo giờ mô phỏng). Ghép thành mp4 có tiếng: ghep-tieng.py; bảng khung: bang-canh.py.
// Kịch bản giống nhau cho hai bản: bãi cỏ trống xa NPC; Mộc linh A → đi tới Mộc linh B (nhát thứ ba chí mạng) → hai Tiểu ma xông vào. Người chơi đi tới quái rồi giữ nút đánh.
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8792);
const [out, name, q, secs = '14', high = '720'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261114; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto('http://localhost:8792/?thu=1&' + q); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
const info = await p.evaluate(async ({ HIGH }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.data.config.power_pop.min = 1e12;   // kịch bản ép chí mạng (đổi chỉ số giữa cảnh) làm bảng "Lực chiến tăng" nhảy giả: tắt bảng đó trong cảnh quay
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  const MB = await import('/src/game/mobs.js'); await wait(1500);
  g.save.weapon = 'kiem'; g.refreshStats?.();
  const pl = g.player, T = g.data.config.tile, M = g.map;
  // Bãi cỏ trống phía tây bắc đảo Thanh Khê (hàng ô 12–14 thông suốt, cách hai NPC trên 120 đơn vị): người chơi đứng ô (9, 13)
  const best = { x: 9.5 * T, y: 13.5 * T }; pl.x = best.x; pl.y = best.y;
  pl.face = { x: 1, y: 0 }; pl.vx = pl.vy = 0; pl.hp = pl.maxHp; pl.st.crit = 0;
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  const add = (id, dx, dy, hp) => { MB.spawnMob(g, id, pl.x + dx, pl.y + dy); const m = g.mobs[g.mobs.length - 1]; m.hp = m.maxHp = hp; m.__mine = 1; m.__pin = { x: m.x, y: m.y }; m.__hits = 0; m.__hp = hp; return m; };
  const A = add('moc-linh', 25, 1, 54), B = add('moc-linh', 76, -9, 54), C = add('ma-tieu', 150, 6, 74), D = add('ma-tieu', 162, -18, 74);
  g.__mobs = [A, B, C, D]; g.__phase = 0;
  g.__log = []; g.__sim = 0;
  const sf = g.sfx; g.sfx = (n, v) => { g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = true; g.__done = 0;
  const inp = g.input, KEYS = { r: 'KeyD', l: 'KeyA', u: 'KeyW', d: 'KeyS' };
  // Người chơi theo kịch bản: còn xa mục tiêu thì đi tới, tới tầm thì đứng lại giữ nút đánh
  g.__drive = () => {
    const alive = m => m && !m.dead && g.mobs.includes(m);
    for (const m of g.__mobs) if (alive(m)) { if (m.hp < m.__hp) { m.__hits++; m.__hp = m.hp; } }
    g.mobs = g.mobs.filter(m => m.__mine);   // không cho quái bãi tự mọc chen vào cảnh
    if (g.__phase === 0 && !alive(A)) g.__phase = 1;
    if (g.__phase === 1 && !alive(B)) { g.__phase = 2; for (const m of [C, D]) { m.__pin = null; m.aggro = true; m.hurtT = g.time; } }
    for (const m of g.__mobs) if (alive(m) && m.__pin && !(m.hp < m.maxHp)) { m.x = m.__pin.x; m.y = m.__pin.y; m.t = 0; m.kx = m.ky = 0; }   // chưa tới lượt: đứng tại chỗ
    if (g.__phase === 2) for (const m of [C, D]) if (alive(m)) m.hurtT = Math.max(m.hurtT || 0, g.time - 1);   // hai Tiểu ma giữ thế xông vào
    const tgt = g.__phase === 0 ? A : g.__phase === 1 ? B : [C, D].filter(alive).sort((a, b2) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b2.x - pl.x, b2.y - pl.y))[0];
    for (const k of Object.values(KEYS)) inp.keys.delete(k);
    pl.st.crit = tgt === B && B.__hits === 2 ? 1 : 0;   // nhát thứ ba vào Mộc linh B: chí mạng (hai bản cùng lúc)
    if (!alive(tgt)) { inp.held.delete('atk'); if (g.__phase === 2) g.__done++; return; }
    const dx = tgt.x - pl.x, dy = tgt.y - pl.y, d = Math.hypot(dx, dy) - tgt.r;
    if (d > (g.__phase === 2 ? 30 : 21) && g.__sim > 0.4) { inp.held.delete('atk'); if (g.__phase !== 2 || d > 60) { if (dx > 3) inp.keys.add(KEYS.r); else if (dx < -3) inp.keys.add(KEYS.l); if (dy > 3) inp.keys.add(KEYS.d); else if (dy < -3) inp.keys.add(KEYS.u); } }
    else if (g.__sim > 0.4) inp.held.add('atk');
  };
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; g.uiOpen = false; g.__drive(); up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  const c = document.createElement('canvas');
  g.__grab = () => { const s = g.screen, P = s.toScreen(pl.x, pl.y - 6); c.width = s.canvas.width; c.height = HIGH;
    c.getContext('2d').drawImage(s.canvas, 0, Math.round(P.y * s.dpr - HIGH * 0.52), c.width, HIGH, 0, 0, c.width, HIGH); return c.toDataURL('image/png').slice(22); };
  g.__live = false;
  const drive = g.__drive; g.__drive = () => {};
  for (let i = 0; i < 90; i++) await g.__step();   // máy quay kịp theo chỗ mới
  g.__drive = drive; g.__sim = 0; g.__log.length = 0;
  return { spot: best, pl: [pl.x, pl.y], atk: pl.atk, el: g.save.element || null, map: M.id };
}, { HIGH: +high });
console.log(JSON.stringify(info));
let n = 0, end = false;
for (let i = 0; i < NMAX && !end; i += 12) {
  const res = await p.evaluate(async m => {
    const g = window.__game, out = [];
    for (let k = 0; k < m; k++) { await g.__step(); out.push(g.__grab()); }
    return { out, done: g.__done, hp: Math.round(g.player.hp), ph: g.__phase, hits: g.__mobs.map(x => x.__hits) };
  }, Math.min(12, NMAX - i));
  for (const s of res.out) writeFileSync(`${dir}/f-${String(++n).padStart(4, '0')}.png`, Buffer.from(s, 'base64'));
  if (res.done > 75) end = true;   // hạ con cuối xong 1,25 giây thì dừng
  if (i % 120 === 0) console.log(n, JSON.stringify({ hp: res.hp, ph: res.ph, hits: res.hits }));
}
const log = await p.evaluate(() => window.__game.__log);
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log }));
console.log(name, n, 'khung ·', log.length, 'tiếng · lỗi JS', errs.length, '·', [...new Set(log.map(l => l[1]))].join(','));
await b.close(); stop();
