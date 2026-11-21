// Quay clip chuỗi nhiệm vụ chính sau phần mở đầu (nhiệm vụ 15 → 27) ở cỡ điện thoại cho chủ dự án xem (docs/10-CAI-HON.md: thứ làm ra phải xem được bằng clip;
// docs/14-TRAN-MA-KY.md phần B):   node tools/do-don/quay-nv.mjs <tệp ra .mp4>      (cần Playwright và ffmpeg)
//   NGON=en | zh-Hant  quay bản dịch · RONG=<bề ngang clip, mặc định 480> · CRF=<độ nén, mặc định 27> · CU=1 bản lưu người chơi cũ (chưa thấy cảnh mở đầu) · CHON=<0…2> câu trả lời Vân Hạc
// Hình lấy từ chính trình duyệt (Page.startScreencast): khung nào đứng bao lâu thì trong clip đứng đúng bấy lâu, không tua. Đoạn ĐI ĐƯỜNG được cắt (hàm cat):
// clip nhảy từ lúc nhân vật vừa lên đường tới lúc sắp tới nơi. Trận trong Hỏa Quật rút ngắn (máu quái hạ xuống, nhân vật không gục) vì clip để xem truyện;
// độ khó thật đo bằng tools/do-don/thu-nv.mjs THAT=1. Chấm tròn trắng trong clip là chỗ ngón tay chạm (chỉ có trong clip). Không có tiếng. Không gọi máy chủ thật.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8793);
const E = process.env, out = process.argv[2] || 'nv.mp4', dir = out.replace(/\.mp4$/i, '') + '-khung', W = +(E.RONG || 480), H = Math.round(W * 844 / 390 / 2) * 2;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
if (E.NGON) await ctx.addInitScript(l => { try { localStorage.setItem('p2d_lang', l); } catch { /* không có kho nhớ */ } }, E.NGON);
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
const ev = (f, a) => p.evaluate(f, a), cho = ms => new Promise(r => setTimeout(r, ms)), T0 = Date.now(), log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1) + 's', ...a);
const vao = async () => { await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 }); await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save && window.__game.map, null, { timeout: 30000 }); };
let loi = 0;
const doi = async (f, a, ms = 90000) => { for (const t = Date.now(); Date.now() - t < ms;) { if (await ev(f, a)) return true; await cho(80); }
  log('HẾT GIỜ chờ', String(f).slice(0, 90)); await p.screenshot({ path: `${out.replace(/\.mp4$/i, '')}-loi${++loi}.png` }).catch(() => {}); return false; };

// ---- bản lưu: vừa hết phần mở đầu (người thân vừa bị bàn tay bắt đi), Luyện Khí tầng 6 như người mới thật ở chỗ này ----
await p.goto('http://localhost:8793/?thu=1'); await vao(); await cho(1500);
await ev(async cu => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)), s = g.save;
  for (let i = 0; i < 40 && !s.gioi; i++) { document.querySelector('#dlg-choices .choice')?.click(); await wait(100); }
  const md = g.data.story.steps.findIndex(x => x.id === g.data.story.mo_dau);
  Object.assign(s, { step: md, stepDone: true, storyV: 2, element: 'hoa', realm: 0, layer: 6, qi: 0, map: 'thien-kiem-phong', spawn: 'vao', weapon: 'kiem' });
  s.root ||= 'pham'; (s.ht ??= {}).intro = 1; s.visited = { 'thanh-khe': true, 'thien-kiem-phong': true };
  Object.assign(s.flags, { 'bac-mo-danh': true, 'bac-mo-hanh': true });
  if (!cu) Object.assign(s.flags, { 'lac-tuyet-vang': true, 'bac-xong': true, 'leo-bac': true, 'mat-tieu-hoa': true });
  g.persist();
}, !!E.CU);
await cho(400); await p.reload(); await vao(); await cho(2200);
await ev(async () => { const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms)); for (let q = 0, i = 0; i < 200 && q < 8; i++) { const c = document.querySelector('#dlg-choices .choice'); if (c) { c.click(); q = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); q = 0; } else q++; await wait(60); } });
// Trong trang: nhân vật không gục, máu quái theo mức đang đặt (window.__mau: { thuong, trum }), Tự hành dừng lại ở việc tay đầu tiên để người quay tự bấm; chấm ngón tay
await ev(() => {
  const g = window.__game; window.__mau = { thuong: 1e9, trum: 1e9 }; window.__dungTay = false;
  setInterval(() => {
    if (!g.player) return;
    g.player.hp = g.player.maxHp;
    for (const m of g.mobs) if (!m.dead) { const cap = m.def?.ai === 'boss' ? window.__mau.trum : window.__mau.thuong; if (m.hp > cap) m.hp = cap; }
    if (window.__dungTay && g.pilot && g.story.viec()) { g.pilot = null; window.__dungTay = false; }
  }, 50);
  const st = document.createElement('style'); st.textContent = '.q-cham{position:fixed;z-index:99999;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid #fff;pointer-events:none;animation:q-cham .55s ease-out forwards}@keyframes q-cham{from{transform:scale(.5);opacity:1}to{transform:scale(1.25);opacity:0}}';
  document.head.append(st);
  window.__cham = (x, y) => { const d = document.createElement('div'); d.className = 'q-cham'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.append(d); setTimeout(() => d.remove(), 600); };
});
// Chạm như ngón tay: hiện chấm rồi chạm thật vào giữa phần tử (sel: bộ chọn, hoặc hàm trong trang trả phần tử)
const cham = async (sel, a) => {
  const tim = () => ev(([sel, a]) => { const e = typeof sel === 'string' && !sel.startsWith('fn:') ? document.querySelector(sel) : [...document.querySelectorAll(a.q)].find(x => new RegExp(a.re).test(x.textContent)); if (!e) return null;
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return [x, y, !t || e === t || e.contains(t) || t.contains(e) ? '' : (t.id || String(t.className) || t.tagName)]; }, [sel, a || null]);
  let r = await tim();
  for (let i = 0; r && r[2] && i < 40; i++) { await cho(150); r = await tim(); }   // biểu tượng Hệ Thống đang bay ngang qua chỗ định chạm: chờ nó đi khỏi
  if (!r) { log('không thấy chỗ chạm', sel, a); return false; }
  if (r[2]) log('chỗ chạm', sel, 'đang bị che bởi', r[2]);
  await ev(([x, y]) => window.__cham(x, y), r); await cho(170); await p.touchscreen.tap(r[0], r[1]); return true;
};
// Không bật Tự hành thì lời thoại chờ người chơi chạm: đọc như người thật (chữ gõ xong, đứng thêm 1,3 giây + 0,03 giây mỗi chữ) rồi chạm vào hộp thoại
let ghi = false, catKe = false, docBan = false, dong = '', dungTu = 0;   // ghi: đang ghi hình (false: đang cắt) · catKe: khung kế là khung đầu sau một chỗ cắt
const docThoai = setInterval(async () => {
  if (docBan || !ghi) return; docBan = true;
  try {
    const d = await ev(() => { const g = window.__game; return g.dialog.open && !g.pilot && !document.querySelector('#dlg-choices .choice') ? document.getElementById('dlg-text')?.textContent || ' ' : ''; });
    if (!d) { dong = ''; } else if (d !== dong) { dong = d; dungTu = Date.now(); }
    else if (Date.now() - dungTu > 1300 + d.length * 30) { dong = ''; const r = await ev(() => { const r = document.getElementById('dialog').getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height * 0.6]; }); await ev(([x, y]) => window.__cham(x, y), r); await cho(150); await p.touchscreen.tap(r[0], r[1]); }
  } catch { /* trang đang chuyển */ } finally { docBan = false; }
}, 150);
const choNV = async n => { await doi(n => { const g = window.__game, G = g.story.goal(); return !!G && G.so >= n && !g.dialog.open && !g.story.busy; }, n, 120000); log('nhiệm vụ', n); };
const gan = (loai, id, d) => [([loai, id, d]) => { const g = window.__game, pl = g.player, t = loai === 'npc' ? g.npcs.find(n => n.id === id) : g.map.center(id[0], id[1]); return !!t && !g.traveling && !g.cheMan && Math.hypot(t.x - pl.x, t.y - pl.y) < d; }, [loai, id, d]];

// ---- quay: mỗi khung trình duyệt vẽ ra ghi thành một ảnh kèm giờ; ghi = false là đang cắt ----
const cdp = await ctx.newCDPSession(p), khung = [];
cdp.on('Page.screencastFrame', f => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  if (!ghi) return;
  const n = `f-${String(khung.length + 1).padStart(6, '0')}.jpg`; writeFileSync(`${dir}/${n}`, Buffer.from(f.data, 'base64')); khung.push([n, f.metadata.timestamp, catKe]); catKe = false; });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: W, maxHeight: H, everyNthFrame: 2 });
// Cắt đoạn đi đường: ngừng ghi tới khi điều kiện đúng, rồi ghi tiếp (khung đầu sau chỗ cắt được đánh dấu để khung trước nó không đứng dài)
const cat = async (f, a, ms) => { ghi = false; const ok = await doi(f, a, ms); catKe = true; ghi = true; return ok; };

// Bản lưu dựng sẵn nên lúc vào có vài dòng báo không thuộc cảnh này (thành tựu, pháp bảo theo tầng): chờ chúng tắt, rồi hẹn lại dòng nhắc của Hệ Thống
await doi(() => document.getElementById('toast')?.hidden !== false, null, 12000); await cho(600);
await ev(() => { const s = window.__game.htS; if (s) { s.nvMoi = Date.now() + 2600; s.nvBuoc = window.__game.save.step; } });
ghi = true; await cho(1000);
// 1. Vào game: thẻ "Nhiệm vụ 15", Hệ Thống nhắc; chạm thẻ là Tự hành dẫn đi
await doi(() => { const t = document.querySelector('.ht-tip'); return t && !t.hidden; }, null, 15000); await cho(4200);
await cham('#nv-hud'); await cho(2400);
await cat(...gan('npc', 'van-hac', 90));
// 2. Vân Hạc → nhiệm vụ 16 → tới chuông, tự tay bấm Gióng chuông → Trấn Ma Kỷ chép
await choNV(16); await cho(2600);
await ev(() => { window.__dungTay = true; });
await cat(...gan('o', [58, 49], 100));
await doi(() => !window.__game.pilot && !!window.__game.story.viec(), null, 30000); await cho(1500);
await cham('#btn-act');
await choNV(17); await cho(1800);
await cham('#nv-hud'); await cho(1600);
await cat(...gan('npc', 'van-hac', 90));
// 3. Câu hỏi của Vân Hạc
await doi(() => document.querySelectorAll('#dlg-choices .choice').length >= 3, null, 60000); await cho(2800);
await cham('fn:', { q: '#dlg-choices .choice', re: ['bị giữ|being kept|被留住', 'sau lưng|behind|身後', 'chính ta|myself|自己'][+(E.CHON || 0)] });
await choNV(18); await cho(2200);
// 4. Bay tới Xích Diễm Tinh → Lão Thiết
await cat(() => { const g = window.__game; return g.map.id === 'dao-xich-dien' && !g.traveling && !g.trip && !g.cheMan; }, null, 120000);
await choNV(19); await cho(1800);
await cat(...gan('npc', 'lao-thiet', 90));
// 5. Hỏa tinh thạch 0/3 → 3/3 (dấu ✓) → qua lửa
await choNV(20); await cho(2000);
const ganDa = [() => { const g = window.__game, pl = g.player; return g.pickups.some(k => k.item === 'hoa-tinh-thach' && !k.taken && Math.hypot(k.x - pl.x, k.y - pl.y) < 70); }, null];
await cat(...ganDa); await doi(() => window.__game.story.goal()?.n >= 1, null, 30000); await cho(1100);
await cat(() => window.__game.story.goal()?.n >= 2, null, 60000); await cat(...ganDa);
await choNV(21); await cho(1500);
await cat(...gan('npc', 'lao-thiet', 90));
await choNV(22); await cho(2000);
// 6. Đặt thẻ tên lên bàn lễ (Tự hành đứng lại một nhịp rồi tự làm)
await cat(...gan('o', [48, 33], 100));
await choNV(23); await cho(2200);
// 7. Hỏa Quật: vài giây đánh (khẩu quyết hiện bên trái), cắt tới trùm, hạ trùm, bảng kết quả, Thoát → Hệ Thống đưa con dao
await ev(() => { window.__mau = { thuong: 420, trum: 1e9 }; });
await cat(() => { const g = window.__game, pl = g.player; return g.map.id === 'hoa-quat' && !g.cheMan && g.mobs.some(m => !m.dead && m.aggro && Math.hypot(m.x - pl.x, m.y - pl.y) < 110); }, null, 120000);
// Tự hành tự tung món đầu (khẩu quyết thứ nhất); bốn giây sau người chơi tự tay tung món thứ ba cho thấy một khẩu quyết khác (xoá hồi chiêu, đủ linh lực để chắc chắn tung được)
await cho(4200);
await ev(() => { const p = window.__game.player; p.mp = p.mpMax || p.mp; p.skillCd[2] = 0; });
await cham('#btn-s2'); await cho(3800);
await ev(() => { window.__mau = { thuong: 25, trum: 190 }; });
await cat(() => { const g = window.__game, pl = g.player; return g.mobs.some(m => !m.dead && m.def?.ai === 'boss' && Math.hypot(m.x - pl.x, m.y - pl.y) < 120); }, null, 120000);
await doi(() => !!document.querySelector('.dr-panel:not([hidden])'), null, 90000); await cho(3200);
await cham('fn:', { q: '.dr-panel button', re: 'Thoát|Leave|Exit|離開|退出' });
await choNV(24); await cho(2200);
// 8. Lấy lại thẻ: ngọn nến sáng, Trấn Ma Kỷ chép
await choNV(25); await cho(2400);
// 9. Lão Thiết nhận ra dấu búa → Lão Than → đường tới Hắc Phong
await cat(...gan('npc', 'lao-thiet', 90));
await choNV(26); await cho(1800);
await cat(...gan('npc', 'lao-than', 90));
await choNV(27); await cho(3600);
// 10. Bảng Hệ Thống: thẻ Nhiệm vụ chính và Hành trình
await ev(() => { window.__game.pilot = null; });
await cham('#ht-icon'); await cho(2600);
await cham('fn:', { q: '.ht-nv button', re: 'Hành trình|Journey|旅程' }); await cho(1600);
await cho(1400);   // danh sách mở ra ở cuối (nhiệm vụ đang làm); rồi kéo ngược lên đầu như ngón tay vuốt
await ev(async () => { const e = document.querySelector('.ht-nv-ds'); if (!e) return; const a = e.scrollTop, t0 = performance.now();
  await new Promise(r => { const f = () => { const k = Math.min(1, (performance.now() - t0) / 2800); e.scrollTop = a * (1 - k * (2 - k)); if (k < 1) requestAnimationFrame(f); else r(); }; f(); }); });
await cho(2200);
ghi = false; clearInterval(docThoai); await cdp.send('Page.stopScreencast').catch(() => {});
const cuoi = await ev(() => { const g = window.__game; return { buoc: g.data.story.steps[g.save.step]?.id, co: Object.keys(g.save.flags).filter(k => /vi-ai|chuong|the-ten|a-luc|dao-ve/.test(k)) }; });
await b.close(); stop();

// ---- ghép: mỗi khung đứng đúng khoảng giờ tới khung kế; chỗ cắt thì khung trước đứng 0,12 giây ----
let list = '', dai = 0;
khung.forEach(([n, t], i) => { const ke = khung[i + 1], d = !ke ? 1.2 : ke[2] ? 0.12 : Math.min(1.5, Math.max(0.01, ke[1] - t)); dai += d; list += `file '${n}'\nduration ${d.toFixed(4)}\n`; });
list += `file '${khung.at(-1)[0]}'\n`; writeFileSync(`${dir}/list.txt`, list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', `fps=30,scale=${W}:${H}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(E.CRF || 27), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
rmSync(dir, { recursive: true, force: true });
console.log(`✅ ${out}: ${khung.length} khung, ${dai.toFixed(0)} giây · bước cuối ${cuoi.buoc} · cờ ${cuoi.co.join(', ')} · ${errs.length} lỗi JavaScript`);
if (errs.length || cuoi.buoc !== 'nv-tang-chin') process.exit(1);
