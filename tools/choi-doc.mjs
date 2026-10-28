// Chơi dọc tua nhanh (chạy tay, không chạy trong CI vì lâu): người mới không tài khoản, bật Tự hành, gọi game.update liên tục
// để tua thời gian (dt 0,05 giây, nhanh vài trăm lần), tự bấm độ kiếp khi linh khí đầy và trong kiếp né sét, chém tâm ma như người chơi.
// Ghi tiến độ mỗi phút giả lập; báo bước truyện nào đứng lâu, lỗi JavaScript. Không gọi máy chủ thật (chặn thư viện Supabase).
// Lưu ý: việc tính theo giờ thật (linh thực 20 phút, hội đèn, việc ngày) không tua theo, nên số giờ chỉ để so sánh tương đối.
// Chạy: npm i --no-save playwright && npx playwright install chromium && SIM_MIN=600 GENDER=0 node tools/choi-doc.mjs
// (chủ dự án yêu cầu chơi thử dọc 28/10/2026; lượt đầu tìm ra 6 chỗ kẹt của tự hành, đã sửa)
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const SIM_MIN = +(process.env.SIM_MIN || 600), GENDER = +(process.env.GENDER || 0), PORT = 8791, OUT = process.env.OUT || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright');
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
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
await p.evaluate(() => {
  const g = window.__game;
  g.simT = 0;
  const orig = g.input.axis; g.input.axis = () => g.botAx || orig();
  // Trong kiếp: né vòng sét sắp giáng, áp sát tâm ma mà chém (tự hành vốn đứng yên nhường người chơi)
  g.botTrib = () => {
    const pp = g.player;
    if (!g.trib.active) { if (g.botAx) { g.botAx = null; g.input.held.delete('atk'); } return; }
    let ex = 0, ey = 0;
    for (const s of g.strikes || []) { if (s.hit) continue; const dx = pp.x - s.x, dy = pp.y - s.y, d = Math.hypot(dx, dy) || 0.1; if (d < s.r + 8) { ex += dx / d; ey += dy / d; } }
    if (ex || ey) { const d = Math.hypot(ex, ey); g.botAx = { x: ex / d, y: ey / d }; g.input.held.delete('atk'); return; }
    const sh = g.mobs.find(m => m.id === 'tam-ma' && !m.dead);
    if (sh) { const dx = sh.x - pp.x, dy = sh.y - pp.y, d = Math.hypot(dx, dy); g.botAx = d > 12 ? { x: dx / d, y: dy / d } : null; g.input.held.add('atk'); g.input.pressed.add('atk'); }
    else g.botAx = null;
  };
});
const log = [];
let lastStep = -1, since = 0;
for (let min = 0; min < SIM_MIN;) {
  const ch = await p.$$('#dlg-choices .choice');
  if (ch.length && await ch[0].isVisible()) { await ch[Math.min(1, ch.length - 1)].dispatchEvent('pointerdown'); await p.waitForTimeout(60); continue; }
  const t = await p.evaluate(() => {
    const g = window.__game;
    if (!g.pilot) document.getElementById('btn-pilot')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (g.uiOpen) for (const id of ['bag', 'skills', 'pets', 'daily', 'achv', 'world', 'social', 'market', 'topup', 'guild']) { if (document.getElementById(id)?.hidden === false) document.getElementById(id + '-close')?.click(); }
    if (g.trib.canStart() && !g.dialog.open && !g.traveling) { g.tribTries = (g.tribTries || 0) + 1; g.trib.start(); }   // người chơi tự bấm độ kiếp
    const choice = () => { const c = document.querySelector('#dlg-choices .choice'); return c && c.offsetParent; };
    for (let k = 0; k < 400 && !choice(); k++) { g.botTrib(); g.update(0.05); g.simT += 0.05; }
    return g.simT;
  });
  await p.waitForTimeout(25);   // cho promise (đi đường, hộp thoại) chạy
  if (t < (min + 1) * 60) continue;
  min++;
  const s = await p.evaluate(() => { const g = window.__game, sv = g.save, T = g.map.T; return { step: sv.step, realm: sv.realm, layer: sv.layer, map: g.map.id, at: [Math.floor(g.player.x / T), Math.floor(g.player.y / T)], kills: sv.stats?.kills || 0, trib: g.tribTries || 0, goal: (g.goals() || '').split('\n')[0].slice(0, 70) }; });
  if (s.step !== lastStep) { lastStep = s.step; since = min; }
  s.min = min; s.stuck = min - since;
  log.push(s);
  if (min % 30 === 0) console.log(`${min} phút: bước ${s.step}, cảnh giới ${s.realm} tầng ${s.layer}, ${s.map}, hạ ${s.kills} quái, độ kiếp ${s.trib} lần. ${s.goal}`);
}
await b.close(); server.close();
if (OUT) await writeFile(OUT, JSON.stringify({ log, errs: [...errs] }, null, 1));
const end = log[log.length - 1], long = [];
for (const s of log) if (s.stuck === 45) long.push(`bước ${s.step} (${s.goal}) ở ${s.map} [${s.at}] đứng 45 phút`);
console.log(`\nKết quả ${SIM_MIN} phút giả lập: bước ${end.step}, cảnh giới ${end.realm} tầng ${end.layer}, độ kiếp ${end.trib} lần.`);
if (long.length) console.log('Đứng lâu (có thể là chờ tu luyện, xem mục tiêu):\n' + long.map(x => ' - ' + x).join('\n'));
if (errs.size) { console.error('❌ Lỗi JavaScript:\n' + [...errs].map(x => ' - ' + x).join('\n')); process.exit(1); }
console.log('✅ Không có lỗi JavaScript');
