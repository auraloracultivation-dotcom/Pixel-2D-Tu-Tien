// Tương tác trên bản đồ: nút ngữ cảnh (nói chuyện, đả tọa, độ kiếp), cổng, vật nhặt theo nhiệm vụ.
import { dist } from './combat.js';
import { BOUNTY_NPC, talkBounty } from './bounty.js';
import { ARMORY_NPC, talkArmory } from './armory.js';

function nearestNpc(game, range) {
  let best = null, bd = range;
  for (const n of game.npcs) { const d = dist(n, game.player); if (d < bd) { bd = d; best = n; } }
  return best;
}

function onMeditateSpot(game) {
  const cfg = game.data.config;
  const T = cfg.tile, p = game.player;
  const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (game.map.at(x, y) === 'M') { const c = game.map.center(x, y); if (Math.hypot(c.x - p.x, c.y - p.y) < cfg.meditate.range) return true; }
  }
  return false;
}

// Nút tương tác theo ngữ cảnh: nói chuyện / độ kiếp (khi đầy tầng 9) / đả tọa
export function updateInteract(game) {
  const cfg = game.data.config, p = game.player;
  const npc = nearestNpc(game, cfg.interact_range);
  const trib = !npc && game.trib.canStart();
  const med = !npc && !trib && onMeditateSpot(game);
  game.actLabel = npc ? 'Nói chuyện' : trib ? 'Độ thiên kiếp' : med ? (p.meditating ? 'Dừng đả tọa' : 'Đả tọa') : null;
  if (!game.input.consume('act')) return;
  if (npc) {
    if (game.story.wants(npc.id)) { game.story.notify('talk', npc.id); return; }
    if (npc.id === BOUNTY_NPC) { talkBounty(game, npc); return; }
    if (npc.id === ARMORY_NPC) { talkArmory(game, npc); return; }
    const lines = npc.def.lines;
    game.dialog.say([[npc.def.name, lines[Math.floor(Math.random() * lines.length)]]]);
  } else if (trib) {
    game.trib.start();
  } else if (med) {
    p.meditating = !p.meditating;
    if (p.meditating) game.toast('Đả tọa... linh khí chảy vào người', 1.4);
  }
}

export function updatePortals(game, dt) {
  game.portalLock -= dt;
  if (game.portalLock > 0) return;
  for (const pt of game.map.def.portals) {
    const c = game.map.center(pt.at[0], pt.at[1]);
    if (Math.hypot(c.x - game.player.x, c.y - game.player.y) > 9) continue;
    if (pt.need && !game.save.flags[pt.need]) { game.toast('Cổng chưa mở.', 1.2); game.portalLock = 1.5; return; }
    game.travel(pt.to, pt.spawn, true, { text: pt.label });
    return;
  }
}

export function updatePickups(game) {
  const p = game.player;
  for (const k of game.pickups) {
    if (k.taken || dist(k, p) > 12) continue;
    k.taken = true;
    game.story.notify('collect', k.item);
    game.toast(`Nhặt được ${game.data.items.quest_items[k.item]?.name || k.item}!`, 1);
    game.sfx('pickup');
  }
  game.pickups = game.pickups.filter(k => !k.taken);
}

