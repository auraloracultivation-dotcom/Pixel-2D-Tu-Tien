// Đồ rơi khi hạ quái: bật ra quanh xác rồi tự bay vào người chơi.
import { rollItem, addItem, rollGem, gemInfo, rarityOf, itemName } from './items.js';
import { totalLayer } from './stats.js';
import { makeRoom } from './autoequip.js';
import { pilotOpt } from './pilotopt.js';

export function dropLoot(game, m) {
  const d = game.data.items.drops[m.id];
  if (!d || m.noQi) return;
  const lvl = totalLayer(game.save, game.data.realms);
  const spawn = (kind, payload) => {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 40;
    game.loot.push({ kind, payload, x: m.x, y: m.y - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
  };
  const L = m.lootMul ?? 1;   // bãi treo máy rơi ít hơn (data/planets.json → farm.loot)
  const times = (p, n = 1) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p * L) k++; return k; };
  for (let i = times(d.item, d.items || 1); i > 0; i--) spawn('item', rollItem(game.data, game.save, { lvl, minRarity: d.min_rarity }));
  for (let i = times(d.gem); i > 0; i--) spawn('gem', rollGem(game.data));
  if (d.set && Math.random() < d.set[1]) {   // boss rơi một món bộ đồ của đảo
    const bs = Object.keys(game.data.items.bases).filter(k => game.data.items.bases[k].set === d.set[0]);
    spawn('item', rollItem(game.data, game.save, { lvl, minRarity: d.min_rarity, base: bs[Math.floor(Math.random() * bs.length)] }));
  }
  const st = times(d.stone);
  if (st) spawn('stone', d.stones || 1);
}

export function updateLoot(game, dt) {
  const p = game.player;
  for (const l of game.loot) {
    l.t += dt;
    if (l.t < 0.45) { l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= 0.9; l.vy *= 0.9; continue; }
    const dx = p.x - l.x, dy = p.y - 6 - l.y, d = Math.hypot(dx, dy), s = Math.min(d, (120 + l.t * 200) * dt);
    l.x += dx / d * s; l.y += dy / d * s;
    if (d < 6) { l.taken = true; take(game, l); }
  }
  game.loot = game.loot.filter(l => !l.taken);
}

function take(game, l) {
  const { data, save } = game;
  if (l.kind === 'item') {
    if (!addItem(data, save, l.payload)) {
      // Đề xuất #46: cả Tự đánh (treo máy tại chỗ) cũng tự phân giải món rẻ khi túi đầy, theo tùy chọn "phan-giai" ở tab Tự hành
      if (!(game.pilot || game.auto) || !pilotOpt(game, 'phan-giai')) { game.toast('Túi đầy! Phân giải bớt đồ.', 1.5); return; }
      if (!makeRoom(game, l.payload)) { game.persist(); return; }   // tự hành / tự đánh: phân giải món rẻ cho có chỗ
    }
    const r = rarityOf(data.items, l.payload.rarity);
    if (game.feed) game.feed(`Nhặt [${r.name}] ${itemName(data, l.payload)}`, r.color || '#ffe6a0'); else game.toast(`Nhặt [${r.name}] ${itemName(data, l.payload)}`, 1.4);   // cột bên trái (src/ui/feed.js)
    game.newItems = (game.newItems || 0) + 1;
  } else if (l.kind === 'gem') {
    save.gems[l.payload] = (save.gems[l.payload] || 0) + 1;
    if (game.feed) game.feed(`Nhặt ${gemInfo(data, l.payload).name}`, '#9fe8ff'); else game.toast(`Nhặt ${gemInfo(data, l.payload).name}`, 1.2);
  } else {
    save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + l.payload;
    game.number(game.player.x, game.player.y - 20, `+${l.payload} Tẩy Luyện Thạch`, '#bff4ff');
  }
  game.sfx('pickup');
  game.persist();
}

// Rời bản đồ: đồ còn rơi trên đất tự vào túi, không mất
export function collectAll(game) {
  for (const l of game.loot) take(game, l);
  game.loot = [];
}

export function lootColor(game, l) {
  if (l.kind === 'item') return rarityOf(game.data.items, l.payload.rarity).color;
  if (l.kind === 'gem') return gemInfo(game.data, l.payload).color;
  return game.data.items.materials['tay-luyen-thach'].color;
}
