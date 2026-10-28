// Cày thử 1 tới max (chủ dự án xin 28/10/2026 tối: "tạo nhiều hệ nhiều acc cày từ 1 đến max, ghi quá trình, xem tỷ lệ
// linh khí, Linh Thạch, đan"). Một nhân vật giả lập theo hệ, không tài khoản, bật Tự hành từ đầu, tua thời gian như
// tools/choi-doc.mjs. Khác choi-doc: đồng hồ game chạy theo giờ giả lập (việc ngày, vườn, ngày đêm, khách ghé theo kịp),
// linh căn cố định phẩm Phàm cho dễ so, và ghi lại:
// - mốc phút giả lập lên từng cảnh giới; mỗi phút: cảnh giới, tầng, tổng linh khí, Linh Thạch, số quái, nguyên liệu, đan;
// - linh khí, Linh Thạch, nguyên liệu, đan theo nguồn (file code sinh ra nó, "a<b" = a gọi từ b), và phần tiêu.
// Dừng khi tới Độ Kiếp tầng 9 đầy linh khí hoặc hết SIM_MIN. Không gọi máy chủ thật (chặn thư viện Supabase).
// Chạy: npm i --no-save playwright && npx playwright install chromium
//       HE=hoa GENDER=0 SIM_MIN=900 OUT=/tmp/hoa.json node tools/cay-thu.mjs
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const HE = process.env.HE || 'hoa', GENDER = +(process.env.GENDER || 0), SIM_MIN = +(process.env.SIM_MIN || 900);
const PORT = +(process.env.PORT || 8792), OUT = process.env.OUT || '', START = process.env.START || '2026-11-02T08:00:00+07:00';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright');
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' })).newPage();
await p.route(/supabase-js/, r => r.abort());
const errs = new Set();
p.on('pageerror', e => errs.add(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.goto(`http://localhost:${PORT}/`);
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(800);
await p.click('#btn-guest');
await p.waitForSelector('#dlg-choices .choice', { timeout: 30000 });
await (await p.$$('#dlg-choices .choice'))[GENDER].dispatchEvent('pointerdown');
await p.waitForTimeout(500);

// Gắn đo đạc trong trang
await p.evaluate(async ({ HE, START }) => {
  const g = window.__game, E = window.__eco = { qi: {}, ls: {}, lsOut: {}, mats: {}, matsOut: {}, pills: {}, pillsOut: {}, realmAt: {} };
  g.simT = 0;
  const clk = await import('/src/core/clock.js');
  window.__simClock = () => clk.setServerTime(Date.parse(START) + g.simT * 1000);
  window.__simClock();
  const G = g.data.config.guard;   // bẫy sửa bộ nhớ: bỏ các khoá đo đạc tự bọc
  if (G) { G.keys = G.keys.filter(k => k !== 'lingshi'); G.nested = {}; }
  // Nguồn = hai file code gần nhất trong chồng gọi (bỏ file đo đạc và game.js khi nó chỉ chuyển tiếp)
  const src = () => {
    const out = [];
    for (const l of new Error().stack.split('\n').slice(2)) {
      const m = l.match(/\/src\/(?:game|ui|world)\/([\w-]+)\.js/);
      if (m && out.at(-1) !== m[1]) out.push(m[1]);
      if (out.length === 2) break;
    }
    return out.join('<') || '?';
  };
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  const og = g.gainQi;
  g.gainQi = (a, x, y, q) => { add(E.qi, src(), Math.round(a * (g.player?.st.qiMul || 1) * 10) / 10); return og(a, x, y, q); };
  const seen = new WeakSet();
  window.__wrapSave = () => {
    const s = g.save;
    if (seen.has(s)) return;
    seen.add(s);
    let ls = s.lingshi || 0;
    Object.defineProperty(s, 'lingshi', { enumerable: true, configurable: true, get: () => ls,
      set: v => { const d = v - ls; if (d > 0) add(E.ls, src(), d); else if (d < 0) add(E.lsOut, src(), -d); ls = v; } });
    const prox = (o, inn, out) => new Proxy(o, { set(t, k, v) { const d = (+v || 0) - (+t[k] || 0); if (d > 0) add(inn, src() + ':' + String(k), d); else if (d < 0) add(out, src() + ':' + String(k), -d); t[k] = v; return true; } });
    s.mats = prox(s.mats || {}, E.mats, E.matsOut);
    s.pills = prox(s.pills || {}, E.pills, E.pillsOut);
  };
  window.__wrapSave();
  const oc = g.dialog.choose;   // chọn hệ theo HE
  g.dialog.choose = (q, opts) => (opts?.some(o => o.id === HE) && opts.some(o => o.id === 'kim') ? Promise.resolve(HE) : oc(q, opts));
  const orig = g.input.axis; g.input.axis = () => g.botAx || orig();
  g.botTrib = () => {   // trong kiếp: né sét, chém tâm ma (như choi-doc)
    const pp = g.player;
    if (!g.trib.active) { if (g.botAx) { g.botAx = null; g.input.held.delete('atk'); } return; }
    let ex = 0, ey = 0;
    for (const s of g.strikes || []) { if (s.hit) continue; const dx = pp.x - s.x, dy = pp.y - s.y, d = Math.hypot(dx, dy) || 0.1; if (d < s.r + 8) { ex += dx / d; ey += dy / d; } }
    if (ex || ey) { const d = Math.hypot(ex, ey); g.botAx = { x: ex / d, y: ey / d }; g.input.held.delete('atk'); return; }
    const sh = g.mobs.find(m => m.id === 'tam-ma' && !m.dead);
    if (sh) { const dx = sh.x - pp.x, dy = sh.y - pp.y, d = Math.hypot(dx, dy); g.botAx = d > 12 ? { x: dx / d, y: dy / d } : null; g.input.held.add('atk'); g.input.pressed.add('atk'); }
    else g.botAx = null;
  };
}, { HE, START });

const log = [];
let done = false;
for (let min = 0; min < SIM_MIN && !done;) {
  const ch = await p.$$('#dlg-choices .choice');
  if (ch.length && await ch[0].isVisible()) { await ch[Math.min(1, ch.length - 1)].dispatchEvent('pointerdown'); await p.waitForTimeout(60); continue; }
  const t = await p.evaluate(() => {
    const g = window.__game;
    window.__wrapSave();
    if (g.save.element && g.save.root !== 'pham') { g.save.root = 'pham'; g.refreshStats(); }
    if (!g.pilot) document.getElementById('btn-pilot')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (g.uiOpen) for (const id of ['bag', 'skills', 'pets', 'daily', 'achv', 'world', 'social', 'market', 'topup', 'guild']) { if (document.getElementById(id)?.hidden === false) document.getElementById(id + '-close')?.click(); }
    if (g.trib.canStart() && !g.dialog.open && !g.traveling) { g.tribTries = (g.tribTries || 0) + 1; g.trib.start(); }
    const choice = () => { const c = document.querySelector('#dlg-choices .choice'); return c && c.offsetParent; };
    for (let k = 0; k < 400 && !choice(); k++) { g.botTrib(); g.update(0.05); g.simT += 0.05; }
    window.__simClock();
    const E = window.__eco; if (E.realmAt[g.save.realm] === undefined) E.realmAt[g.save.realm] = Math.round(g.simT / 60);
    return g.simT;
  });
  await p.waitForTimeout(20);
  if (t < (min + 1) * 60) continue;
  min++;
  const s = await p.evaluate(() => {
    const g = window.__game, sv = g.save, R = g.data.realms;
    const need = i => Math.round(R.qi_base * R.qi_growth ** Math.min(i, R.qi_soft_from) * R.qi_soft_growth ** Math.max(0, i - R.qi_soft_from));
    let tot = sv.qi; for (let i = 0; i < sv.realm * R.layers + sv.layer - 1; i++) tot += need(i);
    const mats = Object.values(sv.mats || {}).reduce((a, v) => a + (+v || 0), 0);
    return { step: sv.step, realm: sv.realm, layer: sv.layer, tot: Math.round(tot), ls: Math.round(sv.lingshi || 0), kills: sv.stats?.kills || 0, mats, pills: { ...sv.pills }, map: g.map.id, trib: g.tribTries || 0,
      top: sv.realm === R.names.length - 1 && sv.layer >= R.layers && sv.qi >= need(sv.realm * R.layers + sv.layer - 1) };
  });
  s.min = min;
  const prev = log.at(-15);   // đứng yên 15 phút (không hạ quái, không thêm linh khí): ghi trạng thái để tìm chỗ kẹt
  if (prev && prev.kills === s.kills && prev.tot === s.tot && !s.top && !log.stuckSaid) {
    log.stuckSaid = true;
    s.stuck = await p.evaluate(() => { const g = window.__game, P = g.player; return { dialog: g.dialog.open, trib: g.trib.active, canTrib: g.trib.canStart(), tries: g.tribTries, pilot: !!g.pilot, pilotLabel: document.getElementById('btn-pilot')?.textContent, busy: g.story.busy, traveling: !!g.traveling, trip: !!g.trip, ui: g.uiOpen, view: !!g.view, med: P.meditating, hp: Math.round(P.hp), goal: (g.goals() || '').slice(0, 160), at: [Math.round(P.x), Math.round(P.y)], flags: Object.keys(g.save.flags).length, map: g.map.id, mobs: g.mobs.length, tamMa: g.mobs.filter(m => m.id === 'tam-ma').map(m => ({ dead: m.dead, hp: Math.round(m.hp), d: Math.round(Math.hypot(m.x - P.x, m.y - P.y)) })), strikes: (g.strikes || []).length, tripInfo: g.trip && { kind: g.trip.kind, t: Math.round(g.trip.t * 10) / 10, dur: g.trip.dur, to: g.trip.to, loaded: g.trip.loaded }, tower: g.tower && { floor: g.tower.floor, mobs: g.tower.mobs?.length, busy: g.tower.busy } }; });
    s.stuck.errs = [...errs].slice(0, 5);
    console.log(`[${HE}] KẸT ở phút ${min}: ${JSON.stringify(s.stuck)}`);
    done = true;   // đứng yên là lỗi: ghi lại rồi dừng, khỏi chạy không
  }
  log.push(s);
  if (s.top) done = true;
  if (min % 30 === 0 || done) console.log(`[${HE}] ${min} phút: bước ${s.step}, cảnh giới ${s.realm} tầng ${s.layer}, linh khí tổng ${s.tot}, Linh Thạch ${s.ls}, ${s.kills} quái, ${s.map}`);
}
const eco = await p.evaluate(() => window.__eco);
await b.close(); server.close();
const end = log.at(-1);
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ');
console.log(`\n[${HE}] ${end.min} phút: cảnh giới ${end.realm} tầng ${end.layer}${end.top ? ' (đỉnh)' : ''}. Mốc cảnh giới (phút): ${JSON.stringify(eco.realmAt)}`);
console.log(`Linh khí theo nguồn: ${top(eco.qi)}\nLinh Thạch vào: ${top(eco.ls)}\nLinh Thạch ra: ${top(eco.lsOut)}\nĐan vào: ${top(eco.pills)}\nĐan ra: ${top(eco.pillsOut)}`);
if (OUT) await writeFile(OUT, JSON.stringify({ he: HE, gender: GENDER, log, eco, errs: [...errs] }));
if (errs.size) { console.error('Lỗi JavaScript:\n' + [...errs].map(x => ' - ' + x).join('\n')); process.exit(1); }
