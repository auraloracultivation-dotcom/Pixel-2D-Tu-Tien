// Trạng thái ván chơi và vòng cập nhật. Vẽ ở src/render, giao diện ở src/ui.
import { buildMap } from '../world/map.js';
import { loadSave, newSave, writeSave } from '../core/save.js';
import { createPlayer, updatePlayer, refreshStats } from './player.js';
import { spawnMob, updateMobs } from './mobs.js';
import { updateBullets, updateFx, addFx, addNumber, dist } from './combat.js';
import { addQi, realmLabel } from './stats.js';
import { createStory } from './story.js';
import { createDungeon } from './dungeon.js';
import { createOthers } from './others.js';
import { dropLoot, updateLoot, collectAll } from './loot.js';
import { ensureInv, rollItem, addItem, equip } from './items.js';

export function createGame(data, screen, input, ui, audio) {
  const cfg = data.config;
  const game = {
    data, screen, input, dialog: ui.dialog, ui,
    save: null, map: null, player: null,
    mobs: [], npcs: [], pickups: [], bullets: [], fx: [], numbers: [], loot: [],
    spawners: [], dungeon: null, story: null,
    hitstop: 0, flashT: 0, dark: 0, darkTarget: 0, noDeath: false,
    traveling: false, paused: false, portalLock: 0, peek: null, time: 0,
    owner: 'guest', online: null, others: null,
  };
  game.sfx = (name, vol) => audio?.play(name, vol);
  game.others = createOthers(game);

  game.persist = () => {
    if (!game.save || !game.map) return;
    writeSave(game.owner, game.save);
    game.cloud?.save(game.save);
  };
  game.toast = (text, sec = 1.6) => ui.toast(text, sec);
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
  game.addPickup = (item, tx, ty) => {
    const p = game.map.center(tx, ty);
    game.pickups.push({ item, x: p.x, y: p.y });
  };

  game.gainQi = (amount, x, y, quiet) => {
    amount = Math.round(amount * (game.player?.st.qiMul || 1) * 10) / 10;
    const broke = addQi(game.save, data.realms, amount);
    if (!quiet) addNumber(game, x, y - 18, `+${amount} linh khí`, '#bff4ff');
    if (broke > 0) {
      game.refreshStats(); game.player.hp = game.player.maxHp;
      addFx(game, { type: 'ring', x: game.player.x, y: game.player.y, r: 40, color: '#bff4ff', life: 0.8, fill: true });
      game.toast(`Đột phá! ${realmLabel(game.save, data.realms)}`, 2.2);
      game.sfx('levelup');
      game.screen.shake(3, 0.3);
    } else if (broke === -1 && !game.capWarned) {
      game.capWarned = true;
      game.toast('Đã tới đỉnh cảnh giới. Cần độ thiên kiếp (sắp có).', 2.5);
    }
    game.persist();
  };

  game.onKill = m => {
    dropLoot(game, m);
    if (m.def.ai === 'boss') { game.story.notify('boss'); game.toast(`Hạ ${m.def.name}!`, 2); }
  };

  function loadMap(id, spawnName) {
    if (game.loot.length && game.save) collectAll(game);
    const def = data.maps[id];
    game.map = buildMap(def, data.tiles, cfg.tile);
    game.mobs = []; game.bullets = []; game.pickups = []; game.loot = []; game.npcs = []; game.fx = []; game.numbers = [];
    const sp = def.spawns[spawnName || 'vao'] || def.spawns.vao;
    const c = game.map.center(sp[0], sp[1]);
    if (!game.player) game.player = createPlayer(game, c.x, c.y);
    game.player.x = c.x; game.player.y = c.y; game.player.meditating = false;
    for (const n of def.npcs) {
      if (n.unless && game.save.flags[n.unless]) continue;
      game.addNpc(n.id, n.at);
    }
    game.spawners = def.spawners.map(s => ({ ...s, alive: [], timer: 0 }));
    game.dungeon = createDungeon(game);
    game.darkTarget = def.dark || 0; game.dark = game.darkTarget;
    game.save.map = id; game.save.spawn = spawnName || 'vao';
    game.portalLock = 0.8;
    joinOnline();
    audio?.music(id);
    screen.snap(c.x, c.y);
    game.persist();
  }

  game.travel = async (id, spawnName, fly, text) => {
    game.traveling = true;
    if (fly) {
      game.sfx('fly');
      await ui.fly(text || `Ngự kiếm bay tới ${data.maps[id].name}...`, () => loadMap(id, spawnName));
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
      return await game.cloud.load();
    } catch { return null; }
  }

  game.begin = async ({ fresh, session, owner }) => {
    game.owner = owner;
    if (session) {
      try {
        const { createOnline } = await import('../net/online.js');
        const me = { id: session.user.id, name: session.user.email.split('@')[0] };
        game.online = createOnline(me, {
          onPresence: l => game.others.presence(l), onMove: p => game.others.move(p), onClear: () => game.others.clear(),
        });
      } catch { game.online = null; }
    }
    const local = loadSave(owner), remote = await loadCloud(session);
    if (remote && !local) fresh = false; // máy mới chưa có bản lưu: menu chỉ có nút Bắt đầu, vẫn chơi tiếp bản trên máy chủ
    const saved = remote || local;
    game.save = fresh || !saved ? newSave(cfg) : saved;
    ensureInv(game.save);
    game.story = createStory(game);
    loadMap(game.save.map, game.save.spawn);
    game.refreshStats(); game.player.hp = game.player.maxHp;
    ui.showPlay(true);
    await game.story.start();
  };

  function respawn() {
    game.toast('Bạn đã gục... hồi phục ở điểm hồi sinh.', 2);
    const p = game.player, sp = game.map.def.spawns.vao, c = game.map.center(sp[0], sp[1]);
    p.x = c.x; p.y = c.y; p.hp = p.maxHp; p.shield = 0; p.kx = p.ky = 0; p.invT = 1.5;
    game.bullets = [];
    for (const m of game.mobs) { m.x = m.hx; m.y = m.hy; m.state = 'idle'; m.tele = null; }
    screen.snap(c.x, c.y);
  }

  function nearestNpc(range) {
    let best = null, bd = range;
    for (const n of game.npcs) { const d = dist(n, game.player); if (d < bd) { bd = d; best = n; } }
    return best;
  }

  function onMeditateSpot() {
    const T = cfg.tile, p = game.player;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
      if (game.map.at(x, y) === 'M') { const c = game.map.center(x, y); if (Math.hypot(c.x - p.x, c.y - p.y) < cfg.meditate.range) return true; }
    }
    return false;
  }

  // Nút tương tác theo ngữ cảnh: nói chuyện / đả tọa
  function updateInteract() {
    const npc = nearestNpc(cfg.interact_range);
    const med = !npc && onMeditateSpot();
    game.actLabel = npc ? `Nói chuyện` : med ? (game.player.meditating ? 'Dừng đả tọa' : 'Đả tọa') : null;
    if (!game.input.consume('act')) return;
    if (npc) {
      if (game.story.wants(npc.id)) { game.story.notify('talk', npc.id); return; }
      const lines = npc.def.lines;
      game.dialog.say([[npc.def.name, lines[Math.floor(Math.random() * lines.length)]]]);
    } else if (med) {
      game.player.meditating = !game.player.meditating;
      if (game.player.meditating) game.toast('Đả tọa... linh khí chảy vào người', 1.4);
    }
  }

  function updatePortals(dt) {
    game.portalLock -= dt;
    if (game.portalLock > 0) return;
    for (const pt of game.map.def.portals) {
      const c = game.map.center(pt.at[0], pt.at[1]);
      if (Math.hypot(c.x - game.player.x, c.y - game.player.y) > 9) continue;
      if (pt.need && !game.save.flags[pt.need]) { game.toast('Cổng chưa mở.', 1.2); game.portalLock = 1.5; return; }
      game.travel(pt.to, pt.spawn, true, `Bay tới ${pt.label}...`);
      return;
    }
  }

  function updatePickups() {
    const p = game.player;
    for (const k of game.pickups) {
      if (k.taken || dist(k, p) > 12) continue;
      k.taken = true;
      game.story.notify('collect', k.item);
      game.toast('Hái được linh thảo!', 1);
      game.sfx('pickup');
    }
    game.pickups = game.pickups.filter(k => !k.taken);
  }

  function updateSpawners(dt) {
    for (const s of game.spawners) {
      s.alive = s.alive.filter(m => !m.dead);
      if (s.alive.length >= s.n) continue;
      s.timer -= dt;
      if (s.timer > 0) continue;
      s.timer = s.respawn;
      const p = game.map.freeNear(s.at[0], s.at[1], s.spread, 7);
      s.alive.push(game.spawn(s.mob, p.x, p.y));
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
    if (!game.save || game.traveling) return;
    const blocked = game.dialog.open || game.uiOpen;
    game.paused = blocked;
    if (blocked) { game.input.clear(); return; }
    if (game.hitstop > 0) { game.hitstop -= dt; return; }
    updateTaps(dt);
    updatePlayer(game, dt);
    game.others.update(dt);
    game.online?.send(game.player, game.player.swingT > 0.15 ? { sw: 1 } : {});
    updateMobs(game, dt);
    updateBullets(game, dt);
    updateLoot(game, dt);
    updatePickups();
    updateSpawners(dt);
    game.dungeon?.update();
    updateInteract();
    updatePortals(dt);
    for (const n of game.npcs) n.bob += dt * 3;
    game.story.update();
    if (game.player.hp <= 0) respawn();
    screen.follow(game.player.x, game.player.y - 4, dt, game.map);
  };

  return game;
}
