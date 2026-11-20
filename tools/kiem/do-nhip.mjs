// Đo nhịp lưu trong một buổi treo máy THẬT (trình duyệt thật, không mạng, không đụng máy chủ): ba bộ gửi giả chạy song song trên cùng
// một buổi chơi, mỗi bộ nhớ riêng "bản máy chủ đã nhận" như src/net/profile.js:
//   cu : trước 21/11/2026, cứ có khoá đổi là gửi theo nhịp 4 giây;
//   v1 : hai nhịp lưu bản đầu (túi đồ chỉ "thêm món phẩm thường ở cuối" mới là chậm);
//   moi: luật đang có trong src/net/save-diff.js (chiSoNhay, tuiDoiThuong).
// In số lần gửi của từng bộ và KHOÁ NÀO làm phải gửi nhanh: thấy ngay thứ gì trong game đang kéo nhịp lưu lên. Dùng khi sửa luật
// hai nhịp, thêm khoá mới vào bản lưu, hay nghi một tính năng làm lưu dày trở lại.
// Chạy ở gốc kho (mã nguồn rời): node tools/kiem/do-nhip.mjs      MAP=đảo quái  S1=giây túi trống  S2=giây túi đầy
// Buổi đo: khách chơi thử sang đảo quái, bật Tự đánh; quái bị giữ ở 1 máu và mình không chết (chỉ để có nhịp hạ quái, nhặt đồ đều),
// chặng một túi còn trống, chặng hai túi được nhét đầy món Phàm / Linh (mỗi lần nhặt là một lần tự phân giải món rẻ).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }   // NODE_PATH khi playwright cài chỗ khác
const S1 = +(process.env.S1 || 120), S2 = +(process.env.S2 || 180), MAP = process.env.MAP || 'dao-xich-dien', PORT = 8793;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { const t = setInterval(() => { if (window.__game) { window.__game.khoaBo = true; clearInterval(t); } }, 20); });   // bỏ khoá leo bậc đầu game
await ctx.route(/supabase-js/, r => r.abort());
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/?thu=1`);
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.waitForTimeout(800);
await p.tap('#btn-guest');
await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });

// Ba bộ gửi giả: 4 giây xem một lần (WAIT_MS), khoá nào khác bản "máy chủ đã nhận" thì xếp nhanh / chậm theo luật của bộ đó
await p.evaluate(async () => {
  const SD = await import('/src/net/save-diff.js'), g = window.__game, nhip = g.data.config.luu_hai_nhip;
  const thuong = new Set(nhip.do_thuong), nhanh = new Set(nhip.nhanh);
  const tuiV1 = (cu, moi) => Array.isArray(cu) && Array.isArray(moi) && moi.length > cu.length && cu.every((c, i) => SD.chiSoNhay(c, moi[i])) && moi.slice(cu.length).every(m => m && thuong.has(m.rarity));
  const cat = v => (JSON.stringify(v) ?? 'undefined').slice(0, 46);
  const dau = (a, c, q = '') => {   // chỗ đầu tiên không phải số nhảy
    if ((typeof a === 'number' && typeof c === 'number') || a === c) return null;
    if (a === null || c === null || typeof a !== 'object' || typeof c !== 'object' || Array.isArray(a) !== Array.isArray(c)) return `${q}: ${cat(a)} → ${cat(c)}`;
    if (Array.isArray(a)) { if (a.length !== c.length) return `${q}[dài ${a.length}→${c.length}] ${cat(c[c.length - 1])}`; for (let i = 0; i < a.length; i++) { const r = dau(a[i], c[i], `${q}[${i}]`); if (r) return r; } return null; }
    for (const k of new Set([...Object.keys(a), ...Object.keys(c)])) {
      const x = a[k], y = c[k];
      if (x === undefined || y === undefined) { if (typeof (x ?? y) !== 'number') return `${q}.${k} ${x === undefined ? 'THÊM' : 'BỚT'} ${cat(x ?? y)}`; }
      else { const r = dau(x, y, `${q}.${k}`); if (r) return r; }
    }
    return null;
  };
  const chup = () => { const m = new Map(); for (const [k, v] of Object.entries(g.save)) { const s = JSON.stringify(v); if (s !== undefined) m.set(k, s); } return m; };
  const bo = (ten, tui) => ({ ten, tui, snap: chup(), last: performance.now(), gui: 0, nhanh: 0, byte: 0, ly: {} });
  const B = window.__do = [bo('cu', null), bo('v1', tuiV1), bo('moi', (cu, moi) => SD.tuiDoiThuong(cu, moi, thuong))];
  setInterval(() => {
    const cur = chup(), now = performance.now();
    for (const e of B) {
      const doi = [], ly = [];
      for (const [k, s] of cur) {
        if (SD.VOLATILE.has(k) || e.snap.get(k) === s) continue;
        doi.push(k);
        if (!e.tui) { ly.push(k); continue; }
        const co = e.snap.has(k), cu = co ? JSON.parse(e.snap.get(k)) : undefined, moi = JSON.parse(s);
        const cham = !nhanh.has(k) && (co ? SD.chiSoNhay(cu, moi) || (k === 'bag' && e.tui(cu, moi)) : typeof moi === 'number');
        if (!cham) ly.push(nhanh.has(k) ? `${k} (khoá nhanh)` : !co ? `${k} (khoá mới)` : `${k}${(dau(cu, moi) || '').replace(/\[\d+\]/g, '[i]').replace(/\d{3,}/g, 'N').slice(0, 90)}`);
      }
      for (const k of e.snap.keys()) if (!cur.has(k) && !SD.VOLATILE.has(k)) { doi.push(k); ly.push(`${k} (xoá)`); }
      if (!doi.length || (!ly.length && now - e.last < nhip.cham_ms)) continue;   // không đổi gì, hoặc chỉ số nhảy mà chưa tới nhịp chậm
      e.gui++; if (ly.length) e.nhanh++;
      e.byte += doi.reduce((t, k) => t + (cur.get(k)?.length || 0), 0);
      if (e.tui) for (const l of ly) e.ly[l] = (e.ly[l] || 0) + 1;
      e.snap = cur; e.last = now;
    }
  }, 4000);
});

const autoOn = () => p.evaluate(async () => { const g = window.__game; if (!g.auto) (await import('/src/game/auto.js')).toggleAuto(g); });
async function choi(sec) {   // bấm qua hội thoại, giữ Tự đánh bật
  for (const end = Date.now() + sec * 1000; Date.now() < end;) {
    const c = await p.$('#dlg-choices .choice');
    if (c && await c.isVisible()) { const all = await p.$$('#dlg-choices .choice'); await all[Math.min(1, all.length - 1)].tap().catch(() => {}); continue; }
    if (await p.evaluate(() => window.__game.dialog.open)) { await p.mouse.click(195, 760); await p.waitForTimeout(200); continue; }
    await autoOn().catch(() => {});
    await p.waitForTimeout(500);
  }
}
const chot = ten => p.evaluate(ten => {   // lấy số của chặng vừa qua rồi đếm lại từ đầu
  const g = window.__game, s = g.save;
  const r = { ten, layer: `${s.realm}.${s.layer}`, tui: s.bag.length, kills: s.stats?.kills || 0, bo: window.__do.map(e => ({ ten: e.ten, gui: e.gui, nhanh: e.nhanh, kb: Math.round(e.byte / 1024), ly: Object.entries(e.ly).sort((a, c) => c[1] - a[1]).slice(0, 12) })) };
  for (const e of window.__do) { e.gui = 0; e.nhanh = 0; e.byte = 0; e.ly = {}; }
  return r;
}, ten);

await choi(15);
await p.evaluate(async map => {
  const g = window.__game;
  if (g.pilot) window.__thu.togglePilot(g);
  await g.travel(map, null, false);
  setInterval(() => { g.player.hp = g.player.maxHp; for (const m of g.mobs) if (m.hp > 1 && !m.remote && !m.dummy) m.hp = 1; }, 250);
}, MAP);
await choi(8); await chot('');
await choi(S1);
const r1 = await chot(`Tự đánh ${S1} giây, túi còn trống`);
await p.evaluate(async () => {
  const I = await import('/src/game/items.js'), g = window.__game, d = g.data, s = g.save;
  I.ensureInv(s);
  for (let i = 0; s.bag.length < I.bagCap(d, s); i++) I.addItem(d, s, I.rollItem(d, s, { rarity: i % 2 ? 'linh' : 'pham' }));
  g.persist();
});
await choi(8); await chot('');
await choi(S2);
const r2 = await chot(`Tự đánh ${S2} giây, túi đầy`);
for (const r of [r1, r2]) {
  console.log(`\n== ${r.ten}: cảnh giới ${r.layer}, túi ${r.tui} món, đã hạ ${r.kills} quái`);
  for (const e of r.bo) { console.log(`  ${e.ten.padEnd(3)}: ${e.gui} lần gửi (${e.nhanh} nhanh), ${e.kb} KB`); for (const [l, n] of e.ly) console.log(`        ${n}×  ${l}`); }
}
if (errs.length) console.log('\nLỖI TRANG:', errs.slice(0, 3));
await b.close(); server.close(); process.exit(errs.length ? 1 : 0);
