// Thiên kiếp: ở tầng 9 đầy linh khí, người chơi gọi kiếp. Sét giáng từng đợt vào chỗ đang đứng và quanh đó,
// phải chạy né. Trụ hết các đợt thì lên cảnh giới mới; gục thì thất bại và mất một phần linh khí.
import { qiNeed, realmLabel } from './stats.js';
import { addStrike } from './strikes.js';
import { addFx } from './combat.js';

export function atPeak(game) {
  const s = game.save, r = game.data.realms;
  return s.layer >= r.layers && s.qi >= qiNeed(s, r) && s.realm < r.names.length - 1;
}

export function createTribulation(game) {
  const cfg = game.data.realms.tribulation;
  let run = null;

  function strike(x, y, k) {
    addStrike(game, { x, y, r: cfg.r, delay: cfg.delay, dmg: game.player.maxHp * cfg.dmg_pct * k, kind: 'thunder', color: '#bff4ff' });
  }

  return {
    get active() { return !!run; },
    get wave() { return run ? run.wave : 0; },
    canStart() { return !run && atPeak(game) && !game.dungeon && !game.map.def.no_trib; },
    async start() {
      await game.dialog.say([['', `Linh khí trong người đã đầy tới đỉnh. Mây đen tụ lại trên đầu... Thiên kiếp ${cfg.waves} đạo sắp giáng xuống!`], ['', 'Chạy né vòng sáng. Trụ hết các đạo sét để đột phá.']]);
      run = { wave: 0, t: 1 };
      game.player.meditating = false;
      game.darkTarget = 0.55;
      game.sfx('roar');
    },
    update(dt) {
      if (!run) return;
      run.t -= dt;
      if (run.t > 0) return;
      if (run.wave >= cfg.waves) { this.finish(); return; }
      run.wave++;
      run.t = cfg.interval;
      const p = game.player, extra = cfg.extra + Math.floor(run.wave / 3);
      const k = 1 + run.wave * cfg.grow;
      strike(p.x, p.y, k);
      for (let i = 0; i < extra; i++) {
        const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 40;
        strike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, k);
      }
    },
    finish() {
      run = null;
      const s = game.save;
      s.realm += 1; s.layer = 1; s.qi = 0;
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
      run = null; game.strikes = [];
      game.save.qi = Math.floor(game.save.qi * (1 - cfg.fail_qi));
      game.darkTarget = game.map.def.dark || 0;
      game.toast(`Độ kiếp thất bại... mất ${Math.round(cfg.fail_qi * 100)}% linh khí. Tu luyện thêm rồi thử lại.`, 3);
      game.persist();
    },
  };
}
