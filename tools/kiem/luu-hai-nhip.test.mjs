// Bài thử HAI NHỊP LƯU (data/config.json → luu_hai_nhip; src/net/save-diff.js, src/net/profile.js), chạy trong Node, đồng hồ giả,
// máy chủ giả (giữ phiên bản như p2d_luu: sai phiên bản là 'phien_ban_cu'). Không ra mạng.
// Giữ các luật: số nhảy lúc farm gom cham_ms gửi một lần; thứ quan trọng vẫn đi trong nhịp 4 giây; không thứ gì chờ quá cham_ms;
// flush / lệnh máy chủ / trang ẩn thì gửi ngay; không bao giờ tự gây 'phien_ban_cu'; tắt công tắc thì y như cũ.
// Chạy: node tools/kiem/luu-hai-nhip.test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const GOC = resolve(import.meta.dirname, '../..');
const SD = await import(pathToFileURL(join(GOC, 'src/net/save-diff.js')).href);
const NHIP = JSON.parse(readFileSync(join(GOC, 'data/config.json'), 'utf8')).luu_hai_nhip;

// 1. Luật phân loại: chỉ số nhảy = chậm; mọi thứ khác = nhanh
{
  const c = SD.chiSoNhay;
  assert.equal(c(1, 2), true);
  assert.equal(c({ a: 1, b: { c: [1, 2] } }, { a: 5, b: { c: [9, 2] } }), true);
  assert.equal(c({ 'linh-thao': 3 }, { 'linh-thao': 3, 'yeu-huyet': 1 }), true, 'nguyên liệu mới có lần đầu: khoá đếm thêm vẫn là số nhảy');
  assert.equal(c({ 'hoi-xuan': 1 }, {}), true, 'đan uống hết: khoá đếm mất đi vẫn là số nhảy');
  assert.equal(c({ a: 1 }, { a: 1, co: true }), false, 'cờ mới: nhanh');
  assert.equal(c({ a: 'x' }, { a: 'y' }), false, 'chữ đổi: nhanh');
  assert.equal(c({ a: false }, { a: true }), false);
  assert.equal(c([1, 2], [1, 2, 3]), false, 'mảng dài ra: nhanh');
  assert.equal(c({ a: 1 }, { a: '1' }), false);
  assert.equal(c({ a: null }, { a: 1 }), false);
  assert.equal(c({ a: { b: 1 } }, { a: { b: 1, c: { d: 1 } } }), false, 'khoá mới không phải số: nhanh');
  const th = new Set(NHIP.do_thuong), mon = (uid, rarity) => ({ uid, base: 'kiem-go', rarity, lines: [], sockets: [] });
  const t = SD.tuiDoiThuong;
  assert.equal(t([mon(1, 'pham')], [mon(1, 'pham'), mon(2, 'linh')], th), true, 'nhặt món phẩm thường: chậm');
  assert.equal(t([mon(1, 'pham')], [mon(1, 'pham'), mon(2, 'thien')], th), false, 'nhặt món phẩm cao: nhanh');
  assert.equal(t([mon(1, 'pham'), mon(2, 'pham')], [mon(2, 'pham'), mon(3, 'pham')], th), true, 'túi đầy: tự bán món rẻ rồi nhặt món rẻ khác vẫn là chậm');
  assert.equal(t([mon(1, 'pham'), mon(2, 'huyen')], [mon(1, 'pham')], th), true, 'bán / phân giải món phẩm thường: chậm');
  assert.equal(t([mon(1, 'thien'), mon(2, 'pham')], [mon(2, 'pham')], th), false, 'mất món phẩm cao: nhanh');
  assert.equal(t([mon(1, 'pham'), mon(2, 'thien')], [mon(2, 'thien'), mon(1, 'pham')], th), true, 'xếp lại túi: không tính');
  assert.equal(t([mon(1, 'pham')], [{ ...mon(1, 'pham'), lock: true }], th), false, 'món đổi cờ khoá: nhanh');
  assert.equal(t([mon(1, 'pham')], [mon(1, 'linh')], th), false, 'món đổi phẩm: nhanh');
  assert.equal(t([{ ...mon(1, 'pham'), plus: 1 }], [{ ...mon(1, 'pham'), plus: 2 }], th), true, 'số trên món nhảy: chậm');
  assert.equal(t([mon(1, 'pham')], [mon(1, 'pham'), null], th), false);
  assert.equal(t([mon(1, 'pham')], [mon(1, 'pham'), { rarity: 'pham' }], th), false, 'món không có uid: nhanh');
  assert.equal(t([mon(1, 'pham'), mon(1, 'pham')], [mon(1, 'pham')], th), false, 'trùng uid trong bản cũ: không đoán, nhanh');
  for (const k of ['tien', 'thuong-co', 'thien', 'dia']) assert.equal(th.has(k), false, `phẩm ${k} không được nằm trong do_thuong`);

  const goc = { realm: 0, layer: 1, qi: 10, lingshi: 5, stats: { kills: 1 }, mats: {}, flags: {}, bag: [mon(1, 'pham'), mon(5, 'thien')], map: 'a', ss: 'x', clk: 1, lastSeen: 1 };
  const d = SD.createSaveDiff(NHIP), sao = o => JSON.parse(JSON.stringify(o));
  assert.equal(d.plan(goc).full, true);
  d.ack(d.plan(goc));
  const thu = (sua, cham, ten) => { const b = sao(goc); sua(b); const p = d.plan(b); assert.equal(p.changed, true, ten); assert.equal(p.cham, cham, ten); };
  thu(b => { b.qi = 99; b.stats.kills = 7; b.lingshi = 9; b.mats['linh-thao'] = 2; b.clk = 50; }, true, 'số nhảy lúc farm: chậm');
  thu(b => { b.qi = 99; b.layer = 2; }, false, 'lên tầng: nhanh dù chỉ là số (khoá trong nhanh)');
  thu(b => { b.realm = 1; }, false, 'lên cảnh giới: nhanh');
  thu(b => { b.flags.gap = true; }, false, 'cờ truyện: nhanh');
  thu(b => { b.map = 'b'; }, false, 'đổi bản đồ: nhanh');
  thu(b => { b.bag.push(mon(2, 'linh')); }, true, 'nhặt món phẩm thường: chậm');
  thu(b => { b.bag.push(mon(2, 'thien')); }, false, 'nhặt món phẩm cao: nhanh');
  thu(b => { b.bag.pop(); }, false, 'mất món phẩm cao: nhanh');
  thu(b => { b.bag.shift(); b.bag.push(mon(3, 'pham')); b.lingshi += 3; }, true, 'túi đầy, tự bán món rẻ rồi nhặt món rẻ: chậm');
  thu(b => { delete b.mats; }, false, 'khoá bị xoá: nhanh');
  thu(b => { b.tn = 5; }, false, 'Tiên Ngọc: nhanh');
  thu(b => { b.diemMoi = 3; }, true, 'khoá số mới ở cấp đầu: chậm');
  thu(b => { b.thuMoi = { a: 1 }; }, false, 'khoá lạ không phải số: nhanh');
  const p0 = d.plan(sao(goc)); assert.equal(p0.changed, false); assert.equal(p0.cham, false);

  // Máy chủ sửa số (sua) thì khoá bị sửa phải gửi lại, nhưng gửi lại không phải việc gấp: chỉ nhanh khi khoá ấy đổi thứ không phải số
  const d2 = SD.createSaveDiff(NHIP), g2 = { ...sao(goc), mats: { 'linh-thao': 3000 } };
  d2.ack(d2.plan(g2));
  const b1 = sao(g2); b1.mats['linh-thao'] = 3010; b1.lingshi = 9;
  d2.ack(d2.plan(b1), { tran: true, mats: { 'linh-thao': 3002 }, lingshi: 7 });   // chạm trần nhận mỗi ngày: máy chủ cắt phần lố
  const sau = (goc2, sua2) => { const x = sao(goc2); sua2(x); return d2.plan(x); };
  let q = sau(b1, x => { x.mats['linh-thao'] = 3005; x.lingshi = 8; });   // máy đã trừ phần lố, farm thêm chút
  assert.equal(q.changed, true); assert.equal(q.cham, true, 'sau sua.tran: nguyên liệu, Linh Thạch chỉ lệch số thì đi nhịp chậm');
  assert.ok('mats' in q.vi && 'lingshi' in q.vi, 'khoá máy chủ vừa sửa vẫn phải gửi lại');
  q = sau(b1, () => {});
  assert.equal(q.changed, true, 'chưa đổi gì thêm vẫn phải gửi lại khoá bị sửa'); assert.equal(q.cham, true, 'và gửi lại y nguyên thì không gấp');
  assert.equal(sau(b1, x => { x.mats.la = 'x'; }).cham, false, 'khoá bị sửa mà đổi thứ không phải số: nhanh');
  assert.equal(sau(b1, x => { x.flags.gap = true; }).cham, false, 'đang chờ gửi lại mà có cờ truyện: vẫn nhanh');
  const b2 = sao(b1); b2.mats['linh-thao'] = 3002; b2.lingshi = 7;
  d2.ack(d2.plan(b2));   // gửi lại xong, máy chủ không sửa nữa
  assert.equal(d2.plan(sao(b2)).changed, false, 'gửi lại xong thì hết nợ');
  const b3 = sao(b2); b3.qi = 500;
  d2.ack(d2.plan(b3), { realm: 0, layer: 1, qi: 120 });   // bộ hãm linh khí: trả cảnh giới, tầng, linh khí của máy chủ
  q = sau(b3, x => { x.qi = 125; });
  assert.equal(q.cham, true, 'sau khi bị hãm linh khí: cảnh giới, tầng y nguyên, linh khí lệch số thì đi nhịp chậm (realm, layer nằm trong danh sách nhanh)');
  assert.ok('realm' in q.vi && 'layer' in q.vi && 'qi' in q.vi);
  assert.equal(sau(b3, x => { x.qi = 0; x.layer = 2; }).cham, false, 'lên tầng thật thì vẫn nhanh');
  const b4 = sao(b3); b4.qi = 125; b4.bag.push(mon(9, 'pham'));
  d2.ack(d2.plan(b4), { mon: [{ ...mon(9, 'pham'), sig: 'k' }] });   // máy chủ trả món đã sửa
  assert.equal(sau(b4, x => { x.bag[2].sig = 'k'; }).cham, false, 'món trong túi đổi chữ theo bản máy chủ: gửi lại nhanh như cũ');
  assert.equal(sau(b4, () => {}).cham, true);
  d2.ack(d2.plan(b4), { la: 1 });
  assert.equal(d2.plan(sao(b4)).full, true, 'trường sửa lạ: quên hết, lần sau gửi cả bản');
  d2.ack(d2.plan(b4), { tran: true, mats: {}, lingshi: 1 }); d2.reset();
  assert.equal(d2.plan(sao(b4)).full, true, 'reset: lần sau gửi cả bản');
  const cu = SD.createSaveDiff(); cu.ack(cu.plan(goc));
  const b = sao(goc); b.qi = 99;
  assert.equal(cu.plan(b).cham, false, 'không đưa cấu hình: một nhịp như cũ, không gì là chậm');
}

// Môi trường giả cho src/net/profile.js: đồng hồ, hẹn giờ, máy chủ, phiên đăng nhập, fetch, sự kiện trang
let T = 0;
const hen = [];   // { at, f, id }
let henId = 0;
globalThis.performance = { now: () => T };
const thatImm = setImmediate;
globalThis.setTimeout = (f, ms = 0) => { hen.push({ at: T + ms, f, id: ++henId }); return henId; };
globalThis.clearTimeout = id => { const i = hen.findIndex(h => h.id === id); if (i >= 0) hen.splice(i, 1); };
const xa = async () => { for (let i = 0; i < 6; i++) await new Promise(r => thatImm(r)); };
async function troi(ms) {   // cho đồng hồ giả trôi, chạy các hẹn giờ tới hạn theo thứ tự
  const dich = T + ms;
  for (;;) {
    hen.sort((a, b) => a.at - b.at || a.id - b.id);
    if (!hen.length || hen[0].at > dich) break;
    const h = hen.shift(); T = Math.max(T, h.at); h.f(); await xa();
  }
  T = dich; await xa();
}
const nghe = {};   // sự kiện trang: pagehide, visibilitychange
globalThis.addEventListener = (ten, f) => { (nghe[ten] ??= []).push(f); };
globalThis.document = { visibilityState: 'visible', addEventListener: (ten, f) => { (nghe[ten] ??= []).push(f); } };

function mayChu() {
  const m = { pb: 3, data: null, goi: [], loi: null, cham: null, fetch: [], uid: 'u1', tran: 0, qiCho: 0 };   // tran: trần Linh Thảo trong ngày; qiCho: linh khí máy chủ cho tới
  const xuLy = async (fn, a) => {
    m.goi.push({ fn, at: T, a: JSON.parse(JSON.stringify(a)) });
    if (m.cham) await m.cham;   // lần gọi treo tới khi bài thử thả
    if (m.loi) { const e = m.loi; m.loi = null; return { data: null, error: e }; }
    if (fn === 'p2d_tai') return { data: { data: m.data, phien_ban: m.pb, ten: 'Thử' }, error: null };
    if (a.p_phien_ban !== m.pb) return { data: null, error: { message: 'phien_ban_cu', code: 'P0001' } };
    if (fn === 'p2d_luu2') m.data = a.p_data;
    else if (fn === 'p2d_luu_vi') { const d = { ...m.data }; for (const k of a.p_xoa || []) delete d[k]; m.data = { ...d, ...a.p_vi }; }
    else return { data: null, error: { message: 'la', code: 'PGRST202' } };
    let sua = null;   // như p2d_luu: cắt phần lố rồi trả số của máy chủ
    if (m.tran && m.data.mats?.['linh-thao'] > m.tran) { m.data = { ...m.data, mats: { ...m.data.mats, 'linh-thao': m.tran } }; sua = { ...sua, tran: true, mats: m.data.mats, lingshi: m.data.lingshi }; }
    if (m.qiCho && m.data.qi > m.qiCho) { m.data = { ...m.data, qi: m.qiCho }; sua = { ...sua, realm: m.data.realm, layer: m.data.layer, qi: m.qiCho }; }
    m.pb++;
    return { data: sua ? { pb: m.pb, sua: JSON.parse(JSON.stringify(sua)) } : { pb: m.pb }, error: null };
  };
  m.supabase = { rpc: (fn, a = {}) => xuLy(fn, a), auth: { getSession: async () => ({ data: { session: { user: { id: m.uid }, access_token: 've-' + m.uid } } }) } };
  m.fetch = [];
  globalThis.fetch = async (url, o) => {
    const fn = String(url).split('/rpc/')[1];
    m.fetch.push({ fn, keepalive: o.keepalive, auth: o.headers.Authorization });
    const r = await xuLy(fn, JSON.parse(o.body));
    return { ok: !r.error, status: r.error ? 400 : 200, json: async () => (r.error ? r.error : r.data) };
  };
  return m;
}

// Nạp profile.js thật, thay ba lệnh nhập bằng đồ giả
const dir = mkdtempSync(join(tmpdir(), 'luu-'));
let src = readFileSync(join(GOC, 'src/net/profile.js'), 'utf8');
const thay = (a, b) => { assert.ok(src.includes(a), 'profile.js đổi lệnh nhập: sửa bài thử theo — ' + a); src = src.replace(a, b); };
thay("import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './client.js';", "const supabase = { rpc: (...a) => globalThis.__mc.supabase.rpc(...a), auth: { getSession: () => globalThis.__mc.supabase.auth.getSession() } }, SUPABASE_URL = 'http://gia', SUPABASE_PUBLISHABLE_KEY = 'khoa';");
thay("import { sendError } from './errlog.js';", 'const sendError = async () => {};');
thay("import { createSaveDiff } from './save-diff.js';", `import { createSaveDiff } from ${JSON.stringify(pathToFileURL(join(GOC, 'src/net/save-diff.js')).href)};`);
writeFileSync(join(dir, 'profile.mjs'), src);
const { createCloudSave } = await import(pathToFileURL(join(dir, 'profile.mjs')).href);

const banLuu = () => ({ realm: 0, layer: 1, qi: 0, step: 0, lingshi: 0, stats: { kills: 0 }, mats: {}, flags: {}, bag: [], map: 'a', lastSeen: 0 });
async function dung(nhip = NHIP) {
  hen.length = 0; for (const k of Object.keys(nghe)) delete nghe[k];
  const m = globalThis.__mc = mayChu(), su = { xungDot: 0, loi: 0, sua: 0 };
  const onFix = (sent, sua) => {   // như src/game/cloud-guard.js applyFix: linh khí lấy số máy chủ, Linh Thạch và nguyên liệu trừ phần lố
    su.sua++;
    if (Number.isFinite(sua.qi)) { s.realm = sua.realm; s.layer = sua.layer; s.qi = sua.qi; }
    if (Number.isFinite(sua.lingshi) && sent.lingshi > sua.lingshi) s.lingshi = Math.max(0, s.lingshi - (sent.lingshi - sua.lingshi));
    for (const [k, v] of Object.entries(sua.mats ? sent.mats || {} : {})) { const lo = v - (sua.mats[k] ?? 0); if (lo > 0) s.mats[k] = Math.max(0, (s.mats[k] || 0) - lo); }
  };
  const c = createCloudSave({ onConflict: () => su.xungDot++, onError: () => su.loi++, onFix, nhip });
  await c.load();
  assert.equal(c.version, m.pb, 'cloud.version phải đọc được phiên bản thật sau khi tải (pickSave lúc vào game dựa vào nó)');
  const s = banLuu();
  const luu = () => { s.lastSeen = T; c.save(s); };
  const farm = async giay => { for (let i = 0; i < giay; i++) { s.qi += 5; s.stats.kills++; s.lingshi += 2; luu(); await troi(1000); } };
  const goiLuu = () => m.goi.filter(g => g.fn !== 'p2d_tai');
  return { m, c, s, su, luu, farm, goiLuu };
}
const khopMayChu = (m, s) => { const a = { ...m.data }, b = JSON.parse(JSON.stringify(s)); for (const k of ['ss', 'clk', 'lastSeen', 'pb']) { delete a[k]; delete b[k]; } assert.deepEqual(a, b, 'bản trên máy chủ phải khớp bản trong máy'); };

// 2. Farm 2 phút, chỉ số nhảy: máy chủ nhận khoảng 30 giây một lần thay vì 4 giây; không khoảng nào dài quá nhịp chậm + một nhịp gom
{
  const { m, s, su, farm, goiLuu } = await dung();
  await farm(120);
  const g = goiLuu(), lan = g.map(x => x.at);
  assert.equal(g[0].fn, 'p2d_luu2', 'lần đầu gửi cả bản');
  assert.ok(lan[0] <= 4100, 'lần đầu vẫn trong nhịp 4 giây');
  assert.ok(g.length >= 4 && g.length <= 6, `2 phút farm: ${g.length} lần gọi máy chủ (mong 4–6; một nhịp như cũ là khoảng 30)`);
  for (let i = 1; i < lan.length; i++) assert.ok(lan[i] - lan[i - 1] <= NHIP.cham_ms + 4100, `khoảng giữa hai lần lưu ${lan[i] - lan[i - 1]} ms vượt nhịp chậm`);
  await troi(40000);
  khopMayChu(m, s);
  assert.equal(su.xungDot + su.loi, 0);
}

// 3. Tắt công tắc: y như cũ, khoảng 4 giây một lần
{
  const { goiLuu, farm } = await dung({ ...NHIP, on: false });
  await farm(120);
  assert.ok(goiLuu().length >= 25, `tắt hai nhịp: ${goiLuu().length} lần gọi trong 2 phút (mong khoảng 30)`);
  const { goiLuu: g2, farm: f2 } = await dung(null);
  await f2(60);
  assert.ok(g2().length >= 12, 'không có cấu hình cũng là một nhịp như cũ');
}

// 4. Thứ quan trọng vẫn tới máy chủ trong nhịp 4 giây, kéo theo cả số nhảy đang chờ
{
  const { m, s, luu, farm, goiLuu } = await dung();
  await farm(10);
  const kiem = async (sua, ten) => {
    await farm(3);   // đang có số nhảy chờ
    const t0 = T, n0 = goiLuu().length;
    sua(); luu();
    await troi(4100);
    const g = goiLuu();
    assert.ok(g.length > n0 && g.at(-1).at - t0 <= 4100, `${ten}: phải gửi trong 4 giây`);
    khopMayChu(m, s);
  };
  await kiem(() => { s.layer++; }, 'lên tầng');
  await kiem(() => { s.realm = 1; s.layer = 1; }, 'đột phá cảnh giới');
  await kiem(() => { s.flags['gap-su-ty'] = true; }, 'cờ truyện');
  await kiem(() => { s.bag.push({ uid: 9, base: 'kiem', rarity: 'thien', lines: [], sockets: [] }); }, 'nhặt món phẩm cao');
  await kiem(() => { s.bag.pop(); }, 'mất món');
  await kiem(() => { s.map = 'dao-khac'; }, 'đổi bản đồ');
  // nhặt món phẩm thường ngay sau một lần lưu: không vội, nhưng cũng không quá nhịp chậm tính từ lần lưu trước
  const n1 = goiLuu().length, truoc = goiLuu().at(-1).at;
  s.bag.push({ uid: 10, base: 'kiem', rarity: 'pham', lines: [], sockets: [] }); luu();
  await troi(8000);
  assert.equal(goiLuu().length, n1, 'món phẩm thường không gửi vội');
  await troi(NHIP.cham_ms);
  assert.ok(goiLuu().length > n1 && goiLuu()[n1].at - truoc <= NHIP.cham_ms + 4100);
  khopMayChu(m, s);
  // im lâu rồi mới có số nhảy: lần đầu sau quãng im đi ngay trong nhịp 4 giây (nhịp chậm chỉ giãn các lần SAU một lần vừa gửi)
  await troi(40000);
  const n2 = goiLuu().length;
  s.qi += 1; luu(); await troi(4100);
  assert.equal(goiLuu().length, n2 + 1);
}

// 5. flush() và lệnh máy chủ (run) gửi ngay thứ đang chờ; phiên bản lệnh trả về được nhận, lần lưu sau không bị coi là bản cũ
{
  const { m, c, s, su, luu, farm, goiLuu } = await dung();
  await farm(8);
  await troi(1000);
  s.qi += 1; luu();
  const n0 = goiLuu().length;
  await c.flush(); await xa();
  assert.equal(goiLuu().length, n0 + 1, 'flush gửi ngay số nhảy đang chờ');
  khopMayChu(m, s);
  s.qi += 1; luu();
  let thuTu = [];
  const r = await c.run(async () => { thuTu = goiLuu().map(g => g.fn); m.pb += 1; m.data = { ...m.data, tn: 7 }; return { phien_ban: m.pb, tn: 7 }; }, kq => { s.tn = kq.tn; });
  assert.equal(r.tn, 7);
  assert.equal(thuTu.length, n0 + 2, 'lệnh máy chủ: đẩy bản đang chờ lên trước rồi mới chạy lệnh');
  luu(); await farm(40); await troi(40000);
  khopMayChu(m, s);
  assert.equal(su.xungDot, 0, 'không tự gây "đang chơi ở máy khác"');
}

// 6. Trang bị ẩn / đóng: gửi ngay bằng fetch keepalive kèm mã đăng nhập; trang còn sống thì nhận phiên bản mới, lưu tiếp không lệch
{
  const { m, s, su, luu, farm, goiLuu } = await dung();
  await farm(10);
  s.qi += 3; luu();
  const n0 = goiLuu().length;
  document.visibilityState = 'hidden';
  for (const f of nghe.visibilitychange) f();
  assert.equal(m.fetch.length, 1, 'trang ẩn: gửi ngay trong cùng nhịp sự kiện, không chờ hỏi phiên');
  assert.deepEqual(m.fetch[0], { fn: 'p2d_luu_vi', keepalive: true, auth: 'Bearer ve-u1' });
  await xa();
  assert.equal(goiLuu().length, n0 + 1);
  khopMayChu(m, s);
  document.visibilityState = 'visible';
  await farm(45);
  await troi(40000);
  khopMayChu(m, s);
  assert.equal(su.xungDot + su.loi, 0, 'trang sống lại: lưu tiếp bằng phiên bản mới, không xung đột');
  // sắp đóng (pagehide) mà không còn gì chờ: không gửi thừa
  const f0 = m.fetch.length;
  for (const f of nghe.pagehide) f();
  assert.equal(m.fetch.length, f0);
  // đang có lần gửi dở thì trang ẩn không gửi lần thứ hai (hai bản cùng phiên bản = máy chủ từ chối bản sau)
  let tha; m.cham = new Promise(r => { tha = r; });
  s.layer++; luu(); await troi(4100);
  s.qi += 1; luu();
  for (const f of nghe.pagehide) f();
  assert.equal(m.fetch.length, f0, 'đang gửi dở: không gửi chồng');
  m.cham = null; tha(); await xa();
  await troi(40000);
  khopMayChu(m, s);
  assert.equal(su.xungDot, 0);
}

// 7. Đổi tài khoản trên cùng máy: lần lưu gấp cũng không được gửi bản của người trước cho người sau (lỗi 21/11/2026)
{
  const { m, c, s, luu, farm } = await dung();
  await farm(10);
  s.qi += 3; luu();
  m.uid = 'nguoi-khac';
  for (const f of nghe.pagehide) f();
  assert.equal(m.fetch.length <= 1 && m.fetch.every(x => x.auth === 'Bearer ve-u1'), true, 'mã đăng nhập gửi kèm phải là của đúng tài khoản đã tải bản lưu');
  await xa();
  const n0 = m.goi.length;
  s.qi += 3; luu(); await troi(40000);
  assert.equal(m.goi.length, n0, 'phiên đã đổi người: thôi hẳn, không gửi gì nữa');
  assert.equal(c.version, m.pb);
}

// 8. Máy chủ lỗi một lần: không kẹt, lần sau gửi cả bản và khớp lại
{
  const { m, s, su, farm } = await dung();
  await farm(40);
  m.loi = { message: 'tam_nghi', code: '500' };
  await farm(40);
  await troi(70000);
  khopMayChu(m, s);
  assert.equal(su.loi, 1);
  assert.equal(su.xungDot, 0);
}

// 9. Chạy dài lẫn lộn 10 phút: không lúc nào bản máy chủ cũ quá nhịp chậm; cuối cùng khớp
{
  const { m, s, su, luu, goiLuu } = await dung();
  let hat = 12345; const rnd = () => (hat = (hat * 1103515245 + 12345) % 2147483648) / 2147483648;
  let doiLuc = 0, treNhat = 0;
  for (let i = 0; i < 600; i++) {
    s.qi += 5; s.stats.kills++;
    if (rnd() < 0.05) s.mats['linh-thao'] = (s.mats['linh-thao'] || 0) + 1;
    if (rnd() < 0.02) s.bag.push({ uid: 100 + i, base: 'kiem', rarity: rnd() < 0.2 ? 'thien' : 'pham', lines: [], sockets: [] });
    if (rnd() < 0.01) s.layer = s.layer % 9 + 1;
    if (!doiLuc) doiLuc = T;
    luu(); await troi(1000);
    const cuoi = goiLuu().at(-1);
    if (cuoi && cuoi.at >= doiLuc) doiLuc = 0;
    if (doiLuc) treNhat = Math.max(treNhat, T - doiLuc);
  }
  assert.ok(treNhat <= NHIP.cham_ms + 5000, `thay đổi chờ lâu nhất ${treNhat} ms, vượt nhịp chậm`);
  await troi(40000);
  khopMayChu(m, s);
  assert.equal(su.xungDot + su.loi, 0);
  const n = goiLuu().length;
  assert.ok(n < 75, `10 phút: ${n} lần gọi (một nhịp như cũ là khoảng 150)`);
}

// 10. Máy chủ cắt số ở MỌI lần lưu (người chạm trần nhận mỗi ngày; người bị bộ hãm linh khí): vẫn chỉ lưu theo nhịp chậm.
//     Trước 21/11/2026 mỗi lần bị cắt là một lần gửi nhanh kế tiếp, lần ấy lại bị cắt: vòng 4 giây không dứt (soát bản thật thấy).
{
  const { m, s, su, luu, goiLuu } = await dung();
  s.mats['linh-thao'] = 2990; luu(); await troi(5000);
  m.tran = 3000;
  const farmNl = async giay => { for (let i = 0; i < giay; i++) { s.qi += 5; s.stats.kills++; s.lingshi += 2; s.mats['linh-thao'] += 1; luu(); await troi(1000); } };
  await farmNl(45);   // vượt trần, máy chủ bắt đầu cắt
  const n0 = goiLuu().length, s0 = su.sua;
  await farmNl(120);
  const g = goiLuu().slice(n0), lan = g.map(x => x.at);
  assert.ok(su.sua - s0 >= 3, `máy chủ giả phải cắt mỗi lần lưu (${su.sua - s0} lần)`);
  assert.ok(g.length >= 3 && g.length <= 6, `chạm trần ngày, farm 2 phút: ${g.length} lần gọi máy chủ (mong 4–5; vòng cũ là khoảng 30)`);
  for (let i = 1; i < lan.length; i++) assert.ok(lan[i] - lan[i - 1] <= NHIP.cham_ms + 4100, `chạm trần: khoảng giữa hai lần lưu ${lan[i] - lan[i - 1]} ms vượt nhịp chậm`);
  assert.ok(g.every(x => x.fn !== 'p2d_luu_vi' || 'mats' in x.a.p_vi), 'khoá máy chủ vừa sửa được gửi lại ở lần kế');
  s.flags.gap = true; luu();
  const t0 = T; await troi(4100);
  assert.ok(goiLuu().some(x => x.at > t0 && x.a.p_vi?.flags?.gap), 'đang trong vòng bị cắt mà có cờ truyện: vẫn tới máy chủ trong 4 giây');
  await troi(80000);
  assert.equal(m.data.mats['linh-thao'], 3000, 'máy chủ giữ đúng trần');
  khopMayChu(m, s);
  assert.equal(su.xungDot + su.loi, 0);
}
{
  const { m, s, su, luu, goiLuu } = await dung();
  s.qi = 100; luu(); await troi(5000);
  m.qiCho = 150;
  const tu = async giay => { for (let i = 0; i < giay; i++) { s.qi += 5; s.stats.kills++; luu(); await troi(1000); } };
  await tu(45);
  const n0 = goiLuu().length, s0 = su.sua;
  await tu(120);
  const g = goiLuu().slice(n0);
  assert.ok(su.sua - s0 >= 3, `bộ hãm linh khí giả phải cắt mỗi lần lưu (${su.sua - s0} lần)`);
  assert.ok(g.length >= 3 && g.length <= 6, `bị hãm linh khí, tu 2 phút: ${g.length} lần gọi máy chủ (mong 4–5; vòng cũ là khoảng 30)`);
  s.layer = 2; s.qi = 0; luu();
  const t0 = T; await troi(4100);
  assert.ok(goiLuu().some(x => x.at > t0 && x.a.p_vi?.layer === 2), 'lên tầng thật thì vẫn tới máy chủ trong 4 giây');
  m.qiCho = 0;
  await troi(80000);
  khopMayChu(m, s);
  assert.equal(su.xungDot + su.loi, 0);
}

console.log('luu-hai-nhip.test: ok');
process.exit(0);
