// Quay nghi lễ kết đan (độ kiếp Trúc Cơ → Kim Đan, src/game/ket-dan.js) cả màn hình điện thoại, từng khung theo giờ game:
//   node tools/do-don/quay-ket-dan.mjs <thư mục ra> <tên> [giây=30] [dpr=2]
// Nhân vật chơi thử được đặt Trúc Cơ tầng 9 đầy linh khí, gọi thẳng game.trib.start() (lời thoại mở đầu bỏ qua), rồi bước từng khung 1/60 giây.
// KHUNG="1,3.5,8": chỉ chụp ảnh ở các giây đó (soát từng nhịp); bỏ trống: quay cả đoạn, FPS (mặc định 30) ảnh mỗi giây.
// MAU=<phần máu lúc bắt đầu, mặc định 1> (0.3: xem cảnh thất bại) · PT=<mã pháp tượng đeo sẵn, vd pt-hoa-long> · BO=<mã trang phục, vd tp-06> ·
// DX, DY=<dời nhân vật bao nhiêu đơn vị bản đồ trước khi quay, tới ô trống gần đó> · XEM=1: quay ở máy NGƯỜI XEM (dựng một người chơi khác đứng cạnh làm nghi lễ, nhận qua đúng đường tin chiêu) · MAN=<rộng>x<cao> (mặc định 390x844) ·
// DONG_LUC=<giây bấm nút Tiếp tục của bảng chúc mừng>. Ra: f-0001.jpg… + sfx.json (ghép tiếng: ghep-tieng.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG_MAY || 8797);
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [out, name, secs = '30', dpr = '2'] = process.argv.slice(2), E = process.env, FPS = +(E.FPS || 30), dir = `${out}/${name}`;
const stills = E.KHUNG ? E.KHUNG.split(',').map(Number) : null, closeAt = E.DONG_LUC ? +E.DONG_LUC : null;
const O = { hp: +(E.MAU ?? 1), pt: E.PT || '', bo: E.BO || '', xem: E.XEM === '1', dx: +(E.DX || 0), dy: +(E.DY || 0) };
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const [MW, MH] = (E.MAN || '390x844').split('x').map(Number);
const ctx = await b.newContext({ viewport: { width: MW, height: MH }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261120; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto(`http://localhost:${PORT}/?thu=1`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.addStyleTag({ content: '#ht-icon, .ht-tip { display: none !important; }' });   // linh vật Hệ Thống dạo quanh màn: ẩn trong cảnh quay
const info = await p.evaluate(async O => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.save.ht = { ...(g.save.ht || {}), intro: 1 }; if (g.data['he-thong']) g.data['he-thong'].idle_s = 1e9;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  await wait(800);
  const toast = g.toast; g.toast = () => {};   // dòng báo do việc dựng cảnh gây ra: không cho hiện
  const s = g.save, R = g.data.realms, ST = await import('/src/game/stats.js');
  s.weapon = 'kiem'; s.realm = 1; s.layer = R.layers; s.giftAt = null;
  if (O.bo) { s.outfits = { ...(s.outfits || {}), [O.bo + ':' + s.look]: true }; s.outfit = O.bo; }
  if (O.pt) { const M = await import('/src/game/items.js'), it = M.rollItem(g.data, s, { base: O.pt, rarity: 'thien', lvl: 10 }); M.addItem(g.data, s, it); M.equip(s, g.data, it.uid); }
  g.refreshStats(); g.checkUnlocks(); g.powerSeen = null;
  g.noDeath = false;   // truyện đầu game đang giữ nhân vật không gục: bỏ để thử được cảnh thất bại
  if (O.dx || O.dy) { const pl = g.player, T = g.map.T, to = g.map.freeNear(Math.floor((pl.x + O.dx) / T), Math.floor((pl.y + O.dy) / T), 0, pl.r); pl.x = to.x; pl.y = to.y; }   // dời tới chỗ trống cho cảnh quay
  s.qi = ST.qiNeed(s, R); g.player.hp = Math.max(1, Math.round(g.player.maxHp * O.hp));
  g.toast = toast; await wait(1500); document.getElementById('toast').hidden = true;
  g.__log = []; g.__sim = 0;
  const sf = g.sfx; g.sfx = (n, v) => { if (n === 'pickup' && new Error().stack.includes('/ui/he-thong.js')) return; if (n) g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = true;
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async (k = 1) => { for (let j = 0; j < k; j++) { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); } await new Promise(r => requestAnimationFrame(r)); };
  g.__live = false;
  for (let i = 0; i < 30; i++) await g.__step();
  g.__sim = 0; g.__log.length = 0;
  if (O.xem) {   // máy người xem: một người chơi khác đứng cạnh, tin nghi lễ đi qua đúng cửa nhận tin chiêu (others.cast)
    const pl = g.player, id = 'nguoi-thu';
    g.others.presence([{ id, name: 'Đạo hữu', element: s.element, realm: 'Trúc Cơ tầng 9', look: s.look, outfit: O.bo || s.outfit || null, mount: null, pt: null }]);
    g.others.move({ id, x: pl.x + 44, y: pl.y - 6, fx: 0, fy: 1 });
    g.__bd = () => g.others.cast({ id, k: 'kd-bd', x: pl.x + 44, y: pl.y - 6, fx: 0.6, fy: 0 });
    g.__ok = () => g.others.cast({ id, k: 'kd-ok', x: pl.x + 44, y: pl.y - 6, fx: 0, fy: 0 });
    g.__T = (await import('/src/game/ket-dan.js')).kdTimes(g.data.config.ket_dan, 12);
  }
  return { tu: `${s.realm}/${s.layer}`, look: s.look, bo: s.outfit, map: g.map.id, hp: `${g.player.hp}/${g.player.maxHp}`, others: g.others.count() };
}, O);
console.log(JSON.stringify(info));
await p.evaluate(O => { const g = window.__game; if (O.xem) g.__bd(); else g.trib.start(); }, O);
const NMAX = Math.round(+secs * FPS), per = Math.round(60 / FPS);
let n = 0, closed = false, sentOk = false;
const ok = async t => { if (O.xem && !sentOk && await p.evaluate(t => t >= window.__game.__T.q, t)) { sentOk = true; await p.evaluate(() => window.__game.__ok()); } };   // máy người xem: tin 'kd-ok' tới ngay trước lúc phát sóng
const shot = async file => p.screenshot({ path: file, type: 'jpeg', quality: 93 });
if (stills) {
  for (const at of stills) {
    for (;;) { const t = await p.evaluate(() => window.__game.__sim); if (t >= at) break; await ok(t); await p.evaluate(k => window.__game.__step(k), Math.max(1, Math.min(12, Math.floor((at - t) * 60)))); }
    await shot(`${dir}/t-${at.toFixed(2).padStart(5, '0')}.jpg`);
    console.log(at, await p.evaluate(() => { const g = window.__game, q = g.player; return `máu ${Math.round(q.hp)}/${q.maxHp} · gục: ${!!g.ghost} · nghi lễ: ${!!g.kd} · đang độ kiếp: ${g.trib.active} · linh khí ${Math.round(g.save.qi)}`; }));
  }
} else while (n < NMAX) {
  const t = await p.evaluate(() => window.__game.__sim);
  await ok(t);
  if (closeAt != null && !closed && t >= closeAt) { closed = true; await p.evaluate(() => document.querySelector('#mung-canh .c-btn')?.click()); }
  await p.evaluate(k => window.__game.__step(k), per);
  await shot(`${dir}/f-${String(++n).padStart(4, '0')}.jpg`);
}
const end = await p.evaluate(() => { const g = window.__game; return { log: g.__log, tu: `${g.save.realm}/${g.save.layer}`, hp: `${Math.round(g.player.hp)}/${g.player.maxHp}`, kd: !!g.kd, trib: g.trib.active, ui: String(g.uiOpen || '') }; });
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log: end.log, bam: [] }));
console.log(name, stills ? `${stills.length} ảnh` : `${n} khung`, `· tu vi sau cùng ${end.tu} · máu ${end.hp} · còn nghi lễ: ${end.kd} · đang độ kiếp: ${end.trib} · bảng đang mở: ${end.ui} · lỗi JS ${errs.length}`);
await b.close(); stop();
