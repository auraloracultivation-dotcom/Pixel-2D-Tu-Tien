// Người mới TỰ TAY đi cả chặng đầu game, không Tự hành (docs/10-CAI-HON.md việc 5). Kịch bản chỉ làm theo thứ người chơi thấy trên màn:
// đọc thoại rồi chạm (22 ký tự / giây + 0,7 giây), bấm nút đang sáng của nghi lễ, đi theo MŨI TÊN chỉ đường (biết đi vòng vật cản), tới gần quái thì giữ nút
// Đánh, tới người có nút Nói chuyện thì bấm, bước tu luyện thì ngồi đả tọa. Truyện đang chờ mà không có mũi tên quá 8 giây → ghi KẸT (đúng lỗi 14/11/2026:
// bước "Vào Bí cảnh Huyết Nha" không có gì chỉ đường khi chặng leo bậc khoá Tự hành; người thật đầu tiên dừng ở đó).
//   node tools/do-don/di-tay.mjs [giây ảo tối đa=1800] [q=bac=1&qua=1&dau=1]
//   DUNG=<điều kiện dừng, mặc định hết chặng leo bậc: g.save.flags['bac-xong']> · HAT=<hạt số ngẫu nhiên> · ANH=<thư mục: chụp một ảnh mỗi lần kẹt / gục / hết giờ>
// Dùng đồng hồ ảo của Playwright (như quay-bac.mjs), không chụp khung nên chạy nhanh hơn giờ thật. In: mốc từng bước / bậc (giây), số lần gục, máu thấp nhất, chỗ kẹt.
import { mkdirSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG || 8785), E = process.env;
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [secs = '1800', q = 'bac=1&qua=1&dau=1'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS);
const STOP_AT = E.DUNG || "g.save.flags['bac-xong']";
if (E.ANH) mkdirSync(E.ANH, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
await ctx.addInitScript(h => { let s = h; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }, +(E.HAT || 20261114));
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.clock.install();
await p.goto(`http://localhost:${PORT}/?thu=1&${q}`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(600);
await p.clock.pauseAt(new Date(Date.now() + 2000));   // từ đây giờ của trang đứng yên, chỉ chạy khi kịch bản cho chạy
await p.evaluate(() => { document.getElementById('btn-guest').click(); });
for (let i = 0; i < 600 && !(await p.evaluate(() => !!window.__game?.save && !!window.__game.player)); i++) await p.clock.runFor(50);
await p.evaluate(async () => { window.__P = await import('/src/game/pilot.js'); window.__G = await import('/src/game/guide.js'); });
await p.evaluate(STOP => {
  const g = window.__game, P = window.__P, G = window.__G;
  const L = window.__L = { moc: [], ket: [], guc: [], t0: performance.now(), line: -1, read: 0, same: 0, len: 0, ready: 0, ht: 0, act: 0, noArrow: 0, where: '', hpMin: 1e9, dead: false, path: null, pathKey: '', pathT: 0, shot: '', stop: new Function('g', 'return ' + STOP) };
  const now = () => (performance.now() - L.t0) / 1000;
  g.persist = () => {};
  const inp = g.input, KEYS = ['KeyD', 'KeyA', 'KeyS', 'KeyW'];
  const here = () => { const r = g.story.rung(), s = g.data.story.steps[g.save.step]; return `${g.save.step}:${s?.id || '?'}${r ? ` bậc ${r.i}` : ''} · ${g.story.goal()?.text || '(không có dòng mục tiêu)'}`; };
  // Đi tới (x, y) theo đường tìm trên lưới ô (như mắt người thấy vật cản thì đi vòng); tính lại đường mỗi 0,5 giây hoặc khi đích đổi ô
  const walk = (x, y, t) => {
    const T = g.map.T, key = `${g.map.id}:${Math.floor(x / T)},${Math.floor(y / T)}`, pl = g.player;
    if (L.pathKey !== key || t - L.pathT > 0.5) { L.pathKey = key; L.pathT = t; L.path = P.findPath(g, Math.floor(x / T), Math.floor(y / T)); }
    while (L.path?.length && Math.hypot(L.path[0].x - pl.x, L.path[0].y - pl.y) < 5) L.path.shift();
    const n = L.path?.length ? L.path[0] : { x, y }, dx = n.x - pl.x, dy = n.y - pl.y;
    if (dx > 2) inp.keys.add('KeyD'); else if (dx < -2) inp.keys.add('KeyA');
    if (dy > 2) inp.keys.add('KeyS'); else if (dy < -2) inp.keys.add('KeyW');
  };
  window.__drive = () => {
    const t = now(), pl = g.player;
    for (const k of KEYS) inp.keys.delete(k); inp.held.delete('atk');
    const w = here();
    if (w !== L.where) { L.where = w; L.moc.push([+t.toFixed(1), w]); L.noArrow = 0; L.ketHere = false; }
    L.hpMin = Math.min(L.hpMin, Math.round(pl.hp));
    if (!!g.ghost !== L.dead) { L.dead = !!g.ghost; if (L.dead) { L.guc.push([+t.toFixed(1), w]); L.shot = 'guc'; } }
    const da = document.querySelector('.death-ask button');   // gục: chọn Hồi sinh tại đây
    if (da) { da.click(); return; }
    const ch = document.querySelector('#dlg-choices .choice');
    if (ch && ch.offsetParent) { L.pick ||= t; if (t - L.pick > 1.2) { ch.click(); L.pick = 0; } return; }
    for (const [id, btn] of [['qua', '.q-btn.go, .q-btn'], ['mung-canh', '.c-btn'], ['hen-mai', '.m-ok']]) {   // nghi lễ, thẻ: nút sáng lên 1,3 giây thì bấm
      const Q = document.getElementById(id);
      if (!Q || Q.hidden) continue;
      const ok = Q.classList.contains('ready') || Q.querySelector('.ready');
      if (ok) { L.ready ||= t; if (t - L.ready > 1.3) { Q.querySelector(btn)?.click(); L.ready = 0; } } else L.ready = 0;
      return;
    }
    if (g.dialog.open) {   // đọc xong câu mới chạm
      const dlg = document.getElementById('dialog'), tx = document.getElementById('dlg-text') || dlg.querySelector('.text'), len = (tx?.textContent || '').length;
      if (L.line !== g.dialog.lineNo) { L.line = g.dialog.lineNo; L.read = t; L.len = 0; }
      if (len !== L.len) { L.len = len; L.same = t; }
      if (t - L.same > 0.7 + len / 22 * 0.35 && t - L.read > 0.7 + len / 22) { dlg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); L.read = t; L.same = t; }
      return;
    }
    if (g.uiOpen === 'he-thong') { L.ht ||= t; if (t - L.ht > 4) { document.querySelector('.ht-back')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('.ht-back')?.click(); L.ht = 0; } return; }
    L.ht = 0;
    if (g.story.busy || g.uiOpen || g.traveling || g.trip || g.ghost) return;
    const u = g.story.current()?.until, goal = g.story.goal(), a = G.guideTarget(g);
    if (u?.layer && pl.meditating) return;   // bước tu luyện: đang ngồi thì ngồi yên
    // quái trong tầm tay: giữ nút Đánh (người mới chỉ biết giữ Đánh)
    let foe = null, bd = 1e9;
    for (const m of g.mobs) { if (m.dead || m.dummy || !(m.aggro || m.story || m.room || (goal?.kill && (goal.kill === '*' || m.id === goal.kill)))) continue; const d = Math.hypot(m.x - pl.x, m.y - pl.y) - m.r; if (d < bd) { bd = d; foe = m; } }
    if (foe && bd <= 15) { inp.held.add('atk'); L.noArrow = 0; return; }
    if (!a) {   // không có mũi tên: người mới không biết đi đâu
      L.noArrow += 1 / 60;
      if (L.noArrow > 8 && !L.ketHere) { L.ketHere = true; L.ket.push([+t.toFixed(1), w]); L.shot = 'ket'; }
      return;
    }
    L.noArrow = 0;
    const d = Math.hypot(a.x - pl.x, a.y - pl.y);
    if ((u?.talk && d < 30 || u?.layer && d < 10) && g.actLabel) { if (t - L.act > 0.7) { inp.pressed.add('act'); L.act = t; } if (u.layer || d < 18) return; }   // tới người: bấm Nói chuyện; tới bồ đoàn: bấm Đả tọa
    walk(a.x, u?.talk ? a.y + 14 : a.y, t);
  };
}, STOP_AT);
let n = 0, end = 0, shots = 0;
const shoot = async tag => { if (E.ANH && shots < 12) await p.screenshot({ path: `${E.ANH}/${String(++shots).padStart(2, '0')}-${tag}-${Math.round(n / FPS)}s.png` }); };
while (n < NMAX && end < 60) {
  const st = await p.evaluate(() => { window.__drive(); const g = window.__game, L = window.__L, s = L.shot; L.shot = ''; return { stop: !!L.stop(g), shot: s }; });
  await p.clock.runFor(1000 / FPS);
  n++;
  if (st.shot) await shoot(st.shot);
  if (st.stop) end++;
  if (n % 3600 === 0) console.log(`… ${n / 60} giây ảo:`, await p.evaluate(() => window.__L.where));
}
if (end < 60) await shoot('het-gio');
const R = await p.evaluate(() => { const g = window.__game, L = window.__L; return { moc: L.moc, ket: L.ket, guc: L.guc, hpMin: L.hpMin, hpMax: Math.round(g.player.maxHp), where: L.where, tu: `${g.data.realms.names[g.save.realm]} tầng ${g.save.layer}`, lc: document.getElementById('power')?.textContent, flags: Object.keys(g.save.flags).filter(k => k.startsWith('bac-') || k === 'leo-bac').join(',') }; });
console.log(`\nNgười mới tự tay đi ${Math.round(n / FPS)} giây ảo (${end >= 60 ? 'ĐẠT điều kiện dừng' : 'HẾT GIỜ, chưa xong'}): đang ở ${R.where} · ${R.tu} · ${R.lc} · cờ ${R.flags}`);
console.log('Mốc (giây: bước · việc):'); for (const [t, w] of R.moc) console.log(`  ${String(t).padStart(7)}  ${w}`);
console.log(`Gục ${R.guc.length} lần${R.guc.length ? ': ' + R.guc.map(([t, w]) => `${t}s ở ${w}`).join(' | ') : ''} · máu thấp nhất ${R.hpMin}/${R.hpMax}`);
console.log(R.ket.length ? 'KẸT (truyện chờ mà không có mũi tên):\n' + R.ket.map(([t, w]) => `  ${t}s  ${w}`).join('\n') : 'Không kẹt chỗ nào: bước nào cũng có mũi tên');
console.log('lỗi JS', errs.length);
await b.close(); stop();
process.exit(end >= 60 && !R.ket.length && !errs.length ? 0 : 1);
