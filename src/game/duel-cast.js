// Bản sao so tài (game/duel.js) ra đòn. Đánh thường như player.js (swing → strike: lấy đà rồi vũ khí tới nơi, cận chiến trúng
// trong cung trước mặt, cung đàn bắn đạn), chiêu như castSkill (game/skills.js) nhưng người ra chiêu là bản sao, mục tiêu là
// người chơi; cùng hệ số chiêu, cấp chiêu, bạo kích, tăng lực. Đòn đánh vào bản sao đi qua duelTake (combat.js hitMob → m.take).
import { addFx, addNumber, hitPlayer, shoot, dist } from './combat.js';
import { addZone } from './zones.js';
import { burstFx, zoneFx, selfFx } from './skill-fx.js';
import { skillMul } from './skill-level.js';
import { segDist } from './skills.js';
import { weaponSlash } from './slash-fx.js';

const SFX = { projectile: 'shoot', multi: 'shoot', aoe: 'boom', zone: 'boom', heal: 'heal', shield: 'shield', buff: 'shield', dash: 'dash' };

// Sát thương bản sao gây ra: bạo kích (đòn của chính nó; linh thú, đồng hành không bạo như của người chơi), tăng lực, ±10%
export function roll(m, dmg, canCrit = true) {
  if (canCrit && Math.random() < m.st.crit) dmg *= m.st.critMult;
  if (m.buffT > 0) dmg *= 1 + m.buffAmt;
  return Math.max(1, Math.round(dmg * (0.9 + Math.random() * 0.2)));
}

// Trúng người chơi (hitPlayer trừ phòng ngự, khiên). at: chỗ đòn tới (đẩy lùi theo hướng đó); at.soft: không đẩy lùi
export function hit(game, m, dmg, at) {
  hitPlayer(game, dmg, at ? { x: at.x, y: at.y, src: m, soft: at.soft } : m);
}

// Đòn đánh vào bản sao: đang lướt thì né, phòng ngự trừ thẳng nhưng luôn còn một phần đòn, nhân hệ số so tài, khiên đỡ trước,
// phản đòn (như hitPlayer)
export function duelTake(game, m, dmg, opt) {
  if (m.dashT > 0) return 0;
  dmg = Math.max(1, Math.round(Math.max(dmg * (game.data.config.player.def_min_take ?? 0), dmg - m.st.def) * m.dmgMul));
  if (m.shield > 0) {
    const a = Math.min(m.shield, dmg); m.shield -= a; dmg -= a;
    addNumber(game, m.x, m.y - 14, a, '#7ad0ff');
  }
  m.hurtT = 0;
  if (dmg > 0 && m.st.thorns && !opt.reflect) hit(game, m, dmg * m.st.thorns, { x: m.x, y: m.y, soft: true });
  return dmg;
}

// Đánh thường: chọn động tác kế tiếp trong chuỗi của nhân vật (data/heroes.json), đòn tới nơi sau nhịp lấy đà của ngự kiếm
export function swingFoe(game, m) {
  const w = game.data.weapons[m.wid], p = game.player, F = game.data.heroes.fly, n = m.atkN = (m.atkN ?? -1) + 1;
  const list = game.data.heroes.list[m.save.look]?.attacks || [], anim = list.length ? list[n % list.length] : null;
  m.heroAnim = anim ? { name: anim, t0: game.time } : null;
  const shot = w.attack === 'shot', move = shot ? 'ban' : (anim && F?.moves?.[anim]) || F?.combo?.[n % F.combo.length] || 'quet';
  const ang = Math.atan2(p.y - m.y, p.x - m.x);
  m.face = { x: Math.cos(ang), y: Math.sin(ang) };
  m.hitQ = { t: (F?.times?.wind || 0) + (F?.times?.strike || 0), ang, half: shot ? 0 : w.arc / 2 * Math.PI / 180, w, dmg: m.atk * m.basic, move };
  m.swingT = 0.18;
  return w.cooldown;
}

export function strikeFoe(game, m, q) {
  const p = game.player, w = q.w, ca = Math.cos(q.ang), sa = Math.sin(q.ang);
  if (q.move === 'ban') {
    shoot(game, { from: 'mob', src: m, x: m.x + ca * 8, y: m.y - 8 + sa * 8, vx: ca * w.speed, vy: sa * w.speed, r: w.radius, dmg: roll(m, q.dmg), pierce: !!w.pierce, color: w.color, life: w.range / w.speed, fx: w.fx });
    game.sfx('shoot', 0.5);
    return;
  }
  const cx = m.x, cy = m.y - 8, k = q.move === 'bo' ? 0.8 : 1;
  weaponSlash(game, m, w, q.move, q.ang, { x: cx + ca * w.range * k, y: cy + sa * w.range * k });
  game.sfx('swing', 0.6);
  const d = dist(m, p);
  if (d > w.range + p.r) return;
  let da = Math.atan2(p.y - m.y, p.x - m.x) - q.ang;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  if (Math.abs(da) <= q.half || d < m.r + p.r + 2) hit(game, m, roll(m, q.dmg));
}

function zoneTick(game, m, z) {
  const p = game.player;
  if (Math.hypot(p.x - z.x, p.y - z.y) < z.radius + p.r) hit(game, m, roll(m, z.dmg), { x: z.x, y: z.y, soft: true });
  if (z.heal && !m.dead && m.hp < m.maxHp && Math.hypot(m.x - z.x, m.y - z.y) < z.radius) {
    const amt = Math.round(m.maxHp * z.heal);
    m.hp = Math.min(m.maxHp, m.hp + amt); game.number(m.x, m.y - 16, '+' + amt, '#9af0a8');
  }
}

function bullet(game, m, s, a, dmg) {
  shoot(game, {
    from: 'mob', src: m, x: m.x + Math.cos(a) * 6, y: m.y - 4 + Math.sin(a) * 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
    r: s.radius, dmg: roll(m, dmg), pierce: !!s.pierce, explode: s.explode, color: s.color, life: s.range / s.speed, trail: true, fx: s.fx, ult: s.ult,
  });
}

// Chiêu của bản sao: trả về thời gian hồi (chưa trừ giảm hồi chiêu)
export function castFoe(game, m, id) {
  const s = game.data.skills[id], p = game.player, K = game.data.config.combat, lv = skillMul({ data: game.data, save: m.save }, id);
  const atk = m.atk * (s.type === 'multi' ? K.multi : K.skill) * lv, amount = (s.amount || 0) * lv;
  const fx = m.face.x, fy = m.face.y, base = Math.atan2(fy, fx);
  if (!['heal', 'shield', 'buff'].includes(s.type)) m.swingT = 0.18;
  game.sfx(SFX[s.type], 0.7);
  switch (s.type) {
    case 'projectile': bullet(game, m, s, base, atk * s.mult); break;
    case 'multi': {
      const spread = s.spread * Math.PI / 180, full = s.spread >= 360, n = s.count;
      for (let i = 0; i < n; i++) bullet(game, m, s, full ? base + i / n * Math.PI * 2 : base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), atk * s.mult);
      break;
    }
    case 'zone':
      addZone(game, { ...s, x: m.x + fx * (s.offset || 0), y: m.y + fy * (s.offset || 0), dmg: atk * s.mult, foe: m, onTick: z => zoneTick(game, m, z) });
      if (s.fx) zoneFx(game, s.fx, game.zones[game.zones.length - 1]);
      break;
    case 'aoe': {
      const cx = m.x + fx * (s.offset || 0), cy = m.y + fy * (s.offset || 0);
      addFx(game, { type: 'ring', x: cx, y: cy, r: s.radius, color: s.color, life: 0.35, fill: true });
      if (s.fx) burstFx(game, s.fx, cx, cy, s.radius, base);
      if (Math.hypot(p.x - cx, p.y - cy) < s.radius + p.r) hit(game, m, roll(m, atk * s.mult), { x: cx, y: cy });
      break;
    }
    case 'heal': {
      const amt = Math.round(m.maxHp * amount);
      m.hp = Math.min(m.maxHp, m.hp + amt);
      game.number(m.x, m.y - 16, '+' + amt, '#9af0a8');
      addFx(game, { type: 'ring', x: m.x, y: m.y, r: 18, color: s.color, life: 0.5 });
      if (s.fx) selfFx(game, s.fx, m);
      break;
    }
    case 'shield':
      m.shield = Math.round(m.maxHp * amount); m.shieldT = s.dur; m.shieldColor = s.color;
      if (s.heal) m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * s.heal));
      addFx(game, { type: 'ring', x: m.x, y: m.y, r: 14, color: s.color, life: 0.4 });
      if (s.fx) selfFx(game, s.fx, m);
      break;
    case 'buff':
      m.buffT = s.dur; m.buffAmt = amount; m.buffColor = s.color;
      addFx(game, { type: 'ring', x: m.x, y: m.y, r: 16, color: s.color, life: 0.4 });
      if (s.fx) selfFx(game, s.fx, m);
      break;
    case 'dash': {
      const sx = m.x, sy = m.y, steps = 16;
      for (let i = 0; i < steps; i++) game.map.move(m, fx * s.dist / steps, fy * s.dist / steps);
      addFx(game, { type: 'line', x: sx, y: sy, x2: m.x, y2: m.y, color: s.color, life: 0.3 });
      m.dashT = 0.15;
      if (s.ult) addFx(game, { type: 'ult', kind: s.ult, x: sx, y: sy, x2: m.x, y2: m.y, color: s.color, life: 0.6 });
      if (s.fx) burstFx(game, s.fx, m.x, m.y, 18, base);
      if (segDist(p, sx, sy, m.x, m.y) < p.r + 8) hit(game, m, roll(m, atk * s.mult), { x: sx, y: sy });
      break;
    }
  }
  return s.cd;
}
