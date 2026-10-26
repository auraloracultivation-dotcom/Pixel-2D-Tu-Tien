// Trúng đòn, đạn, hiệu ứng, số sát thương. Cảm giác đánh: chớp trắng, đẩy lùi, khựng hình, rung màn hình.
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function addFx(game, fx) { game.fx.push({ t: 0, life: 0.3, ...fx }); }

export function addNumber(game, x, y, text, color = '#fff', big = false) {
  game.numbers.push({ x: x + (Math.random() * 6 - 3), y, text: String(text), color, big, t: 0 });
}

export function hitMob(game, m, dmg, opt = {}) {
  if (m.dead) return;
  const feel = game.data.config.feel;
  const p = game.player;
  let crit = false;
  if (opt.canCrit !== false && Math.random() < p.st.crit) { dmg *= p.st.critMult; crit = true; }
  if (p.buffT > 0) dmg *= 1 + p.buffAmt;
  dmg = Math.max(1, Math.round(dmg * (0.9 + Math.random() * 0.2)));
  m.hp -= dmg; m.flash = feel.flash; m.aggro = true;
  const ang = Math.atan2(m.y - (opt.fromY ?? p.y), m.x - (opt.fromX ?? p.x));
  const kb = opt.soft ? 0 : m.def.ai === 'boss' ? feel.knockback * 0.15 : feel.knockback; // soft: nhịp của vùng chiêu, không đẩy lùi
  m.kx = Math.cos(ang) * kb; m.ky = Math.sin(ang) * kb;
  if (opt.slow) m.slowT = Math.max(m.slowT, opt.slow);
  if (opt.stun && m.def.ai !== 'boss') m.stunT = Math.max(m.stunT, opt.stun);
  addNumber(game, m.x, m.y - m.r - 6, dmg, crit ? '#ffd84a' : '#fff', crit);
  game.sfx(crit ? 'crit' : 'hit');
  addFx(game, { type: 'spark', x: m.x - Math.cos(ang) * m.r, y: m.y - Math.sin(ang) * m.r, life: 0.18, color: opt.color || '#fff' });
  if (!opt.soft) {
    game.hitstop = Math.max(game.hitstop, crit ? feel.hitstop * 1.6 : feel.hitstop);
    game.screen.shake(crit ? feel.shake * 1.5 : feel.shake * 0.6, 0.12);
  }
  if (m.hp <= 0) killMob(game, m);
}

export function killMob(game, m) {
  m.dead = true;
  game.sfx('die');
  addFx(game, { type: 'puff', x: m.x, y: m.y, life: 0.45, r: m.r * 1.6, color: m.def.color });
  if (!m.noQi) game.gainQi(m.def.qi, m.x, m.y);
  game.onKill(m);
}

export function hitPlayer(game, dmg, from) {
  const p = game.player;
  if (p.invT > 0 || p.dashT > 0 || game.paused) return;
  dmg = Math.max(1, Math.round(dmg - p.st.def));
  if (p.shield > 0) {
    const a = Math.min(p.shield, dmg); p.shield -= a; dmg -= a;
    addNumber(game, p.x, p.y - 14, a, '#7ad0ff');
  }
  if (dmg > 0) {
    p.hp -= dmg;
    game.sfx('hurt');
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
        if (!b.pierce) { b.life = 0; burst(game, b); break; }
      }
    } else if (dist(b, game.player) < game.player.r + b.r) {
      hitPlayer(game, b.dmg, { x: b.x - b.vx, y: b.y - b.vy }); b.life = 0;
    }
  }
  game.bullets = game.bullets.filter(b => b.life > 0);
}

function burst(game, b) {
  if (!b.explode) return;
  addFx(game, { type: 'ring', x: b.x, y: b.y, r: b.explode, color: b.color, life: 0.3 });
  for (const m of game.mobs) if (!m.dead && !b.hit.has(m) && dist(b, m) < b.explode + m.r) hitMob(game, m, b.dmg * 0.6, { color: b.color, fromX: b.x, fromY: b.y });
}

export function updateFx(game, dt) {
  for (const f of game.fx) f.t += dt;
  game.fx = game.fx.filter(f => f.t < f.life);
  for (const n of game.numbers) { n.t += dt; n.y -= dt * 22; }
  game.numbers = game.numbers.filter(n => n.t < 0.75);
}
