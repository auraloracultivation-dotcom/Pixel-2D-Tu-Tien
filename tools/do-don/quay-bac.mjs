// Quay PHÚT ĐẦU của người mới cả màn hình điện thoại (docs/10-CAI-HON.md việc 5: chặng leo bậc), người chơi do kịch bản điều khiển bằng tay (không Tự hành):
//   node tools/do-don/quay-bac.mjs <thư mục ra> <tên> <q: bac=1&qua=1&dau=1 | bac=0…> [giây tối đa=70] [dpr=2]
// Khác các kịch bản quay khác: dùng đồng hồ ảo của Playwright (page.clock), mỗi khung cho giờ của trang chạy đúng 1/60 giây rồi chụp, nên cả chữ thoại gõ dần,
// nhịp vẽ 30 / 60 khung của game, hẹn giờ… đều đúng như trên máy thật. Người chơi kịch bản: đọc xong câu thoại thì chạm (đọc 22 ký tự / giây + 0,7 giây),
// chọn giới tính đầu tiên, thấy quái cần hạ thì đi tới rồi giữ nút Đánh, nghi lễ nhận thưởng hiện đủ 1,3 giây thì bấm nút đang sáng, bảng chào của Hệ Thống
// đọc 4 giây rồi chạm ra ngoài, có ô đích thì đi tới. Dừng khi DUNG=<điều kiện> đúng (mặc định: tới bước truyện 1) hoặc hết giờ.
// LAI=1: ngoài các bậc cho Tự hành dắt đi (hái linh thảo, lên tông môn…: kịch bản đi thẳng không biết tránh vật cản), tới bậc thì tự tay đánh.
// Ra: f-0001.jpg… + sfx.json (tiếng theo giờ ảo, ghép bằng ghep-tieng.py) + moc.json (mốc: nhát đầu, con đầu, món đầu… tính bằng giây).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG || 8786);
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [out, name, q, secs = '70', dpr = '2'] = process.argv.slice(2), FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
const STOP_AT = process.env.DUNG || 'g.save.step >= 1', NO_SHOT = process.env.KHONG_CHUP === '1', EVERY = +(process.env.CHUP_MOI || 1);   // KHONG_CHUP=1: chỉ đo các mốc, không chụp khung (chạy nhanh); CHUP_MOI=<n>: chỉ chụp mỗi n khung (xem lướt)
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev|supabase-js/, r => r.abort());
await ctx.addInitScript(h => { let s = h; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }, +(process.env.HAT || 20261114));   // HAT=<số>: hạt số ngẫu nhiên khác (thử nhiều lần cho biết kết quả có ổn định không)
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.clock.install();
await p.goto(`http://localhost:${PORT}/?thu=1&${q}`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(600);
await p.clock.pauseAt(new Date(Date.now() + 2000));   // từ đây giờ của trang đứng yên, chỉ chạy khi kịch bản cho chạy
await p.evaluate(() => { document.getElementById('btn-guest').click(); });
for (let i = 0; i < 600 && !(await p.evaluate(() => !!window.__game?.save && !!window.__game.player)); i++) await p.clock.runFor(50);
await p.evaluate(async () => { window.__P = await import('/src/game/pilot.js'); });
await p.evaluate(([STOP, LAI]) => {
  const g = window.__game, L = window.__L = { log: [], moc: {}, t0: performance.now(), read: 0, line: -1, ready: 0, ht: 0, hits: 0, stop: new Function('g', 'return ' + STOP) };
  const now = () => (performance.now() - L.t0) / 1000, mark = k => { L.moc[k] ??= +now().toFixed(2); };
  const sf = g.sfx; g.sfx = (n, v) => {
    if (n === 'pickup' && new Error().stack.includes('/ui/he-thong.js')) return;
    if (n) L.log.push([+now().toFixed(3), n, v ?? 1]);
    if (n === 'swing') mark('nhat_dau'); if (n === 'hit' || n === 'crit') { mark('trung_dau'); L.hits++; } if (n === 'die') { mark('ha_dau'); (L.moc.nhat_moi_con ??= []).push(L.hits); L.hits = 0; } if (n === 'qua-mo') { mark(L.moc.mon_dau ? 'mon_hai' : 'mon_dau'); } if (n === 'hurt') L.moc.bi_danh = (L.moc.bi_danh || 0) + 1; if (n === 'death' || n === 'revive') L.moc.guc = (L.moc.guc || 0) + 1;
    return sf(n, v);
  };
  g.persist = () => {};
  const inp = g.input, KEYS = ['KeyD', 'KeyA', 'KeyS', 'KeyW'];
  // Người chơi kịch bản, gọi một lần mỗi khung trước khi cho giờ chạy
  window.__drive = () => {
    const t = now(), pl = g.player, Q = document.getElementById('qua'), dlg = document.getElementById('dialog');
    for (const k of KEYS) inp.keys.delete(k); inp.held.delete('atk');
    L.moc.mau_thap_nhat = Math.min(L.moc.mau_thap_nhat ?? 1e9, Math.round(pl.hp)); L.moc.mau_toi_da = Math.round(pl.maxHp);
    if (g.save.bac?.i >= 1) mark('xong_bac_1'); if (g.save.bac?.i >= 2) mark('xong_bac_2'); if (g.save.phapBao?.items?.length) mark('co_phap_bao');
    if (g.save.step >= 1) mark('toi_da'); if (g.save.element) mark('co_linh_can'); if (Object.keys(g.save.equip).length) mark('mac_mon_dau'); if (g.map.id === 'thien-kiem-phong') mark('len_tong_mon');
    const ch = document.querySelector('#dlg-choices .choice');
    if (ch && ch.offsetParent) { L.pick ||= t; if (t - L.pick > 1.2) { ch.click(); L.pick = 0; } return; }
    if (Q && !Q.hidden) { if (Q.classList.contains('ready')) { L.ready ||= t; if (t - L.ready > 1.3) { (Q.querySelector('.q-btn.go') || Q.querySelector('.q-btn')).click(); L.ready = 0; } } else L.ready = 0; return; }
    if (g.dialog.open) {   // đọc xong câu mới chạm
      const tx = document.getElementById('dlg-text') || dlg.querySelector('.text'), full = g.dialog.holdSec ? null : null, len = (tx?.textContent || '').length;
      if (L.line !== g.dialog.lineNo) { L.line = g.dialog.lineNo; L.read = t; L.len = 0; }
      if (len !== L.len) { L.len = len; L.same = t; }
      if (t - L.same > 0.7 + len / 22 * 0.35 && t - L.read > 0.7 + len / 22) { dlg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); L.read = t; L.same = t; }
      return;
    }
    if (g.uiOpen === 'he-thong') { L.ht ||= t; mark('bang_he_thong'); if (t - L.ht > 4) { document.querySelector('.ht-back')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('.ht-back')?.click(); L.ht = 0; } return; }
    L.ht = 0;
    if (g.story.busy || g.uiOpen) return;
    // LAI=1: ngoài các bậc thì cho Tự hành dắt đi (bỏ khoá riêng cho phòng đo, game.khoaBo), tới bậc ở làng và tông môn thì tắt Tự hành, kịch bản tự tay đánh
    if (LAI) {
      const hand = g.story.rung() && g.map.id !== 'bi-canh';
      g.khoaBo = true;
      if (hand && g.pilot) g.pilot = null;
      if (!hand) { if (!g.pilot && window.__P) window.__P.togglePilot(g); return; }
    }
    const G = g.story.goal();
    const mobs = g.mobs.filter(m => !m.dead && (G?.kill ? (G.kill === '*' || m.id === G.kill) && (m.story || !LAI) : m.story));
    let tgt = null, bd = 1e9; for (const m of mobs) { const d = Math.hypot(m.x - pl.x, m.y - pl.y); if (d < bd) { bd = d; tgt = m; } }
    const go = (x, y, near) => { const dx = x - pl.x, dy = y - pl.y; if (Math.hypot(dx, dy) <= near) return true; if (dx > 3) inp.keys.add('KeyD'); else if (dx < -3) inp.keys.add('KeyA'); if (dy > 3) inp.keys.add('KeyS'); else if (dy < -3) inp.keys.add('KeyW'); return false; };
    if (tgt) { if (go(tgt.x, tgt.y, tgt.r + 15)) inp.held.add('atk'); return; }
    const u = g.story.current()?.until;
    if (u?.talk) { const npc = g.npcs.find(e => e.id === u.talk); if (npc && go(npc.x, npc.y + 14, 9) && g.actLabel && t - (L.act || 0) > 0.6) { inp.pressed.add('act'); L.act = t; } return; }   // tới trước mặt NPC rồi bấm Nói chuyện
    if (u?.collect) { const k = g.pickups.filter(e => e.item === u.collect).sort((a, b2) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b2.x - pl.x, b2.y - pl.y))[0]; if (k) go(k.x, k.y, 2); return; }
    if (u?.layer) { if (!pl.meditating && g.actLabel && t - (L.act || 0) > 0.8) { inp.pressed.add('act'); L.act = t; } return; }   // đả tọa tại chỗ được thì ngồi (bước tu luyện)
    if (G?.target) { const c = g.map.center(G.target[0], G.target[1]); go(c.x, c.y, 6); }
  };
}, [STOP_AT, process.env.LAI === '1']);
let n = 0, end = 0;
while (n < NMAX && end < 90) {
  const st = await p.evaluate(() => { window.__drive(); const g = window.__game, L = window.__L; return { stop: !!L.stop(g) }; });
  await p.clock.runFor(1000 / FPS);
  n++; if (!NO_SHOT && n % EVERY === 0) await p.screenshot({ path: `${dir}/f-${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (st.stop) end++;   // đạt điều kiện dừng: quay thêm 1,5 giây
  if (n % (NO_SHOT ? 1800 : 300) === 0) console.log(n, JSON.stringify(await p.evaluate(() => ({ t: +((performance.now() - window.__L.t0) / 1000).toFixed(1), moc: window.__L.moc, step: window.__game.save.step, bac: window.__game.save.bac || null }))));
}
const res = await p.evaluate(() => ({ log: window.__L.log, moc: window.__L.moc, lc: document.getElementById('power')?.textContent, eq: Object.keys(window.__game.save.equip), pb: (window.__game.save.phapBao?.items || []).map(i => `${i.type}:${i.grade}:${JSON.stringify(i.slots)}`) }));
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log: res.log }));
writeFileSync(`${dir}/moc.json`, JSON.stringify(res.moc));
console.log(name, n, 'khung ·', JSON.stringify(res.moc), '·', res.lc, '· mặc', res.eq.join(','), '· pháp bảo', res.pb.join(' '), '· lỗi JS', errs.length, '·', [...new Set(res.log.map(l => l[1]))].join(','));
await b.close(); stop();
