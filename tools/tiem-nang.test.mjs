// Bài thử Tiềm năng (data/tiem-nang.json, src/game/tiem-nang.js; docs/15-TIEM-NANG-KY-NANG.md): node tools/tiem-nang.test.mjs (tools/check.mjs cũng gọi).
// Giữ đúng lời chủ dự án 21/11/2026: các tộc "khác hướng, ngang sức" (không tộc nào hơn tộc nào quá khoảng 5% lực chiến), quay một lượt, mỗi đại cảnh giới
// có điểm tiềm năng; và bản lưu bị sửa tay không lấy được hơn luật cho phép.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quay, gocCua, congCua, diemCo, diemCon, tiemPct, tranCua, congDiem, tayDiem, giaTay } from '../src/game/tiem-nang.js';
import { powerOf, sumStats, stdList } from '../src/game/he-chien.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const T = read('tiem-nang'), H = read('he-chien'), data = { 'tiem-nang': T, 'he-chien': H };
const PCT = ['atk_pct', 'hp_pct', 'def_pct', 'crit', 'crit_dmg', 'cdr', 'lifesteal', 'thorns'];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

// Dữ liệu: tỉ lệ cộng lại 100, hướng của mỗi tộc cộng lại 1 và chỉ dùng chỉ số của luật chiến đấu, độ hiếm và chữ đủ
assert.equal(Object.values(T.toc).reduce((s, t) => s + t.w, 0), 100, 'tỉ lệ các tộc phải cộng lại 100');
for (const [id, t] of Object.entries(T.toc)) {
  assert.ok(Math.abs(Object.values(t.huong).reduce((s, x) => s + x, 0) - 1) < 1e-6, `${id}: các phần trong huong phải cộng lại 1`);
  for (const k of Object.keys(t.huong)) assert.ok(PCT.includes(k) && H.line_f[k], `${id}: chỉ số ${k} không có trong luật chiến đấu`);
  assert.ok(T.hiem[t.hiem] && t.ten && t.han && t.loi && /^#[0-9a-f]{6}$/i.test(t.mau), `${id}: thiếu độ hiếm, tên, chữ ấn, lai lịch hoặc màu`);
  assert.equal(!!t.thien_phu, t.hiem !== 'thuong', `${id}: chỉ tộc hiếm mới có thiên phú, và tộc hiếm nào cũng có`);
  for (const loi of [T.le.truong_thon, T.le.he_thong]) assert.ok(loi[t.hiem]?.includes('{toc}') && loi.truoc, `lời lễ thiếu câu cho độ hiếm ${t.hiem}`);
}
for (const k of T.diem.chi_so) assert.ok(PCT.includes(k), `diem.chi_so: ${k} không có trong luật chiến đấu`);

// Quay: 4000 lượt, tổng điểm luôn trong khoảng, tộc nào cũng ra, tỉ lệ gần đúng
const dem = {}, [lo, hi] = T.quay.tong;
for (let i = 0; i < 4000; i++) {
  const r = quay(data, rnd), tong = Object.values(r.goc).reduce((s, x) => s + x, 0);
  assert.ok(T.toc[r.toc] && tong >= lo - 0.2 && tong <= hi + 0.2, `quay ra tổng ${tong} ngoài khoảng ${lo}–${hi}`);
  assert.deepEqual(Object.keys(r.goc).sort(), Object.keys(T.toc[r.toc].huong).sort());
  dem[r.toc] = (dem[r.toc] || 0) + 1;
}
for (const [id, t] of Object.entries(T.toc)) assert.ok(dem[id] > 0 && Math.abs(dem[id] / 40 - t.w) < Math.max(2, t.w * 0.25), `${id}: quay 4000 lượt ra ${dem[id]}, lệch tỉ lệ ${t.w}%`);

// Ngang sức: trên tu sĩ chuẩn của mấy cảnh giới, người hên nhất của tộc này so với người xui nhất của tộc kia lệch không quá 5% lực chiến,
// và một điểm tiềm năng cộng vào chỉ số nào cũng đáng gần như nhau (không chỉ số nào đáng gấp rưỡi chỉ số khác)
let lech = 0;
for (const realm of [1.5, 2.5, 4.5]) {
  const luc = tiem => powerOf(H, sumStats(H, realm, stdList(H, realm), true, { pct: tiemPct({ realm: 8, tiem }, data) }));
  const goc0 = luc(null), all = [];
  for (const [id, t] of Object.entries(T.toc)) {
    const chia = tong => Object.fromEntries(Object.entries(t.huong).map(([k, p]) => [k, Math.round(tong * p * 10) / 10]));
    const a = luc({ toc: id, goc: chia(lo), cong: {} }), b = luc({ toc: id, goc: chia(hi), cong: {} });
    assert.ok(a > goc0 && b > a, `${id}: có huyết mạch mà lực chiến không tăng (cảnh giới ${realm})`);
    all.push(a, b);
  }
  lech = Math.max(lech, Math.max(...all) / Math.min(...all) - 1);
  const mot = T.diem.chi_so.map(k => luc({ toc: 'nhan', goc: {}, cong: { [k]: 10 } }) / goc0 - 1);
  assert.ok(Math.max(...mot) / Math.min(...mot) < 1.5, `cảnh giới ${realm}: 10 điểm vào các chỉ số đáng lệch nhau quá: ${mot.map(x => (x * 100).toFixed(1)).join(' / ')}%`);
}
assert.ok(lech <= 0.05, `các tộc lệch nhau ${(lech * 100).toFixed(1)}% lực chiến, quá 5%`);

// Điểm tiềm năng: theo cảnh giới, không cộng quá số có, không quá trần từng chỉ số; tẩy thì về 0, lần đầu miễn phí
const game = { data, save: { realm: 3, lingshi: 0, tiem: { toc: 'nhan', goc: { atk_pct: 3, hp_pct: 3, def_pct: 3 }, cong: {}, tay: 0 } } };
assert.equal(diemCo(game.save, data), T.diem.moi * 3);
for (let i = 0; i < 99; i++) congDiem(game, 'cdr');
assert.equal(congCua(game.save, data).cdr, Math.min(tranCua(data, 'cdr'), T.diem.moi * 3));
for (let i = 0; i < 99; i++) congDiem(game, 'atk_pct');
assert.equal(diemCon(game.save, data), 0, 'cộng hết thì không còn điểm');
assert.equal(congDiem(game, 'hp_pct'), false);
assert.equal(giaTay(game), 0); assert.ok(tayDiem(game)); assert.equal(diemCon(game.save, data), T.diem.moi * 3); assert.ok(giaTay(game) > 0, 'tẩy lần hai phải tốn Linh Thạch');

// Bản lưu sửa tay: chỉ số ngoài hướng của tộc bị bỏ, tổng gốc không vượt mức quay cao nhất, điểm cộng không vượt số có và trần
const gian = { realm: 1, tiem: { toc: 'nhan', goc: { atk_pct: 999, crit_dmg: 999, hp_pct: 999 }, cong: { atk_pct: 999, cdr: 999, lifesteal: 50 } } };
assert.deepEqual(Object.keys(gocCua(gian, data)), ['atk_pct']); assert.ok(Object.values(gocCua(gian, data)).reduce((s, x) => s + x, 0) <= hi);
assert.equal(Object.values(congCua(gian, data)).reduce((s, x) => s + x, 0), T.diem.moi);
assert.ok(!('lifesteal' in congCua(gian, data)));
assert.deepEqual(tiemPct({ realm: 5, tiem: { toc: 'khong-co' } }, data), {});
assert.deepEqual(tiemPct({ realm: 5 }, data), {});
console.log(`✅ Tiềm năng: ${Object.keys(T.toc).length} tộc, hên nhất hơn xui nhất ${(lech * 100).toFixed(1)}% lực chiến; ${T.diem.moi} điểm mỗi đại cảnh giới`);
