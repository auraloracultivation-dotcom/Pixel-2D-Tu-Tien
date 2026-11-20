// Bài chơi thử tự động (chạy trong CI mỗi lần cập nhật): người mới chơi thử không tài khoản, bật Tự hành,
// giả ngày đang có lễ (mặc định Lễ Bí Ngô 30/10) để bắt lỗi kiểu "lễ làm kẹt truyện". Báo lỗi nếu trang có lỗi
// JavaScript hoặc truyện không đi tiếp đủ số bước trong thời gian chơi. Không gọi máy chủ thật (chặn thư viện Supabase).
// Chạy tay: npm i --no-save playwright && npx playwright install chromium && node tools/playtest.mjs
// Phục vụ game từ thư mục đang đứng: đứng ở gốc kho là chơi mã nguồn rời; đứng trong bản đã gói (node tools/goi.mjs _site; cd _site;
// node ../tools/playtest.mjs) là chơi đúng bản sẽ đưa lên (CI chạy cách này từ 20/11/2026).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

// 18/11/2026: Thiên Kiếm Tinh dựng lại, cổng bí cảnh ra sau chợ nên đường truyện dài hơn (đo: bước 8 đạt ở giây 131): cho 180 giây để máy CI chậm không trượt oan.
// Cùng ngày, bản đĩa 128 ô: bước 8 đạt ở giây 130 lúc máy rảnh, giây 156 lúc máy bận việc khác → cho 220 giây (vẫn đòi đủ 8 bước, không lỗi JavaScript).
const SEC = +(process.env.PLAY_SEC || 220), MIN_STEPS = +(process.env.PLAY_MIN_STEPS || 8);
const FAKE = process.env.PLAY_DATE || '2026-10-30T12:00:00Z', PORT = 8790;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
// Chặng leo bậc đầu game khoá Tự hành tới khi hạ boss đầu (src/game/story.js khoa). Bài chơi thử chạy bằng Tự hành nên bỏ khoá riêng cho nó (game.khoaBo):
// vẫn đi qua đủ các bậc, nghi lễ, cờ mở khoá; riêng cái khoá thì phòng đo tools/do-don/quay-bac.mjs thử bằng người chơi tự tay đánh.
await ctx.addInitScript(() => { const t = setInterval(() => { if (window.__game) { window.__game.khoaBo = true; clearInterval(t); } }, 20); });
await ctx.addInitScript(() => { setInterval(() => { const g = window.__game; if (!g?.player) return; const d = g.player.hp <= 0 || !!g.ghost; if (d && !window.__dd) window.__deaths = (window.__deaths || 0) + 1; window.__dd = d; }, 100); });   // đếm số lần gục
await ctx.addInitScript(`window.__FAKE = ${JSON.stringify(FAKE)}`);
await ctx.addInitScript(() => { const D = Date, off = new D(window.__FAKE) - D.now();
  class F extends D { constructor(...a) { if (!a.length) super(D.now() + off); else super(...a); } static now() { return D.now() + off; } } window.Date = F; });
await ctx.route(/supabase-js/, r => r.abort());   // chơi không mạng, không đụng máy chủ thật
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]?.trim()));
await p.goto(`http://localhost:${PORT}/?thu=1`);   // ?thu=1: hiện nút chơi thử (người chơi thật không thấy, src/ui/login.js)
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(800);
await p.tap('#btn-guest');
await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
// Bài này bắt lỗi kẹt truyện, không đo nhịp tu luyện (đo bằng tools/cay-thu.mjs): mặc định tu nhanh (linh khí cần mỗi tầng × PLAY_NEED,
// đả tọa đủ qi_rate 1) cho truyện đi kịp trong SEC giây; PLAY_NEED=1 PLAY_RATE=0.1 để chạy đúng nhịp thật (xem Tự hành làm gì ở Luyện Khí dài, việc 6 dòng 18d).
await p.evaluate(([k, r]) => { const R = window.__game.data.realms; R.qi_rate = r; if (k !== 1) R.need_mul = Array(R.names.length).fill(k); }, [+(process.env.PLAY_NEED || 0.1), +(process.env.PLAY_RATE || 1)]);
const step0 = await p.evaluate(() => window.__game.save.step);
// Không còn nút Tự hành (02/11/2026): bật tự hành như chạm khung nhiệm vụ
const pilotOn = () => p.evaluate(() => { if (!window.__game.pilot) window.__thu.togglePilot(window.__game); });   // window.__thu: src/game/thu-moc.js (bản gói không gọi được từng tệp code)
await pilotOn();
const end = Date.now() + SEC * 1000;
while (Date.now() < end) {
  const c = await p.$('#dlg-choices .choice');
  if (c && await c.isVisible()) { const all = await p.$$('#dlg-choices .choice'); await all[Math.min(1, all.length - 1)].tap().catch(() => {}); continue; }
  if (await p.evaluate(() => window.__game.dialog.open)) { await p.mouse.click(195, 760); await p.waitForTimeout(200); continue; }
  if (!(await p.evaluate(() => !!window.__game.pilot))) await pilotOn().catch(() => {});
  await p.waitForTimeout(500);
}
const r = await p.evaluate(() => { const g = window.__game; return { step: g.save.step, map: g.map.id, realm: g.save.realm, layer: g.save.layer, goal: g.story.current()?.goal || '', qi: Math.round(g.save.qi), kills: g.save.stats?.kills || 0, deaths: window.__deaths || 0, lc: document.getElementById('power')?.textContent || '' }; });
// Đồ rơi chỗ chạy tới được (17/11/2026: đồ rơi xuống ao không nhặt được): quái chết giữa ô chắn (nước, vách, cây) gần người chơi
// thì không món nào được nằm trên ô chắn
const loot = await p.evaluate(async () => {
  const g = window.__game, L = window.__thu, m = g.map, T = m.T, px = Math.floor(g.player.x / T), py = Math.floor(g.player.y / T);
  let w = null;
  for (let d = 2; d < 14 && !w; d++) for (let dy = -d; dy <= d && !w; dy++) for (let dx = -d; dx <= d && !w; dx++) if (m.solidTile(px + dx, py + dy) && !m.edge(px + dx, py + dy)) w = [px + dx, py + dy];
  if (!w) return { bad: 0, n: 0 };
  const c = m.center(w[0], w[1]), id = Object.keys(g.data.items.drops).find(k => g.data.items.drops[k].item > 0), d0 = g.data.items.drops[id];
  g.loot = []; g.data.items.drops[id] = { ...d0, item: 1, items: 4, gem: 1 };
  L.dropLoot(g, { id, x: c.x, y: c.y }); g.data.items.drops[id] = d0;
  for (let k = 0; k < 30; k++) L.updateLoot(g, 0.03);
  return { bad: g.loot.filter(l => !l.taken && m.blocked(l.x, l.y, 2)).length, n: g.loot.length };
});
await b.close(); server.close();
if (loot.bad) errs.push(`Đồ rơi nằm trên ô chắn (${loot.bad}/${loot.n} món): người chơi không nhặt được`);
const steps = r.step - step0;
console.log(`Chơi thử ${SEC} giây (ngày giả ${FAKE}): qua ${steps} bước truyện, đang ở bước ${r.step} (${r.map}, cảnh giới ${r.realm} tầng ${r.layer}, linh khí ${r.qi}, hạ ${r.kills} quái, gục ${r.deaths} lần, ${r.lc}). Mục tiêu: ${r.goal}`);
const bad = [...errs.map(e => 'Lỗi JavaScript: ' + e), ...(steps < MIN_STEPS ? [`Truyện chỉ đi ${steps} bước, cần ít nhất ${MIN_STEPS}: có thể bị kẹt.`] : [])];
if (bad.length) { console.error('❌ Chơi thử TRƯỢT:\n' + bad.map(x => ' - ' + x).join('\n')); process.exit(1); }
console.log('✅ Chơi thử đạt');
