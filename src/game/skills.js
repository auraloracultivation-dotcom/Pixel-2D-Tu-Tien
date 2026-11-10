// Thi triển chiêu theo kiểu trong data/skills.json; chiêu đã mở và 3 ô chiêu người chơi chọn mang.
import { addFx, hitMob, shoot, dist, impactShake } from './combat.js';
import { addZone } from './zones.js';
import { totalLayer, weaponId } from './stats.js';
import { burstFx, zoneFx, selfFx } from './skill-fx.js';
import { skillMul } from './skill-level.js';
import { vfxOf, vfxCast, vfxMobHit } from './vfx.js';
import { castSfx } from './skill-sfx.js';
import { juiceCast } from './juice.js';
import { pvpTryHit } from './pvp.js';
import { sparks } from './sparks.js';
import { castChain, chainReady } from './skill-chain.js';
import { castDomain, domainReady } from './skill-domain.js';
import { castCharge } from './skill-charge.js';
import { castThunder, thunderReady } from './skill-thunder.js';
import { castKiemVu } from './skill-kiem-vu.js';

export function castSkill(game, id) {
  const s = game.data.skills[id];
  const p = game.player;
  const K = game.data.config.combat, lv = skillMul(game, id);   // chiêu mạnh hơn đánh thường (config.combat), mạnh thêm theo cấp chiêu
  const atk = p.atk * (s.type === 'multi' ? K.multi : K.skill) * lv, amount = (s.amount || 0) * lv;
  const fx = p.face.x, fy = p.face.y, V = vfxOf(game, id);   // V: chiêu có hiệu ứng mới (data/vfx.json): bỏ hiệu ứng cũ
  game.online?.cast?.({ k: id, x: Math.round(p.x), y: Math.round(p.y), fx: +fx.toFixed(2), fy: +fy.toFixed(2) });   // người cùng đảo thấy hiệu ứng (game/others-cast.js)
  pvpTryHit(game);   // PvP Ngoại Vực: đang tắt bảo vệ thì chiêu cũng tính trúng người gần (game/pvp.js)
  // Dùng chiêu không ra động tác đánh, chỉ chém thường mới ra (chủ dự án 05/11/2026 02:31)
  castSfx(game, s);   // tiếng theo hệ chiêu (src/game/skill-sfx.js)
  juiceCast(game, s);   // trận đồ dưới chân; chiêu lớn: chớp màn, rung (src/game/juice.js)
  switch (s.type) {
    case 'projectile':
      shoot(game, {
        from: 'player', x: p.x + fx * 6, y: p.y - 4 + fy * 6, vx: fx * s.speed, vy: fy * s.speed,
        r: s.radius, dmg: atk * s.mult, pierce: !!s.pierce, slow: s.slow, stun: s.stun, explode: s.explode,
        color: s.color, life: s.range / s.speed, trail: true, fx: s.fx, ult: s.ult, sk: id,
      });
      if (V) vfxCast(game, id, s, p);
      break;
    case 'multi': {
      const base = Math.atan2(fy, fx), spread = s.spread * Math.PI / 180;
      const full = s.spread >= 360, n = s.count;
      for (let i = 0; i < n; i++) {
        const a = full ? base + i / n * Math.PI * 2 : base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        shoot(game, {
          from: 'player', x: p.x + Math.cos(a) * 6, y: p.y - 4 + Math.sin(a) * 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
          r: s.radius, dmg: atk * s.mult, pierce: !!s.pierce, slow: s.slow, explode: s.explode,
          color: s.color, life: s.range / s.speed, trail: true, fx: s.fx, ult: s.ult, sk: id,
        });
      }
      if (V) vfxCast(game, id, s, p);
      break;
    }
    case 'zone':
      addZone(game, { ...s, x: p.x + fx * (s.offset || 0), y: p.y + fy * (s.offset || 0), dmg: atk * s.mult });
      if (V) vfxCast(game, id, s, p, { zone: game.zones[game.zones.length - 1] });
      else if (s.fx) zoneFx(game, s.fx, game.zones[game.zones.length - 1]);
      break;
    case 'aoe': {
      const cx = p.x + fx * (s.offset || 0), cy = p.y + fy * (s.offset || 0);
      if (V) vfxCast(game, id, s, p, { cx, cy });
      else {
        addFx(game, { type: 'ring', x: cx, y: cy, r: s.radius, color: s.color, life: 0.35, fill: true });
        if (s.fx) burstFx(game, s.fx, cx, cy, s.radius, Math.atan2(fy, fx));
      }
      for (const m of game.mobs) {
        if (!m.dead && Math.hypot(m.x - cx, m.y - cy) < s.radius + m.r) {
          if (V) vfxMobHit(game, id, m);
          hitMob(game, m, atk * s.mult, { slow: s.slow, stun: s.stun, color: s.color, fromX: cx, fromY: cy });
        }
      }
      impactShake(game, s.radius);   // chiêu vùng càng rộng càng rung (config.feel.aoe_shake)
      sparks(game, cx, cy, 'aoe', s.color);   // vòng tia li ti tóe từ tâm chiêu
      break;
    }
    case 'heal': {
      const amt = Math.round(p.maxHp * amount);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      game.number(p.x, p.y - 16, '+' + amt, '#9af0a8');
      if (V) vfxCast(game, id, s, p);
      else { addFx(game, { type: 'ring', x: p.x, y: p.y, r: 18, color: s.color, life: 0.5 }); if (s.fx) selfFx(game, s.fx, p); }
      break;
    }
    case 'shield':
      p.shield = Math.min(Math.round(p.maxHp * (game.data.config.combat.shield_cap || 1)), (p.shieldT > 0 ? p.shield : 0) + Math.round(p.maxHp * amount)); p.shieldT = Math.max(p.shieldT, s.dur); p.shieldColor = s.color;   // giáp chồng nhau (báo lỗi #28)
      if (s.heal) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * s.heal));
      if (V) vfxCast(game, id, s, p);
      else { addFx(game, { type: 'ring', x: p.x, y: p.y, r: 14, color: s.color, life: 0.4 }); if (s.fx) selfFx(game, s.fx, p); }
      break;
    case 'buff':
      p.buffT = s.dur; p.buffAmt = amount; p.buffColor = s.color;
      if (V) vfxCast(game, id, s, p);
      else { addFx(game, { type: 'ring', x: p.x, y: p.y, r: 16, color: s.color, life: 0.4 }); if (s.fx) selfFx(game, s.fx, p); }
      break;
    case 'thunder':   // Thiên Phạt: tụ lực thành quả cầu sét rồi toả sét lướt qua quái (src/game/skill-thunder.js)
      castThunder(game, s, p.atk * lv);
      break;
    case 'kiemvu':   // Vạn Kiếm Quy Tông: gọi kiếm xoay vòng, kiếm khí, kiếm vũ đâm xuống (src/game/skill-kiem-vu.js); mỗi thanh s.mult × đánh thường
      castKiemVu(game, s, p.atk * lv);
      break;
    case 'charge':   // Phá Thiên Tuyệt Trảm: tụ lực rồi chém quạt sáng tới mép màn (src/game/skill-charge.js); s.mult × đánh thường
      castCharge(game, s, p.atk * lv);
      break;
    case 'domain':   // Vô Ảnh Trảm Vực: lĩnh vực tối, vạn nhát chém (src/game/skill-domain.js); mỗi nhịp s.mult × đánh thường
      castDomain(game, s, p.atk * lv);
      break;
    case 'chain':   // Thiểm Ảnh Liên Trảm: lướt chém qua lại nhiều mục tiêu (src/game/skill-chain.js); mỗi nhát s.mult × đánh thường
      castChain(game, s, p.atk * lv);
      break;
    case 'dash': {
      const sx = p.x, sy = p.y, steps = 16;
      for (let i = 0; i < steps; i++) game.map.move(p, fx * s.dist / steps, fy * s.dist / steps);
      p.dashT = 0.15;
      if (V) vfxCast(game, id, s, p, { sx, sy });
      else {
        addFx(game, { type: 'line', x: sx, y: sy, x2: p.x, y2: p.y, color: s.color, life: 0.3 });
        if (s.ult) addFx(game, { type: 'ult', kind: s.ult, x: sx, y: sy, x2: p.x, y2: p.y, color: s.color, life: 0.6 });
        if (s.fx) burstFx(game, s.fx, p.x, p.y, 18, Math.atan2(fy, fx));
      }
      for (const m of game.mobs) {
        if (m.dead) continue;
        if (segDist(m, sx, sy, p.x, p.y) < m.r + 8) {
          hitMob(game, m, atk * s.mult, { color: s.color, fromX: sx, fromY: sy });
          if (V) vfxMobHit(game, id, m);
          else if (s.fx) burstFx(game, s.fx, m.x, m.y, 10, Math.atan2(fy, fx));
        }
      }
      break;
    }
  }
  return s.cd;
}

// Chiêu dùng được lúc này không (kiểm trước khi trừ linh lực): chiêu lướt chain, lĩnh vực domain cần mục tiêu trong tầm
export function skillReady(game, id) {
  const s = game.data.skills[id];
  return s?.type === 'chain' ? chainReady(game, s) : s?.type === 'domain' ? domainReady(game, s) : s?.type === 'thunder' ? thunderReady(game, s) : true;
}

export function segDist(pt, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((pt.x - x1) * dx + (pt.y - y1) * dy) / l));
  return dist(pt, { x: x1 + dx * t, y: y1 + dy * t });
}

// Chiêu vũ khí: chiêu chính + chiêu thêm (weapons.*.more: [id, tổng tầng mở])
export function weaponSkills(w) {
  return [...(w.skill ? [[w.skill, 0]] : []), ...(w.more || [])];
}

// Chiêu đã mở: chiêu vũ khí + các chiêu hệ đủ tầng tu luyện (elements._unlock) + chiêu đã mua (save.boughtSkills)
export function unlockedSkills(game) {
  const { save, data } = game, out = [];
  const w = data.weapons[weaponId(save, data)], n = totalLayer(save, data.realms);
  for (const [id, at] of weaponSkills(w)) if (n >= at) out.push(id);
  const el = save.element ? data.elements[save.element] : null;
  if (el) el.skills.forEach((id, i) => { if (n >= data.elements._unlock[i]) out.push(id); });
  for (const id of save.boughtSkills || []) if (Object.hasOwn(data.skills, id) && !out.includes(id)) out.push(id);   // chiêu mua ở Vạn Bảo Lâu (shop.js)
  for (const [id, s] of Object.entries(data.skills)) if (s?.test_uid?.includes(game.owner) && !out.includes(id)) out.push(id);   // chiêu đang thử: chỉ tài khoản trong test_uid
  return out;
}

// 3 ô chiêu đang mang (save.loadout). Chưa chọn thì mặc định chiêu vũ khí + 2 chiêu hệ đầu.
export function skillSlots(game) {
  const open = unlockedSkills(game), lo = game.save.loadout;
  if (lo) {
    // Đổi loại vũ khí: ô đang mang chiêu vũ khí cũ tự thay bằng chiêu của vũ khí mới
    const wSkills = Object.values(game.data.weapons).flatMap(w => weaponSkills(w).map(([id]) => id));
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
  game.refreshStats();   // thưởng bộ Đạo Vận tính chiêu hệ đang mang
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
