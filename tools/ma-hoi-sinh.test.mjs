// Bài thử chỗ hồi sinh của ma (src/game/ma-hoi-sinh.js, src/game/ghost.js maHoiSinh; data/pvp.json → ma.hoi_sinh; docs/16-HOA-MA.md):
// node tools/ma-hoi-sinh.test.mjs (tools/check.mjs cũng gọi). Giữ đúng lời chủ dự án 22/11/2026 03:2x: "Chỗ ngẫu nhiên xa làng" (mỗi lần một chỗ
// khác trên tinh cầu đó, không ai canh được) và "ma phải hồi sinh ở chỗ của ma" (đang là ma mà gục thì không hỏi Về động phủ).
// Mốc làng, vùng đi tới được, khoảng cách tính lại ở đây theo cách riêng, không mượn hàm của game, để sửa hỏng hàm game là bị bắt.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildMap } from '../src/world/map.js';
import { choMa } from '../src/game/ma-hoi-sinh.js';
import { maHoiSinh, startGhost } from '../src/game/ghost.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const data = { tiles: read('tiles.json'), 'le-hoi': read('le-hoi.json'), art: read('art.json'), pvp: read('pvp.json'), config: read('config.json'), home: read('home.json') };
const T = data.config.tile, H = data.pvp.ma.hoi_sinh, Z = data.pvp.server.safe, R = 6;
let seed = 20261122; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

assert.ok(H && H.xa > 0 && H.ti_le > 0 && H.ti_le < 1 && H.quai >= 0 && H.it > 0, 'data/pvp.json → ma.hoi_sinh thiếu số');
assert.ok(data.pvp.text.ma_hoi_sinh, 'thiếu chữ báo ma_hoi_sinh');

const tinhCau = readdirSync(new URL('../data/maps/', import.meta.url)).map(f => read('maps/' + f)).filter(d => d.planet && d.world && !d.indoor);
assert.ok(tinhCau.length >= 10, `chỉ thấy ${tinhCau.length} tinh cầu`);
for (const def of tinhCau) {
  const map = buildMap(def, data.tiles, T, data), W = map.w;
  // mốc làng: điểm vào và mọi điểm tới, mốc tên, cổng, NPC, vòng pháp trận an toàn
  const moc = [...Object.values(def.spawns || {}), ...Object.values(def.moc || {}), ...(def.portals || []).map(p => p.at), ...(def.npcs || []).map(n => n.at)]
    .filter(v => Array.isArray(v));
  const vong = Z.map === def.id ? [Z.x / T - 0.5, Z.y / T - 0.5] : null;
  if (vong) moc.push(vong);
  const gan = (x, y) => Math.min(...moc.map(m => Math.hypot(x - m[0], y - m[1])));
  // ô đi tới được từ điểm vào (loang tám hướng rồi lọc bốn hướng: viết khác hàm game)
  const vao = def.spawns.vao, toi = new Set(), hang = [[vao[0], vao[1]]];
  assert.ok(!map.solidTile(vao[0], vao[1]), `${def.id}: điểm vào nằm trên ô chắn`);
  toi.add(vao[1] * W + vao[0]);
  while (hang.length) {
    const [x, y] = hang.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= map.h || toi.has(k) || map.solidTile(nx, ny)) continue;
      toi.add(k); hang.push([nx, ny]);
    }
  }
  let max = 0;
  for (const k of toi) max = Math.max(max, gan(k % W, Math.floor(k / W)));
  const can = Math.min(H.xa, H.ti_le * max);
  const quai = (def.spawners || []).map(s => ({ at: s.at, spread: s.spread ?? 3 }));
  const ngoaiQuai = (x, y) => quai.every(s => Math.hypot(x - s.at[0], y - s.at[1]) >= s.spread + H.quai);
  let ungNgoai = 0;
  for (const k of toi) if (gan(k % W, Math.floor(k / W)) >= can && ngoaiQuai(k % W, Math.floor(k / W))) ungNgoai++;
  const cho = new Set(), lan = 120;
  let truoc = null, buoc = 0;
  for (let i = 0; i < lan; i++) {
    const p = choMa(map, { H, r: R, quai, them: vong ? [vong] : [], rnd });
    assert.ok(p, `${def.id}: không chọn được chỗ hồi sinh`);
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    assert.ok(!map.blocked(p.x, p.y, R), `${def.id}: hồi sinh chạm vách ở ô ${tx},${ty}`);
    assert.ok(toi.has(ty * W + tx), `${def.id}: ô ${tx},${ty} không đi tới được từ điểm vào`);
    assert.ok(gan(tx, ty) >= can - 1e-6, `${def.id}: ô ${tx},${ty} cách làng ${gan(tx, ty).toFixed(1)} ô, cần ≥ ${can.toFixed(1)}`);
    if (vong) assert.ok(Math.hypot(p.x - Z.x, p.y - Z.y) > Z.r + can * T / 2, `${def.id}: hồi sinh sát vòng pháp trận an toàn`);
    if (ungNgoai >= H.it) assert.ok(ngoaiQuai(tx, ty), `${def.id}: còn ${ungNgoai} ô ngoài bãi quái mà vẫn hồi sinh trong bãi ở ${tx},${ty}`);
    if (truoc) buoc += Math.hypot(p.x - truoc.x, p.y - truoc.y) / T;
    truoc = p; cho.add(tx + ',' + ty);
  }
  // không ai canh được: nhiều chỗ khác nhau, hai lần liên tiếp cách nhau trung bình vài ô trở lên
  assert.ok(cho.size >= 30, `${def.id}: ${lan} lần hồi sinh chỉ ở ${cho.size} chỗ`);
  assert.ok(buoc / (lan - 1) >= 5, `${def.id}: hai lần hồi sinh liền nhau cách trung bình ${(buoc / (lan - 1)).toFixed(1)} ô`);
  // tinh cầu rộng thì xa làng đủ xa
  if (W >= 90) assert.ok(can >= H.xa - 1e-6, `${def.id}: tinh cầu rộng mà chỉ cách làng ${can.toFixed(1)} ô`);
}

// ghost.js: đang là ma thì không hỏi Về động phủ và hồi sinh ở chỗ của ma; về làm người thì như cũ; trong nhà, đài so tài, độ kiếp như cũ
{
  const def = read('maps/thien-kiem-phong.json'), map = buildMap(def, data.tiles, T, data);
  const vao = map.center(def.spawns.vao[0], def.spawns.vao[1]);
  const gia = ma => ({ data, map, save: { flags: { 'dong-phu': true } }, player: { x: vao.x, y: vao.y, r: R }, pvp: { ma }, spawners: def.spawners, trib: { active: false } });
  const g = gia(3);
  startGhost(g);
  assert.equal(g.ghost.ask, false, 'đang là ma mà gục vẫn hỏi Về động phủ');
  assert.equal(g.ghost.sec, data.config.ghost.sec, 'đang là ma: bong bóng phải chờ đúng ghost.sec rồi hồi sinh');
  const n = gia(0);
  startGhost(n);
  assert.equal(n.ghost.ask, !!data.config.ghost.ask, 'người thường có động phủ gục ngoài trời phải được hỏi như cũ');
  const c = maHoiSinh(gia(3));
  assert.ok(c && Math.hypot(c.x - vao.x, c.y - vao.y) / T >= H.xa - 1e-6, 'ma gục ở Thiên Kiếm Tinh phải hồi sinh xa điểm vào');
  assert.equal(maHoiSinh(gia(0)), null, 'người thường phải hồi sinh ở điểm vào như cũ');
  assert.equal(maHoiSinh({ ...gia(3), duel: {} }), null, 'đài so tài phải như cũ');
  assert.equal(maHoiSinh({ ...gia(3), trib: { active: true } }), null, 'độ kiếp phải như cũ');
  const nha = read('maps/dong-phu.json'), mNha = buildMap(nha, data.tiles, T, data);
  assert.equal(maHoiSinh({ ...gia(3), map: mNha }), null, 'động phủ phải như cũ');
  for (const [k, v] of [['indoor', true], ['tower', true], ['rooms', [{}]], ['world', false], ['planet', null]]) {
    assert.equal(maHoiSinh({ ...gia(3), map: buildMap({ ...def, [k]: v }, data.tiles, T, data) }), null, `bản đồ có ${k} = ${JSON.stringify(v)} phải như cũ`);
  }
  assert.equal(maHoiSinh({ ...gia(3), dungeon: {} }), null, 'bí cảnh phải như cũ');
}
console.log(`✅ Chỗ hồi sinh của ma: ${tinhCau.length} tinh cầu đạt`);
