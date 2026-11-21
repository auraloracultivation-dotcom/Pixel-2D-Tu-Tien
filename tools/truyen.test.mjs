// Bài thử chuỗi nhiệm vụ chính của truyện Trấn Ma Kỷ (data/story.json, data/tran-ma-ky.json; docs/14-TRAN-MA-KY.md): node tools/truyen.test.mjs
// (tools/check.mjs cũng gọi). Chỉ soát dữ liệu trỏ đúng thứ có thật trong game, để một nhiệm vụ viết sai không làm người chơi kẹt giữa đường:
// người nói, người cần gặp có trên đúng bản đồ; ô đích, ô rải vật nhặt nằm trong bản đồ và đi được; quái, vật nhặt, tiếng, hiệu ứng có thật;
// nhiệm vụ nào cũng có tên; dấu truyện có bước đặt cờ; khẩu quyết đủ cho từng loại pháp bảo; câu có điều kiện (neu) đi theo cặp có / chưa có cờ
// để người chơi cũ (chưa thấy cảnh mở đầu) không bị hẫng một câu; việc tay (until.nut) phải có ô đích; câu hỏi (hoi) đủ lựa chọn và lời đáp.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CANH_FX } from '../src/game/dan-canh.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const S = read('story'), T = read('tran-ma-ky'), npcs = read('npcs'), mobs = read('mobs'), items = read('items'), realms = read('realms'), PB = read('phap-bao'), tiles = read('tiles').types, cfg = read('config');
const KN = read('ky-nang'), skills = read('skills'), elements = read('elements');
const sounds = read('sounds').sfx, maps = Object.fromEntries(cfg.maps.map(id => [id, read('maps/' + id)]));
const both = v => String(v).match(/^\{([^|{}]*)\|([^|{}]*)\}$/)?.slice(1) || [v];   // chữ theo giới {nam|nữ}: soát cả hai vế
const mob = id => (mobs.list || mobs)[id];
const di = (m, x, y) => { const c = maps[m].grid[Math.floor(y)]?.[Math.floor(x)]; return c != null && !tiles[c]?.solid && !tiles[c]?.void; };

const steps = S.steps, ids = steps.map(s => s.id), md = ids.indexOf(S.mo_dau);
assert.equal(new Set(ids).size, ids.length, 'mã bước trùng nhau');
assert.ok(md >= 0, `mo_dau "${S.mo_dau}" không phải mã bước nào`);
assert.ok(steps.slice(0, md + 1).some(s => (s.do || []).some(a => a.flag === S.mo_dau_co)), `mo_dau_co "${S.mo_dau_co}": phần mở đầu không có bước nào đặt cờ này`);
assert.ok(steps.at(-1).until.never, 'bước cuối phải chờ mãi (until.never): hết nhiệm vụ đã viết thì thẻ nhiệm vụ ẩn đi');
assert.ok(S.nv_text?.chip?.includes('{so}'), 'nv_text.chip thiếu chỗ {so}');

const co = new Set(), coTat = new Set(), neu = new Set();   // cờ các bước đặt · cờ bị tắt (unflag) · cờ đứng trong điều kiện neu
function soat(u, at, noiMap) {
  const map = u.target_map || u.map || noiMap, tu = new Set();   // tu: cờ chính bước này bật
  for (const a of u.do || []) {
    if (a.neu) for (const f of both(a.neu.replace(/^!/, ''))) { neu.add(f); assert.ok(!tu.has(f), `${at}: điều kiện neu đặt vào cờ "${f}" do chính bước này bật (mở lại game giữa bước sẽ lệch câu)`); }
    if (a.ky_nang) assert.ok(KN.hoc[a.ky_nang], `${at}: lệnh ky_nang "${a.ky_nang}" không có trong data/ky-nang.json → hoc`);
    if (a.le_toc) assert.ok(a.le_toc === 'he-thong' || npcs[a.le_toc], `${at}: lệnh le_toc cần người đứng lễ có thật ("${a.le_toc}")`);
    if (a.hoi) {
      assert.ok(a.hoi.q && npcs[a.hoi.ai] && a.hoi.opts?.length >= 2 && a.hoi.im, `${at}: câu hỏi thiếu q, người hỏi (ai), lời đáp khi im lặng (im) hoặc dưới hai lựa chọn`);
      for (const o of a.hoi.opts) { assert.ok(o.label && o.reply && o.flag, `${at}: lựa chọn "${o.label}" thiếu label / reply / flag`); co.add(o.flag); }
    }
    if (a.unflag) coTat.add(a.unflag);
    if (a.say) for (const [who, text] of a.say) {
      for (const w of both(who)) assert.ok(!w || w === 'he-thong' || npcs[w], `${at}: người nói "${w}" không có trong npcs.json`);
      assert.ok(typeof text === 'string' && text.length > 0 && text.length <= 200, `${at}: câu trống hoặc dài quá 200 chữ (${text?.length})`);
    }
    if (a.canh) {
      for (const k of Object.keys(a.canh)) assert.ok(['toi', 'rung', 'chop', 'tieng', 'fx', 'mau', 'tai', 'cho'].includes(k), `${at}: dàn cảnh có khoá lạ "${k}"`);
      if (a.canh.tieng) assert.ok(sounds[[].concat(a.canh.tieng)[0]], `${at}: tiếng "${a.canh.tieng}" không có trong sounds.json`);
      if (a.canh.fx) assert.ok(CANH_FX.includes(a.canh.fx), `${at}: hiệu ứng "${a.canh.fx}" không có trong src/game/dan-canh.js`);
      if (a.canh.cho != null) assert.ok(a.canh.cho > 0 && a.canh.cho <= 2, `${at}: nhịp lặng ${a.canh.cho} giây ngoài khoảng 0–2`);
      if (a.canh.tai) assert.ok(map && maps[map]?.grid[Math.floor(a.canh.tai[1])]?.[Math.floor(a.canh.tai[0])] != null, `${at}: chỗ đặt hiệu ứng ${a.canh.tai} nằm ngoài bản đồ ${map}`);
    }
    if (a.chu) {
      assert.ok([].concat(a.chu.cau || []).length && [].concat(a.chu.cau).every(s => s.length <= 27), `${at}: hàng chữ lớn thiếu câu, hoặc một dòng dài quá 27 chữ (màn 390 không đủ chỗ, câu bị ngắt giữa chừng)`);
      if (a.chu.ky) assert.ok(T.chu?.ky, `${at}: dòng chép sổ (ky) mà data/tran-ma-ky.json → chu.ky chưa có nhãn`);
    }
    if (a.pickups) {
      assert.ok(items.quest_items[a.pickups], `${at}: vật nhặt "${a.pickups}" không có trong items.json → quest_items`);
      assert.ok(a.near || a.at?.length, `${at}: vật nhặt thiếu chỗ rải (at hoặc near)`);
      for (const [x, y] of a.at || []) assert.ok(map && di(map, x, y), `${at}: ô rải vật nhặt ${x},${y} không đi được trên ${map}`);
    }
    if (a.flag) for (const f of both(a.flag)) { co.add(f); tu.add(f); }
  }
  const un = u.until || {};
  if (un.talk) for (const w of both(un.talk)) { assert.ok(npcs[w], `${at}: người cần gặp "${w}" không có`); if (u.target_map) assert.ok(maps[u.target_map].npcs.some(n => n.id === w), `${at}: "${w}" không đứng ở ${u.target_map}`); }
  if (un.kill && un.kill !== '*') assert.ok(mob(un.kill), `${at}: quái "${un.kill}" không có`);
  for (const m of [un.map, un.in, u.target_map].filter(Boolean)) assert.ok(maps[m], `${at}: bản đồ "${m}" không có`);
  if (un.kill && un.in && mob(un.kill)?.ai === 'boss') assert.ok(JSON.stringify(maps[un.in]).includes(`"${un.kill}"`), `${at}: trùm "${un.kill}" không nằm ở bản đồ "${un.in}"`);
  if (un.collect) assert.ok((u.do || []).some(a => a.pickups === un.collect), `${at}: chờ nhặt "${un.collect}" mà bước không rải món ấy`);
  if (un.reach && map) { const r = Math.max(1, Math.floor(un.r || 1)), [x, y] = un.reach; let ok = false; for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) ok ||= di(map, x + a, y + b);   // ô đích có thể là chính vật cần tới (đá linh căn): chỉ cần quanh đó có ô đi được
    assert.ok(ok, `${at}: quanh ô đích ${un.reach} không có ô nào đi được trên ${map}`); }
  if (un.nut) assert.ok(un.reach && u.target && u.target_map, `${at}: việc tay "${un.nut}" phải có ô tới (until.reach), ô chỉ đường (target) và target_map`);
  if (un.realm != null) assert.ok(un.realm > 0 && un.realm < realms.names.length, `${at}: cảnh giới ${un.realm} không có`);
  if (u.goal) assert.ok(u.ten, `${at}: nhiệm vụ có việc (goal) mà chưa có tên (ten) cho thẻ nhiệm vụ`);
}
let n = 0, noi = null;
steps.forEach((s, i) => {
  for (const u of S.bac?.truoc?.[s.id] || []) { soat(u, `bậc ${u.id}`, noi); if (u.goal) n++; }
  if (i > md) { assert.ok(s.once, `bước ${s.id}: nhiệm vụ sau phần mở đầu phải có once (mở lại game không diễn lại cảnh)`); assert.ok(!s.map, `bước ${s.id}: sau phần mở đầu dùng target_map, không dùng map (map tự kéo người chơi sang bản đồ đó)`); }
  soat(s, `bước ${s.id}`, noi);
  if (s.goal) n++;
  noi = s.until?.map || s.target_map || s.map || noi;   // bản đồ người chơi đang đứng sau bước này (để soát ô của bước kế không ghi target_map)
});
for (const d of S.dau || []) {
  assert.ok(co.has(d.co), `dấu truyện "${d.co}": không bước nào đặt cờ này`);
  assert.ok(maps[d.map] && ['nen', 'the'].includes(d.kieu) && d.at?.length === 2, `dấu truyện "${d.co}": bản đồ, kiểu hoặc chỗ đặt sai`);
}
for (const f of coTat) assert.ok(co.has(f), `cờ "${f}" bị tắt (unflag) mà không bước nào bật`);
// Điều kiện neu chỉ được dựa vào cờ mà phần mở đầu đặt (người đã thấy cảnh ấy hay chưa), và mỗi cờ phải có cả câu cho người có lẫn người chưa có
const moDau = new Set(); steps.slice(0, md + 1).forEach(s => { for (const u of [...(S.bac?.truoc?.[s.id] || []), s, { do: S.bac?.thay?.[s.id] || [] }]) for (const a of u.do || []) if (a.flag) for (const f of both(a.flag)) moDau.add(f); });
for (const f of neu) assert.ok(moDau.has(f), `điều kiện neu dùng cờ "${f}" không do phần mở đầu đặt`);
{
  const txt = JSON.stringify(steps.slice(md + 1));
  for (const cap of [S.mo_dau_co]) assert.ok(txt.includes(`"neu":"${cap}"`) === txt.includes(`"neu":"!${cap}"`), `điều kiện neu "${cap}": có bản cho người đã thấy mà thiếu bản cho người chưa thấy (hoặc ngược lại)`);
}
assert.equal(T.canh_gioi.length, realms.names.length, 'canh_gioi: mỗi cảnh giới một câu');
for (const t of Object.keys(PB.types)) assert.ok(T.kq[t]?.cau && T.kq[t].lenh && T.kq[t].han && [].concat(T.kq[t].cau).every(s => s.length <= 27), `khẩu quyết của pháp bảo "${t}" thiếu cau / lenh / han, hoặc một dòng dài quá 27 chữ`);
for (const t of Object.keys(T.kq)) assert.ok(PB.types[t], `khẩu quyết cho loại pháp bảo không có: "${t}"`);
// Kỹ năng (data/ky-nang.json): bộ kỹ năng theo truyện đủ số liệu cho bộ máy ra chiêu, mượn hiệu ứng của chiêu có thật, không trùng mã với 48 chiêu cũ; khoá học
// nào cũng được một nhiệm vụ dạy, kỹ năng theo hệ đủ năm hệ; ghép sách và khảm tính chất đúng khuôn; tiếng của màn lễ huyết mạch có trong sounds.json
{
  const daDay = new Set(S.steps.flatMap(st => (st.do || []).map(a => a.ky_nang).filter(Boolean))), cos = new Set(), C = KN.chieu, he = Object.keys(elements).filter(k => !k.startsWith('_'));
  const CAN = { projectile: ['speed', 'range', 'radius'], multi: ['speed', 'range', 'radius', 'count', 'spread'], aoe: ['radius'], dash: ['dist'] };
  for (const [id, c] of Object.entries(C)) {
    assert.ok(!skills[id], `kỹ năng ${id} trùng mã với một chiêu cũ trong data/skills.json`);
    assert.ok(c.name && c.desc && c.day && CAN[c.type] && c.cd >= 6 && c.mp > 0 && c.mult > 0 && c.mult <= 1 && /^#[0-9a-f]{6}$/i.test(c.color), `kỹ năng ${id}: thiếu tên, mô tả, người dạy, kiểu, hồi chiêu ≥ 6 giây, linh lực, sát thương ≤ 1 hoặc màu`);
    for (const f of CAN[c.type]) assert.ok(c[f] > 0, `kỹ năng ${id} (${c.type}) thiếu ${f}`);
    if (c.hinh) assert.ok(skills[c.hinh], `kỹ năng ${id} mượn hiệu ứng của chiêu ${c.hinh} không có`);
  }
  for (const [k, h] of Object.entries(KN.hoc)) {
    assert.ok(h.co && !cos.has(h.co), `ky-nang.hoc.${k}: thiếu cờ hoặc trùng cờ`); cos.add(h.co);
    if (h.he) for (const e of he) assert.ok(C[h.he[e]], `ky-nang.hoc.${k}: thiếu kỹ năng cho hệ ${e}`); else assert.ok(C[h.id], `ky-nang.hoc.${k}: kỹ năng ${h.id} không có`);
    assert.ok(daDay.has(k), `ky-nang.hoc.${k}: chưa nhiệm vụ nào dạy (lệnh ky_nang trong data/story.json)`);
  }
  assert.ok(KN.sach.ghep === 2 && KN.sach.max >= 2 && KN.sach.per > 0, 'ky-nang.sach: ghép 2 cuốn thành 1 cuốn cấp trên (chủ dự án), có cấp tối đa và thưởng mỗi cấp');
  assert.deepEqual([...KN.kham.o].sort((a, b) => a - b), KN.kham.o, 'ky-nang.kham.o: cấp mở ô phải tăng dần'); assert.ok(KN.kham.o.every(x => x <= KN.sach.max));
  for (const [m, T] of Object.entries(KN.kham.tinh)) { assert.ok(T.ten && T.mo_ta && T.at >= 0, `tính chất ${m}: thiếu tên, mô tả hoặc mốc at`); for (const h of T.hop || []) assert.ok(CAN[h], `tính chất ${m}: kiểu chiêu "${h}" bộ kỹ năng chưa dùng`); }
  const TNle = read('tiem-nang').le;
  for (const v of Object.values(TNle.sfx)) assert.ok(sounds[v], `tiem-nang.le.sfx: tiếng "${v}" không có trong sounds.json`);
}
console.log(`✅ Truyện: ${n} nhiệm vụ chính (${steps.length} bước), ${(S.dau || []).length} dấu truyện, ${Object.keys(T.kq).length} khẩu quyết`);
