// Tương tác trên bản đồ: nút ngữ cảnh (nói chuyện, đả tọa, độ kiếp), cổng, vật nhặt theo nhiệm vụ.
import { mapGate } from './map-gate.js';
import { dist } from './combat.js';
import { dailyEvent } from './daily.js';
import { ARMORY_NPC, talkArmory } from './armory.js';
import { harvestAll, gotText } from './garden.js';
import { medBlocked, medPct } from './da-toa.js';
import { pickMode } from './dun-mode.js';
import { waterDir, fishAct, fishLabel } from './fishing.js';

const isDungeon = (game, id) => (game.data.maps[id].rooms || []).length > 0;
import { talkBeast } from './pets.js';
import { talkPuppetShop } from './beast-shop.js';
import { talkShop } from './shop.js';
import { canInvite, talkCompanion } from './companion.js';
import { challenge as challengeTm } from './thienma.js';
import { talkHome } from './home.js';
import { showPat, patPet } from './pat.js';
import { rerootNpc, talkReroot } from './reroot.js';
import { talkDecor } from './decor.js';
import { talkParty } from './party.js';
import { goodsOf, talkGoods } from './npc-goods.js';
import { nearBeCa, talkBeCa } from './be-ca.js';
import { talkFashionShop } from './fashion-shop.js';
import { talkAlchemyNpc } from './npc-dan.js';

function nearestNpc(game, range) {
  let best = null, bd = range;
  for (const n of game.npcs) { const d = dist(n, game.player); if (d < bd) { bd = d; best = n; } }
  for (const n of game.khach || []) if (n.ban) { const d = dist(n, game.player); if (d < bd) { bd = d; best = n; } }   // người bán ở sạp phố hội (hoi-khach.js)
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

const STATIONS = { A: ['Lò rèn', 'ren'], G: ['Dược viên', 'dien'] };   // lò đan Động phủ bỏ (chủ dự án 20/11/2026 14:5x): luyện ở Túi đồ → Luyện đan
function nearStation(game) {
  for (const [ch, s] of Object.entries(STATIONS)) if (nearTile(game, ch, game.data.config.tile * 1.4)) return s;
  return null;
}

// Nói chuyện với một NPC: truyện trước, rồi các việc riêng của NPC đó (tự hành gọi thẳng hàm này)
export function talkTo(game, npc) {
  if (npc.ban) { talkStall(game, npc); return; }
  dailyEvent(game, 'talk', npc.id);   // việc ngày Nói chuyện với dân làng
  if (game.story.wants(npc.id)) { game.story.notify('talk', npc.id); return; }
  if (npc.id === ARMORY_NPC) { talkArmory(game, npc); return; }
  if (npc.id === game.data.pets.npc) { talkBeast(game, npc); return; }
  if (npc.id === game.data.pets.puppet_npc) { talkPuppetShop(game, npc); return; }
  if (npc.id === game.data.fashion.shop_npc) { talkFashionShop(game, npc); return; }   // tiệm thời trang (src/game/fashion-shop.js)
  if (talkAlchemyNpc(game, npc)) return;   // Lò Đan Sư, Đan Dược Sư, Dược Thảo Thương (src/game/npc-dan.js)
  if (npc.id === game.data.duel.thien_ma?.npc) { challengeTm(game); return; }   // Đài Ma Thần (src/game/thienma.js)
  if (npc.id === game.data.shop.npc) { talkShop(game, npc); return; }
  if (rerootNpc(game, npc.id)) { talkReroot(game, npc); return; }
  if (npc.id === game.data.party.npc) { talkParty(game, npc); return; }
  if (npc.id === game.data.market.npc) { game.openMarket?.(); return; }
  if (npc.id === game.data.home.decor.npc) { talkDecor(game, npc); return; }   // Tiểu Linh: bày đồ trang trí (linh cầm đã bỏ)
  if (npc.home || npc.visit) { talkHome(game, npc); return; }
  if (canInvite(game, npc.id)) { talkCompanion(game, npc); return; }
  if (goodsOf(game.data, npc.id)) { talkGoods(game, npc); return; }   // mỗi NPC một món riêng (thay linh thực, data/shop.json → npc_goods)
  const lines = npc.def.lines;
  game.dialog.say([[npc.def.name, lines[Math.floor(Math.random() * lines.length)]]]);
}

// Người bán ở sạp phố hội: chỉ bán hàng (món riêng của người đó, Chủ Chợ Phiên mở chợ), không dính truyện
function talkStall(game, npc) {
  if (npc.id === game.data.market.npc) { game.openMarket?.(); return; }
  if (goodsOf(game.data, npc.id)) { talkGoods(game, npc); return; }
  const lines = npc.def.lines;
  game.dialog.say([[npc.def.name, lines[Math.floor(Math.random() * lines.length)]]]);
}

// Nút tương tác theo ngữ cảnh: nói chuyện / độ kiếp (khi đầy tầng 9) / đả tọa / ngắm cảnh / câu cá / vuốt ve linh thú
export function updateInteract(game) {
  const cfg = game.data.config, p = game.player;
  const npc = nearestNpc(game, cfg.interact_range);
  const trib = !npc && game.trib.canStart();
  const st = !npc && !trib && nearStation(game);
  let med = !npc && !trib && !st && nearTile(game, 'M', cfg.meditate.range);
  const fish = !npc && !trib && !st && !med && (game.fish ? game.fish.dir : waterDir(game));
  const beca = !npc && !trib && !st && !med && !fish && nearBeCa(game);
  const pat = !npc && !trib && !st && !med && !fish && !beca && showPat(game);
  if (!npc && !trib && !st && !med && !fish && !beca && !pat && !medBlocked(game) && (p.meditating || !p.moving)) med = true;   // không có việc gì khác: đả tọa ngay tại chỗ (src/game/da-toa.js)
  game.actLabel = npc ? 'Nói chuyện' : trib ? 'Độ thiên kiếp' : st ? st[0] : med ? (p.meditating ? 'Dừng đả tọa' : 'Đả tọa') : fish ? fishLabel(game) : beca ? game.data.home.be_ca.name : pat ? 'Vuốt ve' : null;
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
  } else if (fish) {
    fishAct(game, fish);
  } else if (beca) {
    talkBeCa(game);
  } else if (pat) {
    patPet(game);
  } else if (med) {
    p.meditating = !p.meditating;
    if (p.meditating) game.toast(cfg.meditate.texts.sit.replace('{pct}', medPct(game)), 1.8);
  }
}

export function updatePortals(game, dt) {
  game.portalLock -= dt;
  if (game.auto && !game.pilot) { game.portalHold = 0; return; }   // Tự đánh không giẫm cổng (góp ý người chơi 19/11/2026: đang farm Thanh Mộc Tinh chạy dính cổng về làng, treo ở làng tới sáng); muốn qua cổng thì tắt Tự đánh hoặc dùng Tự hành
  if (game.portalLock > 0 || game.story.busy || game.trib?.active) return;   // truyện đang chạy lời thoại, cảnh: không giẫm cổng đi mất giữa chừng (chơi thử 28/10: bước Mộc Trưởng Lão); đang độ kiếp: né sét lỡ giẫm cổng thì tâm ma kẹt lại bản đồ cũ, kiếp không bao giờ xong (cày thử 28/10 tối)
  for (const pt of game.map.def.portals) {
    if (pt.fly) continue;   // nối hai tinh cầu: đi bằng Bản đồ, không còn cổng giẫm phải (chủ dự án chốt 28/10/2026)
    const c = game.map.center(pt.at[0], pt.at[1]);
    if (Math.hypot(c.x - game.player.x, c.y - game.player.y) > 9) continue;
    if (holdExit(game, dt)) return;
    if (pt.need && !game.save.flags[pt.need]) { game.toast('Cổng chưa mở.', 1.2); game.portalLock = 1.5; return; }
    const gate = mapGate(game, pt.to); if (gate) { game.toast(gate, 2); game.portalLock = 2; return; }   // mở theo tu vi (src/game/map-gate.js)
    if ((game.data.dungeon.closed || []).includes(pt.to)) { game.toast(game.data.menu.dungeon.closed + '.', 1.2); game.portalLock = 1.5; return; }
    const go = () => game.travel(pt.to, pt.spawn, true, { text: pt.label, kind: pt.kind });
    if (!isDungeon(game, pt.to) || game.story.busy || game.pilot) { game.dunMode = 0; go(); return; }
    game.portalLock = 99;  // đợi chọn độ khó
    pickMode(game, pt.to).then(ok => { if (ok) go(); else game.portalLock = 2; });
    return;
  }
  game.portalHold = 0;
}

// Bí cảnh đang đánh dở (đã vào phòng mà còn phòng chưa dọn xong): giẫm cổng ra chưa đi ngay, phải đứng yên trên cổng, không ra đòn, đủ dungeon.exit_hold giây.
// 15/11/2026: người mới kịch bản đang đánh ở phòng đầu Bí cảnh Huyết Nha lỡ chân giẫm cổng ra (cổng nằm ngay trong phòng), bị đưa ra bãi vòng ngoài giữa trận.
// 19/11/2026: vừa dọn xong một phòng, chưa sang phòng kế (không phòng nào "đang đánh") mà người đang đứng sát cổng ra, hay chạy ngang qua ô cổng, vẫn bị
// đưa ra ngoài ngay (bài chơi thử trượt 1 trong 3 lượt): nay còn phòng chưa dọn là còn phải đứng yên. Khách trong tổ đội không tự theo dõi phòng (entered luôn false): như cũ.
function holdExit(game, dt) {
  const D = game.data.dungeon, p = game.player, R = game.dungeon?.rooms;
  if (!D.exit_hold || !R?.some(r => r.entered) || R.every(r => r.cleared)) return false;
  if (!(game.portalHint > game.time)) { game.portalHint = game.time + 4; game.toast(D.texts.exit_wait, 1.6); }
  const still = Math.hypot(p.vx || 0, p.vy || 0) < 1 && !(p.atkCd > 0) && !(p.swingT > 0);
  game.portalHold = still ? (game.portalHold || 0) + dt : 0;
  return game.portalHold < D.exit_hold;
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

