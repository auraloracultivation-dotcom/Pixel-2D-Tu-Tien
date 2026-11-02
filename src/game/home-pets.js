// Linh thú bắt được sống trong động phủ (chủ dự án chốt 02/11/2026, thay linh cầm): mọi linh thú đã có (trừ con đang mang theo)
// đi lững thững trong sân động phủ (data/pets.json → home.pen); bán được lấy Linh Thạch (home.sell). Không vẽ khi đang thăm nhà bạn.
import { petDef } from './evolve.js';
import { addCoins } from './shop.js';

const H = game => game.data.pets.home;

export function spawnHomePets(game, rnd = Math.random) {
  game.homePets = [];
  const cfg = H(game), s = game.save;
  if (!cfg || game.map.id !== game.data.home.map || game.visiting) return;
  const T = game.map.T, [px, py, pw, ph] = cfg.pen;
  for (const id of Object.keys(s.pets || {}).filter(id => id !== s.pet && game.data.pets.pets[id]).slice(0, cfg.max)) {
    const x = (px + rnd() * pw) * T, y = (py + rnd() * ph) * T;
    game.homePets.push({ id, def: petDef(game.data, s, id), x, y, tx: x, ty: y, wait: rnd() * 3, hop: 0, face: 1, moving: false });
  }
}

export function updateHomePets(game, dt, rnd = Math.random) {
  const cfg = H(game);
  if (!game.homePets?.length || !cfg) return;
  const T = game.map.T, [px, py, pw, ph] = cfg.pen;
  for (const p of game.homePets) {
    if ((p.wait -= dt) > 0) { p.moving = false; continue; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d < 2) { p.wait = 1 + rnd() * 3; p.tx = (px + rnd() * pw) * T; p.ty = (py + rnd() * ph) * T; continue; }
    const st = Math.min(d, cfg.speed * dt);
    p.x += dx / d * st; p.y += dy / d * st; p.face = dx < 0 ? -1 : 1; p.moving = true; p.hop += dt * 10;
  }
}

export const petPrice = (game, id) => { const c = H(game).sell, p = game.save.pets[id]; return Math.round(c.base + (p?.lv || 1) * c.per_lv + (p?.star || 0) * c.per_star + (p?.evo ? c.evo : 0)); };

// Bán một linh thú: không bán con đang mang theo. Trả về câu báo
export function sellPet(game, id) {
  const s = game.save;
  if (!s.pets?.[id]) return 'Không có linh thú này.';
  if (id === s.pet) return 'Đang mang theo con này, đổi linh thú khác rồi mới bán.';
  const price = petPrice(game, id), name = petDef(game.data, s, id).name;
  delete s.pets[id];
  addCoins(game, price);
  game.homePets = (game.homePets || []).filter(p => p.id !== id);
  game.persist(); game.sfx('pickup');
  return `Đã bán ${name}, nhận ${price.toLocaleString('vi-VN')} Linh Thạch.`;
}

// Thú cưỡi bán được (chủ dự án 02/11/2026): giá mount_base + tốc chạy × mount_per_speed; không bán con đang cưỡi
export const mountPrice = (game, id) => { const c = H(game).sell; return Math.round(c.mount_base + (game.data.pets.mounts[id]?.speed || 0) * c.mount_per_speed); };
export function sellMount(game, id) {
  const s = game.save, m = game.data.pets.mounts[id];
  if (!m || !s.mounts?.[id]) return 'Không có thú cưỡi này.';
  if (id === s.mount) return 'Đang cưỡi con này, đổi thú cưỡi khác rồi mới bán.';
  const price = mountPrice(game, id);
  delete s.mounts[id];
  addCoins(game, price);
  game.persist(); game.sfx('pickup');
  return `Đã bán ${m.name}, nhận ${price.toLocaleString('vi-VN')} Linh Thạch.`;
}
