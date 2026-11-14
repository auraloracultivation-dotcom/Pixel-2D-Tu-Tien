// Quay cảnh "nhận thưởng" cả màn hình điện thoại, từng khung 1/60 giây (docs/10-CAI-HON.md việc 4: nghi lễ nhận thưởng):
//   node tools/do-don/quay-qua.mjs <thư mục ra> <tên> <q: qua=0|qua=1> [giây tối đa=14] [cao=844 điểm màn]
// Kịch bản (giống nhau cho hai bản): bãi cỏ đảo Thanh Khê, người chơi chém một con Mộc linh ba nhát; con quái rơi đúng một món trang bị do kịch bản đặt sẵn
// (PHAM=<0..6> phẩm của món, mặc định 3 Địa; MON=<mã món>, mặc định huyen-giap; DONG=<số dòng phụ>, mặc định 1 như đồ mới rơi). Bản cũ: chỉ có dòng "Nhặt …".
// Bản mới: nghi lễ diễn hết, chờ CHO giây (mặc định 1,6) rồi bấm nút đang sáng (Mặc ngay), quay tiếp tới khi chữ Lực chiến nổ xong.
// BAM=keep bấm Cất vào túi; CHAM=<giây> chạm màn lúc ấy (thử "chạm để xem nhanh"); HAI=1 thêm một con Tiểu ma đang đánh mình (món rơi giữa trận: thẻ nhỏ trước,
// hạ nốt con kia mới diễn); TU=1 bật Tự đánh (chỉ thẻ nhỏ). Ra: f-0001.jpg… + sfx.json (ghép tiếng: ghep-tieng.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG || 8796);   // CONG=<cổng>: quay hai cảnh cùng lúc thì mỗi cảnh một cổng
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [out, name, q, secs = '14', high = '844'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
const E = process.env, OPT = { tier: +(E.PHAM ?? 3), base: E.MON || 'huyen-giap', nline: +(E.DONG ?? 1), hold: +(E.CHO ?? 1.6), btn: E.BAM || 'go', tap: E.CHAM ? +E.CHAM : -1, auto: E.TU === '1', two: E.HAI === '1' };
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261114; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto(`http://localhost:${PORT}/?thu=1&${q}`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.addStyleTag({ content: '#ht-icon, .ht-tip { display: none !important; }' });   // linh vật Hệ Thống dạo quanh màn: ẩn trong cảnh quay
const info = await p.evaluate(async O => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9;
  g.save.ht = { ...(g.save.ht || {}), intro: 1 };
  if (g.data['he-thong']) g.data['he-thong'].idle_s = 1e9;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  const MB = await import('/src/game/mobs.js'), IT = await import('/src/game/items.js'), TI = await import('/src/game/tiers.js'); await wait(1500);
  g.save.weapon = 'kiem'; g.refreshStats?.(); g.noDeath = true; if (O.auto) g.auto = true;
  const pl = g.player, T = g.data.config.tile;
  pl.x = 9.5 * T; pl.y = 13.5 * T; pl.face = { x: 1, y: 0 }; pl.vx = pl.vy = 0; pl.hp = pl.maxHp;   // không ép chỉ số (ép bạo kích = 0 làm lực chiến trên màn lệch với số nghi lễ báo)
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  for (const k of Object.keys(g.data.items.drops)) g.data.items.drops[k] = { item: 0, gem: 0, stone: 0 };   // chỉ rơi món kịch bản đặt
  MB.spawnMob(g, 'moc-linh', pl.x + 25, pl.y + 1); const A = g.mobs[g.mobs.length - 1]; A.hp = A.maxHp = 54; A.__mine = 1; A.__pin = { x: A.x, y: A.y };
  let B = null;
  if (O.two) { MB.spawnMob(g, 'ma-tieu', pl.x - 34, pl.y + 3); B = g.mobs[g.mobs.length - 1]; B.hp = B.maxHp = 70; B.__mine = 1; }
  const seed = n => { let s = n; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };   // gieo lại số ngẫu nhiên ở mốc cố định: hai bản ra cùng món, cùng số nhát chém
  seed(4107);
  // món thưởng: gốc O.base, mọi dòng phụ cùng màu O.tier (phẩm của món = màu dòng)
  const it = IT.rollItem(g.data, g.save, { base: O.base, lvl: 1, rarity: 'pham' }), pool = g.data.items.bases[O.base].pool;
  it.lines = Array.from({ length: O.nline }, () => TI.newLine(g.data, pool, it.lvl, Math.random, O.tier)); it.cap = Math.max(it.cap, it.lines.length);
  g.__log = []; g.__sim = 0; g.__phase = 0; g.__done = 0; g.__drop = 0; g.__open = -1; g.__clicked = -1; g.__tapped = 0;
  const sf = g.sfx; g.sfx = (n, v) => {
    if (n === 'pickup' && new Error().stack.includes('/ui/he-thong.js')) return;   // linh vật Hệ Thống (đang ẩn) lên tiếng nhắc: bỏ tiếng đó khỏi cảnh quay
    if (n) g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v);
  };
  const up = g.update, inp = g.input; g.__q = 0; g.__n = 0; g.__live = true;
  const alive = m => m && !m.dead && g.mobs.includes(m);
  g.__drive = () => {
    g.mobs = g.mobs.filter(m => m.__mine);
    if (alive(A)) { A.x = A.__pin.x; A.y = A.__pin.y; A.kx = A.ky = 0; A.aggro = false; A.state = 'idle'; A.t = 0; }   // con quái đứng yên chịu đòn (cảnh này chỉ nói về phần thưởng)
    if (alive(B)) { B.aggro = true; B.hurtT = Math.max(B.hurtT || 0, g.time - 1); }
    if (g.__phase === 0) {
      if (g.__sim > 0.4) inp.held.add('atk');
      if (!alive(A)) { g.__phase = 1; if (!alive(B)) inp.held.delete('atk'); if (!g.__drop) { g.__drop = 1; const a = -0.6; g.loot.push({ kind: 'item', payload: it, x: A.x, y: A.y - 4, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, t: 0 }); } }
    } else {
      if (alive(B)) inp.held.add('atk'); else inp.held.delete('atk');
      const Q = document.getElementById('qua'), on = Q && !Q.hidden;
      if (on && g.__open < 0) g.__open = g.__sim;
      if (on && O.tap >= 0 && !g.__tapped && g.__sim - g.__open >= O.tap) { g.__tapped = 1; Q.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      if (on && Q.classList.contains('ready') && g.__clicked < 0) { g.__ready ??= g.__sim; if (g.__sim - g.__ready >= O.hold) { g.__clicked = g.__sim; (O.btn === 'keep' ? [...Q.querySelectorAll('.q-btn')].pop() : Q.querySelector('.q-btn.go') || Q.querySelector('.q-btn')).click(); } }
      if (!g.loot.length && !on && !alive(B) && (g.__clicked >= 0 || !g.rewardOnLab || O.auto || O.tier < g.data.juice.reward.full_from)) g.__done++;   // chỉ có thẻ nhỏ (phẩm thấp, Tự đánh): không có nút để bấm
    }
  };
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; g.__drive(); up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  g.__live = false;
  const drive = g.__drive; g.__drive = () => { for (const m of [A, B]) if (m) { m.x = m === A ? A.__pin.x : pl.x - 34; m.y = m === A ? A.__pin.y : pl.y + 3; m.aggro = false; m.state = 'idle'; m.t = 0; } };
  for (let i = 0; i < 90; i++) await g.__step();   // máy quay kịp theo chỗ mới
  g.__drive = drive; g.__sim = 0; g.__log.length = 0; pl.hp = pl.maxHp; seed(20261114);
  g.rewardOnLab = !!g.data.juice.reward && new URLSearchParams(location.search).get('qua') === '1';
  return { pl: [pl.x, pl.y], mon: IT.itemName(g.data, it), pham: TI.grade(g.data, it).name, dong: it.lines.length, qua: g.rewardOnLab, lc: document.getElementById('power')?.textContent };
}, OPT);
console.log(JSON.stringify(info));
let n = 0, end = false, last = null;
while (n < NMAX && !end) {
  last = await p.evaluate(async () => { const g = window.__game; await g.__step(); return { done: g.__done, ph: g.__phase, open: g.__open, ready: g.__ready ?? -1, clicked: g.__clicked, ui: g.uiOpen || 0 }; });
  await p.screenshot({ path: `${dir}/f-${String(++n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: 390, height: +high } });
  if (last.done > (info.qua ? 170 : 200)) end = true;   // bản mới: bấm nút xong quay thêm ~2,8 giây (chữ Lực chiến nổ); bản cũ: nhặt xong quay thêm ~3,3 giây (dòng Nhặt… tan)
  if (n % 120 === 0) console.log(n, JSON.stringify(last));
}
const res = await p.evaluate(() => ({ log: window.__game.__log, lc: document.getElementById('power')?.textContent }));
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log: res.log, open: last?.open, ready: last?.ready, clicked: last?.clicked }));
console.log(name, n, 'khung · mở', last?.open, '· sẵn sàng', last?.ready, '· bấm', last?.clicked, '·', res.lc, '·', res.log.length, 'tiếng · lỗi JS', errs.length, '·', [...new Set(res.log.map(l => l[1]))].join(','));
await b.close(); stop();
