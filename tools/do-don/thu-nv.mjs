// Chạy cả chuỗi nhiệm vụ chính sau phần mở đầu bằng Tự hành và chụp từng mốc ở cỡ điện thoại (docs/14-TRAN-MA-KY.md phần B; cần Playwright):
//   node tools/do-don/thu-nv.mjs <thư mục ra> [giây tối đa]
// Mặc định: bản lưu dựng sẵn vừa hết phần mở đầu (đã thấy cảnh người thân bị bắt), máu quái hạ thấp và nhân vật không gục, để soát NHANH rằng truyện đi tới cuối,
// không kẹt, không lỗi JavaScript, lời nào hiện ra đúng lời ấy. Ra mã lỗi nếu có lỗi JavaScript hoặc chưa tới bước cuối.
//   CU=1      bản lưu người chơi cũ (chưa thấy cảnh mở đầu: không có cờ người thân bị giữ, Tiểu Hỏa bị bắt) → phải ra bản lời thứ hai
//   KQ=thoat  bấm Thoát ở bảng kết quả bí cảnh · KQ=dong đóng bảng · mặc định không ai bấm (Tự hành chờ 14 giây rồi tự dọn bảng)
//   CHON=n    lựa chọn thứ n (0…2) ở câu hỏi của Vân Hạc
//   THAT=1    người mới THẬT từ giây đầu: chơi cả phần mở đầu rồi tới chuỗi, không sửa máu, không tua tu luyện (đo độ khó và thời gian thật; chừng 12 phút)
// In ra: mỗi lần sang bước một dòng trạng thái, cuối cùng là mọi câu thoại đã hiện theo thứ tự và các cờ truyện đã bật. Không gọi máy chủ thật.
import { mkdirSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const E = process.env, PORT = +(E.PORT || 8797), stop = serve(PORT);
const out = process.argv[2] || 'thu-nv', THAT = !!E.THAT, MAX = +(process.argv[3] || (THAT ? 1300 : 420)), CU = !!E.CU, KQ = E.KQ || (THAT ? 'thoat' : ''), CHON = +(E.CHON || 0);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: THAT ? 1 : 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
if (THAT) await ctx.addInitScript(() => { const t = setInterval(() => { if (window.__game) { window.__game.khoaBo = true; clearInterval(t); } }, 20); });   // chặng leo bậc khoá Tự hành: bỏ khoá như tools/playtest.mjs
await ctx.addInitScript(() => { setInterval(() => { const g = window.__game; if (!g?.player) return; const d = g.player.hp <= 0 || !!g.ghost; if (d && !window.__dd) window.__deaths = (window.__deaths || 0) + 1; window.__dd = d; }, 100); });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
const ev = (f, a) => p.evaluate(f, a), cho = ms => new Promise(r => setTimeout(r, ms));
const vao = async () => { await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 }); await cho(600); await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 }); };
await p.goto(`http://localhost:${PORT}/?thu=1`); await vao(); await cho(1500);
if (!THAT) {
  await ev(async cu => {
    const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)), s = g.save;
    for (let i = 0; i < 40 && !s.gioi; i++) { document.querySelector('#dlg-choices .choice')?.click(); await wait(100); }
    const md = g.data.story.steps.findIndex(x => x.id === g.data.story.mo_dau);
    Object.assign(s, { step: md, stepDone: true, storyV: 2, element: 'hoa', realm: 0, layer: 5, qi: 0, map: 'thien-kiem-phong', spawn: 'vao', weapon: 'kiem' });
    s.root ||= 'pham'; (s.ht ??= {}).intro = 1; s.visited = { 'thanh-khe': true, 'thien-kiem-phong': true };
    Object.assign(s.flags, { 'bac-mo-danh': true, 'bac-mo-hanh': true });
    if (!cu) Object.assign(s.flags, { 'lac-tuyet-vang': true, 'bac-xong': true, 'leo-bac': true, 'mat-tieu-hoa': true });
    g.persist();
  }, CU);
  await cho(400); await p.reload(); await vao(); await cho(3500);
  await ev(async () => { const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 50; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) c.click(); else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); } await wait(60); } });
  await cho(800);
}
const tt = () => ev(() => { const g = window.__game, s = g.save, G = g.story.goal(), h = document.getElementById('nv-hud'), cl = document.getElementById('chu-lon'), st = g.player?.st || {};
  return { step: s.step, bac: s.bac?.i ?? '', id: g.data.story.steps[s.step]?.id, done: s.stepDone, map: g.map?.id, canh: `${s.realm}.${s.layer}`, lc: (document.getElementById('power')?.textContent || '').replace(/\D+/, ''), hp: g.player ? Math.round(g.player.hp) + '/' + Math.round(g.player.maxHp) : '', atk: Math.round(st.atk || 0), chet: window.__deaths || 0,
    pilot: !!g.pilot, busy: g.story.busy, xong: g.story.xong, act: g.actLabel || '', goal: G && `${G.so}|${G.ten}|${G.text}`, hud: h && !h.hidden ? h.innerText.replace(/\s+/g, ' ') + (h.classList.contains('xong') ? ' [✓]' : '') : '(ẩn)',
    chu: cl && !cl.hidden ? cl.innerText.replace(/\s+/g, ' ') : '', kq: !!document.querySelector('.dr-panel:not([hidden])'), dlg: g.dialog.open ? (document.getElementById('dlg-who')?.textContent || '') + ': ' + (document.getElementById('dlg-text')?.textContent || '') : '' }; });
let key = '', shots = 0, cur = '', curId = ''; const t0 = Date.now(), seen = new Set(), lines = [], [cuoi, soBuoc] = await ev(() => { const S = window.__game.data.story.steps; return [S.at(-1).id, S.length]; });
const chup = async ten => { await p.screenshot({ path: `${out}/${String(++shots).padStart(2, '0')}-${ten}.png` }).catch(() => {}); };
while ((Date.now() - t0) / 1000 < MAX) {
  await ev(([kq, chon, that]) => {
    const g = window.__game; if (!g.player) return;
    if (!that) { for (const m of g.mobs) if (!m.dead && m.hp > 40) m.hp = 40; g.player.hp = g.player.maxHp; }
    const cs = document.querySelectorAll('#dlg-choices .choice'); if (cs.length) { cs[Math.min(chon, cs.length - 1)].click(); return; }
    const dr = document.querySelector('.dr-panel:not([hidden])');
    if (!dr) window.__kqT = null;
    else if (kq) { window.__kqT ??= performance.now(); if (performance.now() - window.__kqT > 2500) { if (kq === 'dong') g.closeAll(); else [...dr.querySelectorAll('button')].find(x => /Thoát/.test(x.textContent))?.click(); window.__kqT = null; } }
    if (that && g.dialog.open && !g.pilot) g.dialog.skip();
    if (!g.pilot && !g.dialog.open && !g.story.busy && !g.story.xong) { if (that && window.__thu?.togglePilot) window.__thu.togglePilot(g); else document.getElementById('nv-hud')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
    if (that && g.trib?.canStart?.() && !g.trib.active) g.trib.start();   // người chơi bấm Độ thiên kiếp
  }, [KQ, THAT ? 1 : CHON, THAT]);
  const s = await tt(), T = ((Date.now() - t0) / 1000).toFixed(1) + 's';
  if (s.dlg !== cur) { if (cur && !s.dlg.startsWith(cur)) lines.push(`[${curId}] ${cur}`); cur = s.dlg; curId = s.id; }   // chữ đang gõ dần: chỉ ghi lại câu khi nó đã đổi sang câu khác
  for (const [k, ten] of [[s.chu && 'chu:' + s.chu, 'chu-lon'], [s.hud.includes('[✓]') && 'xong:' + s.id, 'the-xong'], [s.act && s.act === await ev(() => window.__game.story.viec()) && 'tay:' + s.act, 'nut-viec'], [s.kq && 'kq' + s.step, 'bang-ket-qua']])
    if (k && !seen.has(k)) { seen.add(k); await cho(300); await chup(ten + '-' + s.id); console.log(T, '·', k); }
  const k = `${s.step}/${s.bac}/${(s.goal || '').replace(/\d+\/\d+\)?$/, '')}`;
  if (k !== key) { key = k; console.log(T, JSON.stringify({ ...s, dlg: undefined, chu: undefined })); await cho(700); await chup(s.id); }
  if (!THAT && s.done && s.goal?.includes('tầng 9') && !seen.has('t9')) { seen.add('t9'); await cho(1500); await ev(() => { window.__game.save.layer = 9; }); }   // nhiệm vụ cuối chờ tu luyện: cho đủ tầng để nghe câu kết
  if (s.id === cuoi && s.done) { await cho(1000); break; }
  await cho(250);
}
if (cur) lines.push(`[${curId}] ${cur}`);
const s = await tt(), co = await ev(() => Object.keys(window.__game.save.flags).filter(k => /^(vi-ai|da-giong|dat-the|a-luc|dao-ve)/.test(k)));
console.log('--- lời đã hiện ---\n' + lines.join('\n'));
console.log(`cuối ${((Date.now() - t0) / 1000).toFixed(0)}s: bước ${s.id}${s.done ? ' (xong)' : ''}, cảnh giới ${s.canh}, lực chiến ${s.lc}, gục ${s.chet} lần · cờ: ${co.join(', ')} · ${errs.length} lỗi JavaScript`);
await p.screenshot({ path: `${out}/99-cuoi.png` }).catch(() => {});
await b.close(); stop();
const ok = !errs.length && (THAT ? s.step >= soBuoc - 2 : s.id === cuoi);   // người mới thật: tới được nhiệm vụ cuối (chờ tu luyện) là đạt
console.log(ok ? '✅ Chuỗi nhiệm vụ chạy tới nơi' : '❌ Chưa tới bước cuối hoặc có lỗi JavaScript');
process.exit(ok ? 0 : 1);
