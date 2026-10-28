// Tương tác trên bản đồ: nút ngữ cảnh (nói chuyện, đả tọa, độ kiếp), cổng, vật nhặt theo nhiệm vụ.
import { dist } from './combat.js';
import { BOUNTY_NPC, talkBounty } from './bounty.js';
import { ARMORY_NPC, talkArmory } from './armory.js';
import { harvestAll, gotText } from './garden.js';
import { meditateMul } from './evolve.js';
import { pickMode } from './dun-mode.js';
import { waterDir, fishAct, fishLabel } from './fishing.js';
import { spotHere, sitView } from './scenic.js';
import { nearVein, startDig } from './gather.js';

const isDungeon = (game, id) => (game.data.maps[id].rooms || []).length > 0;
import { talkBeast } from './pets.js';
import { talkTower } from './tower.js';
import { talkArena } from './arena.js';
import { talkShop } from './shop.js';
import { talkRes } from './resrun.js';
import { canInvite, talkCompanion } from './companion.js';
import { hasSide, talkSide, sideCollect } from './side.js';
import { talkHome } from './home.js';
import { canPat, patPet } from './pat.js';
import { rerootNpc, talkReroot } from './reroot.js';
import { talkTieuLinh } from './critters.js';
import { festNpc, talkFest } from './events.js';
import { talkParty } from './party.js';
import { snackOf, talkSnack } from './snack.js';
import { inFair } from './fair.js';

function nearestNpc(game, range) {
  let best = null, bd = range;
  for (const n of game.npcs) { const d = dist(n, game.player); if (d < bd) { bd = d; best = n; } }
  return best;
}

// Đứng gần ô loại ch (bồ đoàn, lò đan, lò rèn, linh điền)?
function nearTile(game, ch, range) {
  const T = game.data.config.tile, p = game.player;
  const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (game.map.at(x, y) === ch) { const c = game.map.center(x, y); if (Math.hypot(c.x - p.x, c.y - p.y) < range) return true; }
  }
  return false;
}

const STATIONS = { K: ['Lò đan', 'dan'], A: ['Lò rèn', 'ren'], G: ['Dược viên', 'dien'] };
function nearStation(game) {
  for (const [ch, s] of Object.entries(STATIONS)) if (nearTile(game, ch, game.data.config.tile * 1.4)) return s;
  return null;
}

// Nói chuyện với một NPC: truyện trước, rồi các việc riêng của NPC đó (tự hành gọi thẳng hàm này)
export function talkTo(game, npc) {
  if (game.story.wants(npc.id)) { game.story.notify('talk', npc.id); return; }
  if (npc.id === BOUNTY_NPC) { talkBounty(game, npc); return; }
  if (npc.id === ARMORY_NPC) { talkArmory(game, npc); return; }
  if (npc.id === game.data.pets.npc) { talkBeast(game, npc); return; }
  if (npc.id === game.data.tower.npc) { talkTower(game, npc); return; }
  if (npc.id === game.data.arena.npc) { talkArena(game, npc); return; }
  if (npc.id === game.data.shop.npc) { talkShop(game, npc); return; }
  if (npc.id === game.data.resrun.npc) { talkRes(game, npc); return; }
  if (hasSide(game, npc.id)) { talkSide(game, npc); return; }
  if (rerootNpc(game, npc.id)) { talkReroot(game, npc); return; }
  if (festNpc(game, npc.id)) { talkFest(game, npc); return; }
  if (npc.id === game.data.party.npc) { talkParty(game, npc); return; }
  if (npc.id === game.data.market.npc) { game.openMarket?.(); return; }
  if (npc.id === game.data.home.decor.npc) { talkTieuLinh(game, npc); return; }
  if (npc.home || npc.visit) { talkHome(game, npc); return; }
  if (canInvite(game, npc.id)) { talkCompanion(game, npc); return; }
  if (snackOf(game.data, npc.id)) { talkSnack(game, npc); return; }   // người bán linh thực ở xóm
  const lines = npc.def.lines;
  game.dialog.say([[npc.def.name, lines[Math.floor(Math.random() * lines.length)]]]);
}

// Nút tương tác theo ngữ cảnh: nói chuyện / độ kiếp (khi đầy tầng 9) / đả tọa / ngắm cảnh / câu cá / vuốt ve linh thú
export function updateInteract(game) {
  const cfg = game.data.config, p = game.player;
  const npc = nearestNpc(game, cfg.interact_range);
  const trib = !npc && game.trib.canStart();
  const st = !npc && !trib && nearStation(game);
  const med = !npc && !trib && !st && (nearTile(game, 'M', cfg.meditate.range) || inFair(game));   // sân hội đèn ngồi đả tọa được
  const view = !npc && !trib && !st && !med && !game.fish && !game.view && spotHere(game);
  const fish = !npc && !trib && !st && !med && !view && !game.view && (game.fish ? game.fish.dir : waterDir(game));
  const vein = !npc && !trib && !st && !med && !view && !game.view && !game.fish && !game.dig && nearVein(game);   // mạch linh khoáng
  const pat = !npc && !trib && !st && !med && !view && !fish && !vein && !game.view && canPat(game);
  game.actLabel = npc ? 'Nói chuyện' : trib ? 'Độ thiên kiếp' : st ? st[0] : med ? (p.meditating ? 'Dừng đả tọa' : 'Đả tọa') : view ? 'Ngắm cảnh' : vein ? game.data.gather.texts.act : fish ? fishLabel(game) : pat ? 'Vuốt ve' : null;
  if (!game.input.consume('act')) return;
  if (npc) {
    talkTo(game, npc);
  } else if (trib) {
    game.trib.start();
  } else if (st && st[1] === 'dien') {
    const got = harvestAll(game);
    if (Object.keys(got).length) { game.sfx('pickup'); game.toast(`Thu hoạch ${gotText(got)}`, 1.8); }
    else game.openCave?.('vuon');
  } else if (st) {
    game.openCave?.(st[1]);
  } else if (view) {
    sitView(game, view);
  } else if (vein) {
    startDig(game, vein);
  } else if (fish) {
    fishAct(game, fish);
  } else if (pat) {
    patPet(game);
  } else if (med) {
    p.meditating = !p.meditating;
    if (p.meditating) game.toast(meditateMul(game) > 1 ? `Bồ đoàn động phủ: tu nhanh gấp ${meditateMul(game)}` : 'Đả tọa... linh khí chảy vào người', 1.4);
  }
}

export function updatePortals(game, dt) {
  game.portalLock -= dt;
  if (game.portalLock > 0 || game.story.busy) return;   // truyện đang chạy lời thoại, cảnh: không giẫm cổng đi mất giữa chừng (chơi thử 28/10: bước Mộc Trưởng Lão)
  for (const pt of game.map.def.portals) {
    if (pt.fly) continue;   // nối hai tinh cầu: đi bằng Bản đồ, không còn cổng giẫm phải (chủ dự án chốt 28/10/2026)
    const c = game.map.center(pt.at[0], pt.at[1]);
    if (Math.hypot(c.x - game.player.x, c.y - game.player.y) > 9) continue;
    if (pt.need && !game.save.flags[pt.need]) { game.toast('Cổng chưa mở.', 1.2); game.portalLock = 1.5; return; }
    const go = () => game.travel(pt.to, pt.spawn, true, { text: pt.label, kind: pt.kind });
    if (!isDungeon(game, pt.to) || game.story.busy || game.pilot) { game.dunMode = 0; go(); return; }
    game.portalLock = 99;  // đợi chọn độ khó
    pickMode(game, pt.to).then(ok => { if (ok) go(); else game.portalLock = 2; });
    return;
  }
}

export function updatePickups(game) {
  const p = game.player;
  for (const k of game.pickups) {
    if (k.taken || dist(k, p) > 12) continue;
    k.taken = true;
    if (k.side) sideCollect(game, k); else game.story.notify('collect', k.item);
    game.toast(`Nhặt được ${game.data.items.quest_items[k.item]?.name || k.item}!`, 1);
    game.sfx('pickup');
  }
  game.pickups = game.pickups.filter(k => !k.taken);
}

