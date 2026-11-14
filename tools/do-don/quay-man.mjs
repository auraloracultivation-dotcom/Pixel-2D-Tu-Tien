// Quay CẢ MÀN HÌNH điện thoại (có thanh máu, nút bấm) theo kịch bản, từng khung 1/60 giây (docs/10-CAI-HON.md việc 3: cảm giác bị đánh):
//   node tools/do-don/quay-man.mjs <thư mục ra> <tên> <q: dau=0|dau=1> [giây tối đa=14] [cao=640 điểm màn]
// Khác quay-canh.mjs (chỉ chép khung vẽ game): chụp cả trang nên thấy được giao diện. Hiệu ứng giao diện phải chạy theo giờ game mới quay đúng.
// Kịch bản "bị đánh" (giống nhau cho hai bản): bãi cỏ đảo Thanh Khê, người chơi đứng yên. Tiểu ma tới từ bên phải cắn một phát, Ma binh áp tới từ bên trái;
// lần Tiểu ma lấy đà thứ hai người chơi lùi ra né; rồi đứng chịu trận (Ma binh nện đòn nặng 30 máu) tới khi máu xuống dưới 30% (tim đập); đánh trả, hạ cả hai.
// Linh vật Hệ Thống và lời nhắc "đứng ngẩn ra" được ẩn cho khỏi che chỗ đánh nhau; NANG=<số> đổi sức đánh của Ma binh. Ra: f-0001.jpg… + sfx.json (ghép tiếng: ghep-tieng.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8794);
const [out, name, q, secs = '14', high = '640'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261114; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto('http://localhost:8794/?thu=1&' + q); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.addStyleTag({ content: '#ht-icon, .ht-tip { display: none !important; }' });   // linh vật Hệ Thống dạo quanh màn hay bay đè lên chỗ đánh nhau: ẩn trong cảnh quay
const info = await p.evaluate(async ({ HEAVY }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.data.config.power_pop.min = 1e12;
  g.save.ht = { ...(g.save.ht || {}), intro: 1 };   // bảng chào của Hệ Thống che nửa màn: coi như đã xem
  if (g.data['he-thong']) g.data['he-thong'].idle_s = 1e9;   // người chơi đứng yên chịu đòn theo kịch bản: Hệ Thống đừng nhắc "đứng ngẩn ra"
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  const MB = await import('/src/game/mobs.js'); await wait(1500);
  g.save.weapon = 'kiem'; g.refreshStats?.(); g.noDeath = true;
  const pl = g.player, T = g.data.config.tile;
  pl.x = 9.5 * T; pl.y = 13.5 * T; pl.face = { x: 1, y: 0 }; pl.vx = pl.vy = 0; pl.hp = pl.maxHp; pl.st.crit = 0;
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  const add = (id, dx, dy, hp, atk) => { MB.spawnMob(g, id, pl.x + dx, pl.y + dy); const m = g.mobs[g.mobs.length - 1]; m.hp = m.maxHp = hp; m.__mine = 1; m.__pin = { x: m.x, y: m.y }; if (atk) m.def = { ...m.def, atk }; return m; };
  const A = add('ma-tieu', 62, 2, 22), B = add('ma-binh', -84, 5, 33, HEAVY);   // Tiểu ma tới từ bên phải, Ma binh từ bên trái: hai kẻ đánh không che nhau, vết đau đổi hướng theo từng đòn
  g.__log = []; g.__sim = 0; g.__phase = 0; g.__done = 0; g.__winds = 0; g.__dodge = 0; g.__hp = [];
  const sf = g.sfx; g.sfx = (n, v) => { g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update, inp = g.input; g.__q = 0; g.__n = 0; g.__live = true;
  const alive = m => m && !m.dead && g.mobs.includes(m), go = m => { m.__pin = null; m.aggro = true; m.hurtT = g.time; };
  let wasWind = false;
  g.__drive = () => {
    g.mobs = g.mobs.filter(m => m.__mine);
    for (const m of [A, B]) if (alive(m)) { if (m.__pin) { m.x = m.__pin.x; m.y = m.__pin.y; m.t = 0; m.kx = m.ky = 0; } else m.hurtT = Math.max(m.hurtT || 0, g.time - 1); }
    if (g.__sim >= 0.3 && A.__pin) go(A);
    if (g.__sim >= 2.2 && B.__pin) go(B);   // Ma binh vào sau: tới nơi lúc người chơi vừa né xong đòn của Tiểu ma
    const wind = alive(A) && A.state === 'windup';
    if (wind && !wasWind) g.__winds++;
    wasWind = wind;
    for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS']) inp.keys.delete(k);
    if (g.__phase === 0) {   // đứng yên chịu đòn đầu; lần lấy đà thứ hai của Tiểu ma thì lùi ra né (thấy dấu báo đòn mới lùi)
      if (g.__winds === 2 && !g.__dodge && A.t > 0.08) g.__dodge = 20;
      if (g.__dodge > 0) { inp.keys.add('KeyA'); if (--g.__dodge === 0) g.__phase = 1; }   // lùi sang trái, ra xa Tiểu ma (lúc này Ma binh chưa tới)
    } else if (g.__phase === 1) {   // đứng chịu trận tới khi máu xuống thấp
      if (pl.hp / pl.maxHp < 0.3) g.__phase = 2;
    } else {   // đánh trả tới khi hạ hết
      const left = [A, B].filter(alive);
      if (left.length) inp.held.add('atk'); else { inp.held.delete('atk'); g.__done++; }
    }
    g.__hp.push(Math.round(pl.hp));
  };
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; g.uiOpen = false; g.__drive(); up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  g.__live = false;
  const drive = g.__drive; g.__drive = () => { for (const m of [A, B]) { m.x = m.__pin.x; m.y = m.__pin.y; m.t = 0; m.aggro = false; m.state = 'idle'; } };   // làm nóng: quái đứng yên tại chỗ
  for (let i = 0; i < 90; i++) await g.__step();   // máy quay kịp theo chỗ mới
  g.__drive = drive; g.__sim = 0; g.__log.length = 0; g.__hp.length = 0; pl.hp = pl.maxHp; pl.invT = 0;
  return { pl: [pl.x, pl.y], hp: pl.maxHp, def: pl.st.def, atk: pl.atk, dau: !!g.hurt2, don: !!g.hit2 };
}, { HEAVY: +(process.env.NANG || 30) });
console.log(JSON.stringify(info));
let n = 0, end = false, last = null;
while (n < NMAX && !end) {
  last = await p.evaluate(async () => { const g = window.__game; await g.__step(); return { done: g.__done, hp: Math.round(g.player.hp), ph: g.__phase, winds: g.__winds }; });
  await p.screenshot({ path: `${dir}/f-${String(++n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: 390, height: +high } });
  if (last.done > 80) end = true;   // hạ con cuối xong 1,3 giây thì dừng
  if (n % 120 === 0) console.log(n, JSON.stringify(last));
}
const res = await p.evaluate(() => ({ log: window.__game.__log, hp: window.__game.__hp }));
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log: res.log, hp: res.hp }));
console.log(name, n, 'khung ·', res.log.length, 'tiếng · lỗi JS', errs.length, '· máu cuối', last?.hp, '·', [...new Set(res.log.map(l => l[1]))].join(','));
await b.close(); stop();
