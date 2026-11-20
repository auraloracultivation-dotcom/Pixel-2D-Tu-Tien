// Bài thử luật chiến đấu mới (src/game/he-chien.js, data/he-chien.json): node tools/he-chien.test.mjs
// Theo Thí Luyện Đài bản 8 (docs/11-HE-CHIEN-DAU.md): lực chiến tu sĩ chuẩn tăng đều theo cảnh giới, phẩm cộng ít, trần dòng và ngọc,
// dòng hack không nổ số, nhịp đánh từng loài quái trong bảng (đòn thường, người chuẩn của tầng quái đánh một mình).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HC, stdPlayer, stdList, sumStats, powerOf, mobFor, loadout, playerStatsHC, keptLines, linesOf, takeK } from '../src/game/he-chien.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const data = { 'he-chien': read('he-chien'), items: read('items'), 'phap-bao': read('phap-bao'), mobs: read('mobs') };
const H = HC(data), mid = r => r + 4 / 9;

// 1. Lực chiến tu sĩ chuẩn (giữa mỗi cảnh giới) tăng 1,4–2,5 lần mỗi cảnh giới; Luyện Khí → Nguyên Anh tới 3,3 lần vì người chơi thật nhặt thêm pháp bảo, khôi lỗi
const LC = [...Array(9).keys()].map(r => powerOf(H, stdPlayer(H, mid(r)), r));
// Luyện Khí cân theo người chơi thật mới vào (4 món Phàm, 16/11 17:30) nên Luyện Khí → Trúc Cơ nhảy tới 8 lần (đủ 12 món, phẩm Huyền +5)
for (let r = 1; r < 9; r++) { const k = powerOf(H, stdPlayer(H, mid(r)), r - 1) / powerOf(H, stdPlayer(H, mid(r - 1)), r - 1); assert.ok(k > 1.4 && k < (r === 1 ? 8 : r <= 3 ? 3.3 : 2.5), `lên cảnh giới ${r}: × ${k.toFixed(2)}`); }

// 1b. Lực chiến thật (chủ dự án 20/11/2026: "có bao nhiêu hiện bấy nhiêu"): chỉ tính từ chỉ số, không theo cảnh giới. Đột phá giữ nguyên đồ
//     thì không tụt (người chơi báo 40k xuống 25k khi lên Trúc Cơ); tăng chỉ số nào lực chiến cũng không giảm; cùng chỉ số thì cùng lực chiến
for (let r = 0; r < 8; r++) {
  const list = stdList(H, (r * 9 + 8) / 9), a = sumStats(H, r, list, true), b = sumStats(H, r + 1, list, true);
  assert.ok(powerOf(H, b) >= powerOf(H, a), `đột phá ${r} → ${r + 1} giữ đồ: ${powerOf(H, a)} → ${powerOf(H, b)}`);
}
{
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 2000; i++) {
    const b = stdPlayer(H, Math.floor(rnd() * 80) / 9), s = { crit: rnd() * 60, cd: rnd() * 60, ls: rnd() * 40, thorns: rnd() * 40, spd: 1.2 * (1 + rnd() * 0.4) };
    for (const k of ['hp', 'atk', 'def']) s[k] = b[k] * Math.exp((rnd() - 0.5) * 2.2);
    const p0 = powerOf(H, s);
    assert.equal(powerOf(H, { ...s, realm: 0 }), powerOf(H, { ...s, realm: 8 }), 'lực chiến không theo cảnh giới');
    for (const k of ['hp', 'atk', 'def', 'crit', 'cd', 'ls', 'thorns', 'spd']) {
      const t = { ...s, [k]: ['hp', 'atk', 'def', 'spd'].includes(k) ? s[k] * 1.01 : s[k] + 1 };
      assert.ok(powerOf(H, t) >= p0, `tăng ${k} mà lực chiến giảm: ${p0} → ${powerOf(H, t)}`);
    }
  }
}

// 2. Phẩm dễ kiếm chỉ cộng ít: Thượng Cổ so với Phàm cùng cảnh giới dưới 1,9 lần
{
  const r = 2, at = p => powerOf(H, sumStats(H, mid(r), stdList(H, mid(r)).map(x => ({ ...x, pham: p })), true), r);
  const k = at(6) / at(0);
  assert.ok(k > 1.3 && k < 1.9, `Thượng Cổ / Phàm = ${k.toFixed(2)}`);
}

// 3. Bản lưu cực hạn: đồ 10 dòng đen chỉ tính số dòng của phẩm và chạm trần; dòng hack số triệu không nổ; món cảnh giới cao hơn
//    người mặc kẹp về cảnh giới người mặc; 18 viên ngọc cấp 20 chỉ tới trần ngọc
const line = (s, t, v = 5) => ({ s, v, t });
const full = (s, n = 10) => Array.from({ length: n }, () => line(s, 6, 999));
const gems = t => [`${t}:20`, `${t}:20`, `${t}:20`];
const save = {
  realm: 2, layer: 5, nextUid: 9,
  equip: { 'vu-khi': 1, mu: 2, giap: 3, giay: 4, 'ngoc-boi': 5, nhan: 6 },
  bag: [
    { uid: 1, base: 'thiet-kiem', rarity: 'thien', lvl: 80, plus: 20, lines: full('atk_pct'), sockets: gems('hong-ngoc') },
    { uid: 2, base: 'bo-can', rarity: 'linh', lvl: 20, plus: 3, lines: [line('atk', 4, 6188429)], sockets: gems('hong-ngoc') },
    { uid: 3, base: 'bo-y', rarity: 'dia', lvl: 20, plus: 9, lines: full('crit_dmg'), sockets: gems('lam-ngoc') },
    { uid: 4, base: 'bo-hai', rarity: 'pham', lvl: 18, plus: 0, lines: [line('speed', 2), line('qi_gain', 3)], sockets: gems('lam-ngoc') },
    { uid: 5, base: 'ngoc-boi-tho', rarity: 'huyen', lvl: 19, plus: 5, lines: full('hp_pct'), sockets: gems('hoang-ngoc') },
    { uid: 6, base: 'thiet-gioi', rarity: 'linh', lvl: 21, plus: 12, lines: [line('crit', 5, 40), line('crit', 6, 40), line('crit', 6, 40)], sockets: gems('luc-ngoc') },
  ],
  pet: 'moc-linh', pets: { 'moc-linh': { lv: 30, star: 2, evo: true, lines: [line('hp_pct', 3)] } },
  mount: 'bach-loc', mountLine: { 'bach-loc': { s: 'atk_pct', v: 6, t: 2 } },
  companion: 'a', companion2: 'b', comps: { a: { lv: 5, lines: [] }, b: { lv: 50, star: 9, lines: [] } },
};
const lo = loadout(save, data);
assert.equal(lo.length, 10, 'đủ 6 trang bị, linh thú, 2 khôi lỗi, thú cưỡi');
for (const p of lo) assert.ok(p.ir <= (save.realm * 9 + save.layer - 1) / 9 + 1e-9, `${p.kind}: cảnh giới món không vượt người mặc`);
for (const p of lo) assert.ok(p.plus <= H.plus_cap[save.realm], `${p.kind}: cấp kẹp trần +${H.plus_cap[save.realm]}`);
assert.equal(keptLines(H, save.bag[0].lines, 6).length, H.lines_all ? Math.min(10, H.lines_max ?? 10) : linesOf(H, 6), 'giữ hên xui (16/11 16:20): mọi dòng đều tính, tối đa lines_max');
const st = playerStatsHC(save, data, { speedMul: 1.1, qiMul: 1 });
const std = stdPlayer(H, (save.realm * 9 + save.layer - 1) / 9);
assert.ok(st.atk < std.atk * 2.2 && st.maxHp < std.hp * 2.2, `bộ đồ cực hạn + dòng hack vẫn trong khoảng: công ${st.atk} / chuẩn ${std.atk}, máu ${st.maxHp} / ${std.hp}`);
assert.ok(st.crit <= (H.base.crit + H.cap.crit + H.gem_cap.crit) / 100 + 1e-9 && st.critMult <= (H.base.crit_mult + H.cap.crit_dmg) / 100 + 1e-9, 'bạo kích, ST bạo chạm trần');
assert.equal(st.speedMul, 1.1, 'giữ tốc chạy của luật cũ');
const pw = powerOf(H, st.hc, save.realm) / powerOf(H, std, save.realm);
assert.ok(pw > 0.6 && pw < 2, `bộ đồ cực hạn (dồn lệch) so với chuẩn: × ${pw.toFixed(2)}`);
const noGem = { ...save, bag: save.bag.map(it => ({ ...it, sockets: [] })) };
const gk = powerOf(H, playerStatsHC(save, data).hc, 2) / powerOf(H, playerStatsHC(noGem, data).hc, 2);
assert.ok(gk > 1.05 && gk < 1.3, `18 viên ngọc cấp 20 thêm × ${gk.toFixed(2)} (trần ngọc)`);

// 4. Nhịp đánh từng loài quái trong bảng: người chuẩn của tầng quái đánh một mình
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function fight(A, B, T = 240) {   // như Thí Luyện Đài: Công² / (Công + Thủ), bạo, hút, phản; quá giờ hòa
  const a = { ...A, cur: A.hp, next: 1 / A.spd, n: 0 }, b = { ...B, cur: B.hp, next: 1 / B.spd * (0.85 + rnd() * 0.3), n: 0 };
  for (;;) {
    const x = a.next <= b.next ? a : b, y = x === a ? b : a, t = x.next;
    if (t > T) return { w: 0, n: a.n, aHp: a.cur / a.hp };
    let d = x.atk * takeK(x.atk, y.def);
    if (rnd() < x.crit / 100) d *= (H.base.crit_mult + x.cd) / 100;
    y.cur -= d; x.n++;
    if (x.ls) x.cur = Math.min(x.hp, x.cur + d * x.ls / 100);
    if (y.thorns) x.cur -= d * y.thorns / 100;
    x.next += 1 / x.spd;
    if (a.cur <= 0 || b.cur <= 0) return { w: b.cur <= 0 && a.cur > 0 ? 1 : -1, n: a.n, aHp: Math.max(0, a.cur) / a.hp };
  }
}
const GOAL = {   // [số đòn ít nhất, nhiều nhất, thắng ít nhất, máu còn ít nhất, nhiều nhất]
  thuong: [3, 12, 0.99, 0.75, 1], tinh_anh: [9, 36, 0.95, 0.25, 0.75], thu_linh: [25, 85, 0.6, 0, 0.6], boss_dao: [60, 160, 0.8, 0, 0.45],   // đầu game (tầng 0–2) cân theo người vừa vào: ít đòn hơn
};
for (const [id, [tang, role]] of Object.entries(H.mobs)) {
  assert.ok(data.mobs[id], `quái ${id} có trong data/mobs.json`);
  const m = mobFor(H, id, data.mobs[id]), A = stdPlayer(H, tang / 9);
  assert.equal(m.role, role);
  let w = 0, n = 0, h = 0; const N = role === 'boss' ? 40 : 160;
  for (let i = 0; i < N; i++) { const f = fight(A, m); n += f.n; if (f.w > 0) { w++; h += f.aHp; } }
  n /= N; h = w ? h / w : 0; w /= N;
  if (role === 'boss') { assert.equal(w, 0, `${id}: boss nhóm không đánh một mình được`); continue; }
  const [n0, n1, w0, h0, h1] = GOAL[role];
  assert.ok(n >= n0 && n <= n1 && w >= w0 && h >= h0 && h <= h1, `${id} (tầng ${tang}, ${role}): ${n.toFixed(0)} đòn, thắng ${(w * 100).toFixed(0)}%, còn ${(h * 100).toFixed(0)}%`);
}
assert.equal(mobFor(H, 'moc-nhan', data.mobs['moc-nhan']), null, 'Mộc Nhân không đổi');

console.log('he-chien: đạt', LC.map(v => v.toLocaleString('vi-VN')).join(' · '));
