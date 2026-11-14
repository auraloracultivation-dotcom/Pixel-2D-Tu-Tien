// Quay màn "mừng mạnh lên" cả màn hình điện thoại, từng khung 1/60 giây (docs/10-CAI-HON.md việc 4b):
//   node tools/do-don/quay-mung.mjs <thư mục ra> <tên> <q: mung=1|mung=0> [giây=4] [dpr=2]
// VIEC chọn cảnh quay:
//   cuong (mặc định) | tay | luyen: người chơi mở bảng Bản thân, chọn món đang mặc, bấm nút rèn ở giây 0,5.
//     CONG=<cấp cường hoá đang có, mặc định 4> · BAC=<màu dòng tẩy luyện sẽ ra 0…6, mặc định 3 Địa> · DONG=<số dòng đang có, mặc định 1> ·
//     HONG=1 lần bấm ấy hỏng (chỉ cường hoá) · LAP=<số lần bấm, mặc định 1>, GIAN=<giây giữa hai lần bấm, mặc định 0,9> ·
//     MON=<mã món, mặc định thiet-kiem; luyen thì kim-luan>. Kết quả do kịch bản định sẵn (thay bộ số ngẫu nhiên trong đúng nhịp bấm).
//   pbup | pbduc: mở Trang bị → Pháp bảo, chọn pháp bảo đang mặc ở ô 1, bấm Nâng cấp / Đục ô ở giây 0,5 (đục ô: định sẵn thành công).
//     CONG=<cấp pháp bảo đang có, mặc định 4> · DONG=<số ô khảm đang có, mặc định 1> · LAP, GIAN như trên.
//   tang: đang đứng ngoài bản đồ, ở giây 0,5 linh khí đầy, lên tầng. CANH=<cảnh giới 0…8, mặc định 0 Luyện Khí> · TANG=<tầng đang ở, mặc định 3> ·
//     LEN=<lên mấy tầng một lúc, mặc định 1>.
//   canh: ở giây 0,5 vừa qua thiên kiếp (gọi thẳng trib.finish), sang cảnh giới mới. CANH=<cảnh giới đang ở, mặc định 0> ·
//     DONG_LUC=<giây bấm nút Tiếp tục; bỏ trống: không bấm> · TU=1 đang bật Tự đánh (nghi lễ tự đóng).
// MAN=<rộng>x<cao> cỡ màn (mặc định 390x844; thử máy thấp: 360x640). NGON=en | zh-Hant: thử bản dịch (cảnh tang, canh).
// Ra: f-0001.jpg… + sfx.json (ghép tiếng: ghep-tieng.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const PORT = +(process.env.CONG_MAY || 8798);
const { chromium } = await import('playwright'); const stop = serve(PORT);
const [out, name, q = 'mung=1', secs = '4', dpr = '2'] = process.argv.slice(2), E = process.env, FPS = 60, NMAX = Math.round(+secs * FPS), dir = `${out}/${name}`;
const O = { viec: E.VIEC || 'cuong', plus: +(E.CONG ?? 4), tier: +(E.BAC ?? 3), nline: +(E.DONG ?? 1), fail: E.HONG === '1', rep: +(E.LAP ?? 1), gap: +(E.GIAN ?? 0.9), base: E.MON || (E.VIEC === 'luyen' ? 'kim-luan' : 'thiet-kiem'),
  realm: +(E.CANH ?? 0), layer: +(E.TANG ?? 3), up: +(E.LEN ?? 1), closeAt: E.DONG_LUC ? +E.DONG_LUC : null, auto: E.TU === '1' };
const world = O.viec === 'tang' || O.viec === 'canh';
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const [MW, MH] = (E.MAN || '390x844').split('x').map(Number);
const ctx = await b.newContext({ viewport: { width: MW, height: MH }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
await ctx.addInitScript(() => { let s = 20261114; Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; });
if (E.NGON) await ctx.addInitScript(l => { try { localStorage.setItem('p2d_lang', l); } catch { /* không có kho nhớ */ } }, E.NGON);   // NGON=en | zh-Hant: thử bản dịch (chỉ cảnh tang, canh: cảnh trong bảng tìm nút theo chữ Việt)
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
p.on('console', m => { if (m.type() === 'error' && /mung/.test(m.text())) { errs.push(m.text()); console.log('LỖI MÀN MỪNG', m.text()); } });
await p.goto(`http://localhost:${PORT}/?thu=1&${q}`); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
await p.addStyleTag({ content: '#ht-icon, .ht-tip { display: none !important; }' });   // linh vật Hệ Thống dạo quanh màn: ẩn trong cảnh quay
const info = await p.evaluate(async ({ O, world }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  g.data.config.perf.slow_ms = 1e9; g.save.ht = { ...(g.save.ht || {}), intro: 1 }; if (g.data['he-thong']) g.data['he-thong'].idle_s = 1e9;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++; await wait(60); }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null); g.persist = () => {};
  const IT = await import('/src/game/items.js'), TI = await import('/src/game/tiers.js'), ST = await import('/src/game/stats.js'); await wait(800);
  g.save.weapon = 'kiem'; g.save.lingshi = 50000000;
  let it = null;
  if (world) {   // ngoài bản đồ: đặt cảnh giới, tầng; quà tu vi tính từ tầng này (không phát bù các tầng trước)
    const toast = g.toast; g.toast = () => {};   // dòng báo do việc dựng cảnh gây ra (pháp bảo, chiêu khảm theo mốc): không cho hiện
    g.save.realm = O.realm; g.save.layer = O.viec === 'canh' ? g.data.realms.layers : O.layer; g.save.qi = 0; g.save.giftAt = null;
    g.refreshStats(); g.player.hp = g.player.maxHp; g.checkUnlocks(); g.powerSeen = null;
    g.toast = toast;
    if (O.auto) g.auto = true;
  } else if (O.viec === 'pbup' || O.viec === 'pbduc') {
    const P = await import('/src/game/phap-bao.js'), st = P.pbState(g), toast = g.toast; g.toast = () => {};
    g.save.realm = 6; g.save.layer = 1; g.checkUnlocks(); g.toast = toast;   // cảnh giới cao: cấp tối đa 35
    const pb = P.pbItem(g, st.wear[0]) || st.items[0];
    pb.lv = O.plus; pb.slots = O.nline; st.stones = 99; g.refreshStats?.(); g.__pb = pb.uid;
  } else {
    g.save.realm = 6; g.save.layer = 1;   // cảnh giới cao cho mọi cấp cường hoá đều mở
    const pool = g.data.items.bases[O.base].pool;
    it = IT.rollItem(g.data, g.save, { base: O.base, lvl: 10, rarity: 'pham' });
    it.lines = Array.from({ length: O.nline }, () => TI.newLine(g.data, pool, it.lvl, Math.random, 3)); it.cap = 4; it.plus = O.plus;
    g.save.bag.push(it); IT.equip(g.save, g.data, it.uid);
    for (const m of ['tinh-thiet', 'tay-luyen-thach', g.data.gear.refine?.mat].filter(Boolean)) g.save.mats[m] = 99999;
    g.refreshStats?.();
  }
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  if (!world) g.toast = () => {};   // cảnh trong bảng: dòng báo do việc dựng cảnh gây ra (thành tựu, quà tu vi của cảnh giới đặt sẵn) không cho chen vào cảnh quay
  if (world) { await wait(1500); document.getElementById('toast').hidden = true; }   // dòng báo còn sót từ lúc vào game: dọn trước khi quay
  if (g.__pb != null) { await wait(300); document.getElementById('toast').hidden = true; g.pbPick = g.__pb; g.openSelf('do', 'pb'); await wait(500); }
  else if (!world) { g.openSelf('do'); await wait(300); document.querySelector('.sv-slot:not(.empty):not(.buff)').click(); await wait(300); }
  g.__log = []; g.__sim = 0; g.__uid = it?.uid;
  const sf = g.sfx; g.sfx = (n, v) => { if (n === 'pickup' && new Error().stack.includes('/ui/he-thong.js')) return; if (n) g.__log.push([+g.__sim.toFixed(3), n, v ?? 1]); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = true;
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; up(1 / 60); g.__sim += 1 / 60; g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  // Định sẵn kết quả lần bấm sắp tới: thay bộ số ngẫu nhiên bằng một hằng số trong đúng nhịp bấm (nút bấm gọi hàm rèn liền trong cùng nhịp), bấm xong trả lại.
  // Cường hoá: 0 là thành công, 0,999 là hỏng (không tụt). Tẩy luyện: thử từng hằng số trên một bản sao của bản lưu, lấy số cho ra đúng màu dòng muốn.
  g.__hang = () => {
    if (O.viec === 'cuong' || O.viec === 'pbduc') return O.fail ? 0.999 : 0;
    if (O.viec !== 'tay') return 0.5;
    const str = JSON.stringify(g.save);
    for (let k = 0; k < 2000; k++) { const c = (k * 0.6180339887) % 1, r = IT.reroll(g.data, JSON.parse(str), g.__uid, () => c); if (r?.line?.t === O.tier) return c; }
    return -1;
  };
  g.__bam = () => {
    if (O.viec === 'tang') {   // linh khí vừa đủ đầy O.up tầng: đi đúng đường thật (game.gainQi)
      const c = { ...g.save }; let need = 1 - g.save.qi;
      for (let i = 0; i < O.up; i++) { need += ST.qiNeed(c, g.data.realms); c.layer++; }
      g.gainQi(need / (g.player.st.qiMul || 1) / (g.data.realms.qi_rate ?? 1), g.player.x, g.player.y);
      return { hat: 0, co: true, nut: '' };
    }
    if (O.viec === 'canh') { g.trib.finish(); return { hat: 0, co: true, nut: '' }; }
    const c = g.__hang(), old = Math.random;
    const re = O.viec === 'tay' ? /^Tẩy luyện/ : O.viec === 'luyen' ? /^Luyện/ : O.viec === 'pbup' ? /^Nâng cấp/ : O.viec === 'pbduc' ? /^Đục ô/ : /^Cường/;
    const bt = [...document.querySelectorAll('.act-btn')].find(e => re.test(e.textContent) && !e.disabled);
    if (c >= 0) Math.random = () => c;
    if (bt) bt.click();
    Math.random = old;
    return { hat: c, co: !!bt, nut: [...document.querySelectorAll('.act-btn')].map(e => (e.disabled ? '(tắt)' : '') + e.textContent.slice(0, 16)).join(' | ') };
  };
  g.__live = false;
  for (let i = 0; i < 30; i++) await g.__step();
  g.__sim = 0; g.__log.length = 0;
  const cur = it && g.save.bag.find(x => x.uid === it.uid);
  return { uid: it?.uid, plus: cur?.plus, lines: cur?.lines?.length, power: document.getElementById('power')?.textContent, mung: !!g.mung, tang: !!g.mungTang, canh: !!g.mungCanh, tu: `${g.save.realm}/${g.save.layer}`, look: g.save.look };
}, { O, world });
console.log(JSON.stringify(info));
let n = 0, done = 0, closed = false; const bam = [];
while (n < NMAX) {
  const t = await p.evaluate(() => window.__game.__sim);
  if (done < O.rep && t >= 0.5 + done * O.gap) { bam.push([+t.toFixed(3), await p.evaluate(() => window.__game.__bam())]); done++; }
  if (O.closeAt != null && !closed && t >= O.closeAt) { closed = true; await p.evaluate(() => document.querySelector('#mung-canh .c-btn')?.click()); }
  await p.evaluate(() => window.__game.__step());
  await p.screenshot({ path: `${dir}/f-${String(++n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
}
const end = await p.evaluate(() => { const g = window.__game, it = g.save.bag.find(x => x.uid === g.__uid); return { log: g.__log, plus: it?.plus, lines: it?.lines?.map(l => l.t), pb: it?.pb, msg: document.querySelector('.d-msg')?.textContent || '', tu: `${g.save.realm}/${g.save.layer}`, ui: String(g.uiOpen) }; });
writeFileSync(`${dir}/sfx.json`, JSON.stringify({ fps: FPS, n, log: end.log, bam }));
console.log(name, n, 'khung · bấm', JSON.stringify(bam.map(x => [x[0], x[1].hat, x[1].co])), world ? `· tu vi sau cùng ${end.tu} · bảng đang mở: ${end.ui}` : `· sau cùng +${end.plus} dòng ${JSON.stringify(end.lines)} · lời báo: ${end.msg}`, '· lỗi JS', errs.length, '·', end.log.map(l => `${l[0]}:${l[1]}`).join(' '));
if (!bam.every(x => x[1].co)) console.log('NÚT:', bam.map(x => x[1].nut).join(' // '));
await b.close(); stop();
