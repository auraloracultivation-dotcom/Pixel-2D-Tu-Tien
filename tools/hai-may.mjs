// Bài thử hai máy tự động (đợt dọn 20/11/2026): hai trình duyệt khách cùng vào một tinh cầu qua PHÒNG GIẢ chạy đúng mã máy chủ phòng
// (tools/cloud/phong-gia.mjs), kiểm rằng thứ gì máy A có thì máy B thấy. Bắt đúng các lỗi đồng bộ đã gặp:
//   - trường hồ sơ bị rơi giữa đường (20/11 11:0x: máy chủ phòng bỏ pháp tượng, vũ khí) → mỗi trường trong data/dong-bo.json phải tới máy B;
//   - mở bảng là ngừng gửi (20/11 17:12) → A mở bảng đứng yên, người vào sau vẫn phải thấy A và nhận tin của A;
//   - hiệu ứng chỉ máy mình thấy → mỗi nhóm hiệu ứng trong data/dong-bo.json phải tới bộ xem của máy B.
// Không ra mạng, không chạm máy chủ thật (thư viện Supabase bị chặn, WebSocket phòng do Playwright chặn lại).
// Chạy: đứng ở gốc kho (mã nguồn rời) hoặc trong bản đã gói (node tools/goi.mjs _site; cd _site; node ../tools/hai-may.mjs).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { taoPhongGia } from './cloud/phong-gia.mjs';

const PORT = +(process.env.PORT || 8794), GOC = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const BANG = JSON.parse(readFileSync(join(GOC, 'data/dong-bo.json'), 'utf8'));
const { chromium } = await import('playwright').catch(() => createRequire(join(GOC, 'tools/x.mjs'))('playwright'));
const phong = await taoPhongGia(), trinh = await chromium.launch();
const kq = [], loi = [];
const ok = (ten, dat, them = '') => { kq.push(dat); console.log(`${dat ? '✅' : '❌'} ${ten}${them ? ' — ' + them : ''}`); };
const cho = async (f, ms = 6000, nhip = 100) => { const het = Date.now() + ms; let v; while (Date.now() < het) { v = await f(); if (v) return v; await new Promise(r => setTimeout(r, nhip)); } return v; };

// Một máy khách: khách không tài khoản, mã thử `id`, vào phòng giả; qua lời thoại mở đầu cho vòng game chạy
async function moMay(id) {
  const ctx = await trinh.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route(/supabase-js/, r => r.abort());   // không đụng máy chủ thật
  await ctx.route(/posthog/, r => r.abort());
  await ctx.routeWebSocket(u => u.pathname.endsWith('/ws'), ws => { phong.noi(ws, id, 'Thử ' + id); });
  const p = await ctx.newPage();
  p.on('pageerror', e => loi.push(`[${id}] ${e.message} @ ${(e.stack || '').split('\n')[1]?.trim() || ''}`));
  await p.goto(`http://localhost:${PORT}/?thu=1&phong=${id}`);
  await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
  await p.waitForTimeout(600);
  await p.tap('#btn-guest');
  await p.waitForFunction(() => window.__game?.save && window.__game.player, null, { timeout: 30000 });
  // tắt thoại truyện (vòng game đứng khi hộp thoại mở), đứng yên, không tự đánh
  await p.evaluate(() => {
    const g = window.__game, d = g.dialog;
    for (const k of Object.keys(d)) if (typeof d[k] === 'function' && k !== 'close') d[k] = async () => null;
    d.open = false; const box = document.getElementById('dialog'); if (box) box.hidden = true;
    g.closeAll?.(); g.auto = false; g.khoaBo = true;
  });
  return { id, ctx, p, dong: () => ctx.close() };
}
// Máy X đang thấy người `id` thế nào (các trường đơn). Tạm gỡ sổ theo dõi đọc (game.thuDoc) để việc soi của bài thử không tính là "có nơi đọc".
const thay = (X, id) => X.p.evaluate(i => {
  const g = window.__game, S = g.thuDoc; g.thuDoc = null;
  try { const o = g.others.list.get(i); return o ? { ...Object.fromEntries(Object.entries(o).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))), ten: o.def?.name } : null; }
  finally { g.thuDoc = S; }
}, id);

const A = await moMay('may-a'), B = await moMay('may-b');
const [mapA, mapB] = await Promise.all([A, B].map(X => X.p.evaluate(() => window.__game.map.id)));
ok('Hai máy khách vào cùng tinh cầu', mapA === mapB, `${mapA} / ${mapB}`);

// 1. Thấy nhau, có toạ độ, đúng tên phòng gắn (máy chủ phòng đặt tên, máy khách không tự khai được)
const bThayA = await cho(async () => { const o = await thay(B, 'may-a'); return o && o.x !== null ? o : null; });
const aThayB = await cho(async () => { const o = await thay(A, 'may-b'); return o && o.x !== null ? o : null; });
ok('B thấy A, A thấy B (có toạ độ)', !!bThayA && !!aThayB, bThayA ? `tên A trên máy B: "${bThayA.ten}"` : 'không thấy');

// 2. Hồ sơ thật của A (nhân vật vừa tạo) tới B đúng từng trường
const H = BANG.ho_so, truongGui = Object.keys(H).filter(k => !H[k].ai);
{
  const cuaA = await A.p.evaluate(() => ({ ...window.__game.hoSo }));
  const o = await cho(async () => { const v = await thay(B, 'may-a'); return v && truongGui.every(k => (v[k] ?? null) === (cuaA[k] ?? null)) ? v : null; }, 4000);
  const lech = o ? [] : truongGui.filter(k => ((bThayA || {})[k] ?? null) !== (cuaA[k] ?? null));
  ok('Hồ sơ thật của A tới B đúng từng trường', !!o, o ? truongGui.filter(k => cuaA[k] != null).map(k => `${k}=${cuaA[k]}`).join(' ') : 'lệch: ' + lech.join(', '));
}

// 3. Mỗi trường trong bảng: A đổi sang một giá trị mẫu hợp lệ → B phải nhận đúng giá trị đó (đi qua bộ lọc máy chủ phòng và bộ lọc máy xem)
const mau = await A.p.evaluate(H => {
  const D = window.__game.data, cur = window.__game.hoSo, di = (o, p) => p.split('.').reduce((a, k) => a?.[k], o), out = {};
  for (const [k, d] of Object.entries(H)) {
    if (d.ai) continue;
    if (d.kieu === 'ma') { const b = di(D, d.bang); out[k] = Object.keys(b).filter(x => x[0] !== '_' && x !== cur[k] && /^[\w-]{1,48}$/.test(x) && (!d.la || Object.entries(d.la).every(([p, v]) => b[x]?.[p] === v))).at(-1) ?? null; }
    else if (d.kieu === 'so') out[k] = d.du ? '0'.repeat(d.dai - 1) + '7' : '5';
    else if (d.kieu === 'chon') out[k] = d.gia_tri[0];
    else if (d.kieu === 'chu') out[k] = 'thu-mau_1';
    else if (d.kieu === 'ten') out[k] = 'Kiếm Tiên thử 9';
  }
  return out;
}, H);
ok('Mọi trường đều tìm được giá trị mẫu trong data/', truongGui.every(k => mau[k] != null), truongGui.filter(k => mau[k] == null).join(', '));
await A.p.evaluate(m => window.__thu.epHoSo(m), mau);
{
  const o = await cho(async () => { const v = await thay(B, 'may-a'); return v && truongGui.every(k => v[k] === mau[k]) ? v : null; }, 5000);
  const v = o || await thay(B, 'may-a') || {};
  ok(`Cả ${truongGui.length} trường hồ sơ A đổi là B nhận đúng`, !!o, o ? truongGui.join(' ') : 'chưa tới: ' + truongGui.filter(k => v[k] !== mau[k]).map(k => `${k} (gửi ${mau[k]}, nhận ${v[k]})`).join(', '));
}
// 3a. Trường nào tới nơi cũng phải có chỗ ở máy người xem ĐỌC tới (vẽ nhân vật, kẻ đi theo…): bắt trường gửi đi mà không ai vẽ
{
  await B.p.evaluate(() => window.__game.thuDoc.clear());   // chỉ tính những lần đọc trong lúc máy B chạy và vẽ bình thường (không có hồ sơ mới tới)
  await new Promise(r => setTimeout(r, 1200));   // cho máy B vẽ A vài chục khung với đủ các trường
  const doc = new Set(await B.p.evaluate(() => [...(window.__game.thuDoc || [])]));
  const can = Object.keys(H).filter(k => H[k].ai !== 'ket-noi' && H[k].xem !== false), thieu = can.filter(k => !doc.has(k));
  ok(`Cả ${can.length} trường tới máy B đều được vẽ / dùng tới`, !thieu.length, thieu.length ? 'không nơi nào đọc: ' + thieu.join(', ') : '');
}
for (const k of truongGui.filter(k => H[k].kieu === 'chon')) for (const gt of H[k].gia_tri.slice(1)) {   // trường chọn: thử hết từng giá trị
  await A.p.evaluate(m => window.__thu.epHoSo(m), { ...mau, [k]: gt });
  ok(`Trường ${k} = ${gt} tới B`, !!(await cho(async () => (await thay(B, 'may-a'))?.[k] === gt, 4000)));
}
// 3b. Trường về trống (xuống thú, hạ cánh, thôi đả tọa, tháo pháp tượng…) thì máy B cũng phải về trống, không giữ giá trị cũ
{
  const trong = Object.fromEntries(truongGui.map(k => [k, null]));
  await A.p.evaluate(m => window.__thu.epHoSo(m), trong);
  const rong = (k, v) => (H[k].kieu === 'ten' ? v === (H[k].trong || '') : v === null);
  const o = await cho(async () => { const v = await thay(B, 'may-a'); return v && truongGui.every(k => rong(k, v[k])) ? v : null; }, 5000);
  const v = o || await thay(B, 'may-a') || {};
  ok('Trường A bỏ trống thì B cũng về trống (không kẹt thú cưỡi, bay, đả tọa cũ)', !!o, o ? '' : 'còn kẹt: ' + truongGui.filter(k => !rong(k, v[k])).map(k => `${k}=${v[k]}`).join(', '));
  await A.p.evaluate(m => window.__thu.epHoSo(m), mau);
  await cho(async () => (await thay(B, 'may-a'))?.look === mau.look, 4000);
}
// 4. Dữ liệu lạ: giá trị sai kiểu thì máy B bỏ (về trống), không vẽ theo
{
  const xau = Object.fromEntries(truongGui.map(k => [k, H[k].kieu === 'ten' ? '<b>‮x' : H[k].kieu === 'chu' ? '../../x' : 'khong-co-that']));
  await A.p.evaluate(m => window.__thu.epHoSo(m), xau);
  const o = await cho(async () => { const v = await thay(B, 'may-a'); return v && truongGui.every(k => (H[k].kieu === 'ten' ? !/[<>‮]/.test(v[k]) && v[k] !== mau[k] : v[k] === null)) ? v : null; }, 5000);
  const v = o || await thay(B, 'may-a') || {};
  ok('Giá trị lạ (mã không có thật, ký tự điều khiển) bị bỏ ở máy B', !!o, o ? '' : truongGui.filter(k => (H[k].kieu === 'ten' ? /[<>‮]/.test(v[k]) : v[k] !== null)).map(k => `${k}=${v[k]}`).join(', '));
  await A.p.evaluate(() => window.__thu.epHoSo(null));
}

// 4b. Hiệu ứng "vừa xảy ra": mỗi nhóm tin trong data/dong-bo.json → hieu_ung, A phát một tin mẫu thì bộ xem nhóm đó ở máy B phải chạy
{
  const nhom = Object.keys(BANG.hieu_ung).filter(k => k[0] !== '_');
  const chieu = await A.p.evaluate(() => { const S = window.__game.data.skills; return Object.keys(S).find(k => S[k].type === 'projectile') || Object.keys(S)[0]; });
  const MAU = { nl: ['nl-0-0'], kd: ['kd-hong'], ks: ['ks-up', 0], pb: ['pb_0_0_1_', 1, 0], chieu: [chieu, 1, 0] };   // hu: thử riêng bằng dien() bên dưới
  ok('Nhóm tin nào trong bảng cũng có tin mẫu trong bài thử', nhom.every(k => k === 'hu' || MAU[k]), nhom.filter(k => k !== 'hu' && !MAU[k]).join(', '));
  const dem = () => B.p.evaluate(() => ({ ...window.__thu.demXem }));
  for (const k of nhom.filter(k => MAU[k])) {
    const truoc = (await dem())[k] || 0;
    await A.p.evaluate(m => window.__thu.phat(window.__game, ...m), MAU[k]);
    ok(`Tin nhóm ${k} (${MAU[k][0]}) của A tới bộ xem ở máy B`, !!(await cho(async () => ((await dem())[k] || 0) > truoc, 3000)));
  }
  // Hiệu ứng viết một lần (dien.js): A gọi dien một lần → máy A diễn, máy B cũng diễn đúng hiệu ứng đó quanh A
  const ds = await A.p.evaluate(() => window.__thu.cacHieuUng());
  ok('Có hiệu ứng viết một lần đã khai (dien.js)', ds.includes('tu-linh'), ds.join(', '));
  const soFx = X => X.p.evaluate(() => (window.__game.fx || []).filter(f => f.type === 'tu-linh').length);
  let cuaA = 0, cuaB = 0;
  for (let i = 0; i < 4 && !(cuaA && cuaB); i++) {   // hiệu ứng sống 0,22 giây: gọi vài lần, soi nhanh
    await A.p.evaluate(() => window.__thu.dien(window.__game, 'tu-linh', 0));
    for (let j = 0; j < 12 && !(cuaA && cuaB); j++) { cuaA ||= await soFx(A); cuaB ||= await soFx(B); await new Promise(r => setTimeout(r, 25)); }
    await new Promise(r => setTimeout(r, 300));
  }
  ok('dien("tu-linh") gọi một lần: máy A diễn, máy B cũng thấy', !!cuaA && !!cuaB, `máy A ${cuaA ? 'có' : 'không'}, máy B ${cuaB ? 'có' : 'không'}`);
}

// 5. Nhịp mạng không bị bảng chặn: A mở bảng, đứng yên; máy C vào SAU vẫn phải thấy A có toạ độ và nhận hồ sơ A đổi lúc đang mở bảng
await A.p.evaluate(() => { const g = window.__game; g.uiOpen = 'thu-bang'; });
const C = await moMay('may-c');
const cThayA = await cho(async () => { const o = await thay(C, 'may-a'); return o && o.x !== null ? o : null; }, 6000);
ok('A đang mở bảng, C vào sau vẫn thấy A có toạ độ', !!cThayA && await A.p.evaluate(() => window.__game.paused === true), cThayA ? `A ở (${Math.round(cThayA.x)}, ${Math.round(cThayA.y)})` : 'C không có toạ độ của A');
await A.p.evaluate(m => window.__thu.epHoSo(m), { st: 'toa' });
ok('A đổi trạng thái lúc đang mở bảng, C vẫn nhận', !!(await cho(async () => (await thay(C, 'may-a'))?.st === 'toa', 4000)));
await A.p.evaluate(() => { window.__thu.epHoSo(null); window.__game.uiOpen = null; });

// 6. Rời tinh cầu: C đóng thì A, B không còn thấy C
await C.dong();
ok('C rời thì A không còn thấy C', !!(await cho(async () => !(await thay(A, 'may-c')), 4000)));

await new Promise(r => setTimeout(r, 300));
ok('Không lỗi JavaScript ở máy nào', !loi.length, loi.slice(0, 3).join(' | '));
console.log(`Tin qua phòng giả — lên: ${JSON.stringify(phong.dem.len)}; xuống: ${JSON.stringify(phong.dem.xuong)}`);
await trinh.close(); server.close();
const truot = kq.filter(x => !x).length;
console.log(truot ? `❌ Bài thử hai máy: trượt ${truot}/${kq.length}` : `✅ Bài thử hai máy: đạt ${kq.length}/${kq.length}`);
process.exit(truot ? 1 : 0);
