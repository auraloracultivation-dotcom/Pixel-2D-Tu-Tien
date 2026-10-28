// Hiệu ứng hình pixel của chiêu (data/skills.json: fx = fire | ice | bolt | slash | vine | rock | wind | arrow | sound | liem (đạn bay có hình; trúng: arrow tia sáng, sound vòng âm ba, liem vệt chém); tự thân: heal | shield | shield-earth | buff). Vẽ ở src/render/draw-sprite-fx.js.
import { addFx } from './combat.js';
import { slashArc, slashSpin } from './slash-fx.js';

// Sét giáng tại chân (x, y): tia điểm ảnh vẽ mỗi khung (src/render/draw-bolt.js), rồi vết cháy xém (hình fx.bolt khung 4–6)
export function boltFx(game, x, y, sky = false, seed = Math.floor(Math.random() * 1e6)) {
  const C = game.data.config.bolt;
  if (!C) { addFx(game, { type: 'sprite', id: 'fx.bolt', x, y, life: 0.5 }); return; }
  addFx(game, { type: 'bolt', x, y, h: sky ? C.h_sky : C.h_skill, seed, life: C.strike + C.fade });
  addFx(game, { type: 'sprite', id: 'fx.bolt', frames: [4, 5, 6], x, y, life: 0.6, fade: true });
}

// Nổ một lần tại (x, y), r: bán kính vùng trúng; ang: hướng chém (slash)
export function burstFx(game, kind, x, y, r, ang = 0) {
  if (kind === 'fire') {
    const n = r > 20 ? 5 : 1;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random(), d = n > 1 ? r * 0.6 * Math.sqrt(Math.random()) : 0;
      addFx(game, { type: 'sprite', id: 'fx.fire', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 3, s: Math.min(1, Math.max(0.5, r / 36)), life: 0.55, fps: 16, fade: true });
    }
  } else if (kind === 'ice') {
    addFx(game, { type: 'sprite', id: 'fx.ice', x, y, s: Math.max(0.45, r / 26), life: 0.7 });
  } else if (kind === 'bolt') {
    boltFx(game, x, y);
    game.flashT = Math.max(game.flashT || 0, 0.06);
  } else if (kind === 'slash' || kind === 'liem') {   // vệt chém mượt (src/render/draw-slash.js); liềm trúng: vệt tím
    slashArc(game, { x, y: y - 3, ang, r: Math.max(12, r), arc: 160, color: game.data.config.slash?.colors[kind] });
  } else if (kind === 'vine') {
    addFx(game, { type: 'sprite', id: 'fx.vine', x, y: y + 2, s: Math.max(0.4, r / 22), life: 0.75 });
  } else if (kind === 'rock') {   // vùng rộng: gai đá trồi thành vòng, không che người đứng giữa
    const n = r > 30 ? 5 : 1;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 - Math.PI / 2, d = n > 1 ? r * 0.65 : 0;
      addFx(game, { type: 'sprite', id: 'fx.rock', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 2, s: n > 1 ? 0.55 : Math.max(0.4, r / 26), life: 0.7 });
    }
  } else if (kind === 'wind') {
    addFx(game, { type: 'sprite', id: 'fx.wind', x, y: y + 4, s: Math.max(0.5, r / 20), life: 0.5, fps: 20, fade: true });
  } else if (kind === 'arrow') {   // tên cắm: tia sáng nhỏ màu thân tên
    addFx(game, { type: 'spark', x, y, color: '#f0d090', life: 0.25 });
  } else if (kind === 'sound') {   // âm ba: vòng tím lan ra, tia trắng ở tâm
    addFx(game, { type: 'ring', x, y: y - 4, r: Math.max(10, r), color: '#d8b0ff', life: 0.4 });
    addFx(game, { type: 'spark', x, y, color: '#f4e8ff', life: 0.25 });
  }
}

// Chiêu tự thân (hồi máu, khiên, tăng sức): hình bám theo người thi triển
export function selfFx(game, kind, p) {
  const life = kind === 'buff' ? 1.2 : kind === 'heal' ? 0.8 : 0.45;
  addFx(game, { type: 'sprite', id: 'fx.' + kind, on: p, ox: 0, oy: 2, s: 1, life, fps: kind === 'buff' ? 14 : 0, fade: kind === 'buff' });
}

// Vùng chiêu kéo dài: lửa cháy quanh vùng suốt thời gian, kim luân xoay, băng trồi lên một lần
export function zoneFx(game, kind, z) {
  if (kind === 'fire') {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, d = z.radius * 0.6;
      addFx(game, { type: 'sprite', id: 'fx.fire', on: z, ox: Math.cos(a) * d, oy: Math.sin(a) * d + 3, s: 0.8, life: z.dur, fps: 12, phase: i * 3, fade: true });
    }
  } else if (kind === 'slash') {   // kim luân: hai lưỡi chém mượt xoay quanh vùng
    slashSpin(game, { on: z, r: z.radius, life: z.dur, color: game.data.config.slash?.colors.slash });
  } else if (kind === 'vine') {   // dây leo mọc khắp vùng rồi đung đưa đến hết
    burstFx(game, kind, z.x, z.y, z.radius * 0.7);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.6, d = z.radius * 0.55;
      addFx(game, { type: 'sprite', id: 'fx.vine', on: z, ox: Math.cos(a) * d, oy: Math.sin(a) * d + 2, s: 0.6, life: z.dur, fps: 3, frames: [4, 5], phase: i, fade: true });
    }
  } else if (kind === 'wind') {
    addFx(game, { type: 'sprite', id: 'fx.wind', on: z, ox: 0, oy: 4, s: z.radius / 20, life: z.dur, fps: 16, fade: true });
  } else burstFx(game, kind, z.x, z.y, z.radius);
}
