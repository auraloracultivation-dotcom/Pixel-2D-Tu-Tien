// Hiệu ứng hình pixel của chiêu (data/skills.json: fx = fire | ice | bolt | slash; nhân vật có fx riêng thì 'hero').
// Vẽ ở src/render/draw-sprite-fx.js.
import { addFx } from './combat.js';

function heroFx(game) {
  const H = game.data.heroes;
  return (H.list[game.save.look] || H.list[H.default]).fx;
}

export function skillFx(game, s) {
  return heroFx(game) ? 'hero' : s.fx;
}

// Hiệu ứng riêng của nhân vật (heroes.json fx: [mục art, khung]): bung to dần rồi tan, cỡ theo bán kính r
function heroBurst(game, x, y, r, extra = {}) {
  const [id, frame] = heroFx(game), spr = game.data.art.sprites[id];
  if (!spr) return;
  addFx(game, { type: 'sprite', id, frames: [frame], x, y, s: Math.max(0.35, 2 * r / spr.w), life: 0.5, grow: true, fade: true, ...extra });
}

// Nổ một lần tại (x, y), r: bán kính vùng trúng; ang: hướng chém (slash)
export function burstFx(game, kind, x, y, r, ang = 0) {
  if (kind === 'hero') heroBurst(game, x, y - 3, r);
  else if (kind === 'fire') {
    const n = r > 20 ? 5 : 1;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random(), d = n > 1 ? r * 0.6 * Math.sqrt(Math.random()) : 0;
      addFx(game, { type: 'sprite', id: 'fx.fire', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 3, s: Math.min(1, Math.max(0.5, r / 36)), life: 0.55, fps: 16, fade: true });
    }
  } else if (kind === 'ice') {
    addFx(game, { type: 'sprite', id: 'fx.ice', x, y, s: Math.max(0.45, r / 26), life: 0.7 });
  } else if (kind === 'bolt') {
    addFx(game, { type: 'sprite', id: 'fx.bolt', x, y, s: Math.max(0.6, r / 30), life: 0.5 });
    game.flashT = Math.max(game.flashT || 0, 0.06);
  } else if (kind === 'slash') {
    addFx(game, { type: 'sprite', id: 'fx.slash', x, y: y - 3, s: Math.max(0.5, r / 19), rot: ang, life: 0.25 });
  }
}

// Vùng chiêu kéo dài: lửa cháy quanh vùng suốt thời gian, kim luân xoay, băng trồi lên một lần
export function zoneFx(game, kind, z) {
  if (kind === 'hero') heroBurst(game, 0, 0, z.radius, { on: z, ox: 0, oy: -3, life: z.dur, spin: 1.5 });
  else if (kind === 'fire') {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, d = z.radius * 0.6;
      addFx(game, { type: 'sprite', id: 'fx.fire', on: z, ox: Math.cos(a) * d, oy: Math.sin(a) * d + 3, s: 0.8, life: z.dur, fps: 12, phase: i * 3, fade: true });
    }
  } else if (kind === 'slash') {
    addFx(game, { type: 'sprite', id: 'fx.slash', on: z, ox: 0, oy: -3, s: z.radius / 19, life: z.dur, spin: 9, fps: 20, frames: [2, 3, 3, 2] });
  } else burstFx(game, kind, z.x, z.y, z.radius);
}
