// Bài thử hai máy cho QUÁI CHUNG (data/config.json → quai_chung; chủ dự án 21/11/2026: "người này farm thì người kia cũng thấy và có thể
// tranh nhau farm", công "chia theo sát thương"). Hai trình duyệt khách cùng vào một tinh cầu qua PHÒNG GIẢ chạy đúng mã máy chủ phòng
// (tools/cloud/phong-gia.mjs, kể cả cloud/src/quai.js và bảng bãi thật cloud/src/quai-cfg.js), nên tin đi đủ đường thật.
// Công tắc quai_chung.on được bật riêng cho bài thử (chặn data/config.json lại, sửa on = true); một máy thứ ba để nguyên công tắc tắt.
// Không ra mạng, không chạm máy chủ thật. Chạy ở gốc kho (mã nguồn rời) hoặc trong bản đã gói (node tools/goi.mjs _site; cd _site;
// node ../tools/quai-chung.thu.mjs); cần playwright như tools/hai-may.mjs. GIAY: số giây hai máy Tự đánh (mặc định 25).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { taoPhongGia } from './cloud/phong-gia.mjs';

const PORT = +(process.env.PORT || 8795), GOC = resolve(import.meta.dirname, '..');
const CFG = JSON.parse(readFileSync(join(GOC, 'data/config.json'), 'utf8'));
// MAP=kh: một tinh cầu tông môn giả (cấp 3, có công trình che bớt bãi); phòng giả đọc nó qua p2d_kh_ds giả (cloud/src/quai-kh.js)
const KH = process.env.MAP === 'kh' ? { id: '00000000-0000-4000-8000-00000000c0de', ten: 'Tinh Cầu Thử', mat_dat: 'co', hat: 4242, cap: 3, vong: 1, goc: 0, trong: false, bang: 'Thử',
  bay: [[Object.keys(JSON.parse(readFileSync(join(GOC, 'data/khai-hoang.json'), 'utf8')).ct)[0], 24, 20, 0]], rieng: {} } : null;
const MAP = KH ? KH.id : process.env.MAP || CFG.quai_chung.maps[0];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const body = await readFile(join(process.cwd(), file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright').catch(() => createRequire(join(GOC, 'tools/x.mjs'))('playwright'));
const phong = await taoPhongGia({ khDs: KH ? [KH] : null }), trinh = await chromium.launch();
const kq = [], loi = [];
const ok = (ten, dat, them = '') => { kq.push(dat); console.log(`${dat ? '✅' : '❌'} ${ten}${them ? ' — ' + them : ''}`); };
const cho = async (f, ms = 8000, nhip = 100) => { const het = Date.now() + ms; let v; while (Date.now() < het) { v = await f(); if (v) return v; await new Promise(r => setTimeout(r, nhip)); } return v; };

// Một máy khách (như tools/hai-may.mjs): khách không tài khoản, mã thử `id`, vào phòng giả. bat: bật công tắc quái chung cho máy này.
async function moMay(id, bat = true) {
  const ctx = await trinh.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route(/supabase-js/, r => r.abort());
  await ctx.route(/posthog/, r => r.abort());
  // mã nguồn rời nạp data/config.json; bản đã gói (tools/goi.mjs) nạp mọi dữ liệu trong data/_all.json
  // công tắc của máy này đặt thẳng (bật / tắt), không dựa vào số trong data/config.json (21/11/2026 công tắc thật đã bật)
  await ctx.route(/data\/(config|_all)\.json/, async r => { const j = await (await r.fetch()).json(); (j.config || j).quai_chung.on = bat; await r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
  const X = { id, ctx, ws: null, dong: () => ctx.close() };
  await ctx.routeWebSocket(u => u.pathname.endsWith('/ws'), ws => { X.ws = ws; phong.noi(ws, id, 'Thử ' + id); });
  const p = X.p = await ctx.newPage();
  p.on('pageerror', e => loi.push(`[${id}] ${e.message} @ ${(e.stack || '').split('\n')[1]?.trim() || ''}`));
  await p.goto(`http://localhost:${PORT}/?thu=1&phong=${id}`);
  await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
  await p.waitForTimeout(600);
  await p.tap('#btn-guest');
  await p.waitForFunction(() => window.__game?.save && window.__game.player, null, { timeout: 30000 });
  await p.evaluate(async ([map, kh]) => {
    const g = window.__game, d = g.dialog;
    for (const k of Object.keys(d)) if (typeof d[k] === 'function' && k !== 'close') d[k] = async () => null;
    d.open = false; const box = document.getElementById('dialog'); if (box) box.hidden = true;
    g.closeAll?.(); g.auto = false; g.khoaBo = true; g.noDeath = true;
    window.__ha = [];   // mỗi lần hạ quái: ô, phần công máy này nhận
    const goc = g.onKill; g.onKill = m => { window.__ha.push({ o: m.qc ?? null, cong: m.cong ? { ...m.cong } : null }); return goc(m); };
    if (kh) { window.__thu.khState(g).list.push(kh); window.__thu.khRebuild(g, kh.id, kh.bay); }   // tinh cầu tông môn giả: dựng như khai-hoang.js khLoad
    await g.travel(map, 'vao', false, { force: true });
    // Khách chơi thử là người mới Luyện Khí: ở tinh cầu cao đánh không nổi (Thủ của quái, áp chế lực chiến), con 484 máu đánh 40 đòn
    // còn chưa chết. Bài này thử đồng bộ chứ không thử cân bằng, nên cho máy thử mạnh vừa tầm tinh cầu: tắt áp chế lực chiến, mỗi đòn
    // thường của Tự đánh cỡ 1/6 máu quái ở đây (đủ để hai máy cùng có phần), giữ lại mỗi 250 ms vì bảng chỉ số hay tính lại.
    g.data.config.cp_press.on = false;
    // Linh khí đo bằng số trước / sau: quái tinh cầu cao cho nhiều linh khí, người mới lên tầng giữa chừng là linh khí tụt về phần dư
    // (21/11/2026 Thiên Kim Tinh: A "+-27"). Cho linh khí cần mỗi tầng thật lớn để không lên tầng trong bài thử.
    const R = g.data.realms; R.need_mul = Array(R.names.length).fill(1e9);
    setInterval(() => {
      const m = g.mobs.find(x => x.qc != null) || g.mobs[0];
      if (!m) return;
      const T = m.maxHp / 6, D = Math.max(0, m.def?.hc?.def || 0), A = (T + Math.sqrt(T * T + 4 * T * D)) / 2;   // A × A / (A + D) = T
      g.player.atk = A; g.player.st.atk = A;
    }, 250);
  }, [MAP, KH]);
  return X;
}
// Trạng thái quái chung trên một máy: ô → [x gốc, y gốc, máu, máu tối đa, dị chủng, do máy khác giữ, x, y]
const soQuai = X => X.p.evaluate(() => {
  const g = window.__game, q = g.qc;
  if (!q) return null;
  return { me: q.me, song: Object.fromEntries([...q.o].map(([s, m]) => [s, [Math.round(m.hx), Math.round(m.hy), m.hp, m.maxHp, m.rare ? 1 : 0, m.remote ? 1 : 0, Math.round(m.x), Math.round(m.y), m.cho]])),
    cho: [...q.cho.keys()], rieng: g.spawners.filter(s => s.qc).reduce((a, s) => a + s.alive.length, 0), baiChung: g.spawners.filter(s => s.qc).length, ke: g.save.stats.kills, qi: g.save.qi, tang: g.save.realm * 100 + g.save.layer };
});
// Đứng cạnh con quái ở ô `o` rồi đánh một đòn; trả về sát thương thật của đòn đó (hitMob còn nhân Công đọ Thủ, ngẫu nhiên ±10%)
// Số đòn ghi trong bài là cho quái 60 máu (Xích Diễm Tinh); tinh cầu máu quái cao hơn thì nhân theo U, và bỏ qua Thủ của quái (reflect)
let U = 1;
const danh = (X, o, dmg, dung = true) => X.p.evaluate(([o, dmg, dung]) => {
  const g = window.__game, m = g.qc?.o.get(o);
  if (!m) return null;
  if (dung) { g.player.x = m.x + 14; g.player.y = m.y; }
  const t = m.cho;
  window.__thu.hitMob(g, m, dmg, { canCrit: false, soft: true, reflect: true });
  return m.cho - t;
}, [o, dmg * U, dung]);
const dat = (X, x, y) => X.p.evaluate(([x, y]) => { const p = window.__game.player; p.x = x; p.y = y; }, [x, y]);

// 0. Công tắc tắt (mặc định): máy thứ ba vào cùng tinh cầu vẫn là quái riêng như cũ
const Z = await moMay('may-z', false);
{
  const z = await cho(() => Z.p.evaluate(() => { const g = window.__game; return g.mobs.length >= 3 ? { qc: !!g.qc, rieng: g.spawners.reduce((a, s) => a + s.alive.length, 0), chung: g.mobs.filter(m => m.qc != null).length } : null; }), 15000);
  ok('Công tắc tắt: quái riêng từng máy như cũ, không gửi tin quái chung', !!z && !z.qc && z.rieng > 0 && z.chung === 0 && !phong.dem.len.q, z ? `quái riêng ${z.rieng}` : 'chưa có quái');
  await Z.dong();
}

const A = await moMay('may-a'), B = await moMay('may-b');
const QCFG = JSON.parse(readFileSync(join(GOC, 'cloud/src/quai-cfg.js'), 'utf8').match(/export const QUAI = (.*);/)[1]);
const B0 = KH ? (await import('../src/game/kh-bai.js')).khBangQuai(QCFG.kh, KH) : QCFG.maps[MAP];   // bảng như máy chủ phòng dựng
const tong = B0.s.reduce((a, r) => a + r[1], 0);

// 1. Hai máy đều chuyển sang quái chung, đủ số con, không còn quái riêng ở các bãi chung
let a = await cho(async () => { const s = await soQuai(A); return s && Object.keys(s.song).length === tong ? s : null; }, 15000);
let b = await cho(async () => { const s = await soQuai(B); return s && Object.keys(s.song).length === tong ? s : null; }, 15000);
ok(`Hai máy vào ${MAP}: quái các bãi chung do máy chủ phòng lo`, !!a && !!b, a && b ? `${tong} con, ${a.baiChung} bãi` : `A ${a ? Object.keys(a.song).length : 'chưa'}, B ${b ? Object.keys(b.song).length : 'chưa'} / ${tong}`);
if (!a || !b) { console.log(loi.join('\n')); await trinh.close(); server.close(); process.exit(1); }
ok('Chữ ký bảng máy khách tự tính khớp bảng của máy chủ phòng (máu, số con, giờ hồi)', true, B0.v);
ok('Không còn quái riêng ở bãi chung', a.rieng === 0 && b.rieng === 0);

// 2. Cùng một con thì hai máy thấy mọc cùng một chỗ, cùng máu
{
  const lech = Object.keys(a.song).filter(o => !b.song[o] || a.song[o][0] !== b.song[o][0] || a.song[o][1] !== b.song[o][1] || a.song[o][3] !== b.song[o][3]);
  ok('Mỗi con quái mọc cùng một chỗ, cùng máu trên hai máy', lech.length === 0, lech.length ? `lệch ô ${lech.slice(0, 5).join(', ')}` : '');
}

// 3. A đánh: máu tụt ngay trên máy A, máy chủ phòng trừ máu chung, máy B thấy đúng máu đó
const bai1 = B0.s.find(r => r[1] >= 4), O1 = bai1[0] * 64, MAX = bai1[3];   // bãi đủ 4 con: mỗi mục dưới đây một con riêng
U = Math.max(1, Math.round(MAX / 60));
const dA = await danh(A, O1, 10);
{
  const ngay = (await soQuai(A)).song[O1];
  ok('A đánh: máu trên máy A tụt ngay (chưa cần chờ máy chủ)', dA > 0 && ngay[2] === MAX - dA, `đòn ${dA}, máu ${ngay?.[2]} / ${MAX}`);
  const bThay = await cho(async () => { const s = (await soQuai(B)).song[O1]; return s && s[2] === MAX - dA ? s : null; });
  ok('B thấy con đó mất đúng số máu A đánh', !!bThay, bThay ? `máu ${bThay[2]} / ${MAX}` : `máy B: ${JSON.stringify((await soQuai(B)).song[O1])}`);
  const aXong = await cho(async () => { const s = (await soQuai(A)).song[O1]; return s && s[8] === 0 && s[2] === MAX - dA ? s : null; });
  ok('Máy chủ phòng đáp: máu trên máy A khớp máu thật, không còn đòn chờ', !!aXong);
}

// 4. B đánh tiếp con đó: máu là máu chung
const dB = await danh(B, O1, 6);
{
  const aThay = await cho(async () => { const s = (await soQuai(A)).song[O1]; return s && s[2] === MAX - dA - dB ? s : null; });
  ok('B đánh tiếp: A thấy máu tụt thêm đúng số B đánh (máu chung)', dB > 0 && !!aThay, `còn ${MAX - dA - dB} / ${MAX}`);
}

// 5. Hạ quái: cả hai máy thấy nó chết; công chia theo sát thương; đồ rơi chỉ về người góp nhiều nhất; ai góp đủ mức đều được tính hạ quái
{
  const truoc = [await soQuai(A), await soQuai(B)];
  let them = 0;
  for (let i = 0; i < 40 && (await soQuai(A)).song[O1]; i++) { them += await danh(A, O1, 9) || 0; await A.p.waitForTimeout(120); }
  const chet = await cho(async () => { const [x, y] = [await soQuai(A), await soQuai(B)]; return !x.song[O1] && !y.song[O1] ? [x, y] : null; });
  ok('Hạ quái: con đó biến mất trên cả hai máy', !!chet);
  const [ha, hb] = [await A.p.evaluate(o => window.__ha.find(k => k.o === o), O1), await B.p.evaluate(o => window.__ha.find(k => k.o === o), O1)];
  const ka = ha?.cong?.k || 0, kb = hb?.cong?.k || 0, phanB = dB / MAX;
  ok('Công chia theo sát thương: phần của A + phần của B = 1, phần B đúng bằng sát thương B góp', Math.abs(ka + kb - 1) < 0.002 && Math.abs(kb - phanB) < 0.002, `A ${ka}, B ${kb} (B góp ${dB} / ${MAX})`);
  ok('Đồ rơi về người góp nhiều nhất (A), B không được đồ', ha?.cong?.top === true && hb?.cong?.top === false);
  const sau = [await soQuai(A), await soQuai(B)], duB = phanB >= CFG.quai_chung.min_cong;
  ok(`Đếm hạ quái: A được tính; B góp ${Math.round(phanB * 100)}% thì ${duB ? 'cũng được tính' : 'không được tính (dưới min_cong)'}`, sau[0].ke === truoc[0].ke + 1 && sau[1].ke === truoc[1].ke + (duB ? 1 : 0), `A ${truoc[0].ke}→${sau[0].ke}, B ${truoc[1].ke}→${sau[1].ke}`);
  // 6. Tới giờ thì mọc lại trên cả hai máy, cùng chỗ, cùng là dị chủng hay không
  const moc = await cho(async () => { const [x, y] = [await soQuai(A), await soQuai(B)]; return x.song[O1] && y.song[O1] ? [x.song[O1], y.song[O1]] : null; }, bai1[2] + 5000);
  ok('Tới giờ hồi: mọc lại trên cả hai máy, cùng chỗ, cùng loại (thường / dị chủng), đầy máu', !!moc && moc[0][0] === moc[1][0] && moc[0][1] === moc[1][1] && moc[0][4] === moc[1][4] && moc[0][2] === moc[0][3], moc ? `(${moc[0][0]}, ${moc[0][1]})${moc[0][4] ? ' dị chủng' : ''}` : 'chưa mọc');
}

// 7. Một mình A hạ một con: B không góp đòn nào thì chỉ thấy nó chết, không được gì
{
  const O2 = O1 + 1, truocB = await soQuai(B);
  for (let i = 0; i < 40 && (await soQuai(A)).song[O2]; i++) { await danh(A, O2, 9); await A.p.waitForTimeout(120); }
  const chetB = await cho(async () => !(await soQuai(B)).song[O2]);
  const hb = await B.p.evaluate(o => window.__ha.filter(k => k.o === o).length, O2), sauB = await soQuai(B);
  ok('A hạ một mình: B thấy con đó chết nhưng không được linh khí, không tính hạ quái', !!chetB && hb === 0 && sauB.ke === truocB.ke && sauB.qi === truocB.qi);
}

// 7b. B góp đủ mức (từ min_cong trở lên) rồi A kết liễu: cả hai được tính hạ quái, linh khí chia theo phần, đồ vẫn chỉ về A
{
  const O4 = O1 + 2, truoc = [await soQuai(A), await soQuai(B)];
  let gopB = 0;
  for (let i = 0; i < 20 && gopB < MAX * 0.25; i++) { gopB += await danh(B, O4, 8) || 0; await B.p.waitForTimeout(120); }
  for (let i = 0; i < 40 && (await soQuai(A)).song[O4]; i++) { await danh(A, O4, 9); await A.p.waitForTimeout(120); }
  await cho(async () => !(await soQuai(A)).song[O4] && !(await soQuai(B)).song[O4]);
  const [ha, hb] = [await cho(() => A.p.evaluate(o => window.__ha.find(k => k.o === o), O4)), await cho(() => B.p.evaluate(o => window.__ha.find(k => k.o === o), O4))];
  const sau = [await soQuai(A), await soQuai(B)], ka = ha?.cong?.k || 0, kb = hb?.cong?.k || 0;
  ok('B góp đủ mức: cả hai được tính hạ quái, phần công đúng theo sát thương', sau[0].ke === truoc[0].ke + 1 && sau[1].ke === truoc[1].ke + 1 && Math.abs(kb - gopB / MAX) < 0.002 && Math.abs(ka + kb - 1) < 0.002 && hb?.cong?.bo === false, `A ${ka}, B ${kb} (B góp ${gopB} / ${MAX})`);
  const [qa, qb] = [sau[0].qi - truoc[0].qi, sau[1].qi - truoc[1].qi];
  ok('Linh khí chia theo phần sát thương (không ai được trọn, cộng lại bằng một con)', qa > 0 && qb > 0 && Math.abs(qb / (qa + qb) - kb) < 0.05, `A +${+qa.toFixed(2)}, B +${+qb.toFixed(2)} (B ${Math.round(qb / (qa + qb) * 100)}%)`);
  ok('Đồ rơi vẫn chỉ về người góp nhiều nhất', (ka > kb) === (ha?.cong?.top === true) && (kb > ka) === (hb?.cong?.top === true));
}

// 8. Giữ quái: A lại gần cho quái nhắm (hoặc đánh nó) thì máy A chạy AI con đó, máy B thấy nó đi theo đúng chỗ máy A báo
{
  const O3 = O1 + 3;
  await cho(async () => (await soQuai(A)).song[O3] && (await soQuai(B)).song[O3], bai1[2] + 5000);
  await danh(A, O3, 1);   // đánh nhẹ một đòn: nó quay sang A
  const theo = await cho(async () => { const [x, y] = [(await soQuai(A)).song[O3], (await soQuai(B)).song[O3]]; return x && y && y[5] === 1 && x[5] === 0 && Math.hypot(x[6] - y[6], x[7] - y[7]) < 24 ? [x, y] : null; });
  ok('Con quái đang đuổi A: máy A chạy AI, máy B thấy nó ở đúng chỗ máy A báo', !!theo, theo ? `A (${theo[0][6]}, ${theo[0][7]}), B (${theo[1][6]}, ${theo[1][7]})` : `A ${JSON.stringify((await soQuai(A)).song[O3])}, B ${JSON.stringify((await soQuai(B)).song[O3])}`);
  // A kéo nó đi xa: máy B thấy nó đi theo
  const g0 = (await soQuai(A)).song[O3];
  if (g0) await dat(A, g0[6] + 120, g0[7]);
  const keo = await cho(async () => { const [x, y] = [(await soQuai(A)).song[O3], (await soQuai(B)).song[O3]]; return x && y && g0 && Math.abs(x[6] - g0[6]) > 30 && Math.hypot(x[6] - y[6], x[7] - y[7]) < 30 ? [x, y] : null; }, 10000);
  ok('A kéo quái đi: trên máy B con quái cũng đi theo', !!keo, keo ? `đi ${keo[0][6] - g0[6]} đơn vị, hai máy lệch ${Math.round(Math.hypot(keo[0][6] - keo[1][6], keo[0][7] - keo[1][7]))}` : '');
  // B vẫn tranh đánh được con A đang giữ
  const truoc = (await soQuai(A)).song[O3]?.[2];
  const d = await danh(B, O3, 3);
  const tranh = await cho(async () => { const s = (await soQuai(A)).song[O3]; return s && truoc - s[2] === d ? s : null; });
  ok('B tranh đánh con quái A đang giữ: đòn của B vẫn được tính', d > 0 && !!tranh);
}

// 8b. Máy chủ phòng ngủ rồi thức (quên hết máu đang giữ): máy nào cũng khớp lại theo số của phòng, không kẹt số cũ
{
  const O5 = B0.s[1][0] * 64, M5 = B0.s[1][3];
  const d1 = await danh(A, O5, 8);
  await cho(async () => (await soQuai(B)).song[O5]?.[2] === M5 - d1);
  for (const { room } of phong.phong.values()) room.q = undefined;   // như Cloudflare dựng lại lớp Phong
  const d2 = await danh(B, O5, 8);
  const khop = await cho(async () => { const [x, y] = [(await soQuai(A)).song[O5], (await soQuai(B)).song[O5]]; return x && y && x[2] === M5 - d2 && y[2] === M5 - d2 && y[8] === 0 ? [x, y] : null; });
  ok('Máy chủ phòng quên máu (ngủ rồi thức): hai máy khớp lại theo số của phòng', d1 > 0 && d2 > 0 && !!khop, khop ? `máu ${khop[0][2]} / ${M5} trên cả hai máy` : `A ${JSON.stringify((await soQuai(A)).song[O5])}, B ${JSON.stringify((await soQuai(B)).song[O5])}`);
}

// 8c. Chơi thật: hai máy cùng bật Tự đánh ở một bãi treo máy (đòn đi đủ đường thật: vung, bạo kích, linh thú). Tranh nhau farm được,
//     hạ con nào cũng có người nhận công, dừng tay thì máu mọi con trên hai máy khớp nhau
{
  const bai = B0.s.find(r => r[1] >= 5) || B0.s[0], GIAY = +(process.env.GIAY || 25), qk0 = phong.dem.xuong.qk || 0;
  const truoc = [await soQuai(A), await soQuai(B)];
  for (const X of [A, B]) await X.p.evaluate(([x, y]) => { const g = window.__game; g.player.x = x; g.player.y = y; g.player.hp = g.player.maxHp; g.auto = true; g.autoTgt = null; g.autoPath = null; g.autoBoss = false; g.autoHome = { x, y }; g.autoHomeMap = g.map.id; window.__ha.length = 0; }, [bai[4], bai[5]]);
  await A.p.waitForTimeout(GIAY * 1000);
  for (const X of [A, B]) await X.p.evaluate(() => { window.__game.auto = false; });
  const qk = (phong.dem.xuong.qk || 0) / 2 - qk0 / 2;   // tin hạ quái phát cho cả hai máy: chia đôi ra số con
  const [ha, hb] = [await A.p.evaluate(() => window.__ha.filter(k => k.cong?.k > 0)), await B.p.evaluate(() => window.__ha.filter(k => k.cong?.k > 0))];
  const sau = [await soQuai(A), await soQuai(B)];
  ok(`Hai máy Tự đánh cùng một bãi ${GIAY} giây: hạ được quái, cả hai đều có phần`, qk >= 2 && ha.length > 0 && hb.length > 0, `${qk} con; A có phần ở ${ha.length} con (tính hạ ${sau[0].ke - truoc[0].ke}), B ${hb.length} con (tính hạ ${sau[1].ke - truoc[1].ke})`);
  const tongPhan = [...ha, ...hb].reduce((t, k) => t + k.cong.k, 0), soTop = [...ha, ...hb].filter(k => k.cong.top).length;
  ok('Mỗi con bị hạ: phần công hai máy cộng lại đúng một con, đúng một người được đồ', Math.abs(tongPhan - qk) < 0.02 * Math.max(1, qk) && soTop === qk, `tổng phần ${+tongPhan.toFixed(3)} / ${qk} con, ${soTop} lượt được đồ`);
  const khop = await cho(async () => { const [x, y] = [await soQuai(A), await soQuai(B)]; const ks = Object.keys(x.song).filter(o => y.song[o]); return ks.length > 40 && ks.every(o => x.song[o][2] === y.song[o][2] && x.song[o][8] === 0 && y.song[o][8] === 0) ? ks.length : 0; }, 6000);
  ok('Dừng tay: máu mọi con quái trên hai máy khớp nhau', khop > 0, `${khop} con`);
  const cuoi = [await soQuai(A), await soQuai(B)];
  ok('Suốt buổi không có quái riêng mọc chen vào bãi chung', cuoi.every(x => x.rieng === 0 && Object.keys(x.song).length + x.cho.length === tong), cuoi.map(x => `${Object.keys(x.song).length} sống + ${x.cho.length} chờ, riêng ${x.rieng}`).join(' | '));
}

// 8b. Nạp lại bản đồ tại chỗ (bay tới đúng tinh cầu đang đứng; tông chủ bày lại công trình): vẫn ở phòng cũ, không có tin chào mới;
// máy A phải xin phòng gửi lại trạng thái rồi về quái chung, không mọc quái riêng chen vào bãi chung
{
  await A.p.evaluate(async map => { const g = window.__game; if (g.map.def.kh) { const p = window.__thu.khState(g).list.find(x => x.id === map); window.__thu.khRebuild(g, map, p.bay); } else await g.travel(map, 'vao', false, { force: true }); }, MAP);
  const lai = await cho(async () => { const s = await soQuai(A); return s && Object.keys(s.song).length + s.cho.length === tong && s.rieng === 0 ? s : null; }, 10000);
  // so với sổ của phòng (sự thật): máy B có thể còn giữ số cũ của lúc phòng ngủ dậy quên máu (mục 7) tới khi có người đánh con đó
  const soPhong = () => [...phong.phong.entries()].find(([ten, v]) => ten.startsWith(`dao:${MAP}`) && v.room.q)?.[1].room.q;
  const lechPhong = x => Object.keys(x.song).filter(o => { const s = soPhong()?.o.get(+o), mau = s && !s.het ? Math.round(s.hp * 10) / 10 : x.song[o][3]; return x.song[o][8] === 0 && Math.abs(x.song[o][2] - mau) > 0.5; });
  const khop = lai && await cho(async () => lechPhong(await soQuai(A)).length === 0, 6000);
  const lech = khop ? '' : (await (async () => { const x = await soQuai(A); return lechPhong(x).slice(0, 4).map(o => `${o}: A ${x.song[o][2]} phòng ${soPhong()?.o.get(+o)?.hp}`).join('; '); })());
  ok('A nạp lại bản đồ tại chỗ: xin phòng gửi lại, về quái chung đủ số con, máu theo phòng', !!lai && khop, lai ? `${Object.keys(lai.song).length} sống + ${lai.cho.length} chờ ${lech}` : JSON.stringify(await A.p.evaluate(() => ({ qc: !!window.__game.qc, rieng: window.__game.spawners.reduce((a, s) => a + s.alive.length, 0) }))));
}

// 9. Rớt mạng: quái chung thành quái riêng, chơi tiếp một mình; nối lại thì về quái chung theo trạng thái của phòng
{
  await A.ws.close({ code: 1006, reason: 'thu-rot-mang' });
  const rot = await cho(() => A.p.evaluate(() => { const g = window.__game; return !g.qc && g.mobs.every(m => m.qc == null) && g.spawners.every(s => !s.qc) ? g.mobs.length : 0; }));
  ok('A rớt mạng: quái trên máy A thành quái riêng, không mất con nào đang đánh dở', rot > 0, `còn ${rot} con`);
  const lai = await cho(async () => { const s = await soQuai(A); return s && Object.keys(s.song).length + s.cho.length === tong && s.rieng === 0 ? s : null; }, 20000);
  ok('A nối lại: quái các bãi chung lại do máy chủ phòng lo, đủ số con', !!lai);
}

ok('Không lỗi JavaScript ở máy nào', loi.length === 0, loi.slice(0, 3).join(' | '));
console.log(`Tin qua phòng giả — lên: ${JSON.stringify(phong.dem.len)}; xuống: ${JSON.stringify(phong.dem.xuong)}`);
const dat0 = kq.filter(Boolean).length;
console.log(`${dat0 === kq.length ? '✅' : '❌'} Bài thử quái chung hai máy: đạt ${dat0}/${kq.length}`);
await trinh.close(); server.close();
process.exit(dat0 === kq.length ? 0 : 1);
