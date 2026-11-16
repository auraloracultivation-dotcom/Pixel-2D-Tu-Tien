// Đồ rơi khi hạ quái: bật ra quanh xác rồi nằm trên đất, có cột sáng theo phẩm (src/render/draw-loot.js); chạy qua mới nhặt được
// (chủ dự án 16/11/2026 23:39; trước đây tự bay vào người). Tự đánh / Tự hành tự đi nhặt khi quanh mình hết quái (lootStep).
// Số ở data/config.json → loot.
import { rollItem, addItem, rollGem, gemInfo, rarityOf, itemName } from './items.js';
import { totalLayer } from './stats.js';
import { quality } from './tiers.js';
import { autoSellFull } from './shop.js';
import { makeRoom } from './autoequip.js';
import { pilotOpt } from './pilotopt.js';
import { rewardItem, rewardTick, rewardOn } from './reward.js';
import { grade } from './tiers.js';

export function dropLoot(game, m) {
  const d = game.data.items.drops[m.id];
  if (!d || m.noQi) return;
  const lvl = totalLayer(game.save, game.data.realms);
  // Đồ rơi ngoài bí cảnh chỉ tới màu world_max (chủ dự án 02/11/2026 17:48: farm ngoài ra đồ đen, đỏ thì người chỉ đi bí cảnh không đua nổi);
  // màu cao (vàng, đỏ, đen) chỉ có trong bí cảnh và qua tẩy luyện
  const maxTier = game.sweeping || game.dungeon || (game.map.def.rooms || []).length ? undefined : game.data.items.line_tiers.world_max;
  const spawn = (kind, payload) => {
    if (game.sweeping) { take(game, { kind, payload }, true); return; }   // càn quét (dun-sweep.js): vào thẳng túi, không diễn nghi lễ từng món
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 40;
    game.loot.push({ kind, payload, x: m.x, y: m.y - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
  };
  const L = m.lootMul ?? 1;   // bãi treo máy rơi ít hơn (data/planets.json → farm.loot)
  const times = (p, n = 1) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p * L) k++; return k; };
  for (let i = times(d.item, d.items || 1); i > 0; i--) spawn('item', rollItem(game.data, game.save, { lvl, minRarity: d.min_rarity, maxTier }));
  for (let i = times(d.gem); i > 0; i--) spawn('gem', rollGem(game.data));
  if (d.set && Math.random() < d.set[1]) {   // boss rơi một món bộ đồ của đảo
    const bs = Object.keys(game.data.items.bases).filter(k => game.data.items.bases[k].set === d.set[0]);
    spawn('item', rollItem(game.data, game.save, { lvl, minRarity: d.min_rarity, base: bs[Math.floor(Math.random() * bs.length)], maxTier }));
  }
  const st = times(d.stone);
  if (st) spawn('stone', d.stones || 1);
}

export function updateLoot(game, dt) {
  const p = game.player;
  for (const l of game.loot) {
    l.t += dt;
    if (l.t < 0.45) { if (!game.map?.blocked?.(l.x + l.vx * dt, l.y + l.vy * dt, 3)) { l.x += l.vx * dt; l.y += l.vy * dt; } l.vx *= 0.9; l.vy *= 0.9; continue; }   // không bật vào tường, cây
    const C = game.data.config.loot;
    if (C?.walk) { if (Math.hypot(p.x - l.x, p.y - l.y) < C.pick) { l.taken = true; take(game, l); } continue; }   // chạy qua mới nhặt
    const dx = p.x - l.x, dy = p.y - 6 - l.y, d = Math.hypot(dx, dy), s = Math.min(d, (120 + l.t * 200) * dt);
    l.x += dx / d * s; l.y += dy / d * s;
    if (d < 6) { l.taken = true; take(game, l); }
  }
  game.loot = game.loot.filter(l => !l.taken);
  rewardTick(game);   // món quý nhặt giữa trận: hết quái quanh mình mới diễn nghi lễ (reward.js)
}

// quiet: nhặt hàng loạt (càn quét, rời bản đồ): không diễn nghi lễ nhận thưởng
function take(game, l, quiet) {
  const { data, save } = game;
  let rare = false, shown = null;
  if (l.kind === 'item') {
    let ok = addItem(data, save, l.payload);
    if (!ok && autoSellFull(game)) ok = addItem(data, save, l.payload);   // góp ý #86: túi đầy thì tự bán theo phẩm đã chọn rồi nhặt
    if (!ok) {
      // Đề xuất #46: cả Tự đánh (treo máy tại chỗ) cũng tự phân giải món rẻ khi túi đầy, theo tùy chọn "phan-giai" ở tab Tự hành
      if (!(game.pilot || game.auto) || !pilotOpt(game, 'phan-giai')) { game.toast('Túi đầy! Phân giải bớt đồ.', 1.5); return; }
      if (!makeRoom(game, l.payload)) { game.persist(); return; }   // tự hành / tự đánh: phân giải món rẻ cho có chỗ
    }
    const q = quality(data, l.payload) || rarityOf(data.items, l.payload.rarity);   // tên phẩm theo màu dòng (Phàm…Thiên, Tiên, Thượng Cổ)
    rare = data.items.line_tiers.list.indexOf(q) >= 4;   // phẩm Thiên trở lên: tiếng chuông ngọc riêng
    const tierIx = data.items.line_tiers.list.indexOf(q);
    if (!quiet && save.bag.includes(l.payload)) shown = rewardItem(game, l.payload);   // món phẩm cao: nghi lễ nhận thưởng hoặc thẻ nhỏ (reward.js), có chữ và tiếng riêng
    if (shown || (tierIx >= 0 && tierIx < (save.feedMin || 0))) { /* đã có nghi lễ; góp ý #145: phẩm thấp hơn mức chọn thì nhặt lặng lẽ */ }
    else if (game.feed) game.feed(`Nhặt [${q.name}] ${itemName(data, l.payload)}`, q.color || '#ffe6a0'); else game.toast(`Nhặt [${q.name}] ${itemName(data, l.payload)}`, 1.4);   // cột bên trái (src/ui/feed.js)
    game.newItems = (game.newItems || 0) + 1;
  } else if (l.kind === 'gem') {
    save.gems[l.payload] = (save.gems[l.payload] || 0) + 1;
    if (game.feed) game.feed(`Nhặt ${gemInfo(data, l.payload).name}`, '#9fe8ff'); else game.toast(`Nhặt ${gemInfo(data, l.payload).name}`, 1.2);
  } else {
    save.mats['tay-luyen-thach'] = (save.mats['tay-luyen-thach'] || 0) + l.payload;
    game.number(game.player.x, game.player.y - 20, `+${l.payload} Tẩy Luyện Thạch`, '#bff4ff');
  }
  if (!shown) game.sfx(rare ? 'rare' : 'pickup');
  game.persist();
}

// Rời bản đồ: đồ còn rơi trên đất tự vào túi, không mất
export function collectAll(game) {
  for (const l of game.loot) take(game, l, true);
  game.loot = [];
}

export function lootColor(game, l) {
  if (l.kind === 'item') return rewardOn(game) ? grade(game.data, l.payload).color : rarityOf(game.data.items, l.payload.rarity).color;   // bản nghi lễ: viên rơi cùng màu phẩm với dòng Nhặt… và vầng sáng
  if (l.kind === 'gem') return gemInfo(game.data, l.payload).color;
  return game.data.items.materials['tay-luyen-thach'].color;
}

// Tự đánh / Tự hành: quanh mình không còn quái đang đánh mình (trong busy đơn vị) thì đi nhặt món gần nhất trong seek đơn vị.
// Trả về hướng đi, hoặc null nếu không có gì để nhặt.
export function lootStep(game) {
  const C = game.data.config.loot, p = game.player;
  if (!C?.walk || !game.loot.length || !p) return null;
  if (game.mobs.some(m => !m.dead && m.aggro && !m.dummy && Math.hypot(m.x - p.x, m.y - p.y) < C.busy)) return null;
  let best = null, bd = C.seek;
  for (const l of game.loot) { if (l.t < 0.45 || (l.seek || 0) > C.give_up) continue; const d = Math.hypot(l.x - p.x, l.y - p.y); if (d < bd) { bd = d; best = l; } }
  if (!best) return null;
  best.seek = (best.seek || 0) + (game.dt || 1 / 60);   // đi mãi không tới (kẹt sau vật cản) thì thôi, rời bản đồ vẫn tự vào túi
  return { x: (best.x - p.x) / (bd || 1), y: (best.y - p.y) / (bd || 1) };
}
