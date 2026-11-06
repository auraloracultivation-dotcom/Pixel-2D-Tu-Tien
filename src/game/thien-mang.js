// Boss thế giới Cửu Đầu Thôn Thiên Mãng (data/thien-mang.json; chủ dự án 06/11/2026). Vô hạn máu, thanh máu luôn 99%,
// bảng xếp hạng sát thương cả máy chủ ở bên phải màn hình (src/ui/mang-panel.js); chém thì được Linh Thạch (cloud/src/mang.js
// tính theo giây chém thật, Hòm thư 5 phút một lần).
// 15:03: boss ra vùng không gian riêng (data/maps/thon-thien-mang.json, cấu hình arena): ngự kiếm bay quanh một con rắn to bằng cả
// hành tinh (src/render/draw-mang-arena.js vẽ cả con), chín đầu đặt tại chỗ chín miệng trên hình là chín chỗ đánh — mỗi đầu là một
// quái tàng hình đứng yên, không đánh, không chết, không rơi đồ, không linh khí. Các đầu ở mép 9 tinh cầu bỏ.
// Đòn trúng đầu (combat.js hitMob) cộng vào pend; cứ report_s giây gửi tổng qua máy chủ phòng Cloudflare (net/online-cf.js bossDmg →
// cloud/src/phong.js kẹp theo lực chiến → cloud/src/mang.js cộng dồn). Đứng gần mà không đánh thì poll_s giây hỏi bảng một lần.
import { spawnMob } from './mobs.js';

const C = game => game.data['thien-mang'];
const A = game => C(game)?.arena;
export const isArena = game => !!A(game) && game.map?.id === A(game).map;
export const mangOn = game => C(game)?.on !== false;

// Vị trí boss trong vùng: { x, y (chân hình), w, h } theo đơn vị bản đồ
export function arenaBox(game) {
  const a = A(game), spr = game.data.art?.sprites?.['boss.mang'], T = game.map.T;
  const h = a.h, w = spr ? h * spr.w / spr.h : h * 1.3;
  return { x: game.map.w * T * a.x, y: game.map.h * T * a.y, w, h };
}
// Toạ độ chín đầu (chỗ chín miệng trên hình, data/thien-mang.json → sky.mouths)
export function arenaHeads(game) {
  const b = arenaBox(game);
  return (C(game).sky?.mouths || []).map(([mx, my], i) => ({ i, x: b.x + (mx - 0.5) * b.w, y: b.y - (1 - my) * b.h }));
}

// game.js loadMap: vào vùng lúc boss đang ngủ (vd. tải lại trang sau giờ boss) thì đưa về tinh cầu cũ
export function arenaGuard(game, id) {
  const a = A(game);
  return !a || id !== a.map || mangOn(game) ? id : backOf(game);
}
const backOf = game => { const a = A(game), b = game.save?.mangBack; return b && game.data.maps[b] && b !== a.map ? b : a.back; };

// Gọi lúc dựng bản đồ (game.js loadMap)
export function spawnMang(game) {
  const c = C(game);
  game.mang = { ...(game.mang || {}), m: null, heads: [], pend: 0, rep: 0, poll: c?.poll_s || 0, seen: false };
  if (!c || !mangOn(game) || !isArena(game) || !game.data.mobs[c.mob]) return;
  const a = A(game);
  for (const h of arenaHeads(game)) {
    const info = a.heads?.[h.i] || {};
    const m = spawnMob(game, c.mob, h.x, h.y, { wboss: { el: info.el, n: info.n, name: info.name, arena: true }, aggro: false, noQi: true });
    m.r = a.head_r || m.r;
    game.mang.heads.push(m);
  }
  game.mang.m = game.mang.heads[0] || null;
}

// combat.js → hitMob (máu đã trả đầy ở đó)
export function mangHit(game, m, dmg) { if (game.mang?.heads?.includes(m)) game.mang.pend += dmg; }

// mobs.js → updateMobs: đứng yên, không đánh
export function tickMang(game, m) { m.kx = m.ky = 0; m.x = m.hx; m.y = m.hy; m.hp = m.maxHp; m.state = 'idle'; m.aggro = false; }

// Đầu gần người chơi nhất (bảng boss, Tự đánh)
export function nearestHead(game) {
  const p = game.player; let best = null, bd = Infinity;
  for (const m of game.mang?.heads || []) { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < bd) { bd = d; best = m; } }
  return best ? { m: best, d: bd } : null;
}

export function updateMang(game, dt) {
  const s = game.mang, c = C(game);
  if (!s?.heads?.length || !game.player) return;
  const nh = nearestHead(game), near = !!nh && nh.d < (A(game).near || c.near || 22) * game.map.T;
  s.m = nh?.m || s.m;   // bảng boss, Tự đánh nhắm đầu gần nhất
  if (!s.seen) { s.seen = true; game.toast(c.text.arena_intro, 3.5); }
  if (!game.online?.bossDmg) return;
  s.rep += dt; s.poll += dt;
  if (s.pend > 0 && s.rep >= c.report_s) { game.online.bossDmg(Math.round(s.pend)); s.pend = 0; s.rep = 0; s.poll = 0; }
  else if (near && s.poll >= c.poll_s) { game.online.bossDmg(0); s.poll = 0; }
}

// Bảng xếp hạng về từ máy chủ: { top: [[tên, sát thương]], n, total, me: [hạng, tổng] | null }
export function onMangBoard(game, bx) { (game.mang ??= {}).board = bx; game.mang.boardAt = Date.now(); }

// Bay tới vùng (nút trên tinh đồ) và rời vùng (nút Rời đi)
export function goArena(game) {
  const a = A(game), c = C(game);
  if (!a || game.traveling || game.trip) return;
  if (!mangOn(game)) { game.toast(c.text.closed, 2.5); return; }
  if (game.duel || game.trib?.active) return;
  if (!isArena(game)) game.save.mangBack = game.map.id;
  game.travel(a.map, 'vao', true, { text: c.text.fly_to });
}
export function leaveArena(game) {
  const a = A(game), c = C(game);
  if (!a || !isArena(game) || game.traveling || game.trip) return;
  const back = backOf(game);
  game.travel(back, 'vao', true, { text: c.text.fly_back.replace('{name}', game.data.maps[back].name) });
}
