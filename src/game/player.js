// Người chơi: đi lại, đánh thường theo cung, chiêu, đả tọa.
import { addFx, hitMob, dist } from './combat.js';
import { castSkill, skillSlots } from './skills.js';
import { playerStats } from './stats.js';

export function createPlayer(game, x, y) {
  const cfg = game.data.config.player;
  const st = playerStats(game.save, game.data);
  return {
    x, y, r: cfg.radius, face: { x: 0, y: 1 }, moving: false, walkT: 0,
    hp: st.maxHp, maxHp: st.maxHp, atk: st.atk,
    atkCd: 0, swingT: 0, skillCd: [0, 0, 0],
    invT: 0, flash: 0, kx: 0, ky: 0, dashT: 0,
    shield: 0, shieldT: 0, buffT: 0, buffAmt: 0,
    meditating: false, regenT: 0,
  };
}

export function refreshStats(game) {
  const p = game.player, st = playerStats(game.save, game.data);
  const grow = st.maxHp - p.maxHp;
  p.maxHp = st.maxHp; p.atk = st.atk; p.hp = Math.min(p.maxHp, p.hp + Math.max(0, grow));
}

function nearestMob(game, range) {
  let best = null, bd = range;
  for (const m of game.mobs) {
    if (m.dead) continue;
    const d = dist(game.player, m) - m.r;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

function swing(game) {
  const p = game.player, w = game.data.weapons[game.save.weapon];
  // Tự quay về phía quái gần nhất (dễ đánh trên điện thoại)
  const target = nearestMob(game, w.range + 24);
  if (target) {
    const a = Math.atan2(target.y - p.y, target.x - p.x);
    p.face = { x: Math.cos(a), y: Math.sin(a) };
  }
  const ang = Math.atan2(p.face.y, p.face.x), half = w.arc / 2 * Math.PI / 180;
  addFx(game, { type: 'arc', x: p.x, y: p.y - 3, r: w.range, a: ang, half, color: w.color, life: 0.18 });
  for (const m of game.mobs) {
    if (m.dead) continue;
    const d = dist(p, m);
    if (d > w.range + m.r) continue;
    let da = Math.atan2(m.y - p.y, m.x - p.x) - ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) <= half || d < m.r + p.r + 2) hitMob(game, m, p.atk, { color: w.color });
  }
  p.swingT = 0.18;
  return w.cooldown;
}

export function updatePlayer(game, dt) {
  const p = game.player, inp = game.input, cfg = game.data.config;
  p.invT -= dt; p.flash -= dt; p.atkCd -= dt; p.swingT -= dt; p.dashT -= dt;
  p.skillCd = p.skillCd.map(c => c - dt);
  if (p.shieldT > 0 && (p.shieldT -= dt) <= 0) p.shield = 0;
  if (p.buffT > 0) p.buffT -= dt;

  // Đẩy lùi
  if (p.kx || p.ky) {
    game.map.move(p, p.kx * dt, p.ky * dt);
    p.kx *= Math.exp(-dt * 12); p.ky *= Math.exp(-dt * 12);
    if (Math.abs(p.kx) + Math.abs(p.ky) < 2) { p.kx = 0; p.ky = 0; }
  }

  const ax = inp.axis();
  p.moving = Math.hypot(ax.x, ax.y) > 0.1;
  if (p.moving) {
    p.meditating = false;
    const sp = cfg.player.speed * Math.min(1, Math.hypot(ax.x, ax.y) * 1.3);
    const d = Math.hypot(ax.x, ax.y);
    game.map.move(p, ax.x / d * sp * dt, ax.y / d * sp * dt);
    p.face = { x: ax.x / d, y: ax.y / d };
    p.walkT += dt;
  }

  if (inp.held.has('atk') && p.atkCd <= 0) { p.meditating = false; p.atkCd = swing(game); }

  const slots = skillSlots(game);
  for (let i = 0; i < 3; i++) {
    if (inp.consume('s' + i) && slots[i] && p.skillCd[i] <= 0) {
      p.meditating = false;
      p.skillCd[i] = castSkill(game, slots[i]);
    }
  }

  // Hồi máu chậm khi không bị đánh
  if (p.invT < -3 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + cfg.player.regen * dt * (p.meditating ? 6 : 1));

  if (p.meditating) {
    p.medT = (p.medT || 0) + dt;
    if (p.medT >= 0.5) { p.medT -= 0.5; game.gainQi(cfg.meditate.qi_per_sec * 0.5, p.x, p.y, true); }
  }
}
