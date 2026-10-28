// Thiên kiếp: ở tầng 9 đầy linh khí, người chơi gọi kiếp. Mỗi cảnh giới một kiểu (data/realms.json → tribulation.by_realm):
// sét, sét thành hàng, tâm ma (bóng của chính mình, máu theo cả máu lẫn công của người chơi), lửa trời, hoặc trộn. Trụ hết các đợt (và hạ tâm ma nếu có) thì lên
// cảnh giới mới; gục thì thất bại và mất một phần linh khí.
import { qiNeed, realmLabel } from './stats.js';
import { addStrike } from './strikes.js';
import { addFx } from './combat.js';

export function atPeak(game) {
  const s = game.save, r = game.data.realms;
  return s.layer >= r.layers && s.qi >= qiNeed(s, r) && s.realm < r.names.length - 1;
}

// Thông số kiếp của cảnh giới hiện tại: số chung đè bởi by_realm
export function tribOf(game) {
  const cfg = game.data.realms.tribulation, by = cfg.by_realm[game.save.realm] || cfg.by_realm[cfg.by_realm.length - 1];
  return { ...cfg, ...by, info: cfg.kinds[by.kind] };
}

export function createTribulation(game) {
  let run = null;

  function strike(x, y, k, kind = 'set') {
    const c = run.cfg, hoa = kind === 'hoa';
    addStrike(game, {
      x, y, r: c.r * (hoa ? 1.35 : 1), delay: c.delay * (hoa ? 1.15 : 1),
      dmg: game.player.maxHp * c.dmg_pct * k * (1 - (game.save.flags.thanhTam || 0)),
      kind: hoa ? 'meteor' : 'thunder', color: hoa ? '#ff9a3a' : run.cfg.info.color,
    });
  }

  // Một hàng sét ngang hoặc dọc đi qua chỗ đứng
  function line(p, k) {
    const horiz = Math.random() < 0.5, step = run.cfg.r * 1.7;
    for (let i = -3; i <= 3; i++) strike(p.x + (horiz ? i * step : 0), p.y + (horiz ? 0 : i * step), k * 0.8);
  }

  function spawnShadow() {
    const p = game.player, c = run.cfg.info, base = game.data.mobs['tam-ma'];
    const hp = Math.round(Math.max(p.maxHp * c.hp, p.atk * (c.hp_atk || 0))), def = { ...base, hp, atk: Math.round(p.atk * c.atk * 10) / 10 };
    const pos = game.map.freeNear(Math.floor(p.x / game.map.T) + 1, Math.floor(p.y / game.map.T), 1, 6);   // sát bên, kẻo mọc sau hàng rào, vách
    run.shadow = game.spawn('tam-ma', pos.x, pos.y, { def, hp, maxHp: hp, noQi: true, tower: true, aggro: true });
    addFx(game, { type: 'ring', x: pos.x, y: pos.y, r: 26, color: c.color, life: 0.8, fill: true });
    game.toast('Tâm ma hiện hình!', 1.6);
  }

  // Tâm ma kẹt xa (sau cây, vách, không tới được) quá FAR_SEC giây thì hiện lại sát bên người chơi: kiếp chỉ xong khi hạ tâm ma,
  // trước đây tâm ma kẹt là kiếp không bao giờ kết thúc (chơi thử 28/10: đứng mãi ở Làng Tinh Linh)
  const FAR = 120, FAR_SEC = 6;
  function keepShadowNear(dt) {
    const m = run.shadow, p = game.player;
    if (!m || m.dead) return;
    run.far = Math.hypot(m.x - p.x, m.y - p.y) > FAR ? (run.far || 0) + dt : 0;
    if (run.far < FAR_SEC) return;
    const T = game.map.T, pos = game.map.freeNear(Math.floor(p.x / T), Math.floor(p.y / T), 1, 6);
    m.x = pos.x; m.y = pos.y; m.kx = m.ky = 0; run.far = 0;
    addFx(game, { type: 'ring', x: pos.x, y: pos.y, r: 26, color: run.cfg.info.color, life: 0.8, fill: true });
    game.toast('Tâm ma đuổi tới sát bên!', 1.4);
  }

  return {
    get active() { return !!run; },
    get wave() { return run ? run.wave : 0; },
    canStart() { return !run && atPeak(game) && !game.dungeon && !game.map.def.no_trib; },
    async start() {
      const cfg = tribOf(game), info = cfg.info;
      await game.dialog.say([['', `Linh khí trong người đã đầy tới đỉnh. ${info.intro}`], ['', `${info.name}, ${cfg.waves} đợt. ${info.tip}`]]);
      run = { wave: 0, t: 1, cfg, shadow: null };
      game.player.meditating = false; game.auto = false;
      game.darkTarget = 0.55;
      game.sfx('roar');
      if (cfg.kind === 'tam-ma' || cfg.kind === 'mix') spawnShadow();
    },
    update(dt) {
      if (!run) return;
      if (run.shadow && !run.shadow.dead && !game.mobs.includes(run.shadow)) spawnShadow();   // đổi bản đồ giữa kiếp: tâm ma cũ mất theo bản đồ, cho hiện lại (trước đây kiếp kẹt mãi)
      keepShadowNear(dt);
      run.t -= dt;
      if (run.t > 0) return;
      const c = run.cfg, shadowAlive = run.shadow && !run.shadow.dead;
      if (run.wave >= c.waves) { if (!shadowAlive) this.finish(); else run.t = 0.3; return; }
      run.wave++;
      run.t = c.interval;
      const p = game.player, k = 1 + run.wave * c.grow;
      const kind = c.kind === 'mix' ? ['set', 'loi', 'hoa'][Math.floor(Math.random() * 3)] : c.kind;
      const light = kind === 'tam-ma';          // tâm ma: sét nhẹ và thưa
      const extra = light ? 0 : c.extra + Math.floor(run.wave / 3) + (kind === 'hoa' ? 1 : 0);
      strike(p.x, p.y, light ? k * 0.5 : k, kind);
      if (kind === 'loi' && run.wave % 2 === 0) line(p, k);
      for (let i = 0; i < extra; i++) {
        const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * (kind === 'hoa' ? 60 : 40);
        strike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, k, kind);
      }
    },
    finish() {
      run = null;
      const s = game.save;
      s.realm += 1; s.layer = 1; s.qi = 0; delete s.flags.thanhTam;
      game.capWarned = false;
      game.darkTarget = game.map.def.dark || 0;
      game.refreshStats(); game.player.hp = game.player.maxHp;
      game.flashT = 0.35;
      addFx(game, { type: 'ring', x: game.player.x, y: game.player.y, r: 70, color: '#fff7d6', life: 1.2, fill: true });
      game.sfx('levelup'); game.screen.shake(6, 0.6);
      game.toast(`Độ kiếp thành công! ${realmLabel(s, game.data.realms)}`, 3);
      game.checkUnlocks();
      game.story.notify('realm');
      game.persist();
    },
    // Gục giữa kiếp: mất một phần linh khí, phải tích lại rồi thử lần nữa
    fail() {
      if (!run) return;
      const c = run.cfg;
      if (run.shadow) run.shadow.dead = true;
      run = null; game.strikes = [];
      game.save.qi = Math.floor(game.save.qi * (1 - c.fail_qi));
      game.darkTarget = game.map.def.dark || 0;
      game.toast(`Độ kiếp thất bại... mất ${Math.round(c.fail_qi * 100)}% linh khí. Tu luyện thêm rồi thử lại.`, 3);
      game.persist();
    },
  };
}
