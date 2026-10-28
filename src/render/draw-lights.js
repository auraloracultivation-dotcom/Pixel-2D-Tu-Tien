// Nguồn sáng động (data/light.json → glow): chiêu, đạn, vệt chém, vùng chiêu, vũ khí bay và người chơi sáng như đèn.
// Mỗi khung gom nguồn sáng một lần (gatherLights), lớp tối ngày đêm (draw-sky.js) và hầm ngục (draw-light.js) khoét
// lỗ tại đó (cutLights), cuối cùng phủ quầng cộng sáng lên trên tất cả (drawBloom) để màu chiêu rực trên nền tối.
import { weaponId } from '../game/stats.js';
import { phase } from '../game/daynight.js';
import { decorLights } from './draw-den.js';

const rgbOf = hex => {
  if (!hex || hex[0] !== '#') return null;
  const h = hex.length === 4 ? hex.slice(1).split('').map(c => c + c).join('') : hex.slice(1, 7);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
};

// → [{ x, y, r, c: 'r,g,b', a }] toạ độ thế giới; a là độ mạnh 0..1
export function gatherLights(game, t) {
  const G = game.data.light.glow, out = [], p = game.player;
  if (!G || !p) return out;
  out.push({ x: p.x, y: p.y - 8, r: G.player.r, c: G.player.c, a: 1, soft: true });
  for (const b of game.bullets) {
    const c = rgbOf(b.color) || '255,240,200';
    out.push({ x: b.x, y: b.y, r: G.bullet.r + (b.r || 3) * G.bullet.per_size, c, a: b.from === 'mob' ? 0.6 : 1 });
  }
  for (const f of game.fx) {
    const k = f.t / f.life, fade = 1 - k * k;
    if (f.type === 'sprite') {
      const c = G.sprite[f.id];
      if (!c) continue;
      const x = f.on ? f.on.x + f.ox : f.x, y = f.on ? f.on.y + f.oy : f.y;
      out.push({ x, y: y - 4, r: G.fx.r * Math.max(0.7, f.s || 1), c, a: fade });
    } else if (f.type === 'slash') {   // vệt chém mượt: hắt sáng xuống đất quanh lưỡi
      const c = rgbOf(f.color) || '235,242,255', x = f.on ? f.on.x : f.x, y = f.on ? f.on.y : f.y;
      out.push({ x: f.shape === 'line' ? x + Math.cos(f.ang) * f.len / 2 : x, y: (f.shape === 'line' ? y + Math.sin(f.ang) * f.len / 2 : y) - 3, r: Math.max(G.fx.r, (f.r || f.len / 2 || 10) * 1.1), c, a: fade });
    } else if (f.type === 'bolt') {   // tia sét điểm ảnh: hắt sáng ở chân và giữa thân
      const c = G.sprite['fx.bolt'] || '200,235,255';
      out.push({ x: f.x, y: f.y - 3, r: G.fx.r * 1.6, c, a: fade }, { x: f.x, y: f.y - f.h * 0.4, r: G.fx.r, c, a: fade * 0.6 });
    } else if (['ring', 'arc', 'line', 'ult', 'spark'].includes(f.type)) {
      const c = rgbOf(f.color) || '255,240,220';
      if (f.type === 'line' || f.type === 'ult') {   // vệt dài: rải nguồn sáng dọc đường
        for (let i = 0; i <= 3; i++) out.push({ x: f.x + (f.x2 - f.x) * i / 3, y: f.y + (f.y2 - f.y) * i / 3 - 5, r: G.fx.r, c, a: fade });
      } else out.push({ x: f.x, y: f.y - 3, r: f.type === 'spark' ? G.fx.r * 0.6 : Math.max(G.fx.r, (f.r || 10) * 1.2), c, a: fade });
    }
  }
  if (game.data.light.maps.includes(game.map?.id)) for (const d of decorLights(game)) out.push({ x: d.x, y: d.y, r: d.r, c: d.c, a: 0.75 + 0.15 * Math.sin(t * 6 + d.ph), soft: true });   // đèn trang trí khoét bóng tối hầm
  for (const z of game.zones) {
    const c = rgbOf(z.color);
    if (c) out.push({ x: z.x, y: z.y, r: z.radius * 1.3, c, a: G.zone.a * Math.min(1, (z.dur - z.t) * 2) });
  }
  const w = game.data.weapons[weaponId(game.save, game.data)], wc = rgbOf(w?.color) || '235,242,255';
  if (p.heroAtk0 != null && t - p.heroAtk0 < 0.28) {   // vệt chém vẽ sẵn trong khung đánh của nhân vật: sáng phía trước mặt
    const k = (t - p.heroAtk0) / 0.28;
    out.push({ x: p.x + (p.lookX || 1) * 12, y: p.y - 8, r: G.slash.r, c: wc, a: 1 - k });
  }
  const fw = p.fw;
  if (fw) {   // vũ khí bay: quầng màu linh căn, lao ra thì sáng hơn
    const c = rgbOf(game.data.elements[game.save.element]?.color) || wc;
    out.push({ x: fw.x, y: fw.y, r: fw.act ? G.fly.strike : G.fly.r, c, a: fw.act ? 1 : 0.5 });
    for (const s of fw.trail || []) out.push({ x: s.x, y: s.y, r: G.fly.r, c, a: 0.35 });
  }
  const max = game.data.config.perf?.max_lights || 40;   // đánh đông quái nhiều chiêu: giữ số quầng vừa phải
  return out.length > max ? out.slice(0, max) : out;
}

// Quầng tròn vẽ sẵn một lần (64×64) rồi dán phóng to: trước đây mỗi nguồn sáng tạo một gradient mới mỗi khung, máy yếu nóng
const sprites = new Map();
export function glow(key, stops) {
  let cv = sprites.get(key);
  if (cv) return cv;
  if (sprites.size > 160) sprites.clear();
  cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, col] of stops) gr.addColorStop(at, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  sprites.set(key, cv);
  return cv;
}

// Khoét lớp tối c (đang vẽ ở toạ độ lớp) tại các nguồn sáng; at(x, y) đổi toạ độ thế giới → lớp, s: điểm lớp / điểm thế giới
export function cutLights(c, lights, at, s, cut) {
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (const L of lights) {
    const q = at(L.x, L.y), r = L.r * s, a = Math.min(1, L.a) * cut;
    if (a <= 0.02) continue;
    c.globalAlpha = a;
    c.drawImage(glow(L.soft ? 'cut-soft' : 'cut', [[0, 'rgba(0,0,0,1)'], [L.soft ? 0.55 : 0.4, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]), q.x - r, q.y - r, r * 2, r * 2);
  }
  c.restore();
}

// Trời tối tới đâu (0 ban ngày ngoài trời có phủ nhẹ … 1 đêm, hầm ngục): quầng chiêu rực theo độ tối
function darkness(game) {
  if (game.data.light.maps.includes(game.map?.id)) return 1;
  const p = phase(game);
  return p.tint ? Math.min(1, p.tint[3] / 0.6) : 0;
}

// Quầng cộng sáng lên trên cùng (toạ độ màn hình): tâm rực, viền mờ dần theo màu nguồn
export function drawBloom(ctx, game, screen, lights) {
  const G = game.data.light.glow;
  if (!G) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const k = G.player.a / G.core;   // người chơi: quầng dịu hơn
  // Đánh đông quái: nhiều quầng chồng một chỗ cộng thành mảng trắng chói (chơi thử 28/10). Chia độ sáng theo số quầng
  // trong cùng ô density (đơn vị thế giới), và ban ngày ngoài trời dịu hơn trong hầm, ban đêm.
  const D = G.density || 32, n = new Map(), cell = L => Math.floor(L.x / D) + ',' + Math.floor(L.y / D);
  for (const L of lights) if (!L.soft) n.set(cell(L), (n.get(cell(L)) || 0) + 1);
  const env = darkness(game);
  for (const L of lights) {
    const q = screen.toScreen(L.x, L.y), r = L.r * screen.zoom * (L.soft ? 1 : 0.9);
    if (q.x < -r || q.y < -r || q.x > screen.w + r || q.y > screen.h + r) continue;
    const m = L.soft ? k : 1, a = Math.min(1, L.a) * (L.soft ? 1 : (G.day + (1 - G.day) * env) / Math.sqrt(n.get(cell(L)) || 1));
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(glow(`${L.c}|${m}`, [[0, `rgba(${L.c},${Math.min(1, G.core * m).toFixed(3)})`], [0.3, `rgba(${L.c},${Math.min(1, G.halo * m).toFixed(3)})`], [1, `rgba(${L.c},0)`]]), q.x - r, q.y - r, r * 2, r * 2);
  }
  ctx.restore();
}
