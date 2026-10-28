// Bản sao so tài tự đánh như người chơi bật Tự đánh (game/auto.js fightStep): áp sát tới tầm vũ khí, đánh thường, chiêu nào
// hồi xong thì dùng khi đối thủ trong tầm (chiêu hồi máu chỉ dùng khi máu dưới duel.heal_below), chiêu pháp bảo cũng vậy.
// Linh thú, đồng hành của bản sao đi theo nó, đánh người chơi như linh thú của mình đánh quái (game/pets.js updateFollower).
import { addFx, dist, shoot } from './combat.js';
import { clearShot } from './auto.js';
import { swingFoe, strikeFoe, castFoe, roll, hit } from './duel-cast.js';

const D = game => game.data.duel;

function timers(game, m, dt) {
  const P = game.data.config.player;
  m.atkCd -= dt; m.swingT -= dt; m.dashT -= dt; m.artCd -= dt; m.gcd -= dt; m.hurtT = (m.hurtT || 0) + dt;
  for (let i = 0; i < 3; i++) m.skillCd[i] -= dt;
  if (m.shieldT > 0 && (m.shieldT -= dt) <= 0) m.shield = 0;
  if (m.buffT > 0) m.buffT -= dt;
  if (m.hurtT > 3 && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + P.regen * dt);   // hồi máu chậm khi không bị đánh, như người chơi
  if (m.st.regen && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.st.regen * dt);
}

function useSkills(game, m) {
  if (m.gcd > 0) return;   // mỗi lần một chiêu cho dễ nhìn
  const low = m.hp < m.maxHp * D(game).heal_below;
  const ok = id => id && (game.data.skills[id].type !== 'heal' || low);
  for (let i = 0; i < 3; i++) {
    if (m.skillCd[i] > 0 || !ok(m.slots[i])) continue;
    m.skillCd[i] = castFoe(game, m, m.slots[i]) * (1 - m.st.cdr); m.gcd = 0.22;
    return;
  }
  if (m.art && m.artCd <= 0 && ok(m.art)) { m.artCd = castFoe(game, m, m.art) * (1 - m.st.cdr); m.gcd = 0.22; }
}

// Gọi từ mobs.js mỗi khung (ai 'duel'); d: khoảng cách tới người chơi
export function duelThink(game, m, d, dt) {
  const f = game.duel, p = game.player;
  timers(game, m, dt);
  if (m.hitQ && (m.hitQ.t -= dt) <= 0) { const q = m.hitQ; m.hitQ = null; strikeFoe(game, m, q); }
  m.moving = false;
  if (!f || f.done || f.wait > 0 || p.hp <= 0) return;
  const w = game.data.weapons[m.wid], reach = w.range * (w.attack === 'shot' ? 0.7 : 0.6) + p.r, see = clearShot(game, m, p);
  const a = Math.atan2(p.y - m.y, p.x - m.x);
  m.face = { x: Math.cos(a), y: Math.sin(a) };
  if (d < reach + 30 && see) useSkills(game, m);
  const sp = game.data.config.player.speed * m.st.speedMul * dt;
  if (d > reach || !see) {
    game.map.move(m, m.face.x * sp, m.face.y * sp);
    m.moving = true; m.walkT = (m.walkT || 0) + dt;
  } else {
    if (d < 11) game.map.move(m, -m.face.x * sp * 0.6, -m.face.y * sp * 0.6);   // đứng chồng lên người chơi thì lùi ra chút cho dễ nhìn
    if (m.atkCd <= 0) m.atkCd = swingFoe(game, m);
  }
}

function fire(game, m, e, dmg, color, spread = 0) {
  const p = game.player, a = Math.atan2(p.y - e.y, p.x - e.x) + spread;
  shoot(game, { from: 'mob', src: m, x: e.x, y: e.y - 4, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 2.5, dmg: roll(m, dmg, false), color, life: 0.9 });
}

function foeSkill(game, m, e, dmg) {
  const s = e.def.skill, p = game.player, color = e.def.color || e.npc?.color;
  if (s.type === 'heal') {
    if (m.hp >= m.maxHp) { e.skillCd = 1; return; }
    const n = Math.round(m.maxHp * s.amount);
    m.hp = Math.min(m.maxHp, m.hp + n); game.number(m.x, m.y - 18, '+' + n, '#9af0a8');
    addFx(game, { type: 'ring', x: m.x, y: m.y, r: 14, color: '#9af0a8', life: 0.4 });
  } else if (s.type === 'aoe' || s.type === 'slow') {   // làm chậm: chỉ hiện vòng, so tài không khống chế
    addFx(game, { type: 'ring', x: e.x, y: e.y, r: s.radius, color, life: 0.35, fill: true });
    if (s.type === 'aoe' && dist(p, e) < s.radius + p.r) hit(game, m, roll(m, dmg * s.dmg, false), { x: e.x, y: e.y, soft: true });
  } else if (s.type === 'buff') {
    m.buffT = s.dur; m.buffAmt = s.amount; m.buffColor = color;
    game.number(m.x, m.y - 18, `Công +${Math.round(s.amount * 100)}%`, color);
  } else if (s.type === 'volley') {
    for (let i = 0; i < s.n; i++) fire(game, m, e, dmg * s.dmg, color, (i - (s.n - 1) / 2) * 0.25);
  }
}

// Kẻ đi theo bản sao: bám sau lưng nó, người chơi trong tầm của nó thì đánh (đánh gần thì lao tới)
function foeStep(game, f, m, e, dt) {
  const p = game.player, def = e.def;
  e.cd -= dt; e.skillCd -= dt; e.hop += dt * 8; e.walkT = (e.walkT || 0) + dt;
  const tgt = !m.dead && !f.done && f.wait <= 0 && p.hp > 0 && dist(p, m) < def.range;
  const fx = m.face?.x || 0, fy = m.face?.y || 0;
  let gx = m.x - fx * e.follow - fy * e.side, gy = m.y - fy * e.follow + fx * e.side + 2 - e.lift;
  if (tgt && def.melee) { gx = p.x - Math.sign(p.x - e.x) * (p.r + 4); gy = p.y; }
  const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
  if (d > 160) { e.x = gx; e.y = gy; }
  else if (d > 2) { const s = Math.min(d, (60 + d * 1.5) * dt); e.x += dx / d * s; e.y += dy / d * s; if (Math.abs(dx) > 1) e.face = Math.sign(dx); }
  e.moving = d > 3;
  if (!tgt) return;
  const dmg = m.atk * def.mult * e.mul;
  if (e.cd <= 0) {
    if (def.melee && dist(e, p) < p.r + 10) { e.cd = def.cd; hit(game, m, roll(m, dmg, false), { x: e.x, y: e.y, soft: true }); }
    else if (!def.melee) { e.cd = def.cd; fire(game, m, e, dmg, def.color || e.npc?.color); }
  }
  if (e.skillCd <= 0) { e.skillCd = def.skill.cd; foeSkill(game, m, e, dmg); }
}

export function updateFoes(game, dt) {
  const f = game.duel, m = f?.mob;
  if (m) for (const e of f.foes) foeStep(game, f, m, e, dt);
}
