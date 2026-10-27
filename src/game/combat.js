// Trúng đòn, đạn, hiệu ứng, số sát thương. Cảm giác đánh: chớp trắng, đẩy lùi, khựng hình, rung màn hình.
import { burstFx } from './skill-fx.js';
import { partyHit, partyKill, partyGhosts, partyHurt } from './party-sync.js';
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function addFx(game, fx) { game.fx.push({ t: 0, life: 0.3, ...fx }); }

export function addNumber(game, x, y, text, color = '#fff', big = false) {
  game.numbers.push({ x: x + (Math.random() * 6 - 3), y, text: String(text), color, big, t: 0 });
}

// opt.remote: đòn của đồng đội tổ đội (đã tính bạo kích ở máy họ): không nhân lại, không rung màn hình máy này
export function hitMob(game, m, dmg, opt = {}) {
  if (m.dead) return;
  const feel = game.data.config.feel, own = !opt.remote;
  const p = game.player;
  let crit = false;
  if (own && opt.canCrit !== false && Math.random() < p.st.crit) { dmg *= p.st.critMult; crit = true; }
  if (own && p.buffT > 0) dmg *= 1 + p.buffAmt;
  dmg = Math.max(1, Math.round(dmg * (own ? 0.9 + Math.random() * 0.2 : 1)));
  if (m.remote) partyHit(game, m, dmg, opt);   // quái của đội trưởng: gửi đòn, máu thật do máy đội trưởng trừ
  m.hp -= dmg; m.flash = feel.flash; m.aggro = true;
  if (m.remote) m.hp = Math.max(1, m.hp);
  if (own && p.st.lifesteal && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + dmg * p.st.lifesteal); // công pháp hút máu
  const ang = Math.atan2(m.y - (opt.fromY ?? p.y), m.x - (opt.fromX ?? p.x));
  const kb = opt.soft || m.remote ? 0 : m.def.ai === 'boss' ? feel.knockback * 0.15 : feel.knockback; // soft: nhịp của vùng chiêu, không đẩy lùi
  m.kx = Math.cos(ang) * kb; m.ky = Math.sin(ang) * kb;
  if (opt.slow) m.slowT = Math.max(m.slowT, opt.slow);
  if (opt.stun && m.def.ai !== 'boss') m.stunT = Math.max(m.stunT, opt.stun);
  addNumber(game, m.x, m.y - m.r - 6, dmg, crit ? '#ffd84a' : own ? '#fff' : '#b8d8ff', crit);
  if (!own) { if (m.hp <= 0) killMob(game, m); return; }
  game.sfx(crit ? 'crit' : 'hit');
  addFx(game, { type: 'spark', x: m.x - Math.cos(ang) * m.r, y: m.y - Math.sin(ang) * m.r, life: 0.18, color: opt.color || '#fff' });
  if (!opt.soft) {
    game.hitstop = Math.max(game.hitstop, crit ? feel.hitstop * 1.6 : feel.hitstop);
    game.screen.shake(crit ? feel.shake * 1.5 : feel.shake * 0.6, 0.12);
  }
  if (m.hp <= 0 && !m.remote) killMob(game, m);
}

export function killMob(game, m) {
  m.dead = true;
  partyKill(game, m);
  game.sfx('die');
  addFx(game, { type: 'puff', x: m.x, y: m.y, life: 0.45, r: m.r * 1.6, color: m.def.color });
  if (!m.noQi) game.gainQi(m.def.qi * game.eventMul('qi'), m.x, m.y);
  game.onKill(m);
}

export function hitPlayer(game, dmg, from) {
  const p = game.player;
  if (p.invT > 0 || p.dashT > 0 || game.paused) return;
  dmg = Math.max(1, Math.round(Math.max(dmg * (game.data.config.player.def_min_take ?? 0), dmg - p.st.def)));   // phòng ngự trừ thẳng nhưng luôn còn một phần đòn
  if (p.shield > 0) {
    const a = Math.min(p.shield, dmg); p.shield -= a; dmg -= a;
    addNumber(game, p.x, p.y - 14, a, '#7ad0ff');
  }
  if (dmg > 0) {
    p.hp -= dmg;
    game.sfx('hurt');
    if (p.st.thorns && from?.def && !from.dead) hitMob(game, from, dmg * p.st.thorns, { canCrit: false, soft: true, color: '#f2c94c' }); // phản đòn
    addNumber(game, p.x, p.y - 14, dmg, '#ff6a6a');
  }
  p.invT = game.data.config.player.invuln; p.flash = 0.12;
  if (from) {
    const ang = Math.atan2(p.y - from.y, p.x - from.x);
    p.kx = Math.cos(ang) * 70; p.ky = Math.sin(ang) * 70;
  }
  game.screen.shake(game.data.config.feel.shake, 0.15);
  if (game.noDeath && p.hp < 1) p.hp = 1;
}

export function shoot(game, b) {
  game.bullets.push({ life: 1.5, r: 3, pierce: false, hit: new Set(), ...b });
}

export function updateBullets(game, dt) {
  const { map } = game;
  for (const b of game.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (map.wallTile(Math.floor(b.x / map.T), Math.floor(b.y / map.T))) { b.life = 0; burst(game, b); continue; }
    if (b.from === 'player') {
      for (const m of game.mobs) {
        if (m.dead || b.hit.has(m) || dist(b, m) > m.r + b.r) continue;
        b.hit.add(m);
        hitMob(game, m, b.dmg, { slow: b.slow, stun: b.stun, color: b.color, fromX: b.x - b.vx, fromY: b.y - b.vy });
        if (b.fx) burstFx(game, b.fx, m.x, m.y, b.explode || 10, Math.atan2(b.vy, b.vx));
        if (!b.pierce) { b.life = 0; burst(game, b); break; }
      }
    } else if (b.from === 'see') continue;   // đạn quái của đội trưởng, chỉ để nhìn; trúng hay không do máy đội trưởng báo
    else if (dist(b, game.player) < game.player.r + b.r) {
      hitPlayer(game, b.dmg, { x: b.x - b.vx, y: b.y - b.vy }); b.life = 0;
    } else {
      const o = partyGhosts(game).find(g => dist(b, g) < g.r + b.r);
      if (o) { partyHurt(game, o.id, b.dmg, { x: b.x - b.vx, y: b.y - b.vy }); b.life = 0; }
    }
  }
  game.bullets = game.bullets.filter(b => b.life > 0);
}

function burst(game, b) {
  if (!b.explode) return;
  if (b.fx) burstFx(game, b.fx, b.x, b.y, b.explode, Math.atan2(b.vy, b.vx));
  addFx(game, { type: 'ring', x: b.x, y: b.y, r: b.explode, color: b.color, life: 0.3 });
  for (const m of game.mobs) if (!m.dead && !b.hit.has(m) && dist(b, m) < b.explode + m.r) hitMob(game, m, b.dmg * 0.6, { color: b.color, fromX: b.x, fromY: b.y });
}

export function updateFx(game, dt) {
  for (const f of game.fx) f.t += dt;
  game.fx = game.fx.filter(f => f.t < f.life);
  for (const n of game.numbers) { n.t += dt; n.y -= dt * 22; }
  game.numbers = game.numbers.filter(n => n.t < 0.75);
}
