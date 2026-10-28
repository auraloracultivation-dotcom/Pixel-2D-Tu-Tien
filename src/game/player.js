// Người chơi: đi lại, đánh thường theo cung, chiêu, đả tọa.
import { addFx, hitMob, dist, shoot } from './combat.js';
import { castSkill, skillSlots } from './skills.js';
import { playerStats, weaponId, artSkill } from './stats.js';
import { usePill } from './cave.js';
import { rideSpeed } from './pets.js';
import { dailyEvent } from './daily.js';
import { autoStep } from './auto.js';
import { pilotStep } from './pilot.js';
import { noteQi } from './eta.js';
import { pilotOpt } from './pilotopt.js';
import { meditateMul } from './evolve.js';
import { nightMul } from './daynight.js';
import { rainMul } from './weather.js';
import { songTuMul } from './affinity.js';
import { homeMul, teaMul } from './home.js';
import { mealMul } from './cooking.js';
import { bump } from './achieve.js';
import { startStrike, updateFlyWeapon, weaponPoint } from './flyweapon.js';

export function createPlayer(game, x, y) {
  const cfg = game.data.config.player;
  const st = playerStats(game.save, game.data);
  return {
    x, y, r: cfg.radius, face: { x: 0, y: 1 }, moving: false, walkT: 0,
    hp: st.maxHp, maxHp: st.maxHp, atk: st.atk, st,
    atkCd: 0, swingT: 0, skillCd: [0, 0, 0],
    invT: 0, flash: 0, kx: 0, ky: 0, dashT: 0,
    shield: 0, shieldT: 0, buffT: 0, buffAmt: 0,
    meditating: false, regenT: 0,
  };
}

export function refreshStats(game) {
  const p = game.player, st = playerStats(game.save, game.data);
  const grow = st.maxHp - p.maxHp;
  p.maxHp = st.maxHp; p.atk = st.atk; p.st = st; p.hp = Math.min(p.maxHp, p.hp + Math.max(0, grow));
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

// Tự ngắm: hướng về quái gần nhất trong tầm chiêu (không có thì giữ hướng đang nhìn)
export function autoAim(game, skillId) {
  const s = game.data.skills[skillId], p = game.player;
  const reach = s.range || s.dist || ((s.offset || 0) + (s.radius || 0)) || 0;
  if (!reach) return null;
  const m = nearestMob(game, reach + 30);
  if (!m) return null;
  const a = Math.atan2(m.y - p.y, m.x - p.x);
  return { x: Math.cos(a), y: Math.sin(a) };
}

// Hệ số đánh thường (config.combat): mang càng nhiều chiêu tấn công thì đánh thường càng nhẹ, chưa có chiêu thì giữ nguyên
export function basicMul(game) {
  const C = game.data.config.combat, S = game.data.skills;
  const n = skillSlots(game).filter(id => id && S[id]?.mult).length;
  return 1 - (1 - C.basic) * Math.min(1, n / C.basic_full);
}

// Đánh thường kiểu ngự kiếm (flyweapon.js): người vận lực, vũ khí sau lưng lao ra; sát thương tính lúc vũ khí tới nơi (p.hitQ)
function swing(game) {
  const p = game.player, w = game.data.weapons[weaponId(game.save, game.data)], dmg = p.atk * basicMul(game);
  // Tự quay về phía quái gần nhất (dễ đánh trên điện thoại)
  const target = nearestMob(game, w.range + 24);
  if (target) {
    const a = Math.atan2(target.y - p.y, target.x - p.x);
    p.face = { x: Math.cos(a), y: Math.sin(a) };
  }
  const ang = Math.atan2(p.face.y, p.face.x), shot = w.attack === 'shot', half = shot ? 0 : w.arc / 2 * Math.PI / 180;
  const t = startStrike(game, shot ? 'shot' : 'arc', ang, w.range, half);
  p.hitQ = { t, ang, half, w, dmg, move: p.fw.act.move };
  p.swingT = 0.18;
  if (!shot) game.sfx('swing', 0.8);   // tiếng vút lúc vũ khí lao ra
  return w.cooldown;
}

// Vũ khí lao tới nơi: bắn đạn từ chỗ vũ khí, hoặc chém trúng quái trong cung trước mặt
function strike(game, q) {
  const p = game.player, w = q.w, ca = Math.cos(q.ang), sa = Math.sin(q.ang);
  if (q.move === 'ban') {   // đàn, cung: đạn bay ra từ vũ khí trước mặt
    const o = weaponPoint(game);
    shoot(game, { from: 'player', x: o.x, y: o.y, vx: ca * w.speed, vy: sa * w.speed, r: w.radius, dmg: q.dmg, pierce: !!w.pierce, color: w.color, life: w.range / w.speed, fx: w.fx });
    game.sfx('shoot', 0.6);
    return;
  }
  const cx = p.x, cy = p.y - 8, tip = { x: cx + ca * w.range, y: cy + sa * w.range };
  const H = game.data.heroes, look = H.list[game.save.look] || H.list[H.default];
  // Nhân vật bằng hình đã có vệt chém vẽ sẵn trong động tác: chỉ thêm vệt riêng của vũ khí (w.slash, vd. liềm); hình khối thì thêm vệt thường
  if (['quet', 'xoay', 'hat', 'moc'].includes(q.move)) { if (!look.sprite || w.slash) addFx(game, { type: 'sprite', id: w.slash || 'fx.slash', x: p.x, y: p.y - 3, s: w.range / 19, rot: q.ang, life: 0.24 }); }
  else if (q.move === 'bo') { addFx(game, { type: 'ring', x: cx + ca * w.range * 0.8, y: cy + sa * w.range * 0.8, r: 12, color: w.color, life: 0.28 }); addFx(game, { type: 'sprite', id: 'fx.spark', x: cx + ca * w.range * 0.8, y: cy + sa * w.range * 0.8, s: 1.4, life: 0.2 }); }
  else { addFx(game, { type: 'line', x: cx, y: cy, x2: tip.x, y2: tip.y, color: w.color, life: 0.16 }); addFx(game, { type: 'sprite', id: 'fx.spark', x: tip.x, y: tip.y, s: 1.2, life: 0.2 }); }   // đâm: vệt kiếm khí thẳng
  for (const m of game.mobs) {
    if (m.dead) continue;
    const d = dist(p, m);
    if (d > w.range + m.r) continue;
    let da = Math.atan2(m.y - p.y, m.x - p.x) - q.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) <= q.half || d < m.r + p.r + 2) hitMob(game, m, q.dmg, { color: w.color });
  }
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

  const auto = game.pilot ? pilotStep(game, inp.axis(), dt) : autoStep(game, inp.axis()), ax = auto.ax;
  p.moving = Math.hypot(ax.x, ax.y) > 0.1;
  // Lướt né: nút riêng, bất tử trong lúc lướt
  p.dashCd = (p.dashCd || 0) - dt;
  if (inp.consume('dash') && p.dashCd <= 0) {
    const dc = cfg.dash, d = p.moving ? Math.hypot(ax.x, ax.y) : 1, dir = p.moving ? { x: ax.x / d, y: ax.y / d } : p.face;
    p.dashCd = dc.cd; p.dashT = dc.time; p.dashV = { x: dir.x * dc.dist / dc.time, y: dir.y * dc.dist / dc.time };
    p.meditating = false; p.riding = false; p.calmT = 0; p.face = dir;
    addFx(game, { type: 'ring', x: p.x, y: p.y, r: 8, color: '#e6ebf7', life: 0.25 });
    game.sfx('dash');
  }
  if (p.dashT > 0 && p.dashV) {
    const sx = p.x, sy = p.y;
    game.map.move(p, p.dashV.x * dt, p.dashV.y * dt);
    addFx(game, { type: 'line', x: sx, y: sy, x2: p.x, y2: p.y, color: '#e6ebf7', life: 0.2 });
  } else if (p.moving) {
    p.meditating = false;
    const sp = cfg.player.speed * p.st.speedMul * rideSpeed(game) * Math.min(1, Math.hypot(ax.x, ax.y) * 1.3);
    const d = Math.hypot(ax.x, ax.y);
    game.map.move(p, ax.x / d * sp * dt, ax.y / d * sp * dt);
    p.face = { x: ax.x / d, y: ax.y / d };
    p.walkT += dt;
  }

  if ((inp.held.has('atk') || auto.atk) && p.atkCd <= 0) { p.meditating = false; p.atkCd = swing(game); }
  if (p.hitQ && (p.hitQ.t -= dt) <= 0) { const q = p.hitQ; p.hitQ = null; strike(game, q); }
  updateFlyWeapon(game, dt);

  const slots = skillSlots(game);
  for (let i = 0; i < 3; i++) {
    if (inp.consume('s' + i) && slots[i] && p.skillCd[i] <= 0) {
      p.meditating = false; p.calmT = 0; p.riding = false;
      const dir = inp.aim['s' + i] || autoAim(game, slots[i]);
      if (dir) p.face = dir;
      p.skillCd[i] = castSkill(game, slots[i]) * (1 - p.st.cdr);
    }
  }

  // Nút pháp bảo: chiêu riêng của pháp bảo đang mặc
  p.artCd = (p.artCd || 0) - dt;
  const art = artSkill(game.save, game.data);
  if (inp.consume('art') && art && p.artCd <= 0) {
    p.meditating = false; p.calmT = 0; p.riding = false;
    const dir = autoAim(game, art);
    if (dir) p.face = dir;
    p.artCd = castSkill(game, art) * (1 - p.st.cdr);
  }

  // Nút Đan: uống đan hồi máu
  p.pillCd = (p.pillCd || 0) - dt;
  const pid = game.data.cave.pill_button, low = (game.pilot || game.auto) && pilotOpt(game, 'dan') && p.hp < p.maxHp * game.data.config.pilot.pill_hp && (game.save.pills?.[pid] || 0) > 0;   // tự hành, tự đánh: máu thấp thì tự uống đan
  if ((inp.consume('pill') || low) && p.pillCd <= 0) {
    const id = game.data.cave.pill_button, msg = usePill(game, id);
    if (msg) { p.pillCd = game.data.cave.pills[id].cd; game.number(p.x, p.y - 20, msg, '#9af0a8'); game.sfx('heal'); }
  }

  // Hồi máu chậm khi không bị đánh
  if (p.invT < -3 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + cfg.player.regen * dt * (p.meditating ? 6 : 1));
  if (p.st.regen && p.hp < p.maxHp && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.st.regen * dt);

  if (p.meditating) {
    p.medT = (p.medT || 0) + dt;
    if (p.medT >= 0.5) { p.medT -= 0.5; const q = cfg.meditate.qi_per_sec * 0.5 * meditateMul(game) * nightMul(game) * rainMul(game) * songTuMul(game) * homeMul(game) * teaMul(game) * mealMul(game) * game.eventMul('qi'); game.gainQi(q, p.x, p.y, true); noteQi(game, q * (p.st.qiMul || 1)); dailyEvent(game, 'meditate', null, 0.5); bump(game, 'sit', 0.5 / 60); }
  }
}
