// Hiệu ứng chiêu thế hệ mới (chủ dự án 05/11/2026, docs/02-CHUAN-PIXEL.md → Quy tắc cốt lõi về chiêu): công thức từng chiêu ở
// data/vfx.json, hình vfx.* từ ảnh GPT. File này chỉ tạo và cập nhật trạng thái (game.vfx: fx = hình đang diễn, parts = hạt);
// vẽ ở src/render/vfx/ (lớp trên cùng, đè nhà cửa, người). Gọi từ src/game/skills.js (người chơi), src/game/duel-cast.js (bản sao
// so tài), src/game/combat.js (đạn trúng, nổ). Chiêu không có công thức thì giữ hiệu ứng cũ (skill-fx.js).

import { hitSfx } from './skill-sfx.js';
import { updateJuice } from './juice.js';
import { updateKiemVu } from './skill-kiem-vu.js';

export const vfxOf = (game, id) => (id && game.data.vfx?.skills?.[id]) || null;
const st = game => (game.vfx ??= { fx: [], parts: [] });
const rnd = (a, b) => a + Math.random() * (b - a);

// Hạt: img = tên mảnh (vfx.<img>), size đơn vị bản đồ, g trọng lực (dương rơi xuống, âm bay lên), add: cộng sáng
function part(game, o) {
  const S = st(game), cap = (game.data.vfx?.max_parts || 260) * (+(globalThis.document?.body?.dataset.perf || 0) >= 3 ? 0.5 : 1)   // máy đã tự hạ mức (src/core/perf.js): bớt hạt;
  if (S.parts.length >= cap) S.parts.shift();
  S.parts.push({ t: 0, life: 0.6, size: 5, vx: 0, vy: 0, g: 0, rot: rnd(0, 6.28), vr: rnd(-3, 3), ...o });
}

// Tóe n hạt quanh (x, y); spd tốc độ; up: bay lên (lửa, sáng) thay vì rơi (đá, giọt)
export function spray(game, img, x, y, n, spd = 40, opts = {}) {
  if (!img || !n) return;
  const heavy = ['da', 'giot'].includes(img), up = ['lua', 'thanh-quang', 'sao-vang', 'am', 'set'].includes(img);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), v = spd * rnd(0.4, 1);
    part(game, { img, x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - (heavy ? 30 : 0),
      g: heavy ? 140 : up ? -30 : 10, life: rnd(0.35, 0.7), size: (opts.size || 6) * rnd(0.7, 1.2), add: up });
  }
}

const fx = (game, o) => st(game).fx.push({ t: 0, life: 0.6, ...o });

// Tung chiêu: who = người tung (người chơi hoặc bản sao), s = data/skills.json, info: { cx, cy } tâm chiêu vùng, { sx, sy } đầu đường lướt, zone
export function vfxCast(game, id, s, who, info = {}) {
  const V = vfxOf(game, id);
  if (!V) return false;
  const color = V.color || s.color, cx = info.cx ?? who.x, cy = info.cy ?? who.y;
  if (V.cast) fx(game, { k: 'flash', img: V.cast, x: who.x + (who.face?.x || 0) * 8, y: who.y - 10, size: V.cast_size || 26, color, life: 0.5, sk: id });
  if (V.circle && s.type !== 'zone') fx(game, { k: 'circle', img: V.circle, x: s.type === 'aoe' ? cx : who.x, y: (s.type === 'aoe' ? cy : who.y) + 1, r: Math.max(16, (s.radius || 18) * 0.9), color, life: s.type === 'dash' ? 0.6 : 0.9, sk: id });
  const big = V.size;   // cỡ khai sẵn theo bán kính chiêu (data/vfx.json), không phóng thêm cho khỏi che kín màn
  switch (V.show) {
    case 'shot': fx(game, { k: 'muzzle', x: who.x + (who.face?.x || 0) * 7, y: who.y - 5 + (who.face?.y || 0) * 7, color, r: V.glow, life: 0.22 }); break;
    case 'ground': fx(game, { k: 'ground', img: V.img || id, x: cx, y: cy, size: big, color, life: 0.7, sk: id, flat: V.flat });
      if (V.hit) fx(game, { k: 'burst', img: V.hit, x: cx, y: cy - 4, size: V.hit_size, color, life: 0.5 });
      fx(game, { k: 'ring', x: cx, y: cy, r: s.radius || 30, color, life: 0.45 });
      spray(game, V.part || V.trail, cx, cy, V.hit_n, (s.radius || 30) * 2.2); break;
    case 'center': fx(game, { k: 'center', img: V.img || id, x: cx, y: cy, size: big, color, life: 0.9, sk: id });
      fx(game, { k: 'ring', x: cx, y: cy, r: s.radius || 30, color, life: 0.5 });
      spray(game, V.part || V.trail, cx, cy, V.hit_n, (s.radius || 30) * 2.4); break;
    case 'sky': fx(game, { k: 'sky', img: V.img || id, x: cx, y: cy, size: V.size, color, life: 0.7, sk: id });
      fx(game, { k: 'ring', x: cx, y: cy, r: s.radius || 30, color, life: 0.45, delay: 0.08 });
      if (V.hit) fx(game, { k: 'burst', img: V.hit, x: cx, y: cy - 3, size: V.hit_size, color, life: 0.45, delay: 0.08 });
      spray(game, V.part, cx, cy - 4, V.hit_n, 70); break;
    case 'drop': fx(game, { k: 'drop', img: V.img || id, x: cx, y: cy, size: V.size, color, life: 0.95, land: 0.26, sk: id, hit: V.hit, hit_size: V.hit_size, part: V.part, n: V.hit_n, r: s.radius }); break;
    case 'rise': fx(game, { k: 'rise', img: V.img || id, on: who, size: V.size, color, life: 1.3, sk: id });
      spray(game, V.part || V.trail, who.x, who.y - 8, V.hit_n, 30); break;
    case 'aura': who.buffSk = id;
      fx(game, { k: 'ring', x: who.x, y: who.y, r: 20, color, life: 0.45 }); fx(game, { k: 'pop', x: who.x, y: who.y - 12, r: V.glow, color, life: 0.35 }); spray(game, V.part, who.x, who.y - 10, V.hit_n, 36); break;
    case 'dome': who.shieldSk = id;
      if (V.drop) fx(game, { k: 'drop', img: V.img || id, on: who, x: who.x, y: who.y, size: V.size, color, life: 0.7, land: 0.3, sk: id, part: V.part, n: V.hit_n, r: 22, soft: true });
      else { fx(game, { k: 'ring', x: who.x, y: who.y, r: 18, color, life: 0.4 }); spray(game, V.part, who.x, who.y - 10, V.hit_n, 34); }
      break;
    case 'sweep': fx(game, { k: 'sweep', img: V.img || id, x: info.sx, y: info.sy, x2: who.x, y2: who.y, size: V.size, color, life: 0.5, go: 0.22, sk: id }); break;
  }
  if (info.zone) { info.zone.sk = id; if (V.show === 'ground' || V.show === 'orbit') spray(game, V.part || V.trail, info.zone.x, info.zone.y, V.hit_n, 50); }
  return true;
}

// Trúng một con trong vùng chiêu, đường lướt: vài hạt nhỏ ở chỗ trúng
export function vfxMobHit(game, id, m) {
  const V = vfxOf(game, id);
  if (!V) return false;
  spray(game, V.part || V.trail, m.x, m.y - 6, Math.ceil((V.hit_n || 6) / 3), 40, { size: 5 });
  hitSfx(game, id, 0.5);
  if (V.show === 'sweep' && V.hit) fx(game, { k: 'burst', img: V.hit, x: m.x, y: m.y - 6, size: V.hit_size, color: V.color, life: 0.35 });
  return true;
}

// Đạn trúng / nổ / hết đường. big: nổ lan (explode) thì hình nổ to theo bán kính nổ
export function vfxHit(game, b, x, y, big = 0) {
  const V = vfxOf(game, b.sk);
  if (!V) return false;
  const size = Math.max(V.hit_size || 14, big * 1.8);
  hitSfx(game, b.sk, big ? 0.9 : 0.7);
  if (V.hit) fx(game, { k: 'burst', img: V.hit, x, y: y - 3, size, color: V.color || b.color, life: big ? 0.5 : 0.38 });
  fx(game, { k: 'pop', x, y: y - 3, r: Math.max(8, V.glow * (big ? 1.4 : 0.8)), color: V.color || b.color, life: 0.25 });
  if (big) fx(game, { k: 'ring', x, y, r: big, color: V.color || b.color, life: 0.4 });
  spray(game, V.part || V.trail, x, y - 3, V.hit_n, big ? 70 : 45);
  return true;
}

// Mỗi khung: hiệu ứng, hạt; đạn có công thức thả hạt đuôi, nhớ vài vị trí trước (bóng mờ); vùng chiêu, hào quang thả hạt
export function updateVfx(game, dt) {
  updateJuice(game, dt);   // cảm giác đánh (src/game/juice.js)
  updateKiemVu(game, dt);   // Vạn Kiếm Quy Tông (src/game/skill-kiem-vu.js)
  const S = st(game);
  for (const f of S.fx) {
    f.t += dt;
    if (f.k === 'drop' && !f.landed && f.t >= f.land) {   // núi, tháp chạm đất: nổ, tóe
      f.landed = true; const x = f.on ? f.on.x : f.x, y = f.on ? f.on.y : f.y;
      if (f.hit) fx(game, { k: 'burst', img: f.hit, x, y: y - 4, size: f.hit_size, color: f.color, life: 0.5 });
      fx(game, { k: 'ring', x, y, r: f.r || 30, color: f.color, life: 0.45 });
      spray(game, f.part, x, y - 4, f.n, f.soft ? 36 : 80);
    }
  }
  S.fx = S.fx.filter(f => f.t < f.life + (f.delay || 0));
  for (const q of S.parts) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 1.5; q.rot += q.vr * dt; }
  S.parts = S.parts.filter(q => q.t < q.life);
  for (const b of game.bullets) {
    const V = b.sk && vfxOf(game, b.sk);
    if (!V) continue;
    (b.hist ||= []).push(b.x, b.y); if (b.hist.length > 2 * ((V.ghost || 0) + 1) * 2) b.hist.splice(0, 2);
    if (!V.trail) continue;
    b.acc = (b.acc || 0) + dt * (V.rate || 10);
    while (b.acc >= 1) {
      b.acc--;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      part(game, { img: V.trail, x: b.x - b.vx / sp * V.size * 0.3 + rnd(-2, 2), y: b.y - b.vy / sp * V.size * 0.3 + rnd(-2, 2), vx: -b.vx * 0.15 + rnd(-10, 10), vy: -b.vy * 0.15 + rnd(-10, 6),
        g: ['lua', 'thanh-quang', 'sao-vang', 'am'].includes(V.trail) ? -25 : 30, life: rnd(0.3, 0.55), size: Math.max(3, V.size * 0.28) * rnd(0.7, 1.1), add: V.trail !== 'da' });
    }
  }
  for (const z of game.zones) {   // vùng chiêu kéo dài: hạt bốc lên rải rác trong vùng
    const V = z.sk && vfxOf(game, z.sk);
    if (!V?.trail) continue;
    z.vacc = (z.vacc || 0) + dt * (V.rate || 8);
    while (z.vacc >= 1) {
      z.vacc--; const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * z.radius;
      part(game, { img: V.trail, x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d * 0.6, vy: rnd(-24, -10), vx: rnd(-6, 6), g: -8, life: rnd(0.6, 1.1), size: rnd(4, 6.5), add: V.trail !== 'da' });
    }
  }
}
