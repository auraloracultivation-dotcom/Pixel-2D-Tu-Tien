// Nguyên liệu rơi ngẫu nhiên trên bản đồ (chủ dự án 17/11/2026: "thỉnh thoảng trên bản đồ sẽ rơi nguyên liệu ngẫu nhiên, không cần
// đánh quái, lâu lâu gặp thì đi nhặt"; "tâm lý chung thích đồ free nên cứ để rơi, ai lấy thì lấy").
// Không cần máy chủ mới: mọi máy cùng bản đồ tính ra cùng món, cùng chỗ, cùng lúc (hạt giống = bản đồ + khung giờ slot_s giây),
// nên ai đứng cùng bản đồ cũng thấy y nhau, chơi một mình vẫn có. Ai nhặt trước thì báo cả tuyến qua phòng Cloudflare bằng tin
// chiêu { k: 'nl-<khung>-<số>' } (cloud/src/proto.js cleanCast đã cho qua), máy khác xoá món đó (nlSeen, gọi ở src/game/others.js).
// Món đã nhặt ghi vào save.nlGot [mã, lúc] (giữ 1 giờ): đổi tuyến, tải lại không nhặt lại được; mỗi giờ nhặt tối đa cap_h món.
// Món nằm chung danh sách đồ rơi game.loot (kind 'mat', có l.nl) nên vẽ icon, cột sáng, Tự đánh đi nhặt như đồ rơi của quái;
// rời bản đồ thì món chưa nhặt KHÔNG tự vào túi (collectAll bỏ qua). Số ở data/nl-roi.json.
const N = game => game.data['nl-roi'] || {};
const HOUR = 3600e3;

function seedOf(str) {   // băm chuỗi → số 32 bit (FNV-1a)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {   // mulberry32: mọi máy ra cùng dãy số
  let a = seed;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Bản đồ này có rơi không: không rơi ở phó bản, bí cảnh, đài, trong nhà, vùng không gian, động phủ
export function nlHere(game) {
  const d = game.map?.def || {}, C = N(game);
  if (!C.on || !game.save || !game.map) return false;
  return !(d.indoor || d.space || d.arena || (d.rooms || []).length || game.dungeon || game.duel || game.sweeping || game.map.id === game.data.home?.map);
}

const got = save => (save.nlGot ||= []);
const gotIds = save => new Set(got(save).map(g => g[0]));
export const nlCapped = game => got(game.save).filter(g => Date.now() - g[1] < HOUR).length >= (N(game).cap_h || 8);

// Một món của khung s, số i: lúc rơi, lúc mất, chỗ nằm, món gì (giống hệt nhau trên mọi máy cùng bản đồ)
function plan(game, s, i) {
  const C = N(game), m = game.map, slot = (C.slot_s || 240) * 1000, r = rng(seedOf(`${m.id}|${s}|${i}`));
  const born = s * slot + Math.floor(r() * slot * 0.5), die = born + (C.life_s || 150) * 1000;
  let spot = null;
  for (let k = 0; k < 40 && !spot; k++) {   // ô đi được, không sát mép tinh cầu, không cửa khoá truyện
    const tx = Math.floor(r() * m.w), ty = Math.floor(r() * m.h), c = m.center(tx, ty);
    if (!m.edge(tx, ty) && !m.blocked(c.x, c.y, 4)) spot = c;
  }
  const pool = (C.pool || []).filter(p => game.data.cave.materials[p.id] || game.data.items.materials[p.id]);
  let w = r() * pool.reduce((a, p) => a + (p.w || 1), 0), pick = pool[0];
  for (const p of pool) { w -= p.w || 1; if (w <= 0) { pick = p; break; } }
  const n = pick ? pick.n[0] + Math.floor(r() * (pick.n[1] - pick.n[0] + 1)) : 0;
  return spot && pick && n > 0 ? { key: `nl-${s}-${i}`, born, die, x: spot.x, y: spot.y, id: pick.id, n } : null;
}

// Mỗi khung (src/game/loot.js updateLoot): thêm món tới giờ rơi, bỏ món hết giờ / đã có người nhặt
export function nlTick(game, dt) {
  game.nlAcc = (game.nlAcc || 0) + dt;
  if (game.nlAcc < 1) return;
  game.nlAcc = 0;
  const now = Date.now(), gone = game.nlGone || new Set();
  game.loot = game.loot.filter(l => !l.nl || (l.die > now && !gone.has(l.nl) && l.map === game.map?.id));
  if (!nlHere(game)) return;
  const C = N(game), slot = (C.slot_s || 240) * 1000, s0 = Math.floor(now / slot), mine = gotIds(game.save);
  const have = new Set(game.loot.filter(l => l.nl).map(l => l.nl));
  for (let s = s0 - 1; s <= s0; s++) for (let i = 0; i < (C.per_slot || 2); i++) {
    const q = plan(game, s, i);
    if (!q || now < q.born || now >= q.die || have.has(q.key) || mine.has(q.key) || gone.has(q.key)) continue;
    game.loot.push({ kind: 'mat', payload: { id: q.id, n: q.n }, nl: q.key, map: game.map.id, die: q.die, x: q.x, y: q.y, t: 1, down: true });
  }
  const keep = got(game.save).filter(g => now - g[1] < HOUR);   // sổ nhặt chỉ giữ 1 giờ
  if (keep.length !== game.save.nlGot.length) game.save.nlGot = keep;
}

// Nhặt được không (đủ cap_h món trong giờ thì thôi, báo mỗi 10 giây một lần)
export function nlOk(game) {
  if (!nlCapped(game)) return true;
  const now = performance.now();
  if (!game.nlCapT || now - game.nlCapT > 10000) { game.nlCapT = now; game.toast(N(game).text?.cap || 'Đã nhặt đủ.', 2); }
  return false;
}

// Đã nhặt (loot.js take): ghi sổ, báo người cùng tuyến xoá món này
export function nlTaken(game, l) {
  got(game.save).push([l.nl, Date.now()]);
  (game.nlGone ||= new Set()).add(l.nl);
  game.online?.cast?.({ k: l.nl, x: Math.round(l.x), y: Math.round(l.y), fx: 0, fy: 0 });
}

// Tin chiêu từ người khác (src/game/others.js): là tin nhặt đồ rơi thì xoá món đó, trả true
export function nlSeen(game, c) {
  if (typeof c?.k !== 'string' || !/^nl-\d+-\d+$/.test(c.k)) return false;
  (game.nlGone ||= new Set()).add(c.k);
  if (game.nlGone.size > 200) game.nlGone = new Set([...game.nlGone].slice(-100));
  game.loot = game.loot.filter(l => l.nl !== c.k);
  return true;
}
