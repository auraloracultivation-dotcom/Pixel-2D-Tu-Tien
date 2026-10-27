// Thi triển chiêu theo kiểu trong data/skills.json; chiêu đã mở và 3 ô chiêu người chơi chọn mang.
import { addFx, hitMob, shoot, dist } from './combat.js';
import { addZone } from './zones.js';
import { totalLayer, weaponId } from './stats.js';
import { burstFx, zoneFx, selfFx } from './skill-fx.js';

export function castSkill(game, id) {
  const s = game.data.skills[id];
  const p = game.player;
  const atk = p.atk;
  const fx = p.face.x, fy = p.face.y;
  if (!['heal', 'shield', 'buff'].includes(s.type)) p.swingT = 0.18;   // nhân vật làm động tác đánh
  game.sfx({ projectile: 'shoot', multi: 'shoot', aoe: 'boom', zone: 'boom', heal: 'heal', shield: 'shield', buff: 'shield', dash: 'dash' }[s.type]);
  switch (s.type) {
    case 'projectile':
      shoot(game, {
        from: 'player', x: p.x + fx * 6, y: p.y - 4 + fy * 6, vx: fx * s.speed, vy: fy * s.speed,
        r: s.radius, dmg: atk * s.mult, pierce: !!s.pierce, slow: s.slow, stun: s.stun, explode: s.explode,
        color: s.color, life: s.range / s.speed, trail: true, fx: s.fx,
      });
      break;
    case 'multi': {
      const base = Math.atan2(fy, fx), spread = s.spread * Math.PI / 180;
      const full = s.spread >= 360, n = s.count;
      for (let i = 0; i < n; i++) {
        const a = full ? base + i / n * Math.PI * 2 : base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        shoot(game, {
          from: 'player', x: p.x + Math.cos(a) * 6, y: p.y - 4 + Math.sin(a) * 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
          r: s.radius, dmg: atk * s.mult, pierce: !!s.pierce, slow: s.slow, explode: s.explode,
          color: s.color, life: s.range / s.speed, trail: true, fx: s.fx,
        });
      }
      break;
    }
    case 'zone':
      addZone(game, { ...s, x: p.x + fx * (s.offset || 0), y: p.y + fy * (s.offset || 0), dmg: atk * s.mult });
      if (s.fx) zoneFx(game, s.fx, game.zones[game.zones.length - 1]);
      break;
    case 'aoe': {
      const cx = p.x + fx * (s.offset || 0), cy = p.y + fy * (s.offset || 0);
      addFx(game, { type: 'ring', x: cx, y: cy, r: s.radius, color: s.color, life: 0.35, fill: true });
      if (s.fx) burstFx(game, s.fx, cx, cy, s.radius, Math.atan2(fy, fx));
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
      if (s.fx) selfFx(game, s.fx, p);
      break;
    }
    case 'shield':
      p.shield = Math.round(p.maxHp * s.amount); p.shieldT = s.dur; p.shieldColor = s.color;
      if (s.heal) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * s.heal));
      addFx(game, { type: 'ring', x: p.x, y: p.y, r: 14, color: s.color, life: 0.4 });
      if (s.fx) selfFx(game, s.fx, p);
      break;
    case 'buff':
      p.buffT = s.dur; p.buffAmt = s.amount; p.buffColor = s.color;
      addFx(game, { type: 'ring', x: p.x, y: p.y, r: 16, color: s.color, life: 0.4 });
      if (s.fx) selfFx(game, s.fx, p);
      break;
    case 'dash': {
      const sx = p.x, sy = p.y, steps = 16;
      for (let i = 0; i < steps; i++) game.map.move(p, fx * s.dist / steps, fy * s.dist / steps);
      addFx(game, { type: 'line', x: sx, y: sy, x2: p.x, y2: p.y, color: s.color, life: 0.3 });
      p.dashT = 0.15;
      if (s.fx) burstFx(game, s.fx, p.x, p.y, 18, Math.atan2(fy, fx));
      for (const m of game.mobs) {
        if (m.dead) continue;
        if (segDist(m, sx, sy, p.x, p.y) < m.r + 8) {
          hitMob(game, m, atk * s.mult, { color: s.color, fromX: sx, fromY: sy });
          if (s.fx) burstFx(game, s.fx, m.x, m.y, 10, Math.atan2(fy, fx));
        }
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

// Chiêu đã mở: chiêu vũ khí + các chiêu hệ đủ tầng tu luyện (elements._unlock)
export function unlockedSkills(game) {
  const { save, data } = game, out = [];
  const w = data.weapons[weaponId(save, data)];
  if (w.skill) out.push(w.skill);
  const el = save.element ? data.elements[save.element] : null;
  if (el) {
    const n = totalLayer(save, data.realms);
    el.skills.forEach((id, i) => { if (n >= data.elements._unlock[i]) out.push(id); });
  }
  return out;
}

// 3 ô chiêu đang mang (save.loadout). Chưa chọn thì mặc định chiêu vũ khí + 2 chiêu hệ đầu.
export function skillSlots(game) {
  const open = unlockedSkills(game), lo = game.save.loadout;
  if (lo) {
    // Đổi loại vũ khí: ô đang mang chiêu vũ khí cũ tự thay bằng chiêu của vũ khí mới
    const wSkills = Object.values(game.data.weapons).map(w => w.skill).filter(Boolean);
    const cur = game.data.weapons[weaponId(game.save, game.data)].skill;
    return lo.map(id => (open.includes(id) ? id : wSkills.includes(id) && cur && !lo.includes(cur) ? cur : null));
  }
  return [open[0] || null, open[1] || null, open[2] || null];
}

export function setSlot(game, i, id) {
  const lo = skillSlots(game).slice();
  const j = lo.indexOf(id);
  if (j >= 0) lo[j] = lo[i];   // đổi chỗ nếu chiêu đã nằm ở ô khác
  lo[i] = id;
  game.save.loadout = lo;
  game.player.skillCd = [0, 0, 0];
  game.persist();
}

// Báo chiêu mới mở (gọi sau khi đột phá)
export function checkUnlocks(game) {
  const s = game.save, open = unlockedSkills(game);
  s.knownSkills ??= open.slice();
  const fresh = open.filter(id => !s.knownSkills.includes(id));
  if (!fresh.length) return;
  s.knownSkills.push(...fresh);
  const lo = skillSlots(game);
  for (const id of fresh) { const k = lo.indexOf(null); if (k >= 0 && !lo.includes(id)) { lo[k] = id; s.loadout = lo; } }
  game.toast(`Lĩnh ngộ chiêu mới: ${fresh.map(id => game.data.skills[id].name).join(', ')}! Mở bảng Chiêu để mang.`, 3);
  game.newSkills = true;
}
