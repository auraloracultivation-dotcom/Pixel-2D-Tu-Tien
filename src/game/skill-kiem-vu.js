// Kiểu chiêu 'kiemvu' — Vạn Kiếm Thiên Lâm (chủ dự án 10/11/2026 12:35, ba tấm kiếm GPT; hình tools/art/vfx_kiem.py, vẽ render/draw-kiem-vu.js;
// 13:42: gấp đôi kiếm, đâm tới mọi quái trong màn hình, vòng kiếm cao hơn đầu).
//   0 → s.summon (2,5 giây): kiếm bay từ bốn phía về, xoay vòng trên đầu người chơi (đi lại tự do, vòng kiếm bám theo);
//   s.summon → s.release (0,3 giây): kiếm khí cuộn quanh từng thanh, vòng xoay nhanh dần;
//   s.release → + s.fall (1,5 giây): từng thanh rời vòng, vọt tới trên điểm rơi rồi đâm thẳng xuống đất: mọi quái trong khung màn hình
//   (gần trước, mỗi con tối đa s.per_mob thanh), thanh thừa rơi quanh trong s.area; không có quái thì phía trước s.offset (vuốt: theo hướng vuốt);
//   cắm đất s.stick giây (0,3) rồi tan. Mỗi thanh trúng quái trong s.hit_r: s.mult × đánh thường (4 lần).
//   Số ở data/skills.json → van-kiem-thien; cặp hình ở data/kiem-vu.json.
import { hitMob, dist, impactShake, addFx } from './combat.js';
import { pvpTryHit } from './pvp.js';

const TAU = Math.PI * 2;
const ease = k => k * k * (3 - 2 * k);

export function castKiemVu(game, s, dmg) {
  const p = game.player, pairs = game.data['kiem-vu']?.pairs || [[0, 0]], swords = [];
  for (let i = 0; i < s.count; i++) {
    const k = Math.floor(Math.random() * pairs.length), a = Math.random() * TAU, R = s.from_r * (0.8 + Math.random() * 0.6);
    swords.push({ k, khi: pairs[k]?.[0] ?? 0, dam: pairs[k]?.[1] ?? 0, ox: Math.cos(a) * R, oy: Math.sin(a) * R * 0.75 - 30,   // bay về từ bốn phía
      arrive: s.summon * (0.15 + 0.5 * Math.random()), slot: i / s.count * TAU, go: s.release + (i / s.count) * (s.fall - s.drop - s.leave) });
  }
  swords.sort((a, b) => a.go - b.go);
  (game.kiemVu ||= []).push({ s, dmg, t: 0, swords, hand: p.castAim, sx: p.x, sy: p.y });
}

// Vị trí ô trên vòng xoay (quanh đầu người chơi): vòng dẹt, xoay nhanh dần khi tụ kiếm khí
export function orbitPos(c, w, p) {
  const s = c.s, spin = s.spin * c.t + (c.t > s.summon ? (c.t - s.summon) ** 2 * 6 : 0), a = w.slot + spin;
  return { x: p.x + Math.cos(a) * s.orbit, y: p.y - s.lift + Math.sin(a) * s.orbit * 0.32, a };
}

// Quái trong khung màn hình (không biết khung nhìn thì trong vòng 220 đơn vị), gần người chơi trước
function inView(game) {
  const p = game.player, v = game.screen?.viewRect?.();
  return game.mobs.filter(m => !m.dead && (v ? m.x > v.x0 && m.x < v.x1 && m.y > v.y0 && m.y < v.y1 : dist(p, m) < 220)).sort((a, b) => dist(p, a) - dist(p, b));
}

// Điểm rơi: chia đều kiếm cho quái trong màn (vòng lượt: con gần trước, mỗi con tối đa s.per_mob thanh), thanh thừa rơi quanh quái
// trong s.area; không có quái thì rơi quanh phía trước (vuốt nút: theo hướng vuốt)
function landings(game, c) {
  const s = c.s, p = game.player, mobs = inView(game), got = new Map(), cap = s.per_mob || 4;
  let C;
  if (c.hand) { const L = Math.hypot(c.hand.x, c.hand.y) || 1; C = { x: p.x + c.hand.x / L * s.offset, y: p.y + c.hand.y / L * s.offset }; }
  else C = mobs[0] ? { x: mobs[0].x, y: mobs[0].y } : { x: p.x + p.face.x * s.offset, y: p.y + p.face.y * s.offset };
  let k = 0;
  for (const w of c.swords) {
    let m = null;
    for (let tries = 0; tries < mobs.length && !m; tries++, k++) { const q = mobs[k % mobs.length]; if ((got.get(q) || 0) < cap) m = q; }
    if (m) { got.set(m, (got.get(m) || 0) + 1); k++; w.lx = m.x + (Math.random() - 0.5) * 8; w.ly = m.y + (Math.random() - 0.5) * 5; continue; }
    const o = mobs.length ? mobs[Math.floor(Math.random() * mobs.length)] : C, r = s.area * Math.sqrt(Math.random()), a = Math.random() * TAU;
    w.lx = o.x + Math.cos(a) * r; w.ly = o.y + Math.sin(a) * r * 0.6;
  }
  return C;
}

export function updateKiemVu(game, dt) {
  const L = game.kiemVu;
  if (!L?.length) return;
  const p = game.player;
  for (const c of L) {
    const s = c.s, t0 = c.t; c.t += dt;
    if (t0 < s.release && c.t >= s.release) { c.C = landings(game, c); pvpTryHit(game); }
    if (t0 < s.summon && c.t >= s.summon) { game.sfx?.('chime', 0.8); game.screen?.shake?.(1.2, 0.2); }   // đủ kiếm: kiếm khí bùng
    for (const w of c.swords) {
      if (c.t < w.go && !w.hx) continue;
      if (!w.hx) { const o = orbitPos(c, w, p); w.hx = o.x; w.hy = o.y; game.sfx?.('swing', 0.5); }   // rời vòng: ghi chỗ bắt đầu bay
      const land = w.go + s.leave + s.drop;
      if (!w.hit && c.t >= land) {   // cắm đất: trúng quái quanh điểm rơi
        w.hit = true;
        for (const m of game.mobs) if (!m.dead && Math.hypot(m.x - w.lx, m.y - w.ly) < s.hit_r + m.r) hitMob(game, m, c.dmg * s.mult, { color: s.color, fromX: w.lx, fromY: w.ly - 20 });
        addFx(game, { type: 'ring', x: w.lx, y: w.ly, r: s.hit_r, color: s.color, life: 0.3 });
        impactShake(game, s.hit_r * 0.6); game.sfx?.('metal_hit', 0.7);
      }
    }
  }
  game.kiemVu = L.filter(c => c.t < c.s.release + c.s.fall + c.s.stick + 0.4);
}
