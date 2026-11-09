// Tia lửa li ti khi trúng đòn (chủ dự án 08/11/2026 16:52: "hiệu ứng đốm nhỏ li ti" như video tham khảo): mỗi đòn trúng tóe vài
// hạt sáng 1–2 điểm ảnh bay ra rồi rơi, chí mạng tóe nhiều hạt vàng, hạ quái tóe hạt màu quái, chiêu vùng nổ tóe vòng hạt.
// Không dùng hình: vẽ ô vuông cộng sáng ở src/render/draw-sparks.js. Số ở data/vfx.json → sparks. Máy đã tự hạ mức (perf ≥ 3) bớt nửa.
import { fxOk } from './fx-budget.js';
const rnd = (a, b) => a + Math.random() * (b - a);

export function sparks(game, x, y, kind, color, dir) {
  const S = game.data.vfx?.sparks, k = S?.[kind];
  if (!k || (k.budget && !fxOk(game, 'sp_' + kind))) return;   // đòn thường, hạ quái thường: trong hạn mức (src/game/fx-budget.js)
  const low = +(globalThis.document?.body?.dataset.perf || 0) >= 3, list = (game.sparks ??= []);
  const n = Math.round(k.n * (low ? 0.5 : 1)), cap = S.max * (low ? 0.5 : 1);
  for (let i = 0; i < n; i++) {
    const a = dir == null ? rnd(0, Math.PI * 2) : dir + rnd(-k.cone, k.cone), v = k.spd * rnd(0.35, 1);
    if (list.length >= cap) list.shift();
    list.push({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: Math.cos(a) * v, vy: Math.sin(a) * v - k.up, g: k.g, t: 0,
      life: k.life * rnd(0.6, 1.2), c: i % 4 === 0 ? '#ffffff' : color || k.color, s: Math.random() < k.big ? 3 : 2, drag: k.drag });
  }
}

export function updateSparks(game, dt) {
  const list = game.sparks;
  if (!list?.length) return;
  for (const p of list) {
    p.t += dt; p.vy += p.g * dt;
    const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  game.sparks = list.filter(p => p.t < p.life);
}
