// Thi triển chiêu theo kiểu trong data/skills.json.
import { addFx, hitMob, shoot, dist } from './combat.js';

export function castSkill(game, id) {
  const s = game.data.skills[id];
  const p = game.player;
  const atk = p.atk;
  const fx = p.face.x, fy = p.face.y;
  switch (s.type) {
    case 'projectile':
      shoot(game, {
        from: 'player', x: p.x + fx * 6, y: p.y - 4 + fy * 6, vx: fx * s.speed, vy: fy * s.speed,
        r: s.radius, dmg: atk * s.mult, pierce: !!s.pierce, slow: s.slow, explode: s.explode,
        color: s.color, life: s.range / s.speed, trail: true,
      });
      break;
    case 'aoe': {
      const cx = p.x + fx * (s.offset || 0), cy = p.y + fy * (s.offset || 0);
      addFx(game, { type: 'ring', x: cx, y: cy, r: s.radius, color: s.color, life: 0.35, fill: true });
      for (const m of game.mobs) {
        if (!m.dead && Math.hypot(m.x - cx, m.y - cy) < s.radius + m.r) {
          hitMob(game, m, atk * s.mult, { slow: s.slow, stun: s.stun, color: s.color, fromX: cx, fromY: cy });
        }
      }
      game.screen.shake(3, 0.2);
      break;
    }
    case 'heal': {
      const amt = Math.round(p.maxHp * s.amount);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      game.number(p.x, p.y - 16, '+' + amt, '#9af0a8');
      addFx(game, { type: 'ring', x: p.x, y: p.y, r: 18, color: s.color, life: 0.5 });
      break;
    }
    case 'shield':
      p.shield = Math.round(p.maxHp * s.amount); p.shieldT = s.dur; p.shieldColor = s.color;
      addFx(game, { type: 'ring', x: p.x, y: p.y, r: 14, color: s.color, life: 0.4 });
      break;
    case 'buff':
      p.buffT = s.dur; p.buffAmt = s.amount; p.buffColor = s.color;
      addFx(game, { type: 'ring', x: p.x, y: p.y, r: 16, color: s.color, life: 0.4 });
      break;
    case 'dash': {
      const sx = p.x, sy = p.y, steps = 16;
      for (let i = 0; i < steps; i++) game.map.move(p, fx * s.dist / steps, fy * s.dist / steps);
      addFx(game, { type: 'line', x: sx, y: sy, x2: p.x, y2: p.y, color: s.color, life: 0.3 });
      p.dashT = 0.15;
      for (const m of game.mobs) {
        if (m.dead) continue;
        if (segDist(m, sx, sy, p.x, p.y) < m.r + 8) hitMob(game, m, atk * s.mult, { color: s.color, fromX: sx, fromY: sy });
      }
      break;
    }
  }
  return s.cd;
}

function segDist(pt, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((pt.x - x1) * dx + (pt.y - y1) * dy) / l));
  return dist(pt, { x: x1 + dx * t, y: y1 + dy * t });
}

// Các ô chiêu: 0 = chiêu của vũ khí, 1-2 = chiêu của hệ
export function skillSlots(game) {
  const w = game.data.weapons[game.save.weapon];
  const el = game.save.element ? game.data.elements[game.save.element] : null;
  return [w.skill, el ? el.skills[0] : null, el ? el.skills[1] : null];
}
