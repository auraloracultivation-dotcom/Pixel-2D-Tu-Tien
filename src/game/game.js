// Trạng thái ván chơi và vòng cập nhật. Vẽ ở src/render, giao diện ở src/ui.
import { buildMap } from '../world/map.js';
import { loadSave, newSave, writeSave } from '../core/save.js';
import { createPlayer, updatePlayer, refreshStats } from './player.js';
import { spawnMob, updateMobs, scaleMobBy } from './mobs.js';
import { updateBullets, updateFx, addFx, addNumber, dist } from './combat.js';
import { addQi, realmLabel, totalLayer, rollRoot } from './stats.js';
import { createStory } from './story.js';
import { createDungeon } from './dungeon.js';
import { createOthers } from './others.js';
import { updateParty } from './party-sync.js';
import { dropLoot, updateLoot, collectAll } from './loot.js';
import { ensureInv, rollItem, addItem, equip, fixGearPct } from './items.js';
import { startTrip, updateTrip } from './travel.js';
import { updateInteract, updatePortals, updatePickups } from './interact.js';
import { updateStrikes } from './strikes.js';
import { updateZones } from './zones.js';
import { checkUnlocks } from './skills.js';
import { ensureTech, techDrop, gainTechExp, learnTech } from './techniques.js';
import { createTribulation } from './tribulation.js';
import { bountyKill, bountyGoal } from './bounty.js';
import { ensureCave, matDrop } from './cave.js';
import { ensureDaily, dailyEvent } from './daily.js';
import { updateTower, towerFail } from './tower.js';
import { updateArena, arenaFail, arenaGoal } from './arena.js';
import { pilotDialog, pilotDied } from './pilot.js';
import { praise, updatePraise } from './praise.js';
import { updateGarden } from './garden.js';
import { updateDayNight } from './daynight.js';
import { updateWeather } from './weather.js';
import { updateJournal } from './journal.js';
import { updateHome } from './home.js';
import { updateChatter } from './chatter.js';
import { updateStroll } from './stroll.js';
import { spawnWild, updateWild } from './wildlife.js';
import { updateKyNgo } from './kyngo.js';
import { updatePilotLog } from './pilotlog.js';
import { updateEta } from './eta.js';
import { updateAnniv } from './anniv.js';
import { updateCritters } from './critters.js';
import { onSay, updateSocial } from './social.js';
import { updatePetFetch } from './pat.js';
import { updateFishing } from './fishing.js';
import { updateView, viewPan, standUp } from './scenic.js';
import { coinDrop } from './shop.js';
import { eventMul, eventKill, checkFestival, eventToast, festSpawn } from './events.js';
import { ensureStats, countKill, checkAchv, power } from './achieve.js';
import { initRank } from './rank.js';
import { updateRes, resKill, resGoal } from './resrun.js';
import { updateWorldBoss } from './worldboss.js';
import { stamp, offlineGains } from './offline.js';
import { sideKill, spawnSidePickups, sideGoals, hasSide } from './side.js';
import { spawnHome } from './home.js';
import { spawnCompanion, updateCompanion, gainCompExp } from './companion.js';
import { updateCombo } from './affinity.js';
import { ensurePets, maybeRare, petKill, gainPetExp, spawnPet, updatePet, updateRide } from './pets.js';

export function createGame(data, screen, input, ui, audio) {
  const cfg = data.config;
  const game = {
    data, screen, input, dialog: ui.dialog, ui,
    save: null, map: null, player: null,
    mobs: [], npcs: [], pickups: [], bullets: [], fx: [], numbers: [], loot: [], strikes: [], zones: [],
    spawners: [], dungeon: null, story: null,
    hitstop: 0, flashT: 0, dark: 0, darkTarget: 0, noDeath: false,
    trip: null, traveling: false, paused: false, portalLock: 0, peek: null, time: 0,
    owner: 'guest', online: null, others: null,
  };
  game.sfx = (name, vol) => audio?.play(name, vol);
  game.rain = on => audio?.rain(on);
  game.night = on => audio?.night(on);
  game.others = createOthers(game);

  game.persist = () => {
    if (!game.save || !game.map) return;
    stamp(game.save);
    if (game.player) game.save.power = power(game);   // máy chủ đọc để xếp hạng lực chiến
    writeSave(game.owner, game.save);
    game.cloud?.save(game.save);
  };
  game.toast = (text, sec = 1.6) => ui.toast(text, sec);
  // Chữ nhiệm vụ góc phải: bước truyện và việc treo thưởng
  game.goals = () => [game.res && resGoal(game), arenaGoal(game), game.tower && `Tháp Thử Thách: tầng ${game.tower.floor} (cao nhất ${game.save.tower?.best || 0})`, game.story?.goal()?.text, game.save?.bounty && bountyGoal(game), ...(game.save ? sideGoals(game) : [])].filter(Boolean).join('\n');
  game.say = (who, text, sec) => ui.toast(`${who}: ${text}`, sec);
  game.number = (x, y, t, c) => addNumber(game, x, y, t, c);
  game.refreshStats = () => refreshStats(game);
  game.spawn = (id, x, y, extra) => spawnMob(game, id, x, y, extra);

  game.addNpc = (id, at) => {
    const p = at ? game.map.center(at[0], at[1]) : game.map.freeNear(Math.floor(game.player.x / cfg.tile) + 1, Math.floor(game.player.y / cfg.tile) - 1, 1, 6);
    game.npcs.push({ id, def: data.npcs[id], x: p.x, y: p.y, r: 6, bob: Math.random() * 6 });
  };
  // Trang bị khởi đầu (Phàm) và tự mặc vào
  game.giveGear = bases => {
    if (game.save.flags.starterGear) return; // làm lại bước truyện không nhận thêm
    game.save.flags.starterGear = true;
    for (const b of bases) {
      const it = rollItem(data, game.save, { base: b, rarity: 'pham' });
      if (addItem(data, game.save, it)) equip(game.save, data, it.uid);
    }
    game.refreshStats(); game.persist();
  };
  // Phần thưởng cốt truyện: một món đồ định sẵn phẩm chất (r.base, r.rarity) và/hoặc đá tẩy luyện
  game.giveReward = r => {
    if (r.base) {
      const it = rollItem(data, game.save, { base: r.base, rarity: r.rarity, lvl: totalLayer(game.save, data.realms) });
      if (addItem(data, game.save, it)) game.newItems = (game.newItems || 0) + 1;
    }
    if (r.stones) game.save.mats['tay-luyen-thach'] = (game.save.mats['tay-luyen-thach'] || 0) + r.stones;
    game.persist();
  };
  game.learnTech = id => learnTech(game, id);
  game.eventMul = k => eventMul(game, k);
  game.addPickup = (item, tx, ty) => {
    const p = game.map.center(tx, ty);
    game.pickups.push({ item, x: p.x, y: p.y });
  };

  game.gainQi = (amount, x, y, quiet) => {
    amount = Math.round(amount * (game.player?.st.qiMul || 1) * 10) / 10;
    const broke = addQi(game.save, data.realms, amount);
    gainTechExp(game, amount);
    gainPetExp(game, amount);
    gainCompExp(game, amount);
    if (!quiet) addNumber(game, x, y - 18, `+${amount} linh khí`, '#bff4ff');
    if (broke > 0) {
      game.refreshStats(); game.player.hp = game.player.maxHp;
      checkUnlocks(game);
      addFx(game, { type: 'ring', x: game.player.x, y: game.player.y, r: 40, color: '#bff4ff', life: 0.8, fill: true });
      game.toast(`Đột phá! ${realmLabel(game.save, data.realms)}`, 2.2);
      game.sfx('levelup');
      game.screen.shake(3, 0.3);
    } else if (broke === -1 && !game.capWarned) {
      game.capWarned = true;
      game.toast('Linh khí đã đầy tới đỉnh! Bấm "Độ thiên kiếp" để đột phá.', 3);
    }
    game.persist();
  };

  game.onKill = m => {
    if (m.tower) { resKill(game, m); return; } // quái trong tháp, bí cảnh tài nguyên: chỉ tính ở đó
    countKill(game, m);
    if (m.def.ai === 'boss') praise(game, 'boss', { boss: m.def.name });
    dropLoot(game, m);
    coinDrop(game, m);
    bountyKill(game, m);
    sideKill(game, m);
    techDrop(game, m);
    matDrop(game, m);
    petKill(game, m);
    eventKill(game, m);
    dailyEvent(game, 'kill', m.id);
    if (m.rare) dailyEvent(game, 'rare', m.id);
    game.story.notify('kill', m.id);
    if (m.def.ai === 'boss') { if (!m.wb) game.story.notify('boss'); game.toast(`Hạ ${m.def.name}!`, 2); }
  };

  function loadMap(id, spawnName) {
    if (game.loot.length && game.save) collectAll(game);
    const def = data.maps[id];
    game.map = buildMap(def, data.tiles, cfg.tile);
    game.mobs = []; game.bullets = []; game.pickups = []; game.loot = []; game.npcs = []; game.fx = []; game.numbers = []; game.strikes = []; game.zones = [];
    const sp = def.spawns[spawnName || 'vao'] || def.spawns.vao;
    const c = game.map.center(sp[0], sp[1]);
    if (!game.player) game.player = createPlayer(game, c.x, c.y);
    game.player.x = c.x; game.player.y = c.y; game.player.meditating = false;
    for (const n of def.npcs) {
      if ((n.unless && game.save.flags[n.unless]) || (n.need && !game.save.flags[n.need])) continue;
      if (n.id === game.save.companion && !game.story.wants(n.id) && !hasSide(game, n.id)) continue; // đang đi cùng người chơi
      game.addNpc(n.id, n.at);
    }
    spawnPet(game); spawnCompanion(game); spawnSidePickups(game); spawnHome(game); spawnWild(game);
    game.spawners = def.spawners.map(s => ({ ...(s.farm ? data.planets.farm : {}), ...s, alive: [], timer: 0 }));   // bãi treo máy: số con, tốc hồi ở planets.json
    festSpawn(game, def);
    game.dungeon = createDungeon(game);
    game.darkTarget = def.dark || 0; game.dark = game.darkTarget;
    standUp(game); game.fish = null;
    game.save.map = id; game.save.spawn = spawnName || 'vao';
    (game.save.visited ??= {})[id] = true;
    game.portalLock = 0.8;
    joinOnline();
    audio?.music(id);
    screen.snap(c.x, c.y);
    game.persist();
  }

  // fly: đi bằng cảnh bay/truyền tống; opts.text là chữ hiện trên đường, opts.with là NPC chở người chơi
  game.travel = async (id, spawnName, fly, opts = {}) => {
    game.traveling = true;
    if (fly) {
      ui.tripMode(true);
      await startTrip(game, id, { ...opts, text: opts.text || `Ngự kiếm bay tới ${data.maps[id].name}` }, () => loadMap(id, spawnName));
      ui.tripMode(false);
      game.player.hp = game.player.maxHp; // nghỉ ngơi trên đường bay
    }
    else loadMap(id, spawnName);
    game.traveling = false;
    game.story.notify('enter', id);
  };

  // Bí cảnh là phòng riêng, chưa đồng bộ quái nên không hiện người khác
  function joinOnline() {
    if (!game.online) return;
    const solo = (game.map.def.rooms || []).length > 0;
    game.online.join(solo ? null : game.map.id, { element: game.save.element, realm: realmLabel(game.save, data.realms) })
      .catch(() => game.toast('Mất kết nối, đang chơi một mình.'));
  }

  // Lưu máy chủ: chỉ khi config bật server_save và đã đăng nhập. Lỗi mạng thì vẫn chơi với bản trong máy.
  async function loadCloud(session) {
    game.cloud = null;
    if (!session || !cfg.server_save) return null;
    try {
      const { createCloudSave } = await import('../net/profile.js');
      game.cloud = createCloudSave({
        onConflict: () => game.toast('Tài khoản đang chơi ở máy khác. Tải lại game để tiếp tục lưu.', 4),
        onError: () => game.toast('Chưa lưu được lên máy chủ, sẽ thử lại.', 1.5),
      });
      return await Promise.race([game.cloud.load(), new Promise((_, no) => setTimeout(() => no(new Error('cham')), cfg.cloud_timeout_ms || 8000))]);
    } catch { game.cloud = null; game.cloudDown = true; return null; }   // máy chủ chậm hoặc lỗi: chơi bằng bản trong máy, không lưu lên
  }

  game.begin = async ({ fresh, session, owner }) => {
    if (game.beginning) return;   // bấm nhiều lần lúc đang tải
    game.beginning = true;
    try { await beginGame({ fresh, session, owner }); } finally { game.beginning = false; }
  };

  async function beginGame({ fresh, session, owner }) {
    game.owner = owner;
    if (session) {
      try {
        const { createOnline } = await import('../net/online.js');
        const me = { id: session.user.id, name: 'Đạo hữu' };   // tên hiển thị lấy từ máy chủ ngay dưới (không dùng tên đăng nhập)
        game.online = createOnline(me, {
          onPresence: l => game.others.presence(l), onMove: p => game.others.move(p), onClear: () => game.others.clear(), onSay: p => onSay(game, p),
        });
      } catch { game.online = null; }
    }
    const msg = document.getElementById('login-msg');
    if (session && msg) { msg.classList.remove('bad'); msg.textContent = 'Đang tải bản lưu...'; }
    game.cloudDown = false;
    const local = loadSave(owner), remote = await loadCloud(session);
    if (game.online && game.cloud?.name) game.online.me.name = game.cloud.name;
    if (game.cloudDown && !local && !fresh) {   // máy này chưa có bản lưu, máy chủ không trả lời: đừng mở game trống
      if (msg) { msg.classList.add('bad'); msg.textContent = 'Máy chủ đang chậm, chưa tải được bản lưu. Bấm lại sau ít phút.'; }
      return;
    }
    if (msg) msg.textContent = '';
    if (remote && !local) fresh = false; // máy mới chưa có bản lưu: menu chỉ có nút Bắt đầu, vẫn chơi tiếp bản trên máy chủ
    const saved = remote && local && (local.lastSeen || 0) > (remote.lastSeen || 0) ? local : remote || local;   // bản trong máy mới hơn (chơi lúc máy chủ chậm) thì giữ bản trong máy
    game.save = fresh || !saved ? newSave(cfg) : saved;
    const lastSeen = game.save.lastSeen; // đọc trước khi nạp bản đồ ghi đè
    ensureInv(game.save); fixGearPct(game.data, game.save); ensureTech(game.save); ensureCave(game.save); ensurePets(game.save); ensureStats(game.save);
    if (game.save.element && !game.save.root) game.save.root = rollRoot(data); // bản lưu trước khi có phẩm linh căn
    const ptIdx = data.story.steps.findIndex(x => x.id === 'phan-than');
    if (game.save.step > ptIdx && !Object.keys(game.save.techs).length) game.pendingTech = data.techniques.starter; // bản lưu trước khi có công pháp
    ensureDaily(game);
    if (!game.save.visited) { // bản lưu trước khi có bản đồ thế giới: đảo có cổng đã mở coi như đã tới
      const v = game.save.visited = { [cfg.start.map]: true };
      if (game.save.step >= data.story.steps.findIndex(x => x.id === 'nhap-mon')) v['thien-kiem-phong'] = true;
      for (const m of Object.values(data.maps)) for (const pt of m.portals) if (pt.need && game.save.flags[pt.need]) v[pt.to] = true;
    }
    game.story = createStory(game);
    game.trib = createTribulation(game);
    game.checkUnlocks = () => checkUnlocks(game);
    loadMap(game.save.map, game.save.spawn);
    game.refreshStats(); game.player.hp = game.player.maxHp;
    game.checkUnlocks(); // bản lưu cũ: ghi nhận chiêu đã có, không báo
    if (game.pendingTech) { learnTech(game, game.pendingTech); game.pendingTech = null; }
    ui.showPlay(true);
    initRank(game);
    await offlineGains(game, lastSeen);
    eventToast(game); checkFestival(game);
    if (game.cloudDown) game.toast('Máy chủ đang chậm: đang chơi bằng bản lưu trong máy, chưa lưu lên máy chủ.', 4);
    await game.story.start();
  }

  function respawn() {
    if (!game.tower && !game.arena) pilotDied(game);   // gục trong tháp, trên đài thì chỉ là thua; việc vặt ngoài trời thì tự hành đi tiếp
    if (game.trib.active) game.trib.fail();
    else if (!towerFail(game) && !arenaFail(game)) game.toast('Bạn đã gục... hồi phục ở điểm hồi sinh.', 2);
    const p = game.player, sp = game.map.def.spawns.vao, c = game.map.center(sp[0], sp[1]);
    p.x = c.x; p.y = c.y; p.hp = p.maxHp; p.shield = 0; p.kx = p.ky = 0; p.invT = 1.5;
    game.bullets = [];
    for (const m of game.mobs) { m.x = m.hx; m.y = m.hy; m.state = 'idle'; m.tele = null; }
    screen.snap(c.x, c.y);
  }

  function updateSpawners(dt) {
    for (const s of game.spawners) {
      if ((s.need && !game.save.flags[s.need]) || (s.unless && game.save.flags[s.unless])) continue;
      s.alive = s.alive.filter(m => !m.dead);
      if (s.alive.length >= s.n) continue;
      s.timer -= dt;
      if (s.timer > 0) continue;
      s.timer = s.respawn;
      const p = game.map.freeNear(s.at[0], s.at[1], s.spread, 7);
      const m = game.spawn(s.mob, p.x, p.y);
      if (s.mul > 1) scaleMobBy(game, m, s.mul);
      if (s.farm) m.lootMul = data.planets.farm.loot;
      maybeRare(game, m); s.alive.push(m);
    }
  }

  function updateTaps(dt) {
    for (const tap of game.input.taps) {
      const w = screen.toWorld(tap.x, tap.y);
      let best = null, bd = cfg.tap_range;
      for (const e of [...game.npcs, ...game.mobs, ...game.others.visible()]) { const d = Math.hypot(e.x - w.x, e.y - 4 - w.y); if (d < bd) { bd = d; best = e; } }
      if (best) game.peek = { e: best, t: 3 };
    }
    game.input.taps.length = 0;
    if (game.peek && (game.peek.t -= dt) <= 0) game.peek = null;
  }

  game.update = dt => {
    game.time += dt;
    updateFx(game, dt);
    game.flashT -= dt;
    game.dark += (game.darkTarget - game.dark) * Math.min(1, dt * 2);
    if (game.trip) { updateTrip(game, dt); return; }
    if (!game.save || game.traveling) return;
    pilotDialog(game, dt);
    const blocked = game.dialog.open || game.uiOpen;
    game.paused = blocked;
    if (blocked) { game.input.clear(); return; }
    if (game.hitstop > 0) { game.hitstop -= dt; return; }
    updateTaps(dt);
    updatePlayer(game, dt);
    updateRide(game, dt);
    updatePet(game, dt);
    updateCompanion(game, dt); updateCombo(game, dt);
    game.others.update(dt);
    game.online?.send(game.player, game.player.swingT > 0.15 ? { sw: 1 } : {});
    updateMobs(game, dt);
    updateBullets(game, dt);
    updateStrikes(game, dt);
    updateZones(game, dt);
    game.trib.update(dt);
    updateLoot(game, dt);
    updatePickups(game);
    updateSpawners(dt);
    game.dungeon?.update();
    updateParty(game, dt);
    updateTower(game, dt);
    updateArena(game, dt);
    updatePraise(game, dt);
    updateGarden(game, dt);
    updateDayNight(game, dt);
    updateWeather(game, dt);
    updateJournal(game, dt);
    updateHome(game, dt);
    updateChatter(game, dt);
    updateStroll(game, dt); updateWild(game, dt);
    updateKyNgo(game, dt);
    updatePilotLog(game);
    updateEta(game, dt);
    updateAnniv(game, dt);
    updateCritters(game, dt);
    updateSocial(game, dt);
    updatePetFetch(game, dt);
    updateFishing(game, dt);
    updateView(game, dt);
    if ((game.achvT = (game.achvT || 0) - dt) <= 0) { game.achvT = 2; checkAchv(game); }
    updateRes(game, dt);
    updateWorldBoss(game, dt);
    updateInteract(game);
    updatePortals(game, dt);
    for (const n of game.npcs) n.bob += dt * 3;
    game.story.update();
    if (game.player.hp <= 0) respawn();
    if ((game.stampT = (game.stampT ?? 30) - dt) <= 0) { game.stampT = 30; game.persist(); } // mốc giờ cho bế quan khi vắng
    screen.follow(game.player.x, game.player.y - 4 + viewPan(game), dt, game.map);
  };

  return game;
}
