// Kiểu chiêu 'kiemvu' — Vạn Kiếm Quy Tông (chủ dự án 10/11/2026 12:35, ba tấm kiếm GPT; hình tools/art/vfx_kiem.py, vẽ render/draw-kiem-vu.js).
//   0 → s.summon (2,5 giây): kiếm bay từ bốn phía về, xoay vòng trên đầu người chơi (đi lại tự do, vòng kiếm bám theo);
//   s.summon → s.release (0,3 giây): kiếm khí cuộn quanh từng thanh, vòng xoay nhanh dần;
//   s.release → + s.fall (1,5 giây): từng thanh rời vòng, vọt tới trên điểm rơi rồi đâm thẳng xuống đất trong vùng s.area quanh nơi ngắm
//   (vuốt nút: theo hướng vuốt; chạm: quái gần nhất trong s.range, không có thì phía trước s.offset);
//   cắm đất s.stick giây (0,3) rồi tan. Mỗi thanh trúng quái trong s.hit_r: s.mult × đánh thường (4 lần). Nửa số kiếm nhắm quái trong vùng,
//   nửa rơi ngẫu nhiên quanh tâm, nên có chỗ trúng 3–4 thanh. Số ở data/skills.json → van-kiem; cặp hình ở data/kiem-vu.json.
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

function aim(game, c) {
  const p = game.player, s = c.s;
  if (c.hand) { const L = Math.hypot(c.hand.x, c.hand.y) || 1; return { x: p.x + c.hand.x / L * s.offset, y: p.y + c.hand.y / L * s.offset }; }
  let best = null, bd = 1e9;
  for (const m of game.mobs) if (!m.dead && dist(p, m) < bd) { bd = dist(p, m); best = m; }
  return best && bd < s.range ? { x: best.x, y: best.y } : { x: p.x + p.face.x * s.offset, y: p.y + p.face.y * s.offset };
}

// Điểm rơi: nửa số kiếm nhắm quái trong vùng (một con nhận tối đa 4 thanh), còn lại rơi quanh tâm
function landings(game, c, C) {
  const s = c.s, inA = game.mobs.filter(m => !m.dead && Math.hypot(m.x - C.x, m.y - C.y) < s.area + m.r), got = new Map();
  c.swords.forEach((w, i) => {
    const m = inA.length && i % 2 === 0 ? inA[(i / 2) % inA.length] : null;
    if (m && (got.get(m) || 0) < 4) { got.set(m, (got.get(m) || 0) + 1); w.lx = m.x + (Math.random() - 0.5) * 8; w.ly = m.y + (Math.random() - 0.5) * 5; return; }
    const r = s.area * Math.sqrt(Math.random()) * 0.9, a = Math.random() * TAU;
    w.lx = C.x + Math.cos(a) * r; w.ly = C.y + Math.sin(a) * r * 0.6;
  });
}

export function updateKiemVu(game, dt) {
  const L = game.kiemVu;
  if (!L?.length) return;
  const p = game.player;
  for (const c of L) {
    const s = c.s, t0 = c.t; c.t += dt;
    if (t0 < s.release && c.t >= s.release) { c.C = aim(game, c); landings(game, c, c.C); pvpTryHit(game); }
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
