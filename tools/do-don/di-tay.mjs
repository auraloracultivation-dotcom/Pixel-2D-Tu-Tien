// Người mới TỰ TAY đi cả chặng đầu game, không Tự hành (docs/10-CAI-HON.md việc 5). Kịch bản chỉ làm theo thứ người chơi thấy trên màn:
// đọc thoại rồi chạm (22 ký tự / giây + 0,7 giây), bấm nút đang sáng của nghi lễ, đi theo MŨI TÊN chỉ đường (biết đi vòng vật cản), tới gần quái thì giữ nút
// Đánh, tới người có nút Nói chuyện thì bấm, bước tu luyện thì ngồi đả tọa. Truyện đang chờ mà không có mũi tên quá 8 giây → ghi KẸT (đúng lỗi 14/11/2026:
// bước "Vào Bí cảnh Huyết Nha" không có gì chỉ đường khi chặng leo bậc khoá Tự hành; người thật đầu tiên dừng ở đó).
//   node tools/do-don/di-tay.mjs [giây ảo tối đa=1800] [q=bac=1&qua=1&dau=1]
//   DUNG=<điều kiện dừng, mặc định hết chặng leo bậc: g.save.flags['bac-xong']> · HAT=<hạt số ngẫu nhiên> · ANH=<thư mục: chụp một ảnh mỗi lần kẹt / gục / hết giờ>
// Dùng đồng hồ ảo của Playwright (như quay-bac.mjs), không chụp khung nên chạy nhanh hơn giờ thật. In: mốc từng bước / bậc (giây), số lần gục, máu thấp nhất, chỗ kẹt.
// Đo sức (docs/10-CAI-HON.md việc 6, dòng 18e): mỗi con quái hạ được ghi số nhát trúng, số giây từ nhát đầu tới lúc tan; mỗi chặng ghi số đòn người chơi ăn và máu mất.
//   SAU=<giây>: xong điều kiện dừng thì ra bãi quái treo máy gần nhất đánh tiếp chừng ấy giây ảo (người mới chỉ biết đi tới và giữ Đánh), VONG=1 vòng trong | 2 vòng ngoài,
//   TANG=<tầng Luyện Khí lúc ra bãi, mặc định giữ nguyên>, DANH=1 bật Tự đánh ở bãi (đo nhịp treo máy). In: số con, nhát mỗi con, giây mỗi con, linh khí mỗi phút, đòn ăn, gục.
//   QUAY=<thư mục>: chụp cả màn hình mỗi CHUP_MOI khung (mặc định 2 = 30 khung / giây, điểm máy × 2) + sfx.json, ghép tiếng bằng ghep-tieng.py như quay-bac.mjs.
//   LUU=<file>: ghi bản lưu lúc đạt điều kiện dừng · NAP=<file>: vào game bằng bản lưu đó (bỏ qua chặng đã đi, ra bãi luôn: mỗi lần đo bãi còn hơn một phút).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG || 8785), E = process.env;
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [secs = '1800', q = 'bac=1&qua=1&dau=1'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS);
const STOP_AT = E.DUNG || "g.save.flags['bac-xong']";
const QUAY = E.QUAY || '', MOI = +(E.CHUP_MOI || 2);
if (QUAY) mkdirSync(QUAY, { recursive: true });
if (E.ANH) mkdirSync(E.ANH, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: QUAY ? 2 : 1, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
await ctx.addInitScript(h => { let s = h; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }, +(E.HAT || 20261114));
if (E.NAP) await ctx.addInitScript(sv => { try { const d = JSON.parse(sv); d.lastSeen = Date.now(); localStorage.setItem('p2d.save.v1:guest', JSON.stringify(d)); } catch { /* không có bộ nhớ */ } }, readFileSync(E.NAP, 'utf8'));   // lastSeen = bây giờ: không cộng linh khí bế quan của quãng thời gian từ lúc ghi bản lưu
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
  L.sfx = []; const sf = g.sfx; g.sfx = (n, v) => { if (n) L.sfx.push([+now().toFixed(3), n, v ?? 1]); return sf(n, v); };   // tiếng theo giờ ảo (QUAY)
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
  // Đo sức: theo từng con quái (số nhát trúng, giây từ nhát đầu tới lúc tan) và từng đòn người chơi ăn, gom theo chặng đang đứng (L.where)
  const T = new Map(); L.quai = []; L.dau = {}; let php = null;
  window.__do = () => {
    const t = now(), w = L.pha || L.where, pl = g.player;
    for (const m of g.mobs) if (!m.dummy && !m.remote && !T.has(m.uid)) T.set(m.uid, { m, hp: m.hp, hits: 0, t0: 0 });
    for (const [uid, r] of T) {
      const m = r.m;
      if (m.hp < r.hp - 0.01) { r.hits++; r.t0 ||= t; }
      r.hp = m.hp;
      if (m.dead) { T.delete(uid); if (r.hits) L.quai.push({ w, name: m.def.name, max: m.maxHp, atk: m.def.atk, hits: r.hits, sec: +(t - r.t0).toFixed(2), dmg: (m.maxHp - m.hp) / r.hits }); }
      else if (!g.mobs.includes(m)) T.delete(uid);   // đổi bản đồ: con này không còn
    }
    if (php != null && pl.hp < php - 0.01 && !g.ghost) { const d = (L.dau[w] ||= { n: 0, dmg: 0 }); d.n++; d.dmg += php - pl.hp; }
    php = pl.hp;
  };
  // Ra bãi quái treo máy (sau chặng leo bậc): tới con gần nhất của vòng đã chọn rồi giữ Đánh; quái hiền nên phải tự tìm tới
  window.__bai = (vong, auto) => {
    const pl = g.player, t = now();
    for (const k of KEYS) inp.keys.delete(k); inp.held.delete('atk');
    const da = document.querySelector('.death-ask button'); if (da) { da.click(); return; }
    if (!!g.ghost !== L.dead) { L.dead = !!g.ghost; if (L.dead) L.guc.push([+t.toFixed(1), L.pha]); }
    if (g.dialog.open) { document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; }
    for (const [id, btn] of [['qua', '.q-btn.go, .q-btn'], ['mung-canh', '.c-btn'], ['hen-mai', '.m-ok']]) { const Q = document.getElementById(id); if (Q && !Q.hidden) { if (Q.classList.contains('ready') || Q.querySelector('.ready')) Q.querySelector(btn)?.click(); return; } }
    if (g.uiOpen === 'he-thong') { document.querySelector('.ht-back')?.click(); return; }
    const dr = document.querySelector('.dr-panel'); if (dr && !dr.hidden) { [...dr.querySelectorAll('button')].at(-1)?.click(); return; }   // bảng kết quả bí cảnh: bấm Thoát
    if (g.story.busy || g.uiOpen || g.traveling || g.trip || g.ghost) return;
    let foe = null, bd = 1e9;
    for (const m of g.mobs) { if (m.dead || m.dummy || !m.farm || (vong === 2 ? !(m.elite > 1) : m.elite > 1)) continue; const d = Math.hypot(m.x - pl.x, m.y - pl.y) - m.r - (m.aggro ? 400 : 0); if (d < bd) { bd = d; foe = m; } }   // con đang cắn mình thì đánh nó trước
    if (!foe) return;
    if (auto) { if (!g.auto) document.getElementById('btn-auto')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); if (g.auto) return; }
    if (Math.hypot(foe.x - pl.x, foe.y - pl.y) - foe.r <= 15) { inp.held.add('atk'); return; }
    walk(foe.x, foe.y, t);
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
let n = 0, end = 0, shots = 0, khung = 0;
const shoot = async tag => { if (E.ANH && shots < 12) await p.screenshot({ path: `${E.ANH}/${String(++shots).padStart(2, '0')}-${tag}-${Math.round(n / FPS)}s.png` }); };
while (n < NMAX && end < 60) {
  const st = await p.evaluate(() => { window.__do(); window.__drive(); const g = window.__game, L = window.__L, s = L.shot; L.shot = ''; return { stop: !!L.stop(g), shot: s }; });
  await p.clock.runFor(1000 / FPS);
  n++;
  if (QUAY && n % MOI === 0) await p.screenshot({ path: `${QUAY}/f-${String(++khung).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
  if (st.shot) await shoot(st.shot);
  if (st.stop) end++;
  if (n % 3600 === 0) console.log(`… ${n / 60} giây ảo:`, await p.evaluate(() => window.__L.where));
}
if (QUAY) writeFileSync(`${QUAY}/sfx.json`, JSON.stringify({ fps: FPS / MOI, n: khung, log: await p.evaluate(() => window.__L.sfx) }));
if (end < 60) await shoot('het-gio');
if (end < 60) console.log('Hết giờ, chỗ đang đứng:', JSON.stringify(await p.evaluate(() => { const g = window.__game, T = g.map.T, pl = g.player, a = window.__G.guideTarget(g), o = v => v && [Math.round(v.x / T * 10) / 10, Math.round(v.y / T * 10) / 10];
  return { map: g.map.id, nguoi: o(pl), muiTen: o(a), uiOpen: g.uiOpen, busy: g.story.busy, quai: g.mobs.filter(m => !m.dead).map(m => ({ ten: m.def.name, o: o(m), hp: Math.round(m.hp), state: m.state, room: !!m.room, story: !!m.story, aggro: !!m.aggro, ghost: m.ghostT || 0 })), phong: (g.dungeon?.rooms || []).map(r => ({ rect: r.rect, vao: r.entered, xong: r.cleared, con: r.mobs.length })) }; })));
if (E.LUU && end >= 60) writeFileSync(E.LUU, await p.evaluate(() => JSON.stringify(window.__game.save)));
// Pha ra bãi quái (SAU giây ảo): đổi tầng nếu có TANG, rồi đánh ở bãi; đếm linh khí bằng cách bọc game.gainQi
const SAU = +(E.SAU || 0), VONG = +(E.VONG || 1), bai = { sec: 0 };
if (SAU > 0 && end >= 60) {
  await p.evaluate(({ tang, vong }) => {
    const g = window.__game, L = window.__L, og = g.gainQi;
    L.pha = `bãi vòng ${vong}`; L.qi = 0; L.guc0 = L.guc.length;
    g.gainQi = (...a) => { const v = og(...a); L.qi += v; return v; };
    if (tang) { g.save.layer = tang; g.save.qi = 0; g.refreshStats(); g.player.hp = g.player.maxHp; }
    L.luc = { tang: g.save.layer, hp: Math.round(g.player.maxHp), atk: Math.round(g.player.atk * 10) / 10, lc: document.getElementById('power')?.textContent };
  }, { tang: +(E.TANG || 0), vong: VONG });
  // chờ truyện đưa về Thiên Kiếm Phong (tối đa 40 giây ảo) rồi đặt người chơi cạnh bãi của vòng đã chọn: đo việc đánh, không đo quãng đường đi
  for (let k = 0; k < 40 * FPS; k++) { const ok = await p.evaluate(v => { window.__bai(v, false); const g = window.__game; return g.map.id === 'thien-kiem-phong' && !g.story.busy && !g.dialog.open && !g.traveling && !g.trip; }, VONG); await p.clock.runFor(1000 / FPS); if (ok) break; }
  const cho = await p.evaluate(v => {
    const g = window.__game, pl = g.player, L = window.__L, sp = g.spawners.filter(s => s.farm && (v === 2 ? s.mul > 1 : !(s.mul > 1)));
    if (g.map.id !== 'thien-kiem-phong' || !sp.length) return null;
    const s = sp[0], c = g.map.freeNear(s.at[0] + 2, s.at[1] + 2, 2, 7); pl.x = c.x; pl.y = c.y; g.screen.snap(c.x, c.y); pl.hp = pl.maxHp; L.qi = 0; L.guc0 = L.guc.length; L.quai0 = L.quai.length;
    return { at: s.at, mobs: g.mobs.filter(m => m.farm).length };
  }, VONG);
  console.log('Ra bãi:', JSON.stringify(cho));
  for (let k = 0; cho && k < SAU * FPS; k++) { await p.evaluate(({ v, a }) => { window.__do(); window.__bai(v, a); }, { v: VONG, a: E.DANH === '1' }); await p.clock.runFor(1000 / FPS); n++; }
  bai.sec = SAU; await shoot('bai');
  console.log('Trạng thái cuối pha bãi:', JSON.stringify(await p.evaluate(() => { const g = window.__game; return { uiOpen: g.uiOpen, busy: g.story.busy, dialog: g.dialog.open, traveling: !!g.traveling, trip: !!g.trip, ghost: !!g.ghost, auto: !!g.auto, map: g.map.id, mo: [...document.querySelectorAll('.panel:not([hidden]), [id]:not([hidden]).open')].map(e => e.id || e.className).slice(0, 6) }; })));
}
const R = await p.evaluate(() => { const g = window.__game, L = window.__L; return { quai: L.quai, dau: L.dau, qi: L.qi || 0, luc: L.luc, guc0: L.guc0 ?? L.guc.length, moc: L.moc, ket: L.ket, guc: L.guc, hpMin: L.hpMin, hpMax: Math.round(g.player.maxHp), where: L.where, tu: `${g.data.realms.names[g.save.realm]} tầng ${g.save.layer}`, lc: document.getElementById('power')?.textContent, flags: Object.keys(g.save.flags).filter(k => k.startsWith('bac-') || k === 'leo-bac').join(',') }; });
console.log(`\nNgười mới tự tay đi ${Math.round(n / FPS)} giây ảo (${end >= 60 ? 'ĐẠT điều kiện dừng' : 'HẾT GIỜ, chưa xong'}): đang ở ${R.where} · ${R.tu} · ${R.lc} · cờ ${R.flags}`);
console.log('Mốc (giây: bước · việc):'); for (const [t, w] of R.moc) console.log(`  ${String(t).padStart(7)}  ${w}`);
console.log(`Gục ${R.guc.length} lần${R.guc.length ? ': ' + R.guc.map(([t, w]) => `${t}s ở ${w}`).join(' | ') : ''} · máu thấp nhất ${R.hpMin}/${R.hpMax}`);
console.log(R.ket.length ? 'KẸT (truyện chờ mà không có mũi tên):\n' + R.ket.map(([t, w]) => `  ${t}s  ${w}`).join('\n') : 'Không kẹt chỗ nào: bước nào cũng có mũi tên');
// Bảng đo sức: gom theo chặng và loại quái
{ const by = {}; for (const q of R.quai) { const k = `${q.w} · ${q.name} (${q.max} máu, công ${q.atk})`; (by[k] ||= []).push(q); }
  const avg = (a, f) => (a.reduce((s, x) => s + f(x), 0) / a.length);
  console.log('Đo sức (mỗi con: số nhát trúng · giây từ nhát đầu tới lúc tan):');
  for (const [k, a] of Object.entries(by)) console.log(`  ${k}: ${a.length} con · ${avg(a, x => x.hits).toFixed(1)} nhát (mỗi nhát ${avg(a, x => x.dmg).toFixed(0)}) · ${avg(a, x => x.sec).toFixed(1)} giây`);
  console.log('Đòn người chơi ăn (chặng: số đòn · máu mất):'); for (const [k, d] of Object.entries(R.dau)) console.log(`  ${k}: ${d.n} đòn · ${Math.round(d.dmg)} máu`);
  if (bai.sec) { const a = R.quai.filter(q => q.w.startsWith('bãi')); console.log(`Ra bãi ${bai.sec} giây (Luyện Khí tầng ${R.luc.tang}, máu ${R.luc.hp}, công ${R.luc.atk}, ${R.luc.lc}): hạ ${a.length} con = ${(a.length / bai.sec * 60).toFixed(1)} con / phút · linh khí ${R.qi.toFixed(1)} = ${(R.qi / bai.sec * 60).toFixed(1)} / phút · gục ${R.guc.length - R.guc0} lần`); } }
console.log('lỗi JS', errs.length);
await b.close(); stop();
process.exit(end >= 60 && !R.ket.length && !errs.length ? 0 : 1);
