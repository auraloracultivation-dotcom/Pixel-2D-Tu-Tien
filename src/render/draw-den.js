// Đèn trang trí trên bản đồ (chủ dự án 29/10/2026: đèn đuốc, đá phát sáng, Halloween trên cả nền game). Không sửa lưới bản đồ,
// không chặn đường: chọn sẵn ô đi được sát vách, nhà, cây (theo băm toạ độ, mỗi bản đồ cố định), tránh cổng, điểm vào, NPC.
// Hình lấy từ ảnh Canva (tools/art/ui_frame.py: ui.torch, ui.stonelamp, ui.crystal...). Mỗi món là đèn được thắp: hắt quầng sáng
// ban đêm (draw-glow.js) và khoét bóng tối hầm ngục (draw-lights.js), lửa lập lòe bằng code. Mùa Halloween thêm bí ngô cháy sáng.
// Cỡ, mật độ, màu ở data/light.json → decor. (File khác draw-decor.js: đó là vật trang trí cũ của bản đồ.)
import { spriteImage } from './sprites.js';

let cache = { map: null, le: null, list: [] };

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

function pickKind(D, kindSet, h) {
  const opts = D.sets[kindSet];
  let acc = 0; const total = opts.reduce((s, o) => s + o[1], 0);
  for (const [k, w] of opts) { acc += w / total; if (h < acc) return k; }
  return opts[opts.length - 1][0];
}

export function decorList(game) {
  const map = game.map, le = document.body.dataset.le || '';
  if (cache.map === map && cache.le === le) return cache.list;
  const D = game.data.light.decor, list = [];
  if (!D || !map) return (cache = { map, le, list }).list;
  const T = map.T, dark = game.data.light.maps.includes(map.def.id), voidMap = D.void_maps.some(p => map.def.id.startsWith(p));
  const set = voidMap ? 'void' : dark ? 'dark' : 'outdoor';
  const busy = [...Object.values(map.def.spawns || {}), ...(map.def.portals || []).map(p => p.at), ...(map.def.npcs || []).map(n => n.at)];
  const near = (x, y) => busy.some(b => b && Math.abs(b[0] - x) <= 2 && Math.abs(b[1] - y) <= 2);
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
    const k = map.type(x, y);
    if (k.solid || k.void) continue;
    const up = map.type(x, y - 1), side = [map.type(x - 1, y), map.type(x + 1, y), map.type(x, y + 1)];
    const hug = (up.solid && !up.void) || side.some(s => s.solid && !s.void);
    if (!hug) continue;
    const h = hash(x, y), hw = le === 'halloween' && set !== 'void' ? D.halloween : 0;
    if (h > D.density + hw || near(x, y)) continue;
    let kind = h < hw ? 'pumpkin' : pickKind(D, set, hash(y + 3, x + 7));
    if (kind === 'torch' && !(up.solid && !up.void)) kind = 'candles';   // đuốc chỉ treo trên vách phía sau
    const def = D.kinds[kind], spr = game.data.art.sprites['ui.' + kind];
    if (!def || !spr) continue;
    list.push({ kind, x: (x + 0.5) * T + (hash(x, y + 9) - 0.5) * 4, y: (y + 0.6) * T, r: def.r, c: def.c, fy: def.fy, ph: h * 40, spr });
  }
  return (cache = { map, le, list }).list;
}

// Vẽ trước người và quái (đồ đặt trên đất), chân đặt ở y; ngọn lửa hắt quầng nhỏ lập lòe
export function drawDen(ctx, game, t) {
  const list = decorList(game), k = game.data.light.decor?.scale || 0.55;
  if (!list.length) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (const d of list) {
    const im = spriteImage(d.spr);
    if (!im) continue;
    const w = d.spr.w * k, h = d.spr.h * k;
    ctx.drawImage(im, 0, 0, d.spr.w, d.spr.h, Math.round(d.x - w / 2), Math.round(d.y - h), w, h);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const d of list) {   // ngọn lửa: chấm sáng phập phồng ở đầu đèn
    const f = 0.55 + 0.3 * Math.sin(t * 7 + d.ph) + 0.15 * Math.sin(t * 13 + d.ph * 2);
    const fy = d.y - d.spr.h * k * d.fy;
    ctx.globalAlpha = 0.35 * f; ctx.fillStyle = `rgb(${d.c})`;
    ctx.beginPath(); ctx.arc(d.x, fy, 3 + f, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Nguồn sáng cho lớp tối (hầm ngục, đêm): toạ độ đầu đèn
export function decorLights(game) {
  const k = game.data.light.decor?.scale || 0.55;
  return decorList(game).map(d => ({ x: d.x, y: d.y - d.spr.h * k * d.fy, r: d.r, c: d.c, ph: d.ph }));
}
