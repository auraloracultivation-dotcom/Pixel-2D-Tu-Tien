// Bài thử sổ Trấn Ma Kỷ (src/game/tran-ma-ky.js, data/tran-ma-ky.json): node tools/tran-ma-ky.test.mjs (tools/check.mjs cũng gọi)
// 1. Dữ liệu trỏ đúng: người nói là NPC có thật, bản đồ, trùm (và trùm ấy nằm đúng bản đồ trang kể), tiếng, hiệu ứng dàn cảnh, thiên quy, trang được nhắc tới.
// 2. Luật mở trang: người mới chưa mở gì; qua bước truyện thì mở trang quyển một; trùm phải hạ đúng bản đồ; người hạ trùm từ trước được tính theo tu vi;
//    đọc xong thì lĩnh ngộ thiên quy, mở Cấm Kỵ Các, quyển trắng.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dieuKien, tmkKill, tmkSo, tmkQuy, tmkKq, tmkCam, trangs, daMo, canhGioiY } from '../src/game/tran-ma-ky.js';
import { CANH_FX } from '../src/game/tmk-canh.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const C = read('tran-ma-ky'), npcs = read('npcs'), mobs = read('mobs'), realms = read('realms'), story = read('story'), cfg = read('config'), PB = read('phap-bao'), sounds = JSON.stringify(read('sounds'));
const maps = Object.fromEntries(cfg.maps.map(id => [id, readFileSync(new URL(`../data/maps/${id}.json`, import.meta.url), 'utf8')]));
const both = v => String(v).match(/^\{([^|{}]*)\|([^|{}]*)\}$/)?.slice(1) || [v];
const pages = C.quyen.flatMap(q => q.trang), ids = new Set(pages.map(p => p.id)), mob = id => (mobs.list || mobs)[id];

// ---- 1. dữ liệu ----
assert.equal(ids.size, pages.length, 'mã trang trùng nhau');
assert.ok(C.so.length >= C.quyen.length, 'so: thiếu chữ số cho quyển');
assert.equal(C.canh_gioi.length, realms.names.length, 'canh_gioi: mỗi cảnh giới một câu');
const KHI = ['step', 'xong', 'realm', 'total', 'den', 'boss', 'tai', 'hoac', 'doc', 'o', 'co', 'pb'];
function khiOk(k, at) {
  for (const x of Object.keys(k)) assert.ok(KHI.includes(x), `${at}: khoá điều kiện lạ "${x}"`);
  if (k.step != null) assert.ok(k.step >= 0 && k.step < story.steps.length, `${at}: bước truyện ${k.step} không có`);
  if (k.realm != null) assert.ok(k.realm > 0 && k.realm < realms.names.length, `${at}: cảnh giới ${k.realm} không có`);
  for (const m of [k.den, k.tai, k.o].filter(Boolean)) assert.ok(maps[m], `${at}: bản đồ "${m}" không có`);
  if (k.boss) { assert.ok(mob(k.boss)?.ai === 'boss', `${at}: "${k.boss}" không phải trùm`); assert.ok(k.tai && maps[k.tai].includes(`"${k.boss}"`), `${at}: trùm "${k.boss}" không nằm ở bản đồ "${k.tai}"`); }
  for (const d of [].concat(k.doc || [])) assert.ok(ids.has(d), `${at}: trang "${d}" không có`);
  if (k.pb) assert.ok(PB.types[k.pb], `${at}: loại pháp bảo "${k.pb}" không có`);
  if (k.hoac) khiOk(k.hoac, at + '.hoac');
}
const quy = new Set(C.quy.map(l => l.id)), dungQuy = [], mo = [];
for (const q of C.quyen) {
  for (const k of ['id', 'ten', 'noi', 'mo', 'vi_ai', 'goi']) assert.ok(q[k], `quyển ${q.id}: thiếu ${k}`);
  for (const p of q.trang) {
    const at = `trang ${p.id}`;
    assert.ok(p.id.startsWith(q.id + '-') && p.ten && p.goi && p.khi && p.canh?.length, `${at}: thiếu tên, gợi ý, điều kiện hoặc cảnh`);
    khiOk(p.khi, at);
    if (p.quy) { assert.ok(quy.has(p.quy), `${at}: thiên quy "${p.quy}" không có`); dungQuy.push(p.quy); }
    if (p.mo) { assert.ok(['cam', 'trang'].includes(p.mo), `${at}: mo "${p.mo}" lạ`); mo.push(p.mo); }
    let noi = 0;
    for (const c of p.canh) {
      if (Array.isArray(c)) {
        noi++;
        for (const who of both(c[0])) assert.ok(!who || who === 'he-thong' || npcs[who], `${at}: người nói "${who}" không có trong npcs.json`);
        assert.ok(typeof c[1] === 'string' && c[1].length > 0 && c[1].length <= 200, `${at}: câu trống hoặc dài quá 200 chữ (${c[1]?.length})`);
      } else if (c.dan) {
        for (const x of Object.keys(c.dan)) assert.ok(['toi', 'rung', 'chop', 'tieng', 'fx', 'mau', 'cho'].includes(x), `${at}: dàn cảnh có khoá lạ "${x}"`);
        if (c.dan.tieng) assert.ok(sounds.includes(`"${[].concat(c.dan.tieng)[0]}"`), `${at}: tiếng "${c.dan.tieng}" không có trong sounds.json`);
        if (c.dan.fx) assert.ok(CANH_FX.includes(c.dan.fx), `${at}: hiệu ứng "${c.dan.fx}" không có trong src/game/tmk-canh.js`);
        if (c.dan.cho != null) assert.ok(c.dan.cho > 0 && c.dan.cho <= 2, `${at}: nhịp lặng ${c.dan.cho} giây ngoài khoảng 0–2`);
      } else if (c.hoi) {
        assert.ok(c.hoi.q && c.hoi.opts?.length >= 2 && c.hoi.opts.every(o => o.label) && c.hoi.opts.some(o => !o.lai), `${at}: câu hỏi thiếu lựa chọn`);
      } else assert.fail(`${at}: mục cảnh không hiểu được ${JSON.stringify(c).slice(0, 60)}`);
    }
    assert.ok(noi >= 2 && noi <= 8, `${at}: ${noi} câu (mỗi trang 2–8 câu cho vừa một nhịp đọc)`);
    if (p.bo) for (const f of both(p.bo)) assert.ok(/-vang$/.test(f), `${at}: bo chỉ dùng để gỡ cờ "người ấy vắng"`);
  }
}
assert.deepEqual([...dungQuy].sort(), [...quy].sort(), 'mỗi thiên quy phải được đúng một trang mở');
assert.deepEqual(mo.sort(), ['cam', 'trang'], 'phải có đúng một trang mở Cấm Kỵ Các và một trang mở quyển trắng');
assert.deepEqual(Object.keys(C.kq.doan).sort(), Object.keys(PB.types).sort(), 'kq.doan: mỗi loại pháp bảo một câu đoản quyết');
for (const [id, q] of Object.entries(C.kq.doan)) assert.ok(q.ho && q.loi && q.ho.length <= 24, `kq.doan.${id}: câu hô dài quá 24 chữ (bong bóng trên đầu phải ngắn)`);
for (const q of C.kq.truong) { assert.ok(q.id && q.ten && q.dung && q.loi?.length, `trường quyết ${q.id}: thiếu mục`); khiOk(q.khi, `trường quyết ${q.id}`); }
for (const c of [...C.cam.list, C.cam.trang]) for (const k of ['ten', 'gia', 'loi', 'chieu', 'tra', 'nguoi']) assert.ok(c[k], `cấm kỵ ${c.id || c.ten}: thiếu ${k}`);
for (const k of ['cover_sub', 'progress', 'quyen', 'open', 'close', 'ask', 'new', 'read', 'again', 'how', 'sec_quyen', 'sec_quy', 'sec_kq', 'sec_cam', 'have', 'quy_lock', 'kq_doan', 'kq_truong', 'kq_lock', 'kq_pb', 'kq_dung',
  'cam_lock', 'cam_intro', 'cam_gia', 'cam_chieu', 'cam_tra', 'cam_nguoi', 'cam_trang', 'busy', 'nudge_new', 'nudge_old', 'card_title', 'law_got', 'cam_got', 'all', 'next_q', 'end', 'ok', 'skip', 'auto_on', 'auto_off']) assert.ok(C.text[k], `text.${k}: thiếu chữ`);

// ---- 2. luật ----
const fake = (save = {}, map = 'thanh-khe') => ({ data: { 'tran-ma-ky': C, realms, 'phap-bao': PB, journal: { flags: {} } }, map: { id: map }, persist() {},
  save: { step: 0, stepDone: false, realm: 0, layer: 1, flags: {}, visited: { 'thanh-khe': true }, ...save } });
const doc = (g, ...l) => { for (const id of l) g.save.flags['tmkd-' + id] = true; };
{
  const g = fake();
  assert.equal(trangs(g).length, pages.length);
  assert.equal(tmkSo(g).quyen.flatMap(q => q.trang).filter(p => p.mo).length, 0, 'bản lưu mới: chưa trang nào mở');
  g.save.step = 2; assert.deepEqual(trangs(g).filter(p => daMo(g, p)).map(p => p.id), ['q1-1', 'q1-2'], 'qua bước 1: mở hai trang đầu');
  g.save.step = 10; assert.ok(!dieuKien(g, { step: 10, xong: true }), 'bước cuối chưa chạy xong lời thì chưa mở trang cuối quyển một');
  g.save.stepDone = true; assert.ok(dieuKien(g, { step: 10, xong: true }));
}
{
  const g = fake({ step: 10, stepDone: true }, 'phuong-thien-dia'), k = { boss: 'hu-khong-nguc-chu', tai: 'hu-khong-lao', hoac: { total: 36 } };
  tmkKill(g, { id: 'hu-khong-nguc-chu' }); assert.ok(!dieuKien(g, k), 'Ma Vương tuần mượn hình trùm ở Phương Thiên Địa: không tính');
  g.map.id = 'hu-khong-lao'; tmkKill(g, { id: 'hu-khong-nguc-chu' }); assert.ok(dieuKien(g, k), 'hạ trùm đúng bản đồ thì mở');
  const cu = fake({ step: 10, stepDone: true, realm: 4, layer: 1 }); assert.ok(dieuKien(cu, k), 'người đã qua mốc tu vi: tính như đã hạ từ trước');
  assert.ok(!dieuKien(fake({ step: 10, stepDone: true, realm: 3, layer: 9 }), k));
  assert.ok(!dieuKien(cu, { boss: 'ma-ton', tai: 'vet-nut' }), 'Ma Tôn: không có lối tắt, phải hạ thật');
}
{
  const g = fake({ step: 10, stepDone: true, realm: 2 }, 'thien-kiem-phong');
  assert.ok(!dieuKien(g, { doc: ['q6-2', 'q6-3'] })); doc(g, 'q6-2'); assert.ok(!dieuKien(g, { doc: ['q6-2', 'q6-3'] })); doc(g, 'q6-3'); assert.ok(dieuKien(g, { doc: ['q6-2', 'q6-3'], o: 'thien-kiem-phong' }));
  assert.ok(!dieuKien(g, { o: 'dao-moc' }) && dieuKien(g, { den: 'thanh-khe' }) && !dieuKien(g, { den: 'dao-moc' }));
  assert.equal(tmkQuy(g).filter(l => l.co).length, 0); doc(g, 'q1-2'); assert.deepEqual(tmkQuy(g).filter(l => l.co).map(l => l.id), ['can']);
  assert.ok(!tmkCam(g).mo); doc(g, pages.find(p => p.mo === 'cam').id); assert.ok(tmkCam(g).mo && tmkCam(g).coTrang, 'đã đọc q6-3 ở trên: quyển trắng có chữ');
  { const h = fake(); doc(h, pages.find(p => p.mo === 'cam').id); assert.ok(tmkCam(h).mo && !tmkCam(h).coTrang, 'Cấm Kỵ Các mở, quyển trắng còn để trắng'); doc(h, pages.find(p => p.mo === 'trang').id); assert.ok(tmkCam(h).coTrang); }
  assert.ok(!tmkKq(g).doan.some(k => k.co)); g.save.phapBao = { items: [{ type: 'phi-kiem' }] }; assert.deepEqual(tmkKq(g).doan.filter(k => k.co).map(k => k.id), ['phi-kiem']);
  const so = tmkSo(g); assert.equal(so.tong, pages.length); assert.equal(so.doc, 4);   // q6-2, q6-3 (cũng là trang mở quyển trắng), q1-2, trang mở Cấm Kỵ Các
  assert.equal(canhGioiY(g, 1), C.canh_gioi[1]);
}
console.log(`✅ Trấn Ma Kỷ: ${C.quyen.length} quyển, ${pages.length} trang, ${C.quy.length} thiên quy, ${Object.keys(C.kq.doan).length + C.kq.truong.length} khẩu quyết, ${C.cam.list.length + 1} quyển cấm kỵ`);
