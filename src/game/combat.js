// Trúng đòn, đạn, hiệu ứng, số sát thương. Cảm giác đánh: chớp trắng, đẩy lùi, khựng hình, rung màn hình.
import { burstFx } from './skill-fx.js';
import { partyHit, partyKill, partyGhosts, partyHurt } from './party-sync.js';
import { mobLk } from './stats.js';
import { cpOut, cpIn } from './cp-press.js';   // áp chế lực chiến người chơi / quái
import { dummyHit } from './dummy.js';
import { sparks } from './sparks.js';
import { fxOk, shortNum } from './fx-budget.js';
import { mangHit } from './thien-mang.js';
import { vfxHit, vfxOf } from './vfx.js';
import { juiceHit, juiceKill, juiceHurt, rageMul } from './juice.js';
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function addFx(game, fx) { game.fx.push({ t: 0, life: 0.3, ...fx }); }

export function addNumber(game, x, y, text, color = '#fff', big = false) {
  // "+16 linh khí", "+3 Linh Thạch" liên tục mỗi lần hạ quái: gộp vào dòng cùng loại vừa hiện gần đó (đỡ rối mắt, chơi thử 28/10)
  const m = /^\+([\d.]+) (.+)$/.exec(String(text));
  if (m && game.feed) { game.feed(text, color); return; }   // linh khí, Linh Thạch: cột thông báo bên trái (src/ui/feed.js), không bay trên đầu
  if (m) {
    const same = game.numbers.find(n => n.gain === m[2] && n.t < 0.45 && Math.abs(n.x - x) < 40 && Math.abs(n.y - y) < 40);
    if (same) { same.sum += +m[1]; same.text = `+${same.sum} ${m[2]}`; same.t = Math.min(same.t, 0.1); return; }
    game.numbers.push({ x: x + (Math.random() * 6 - 3), y, text: String(text), color, big, t: 0, gain: m[2], sum: +m[1] });
    return;
  }
  // Chiêu nhiều đòn trúng một con liên tục: cộng vào số vừa hiện trên con đó thay vì chồng hàng chục số (chơi thử 28/10)
  if (/^\d+$/.test(String(text))) {
    const same = game.numbers.find(n => !n.gain && n.color === color && n.v != null && n.t < 0.18 && Math.abs(n.x - x) < 9 && Math.abs(n.y - y) < 9);
    if (same) { same.v += +text; same.text = shortNum(same.v); same.big ||= big; return; }
    // đánh đông quái: số đòn của mình chỉ hiện trong hạn mức (data/juice.json → budget.num, num_crit), số đồng đội, hồi máu không giới hạn (09/11/2026)
    if ((color === '#fff' || color === '#ffd84a') && !fxOk(game, big ? 'num_crit' : 'num')) return;
    const N = game.data.juice?.budget?.num_max ?? 28;
    if (game.numbers.length >= N) game.numbers.splice(game.numbers.findIndex(n => !n.big) >>> 0, 1);   // bỏ số thường cũ nhất trước
    const ref = color === '#fff' || color === '#ffd84a' ? game.player?.dmgRef || game.player?.atk || 0 : 0;   // cỡ số theo đòn đánh thường (draw-numbers.js)
    game.numbers.push({ x: x + (Math.random() * 6 - 3), y, text: shortNum(+text), v: +text, color, big, t: 0, ref });   // số lớn rút gọn: 253Tr
    return;
  }
  if (game.numbers.length > 28) game.numbers.shift();   // giữ màn gọn khi đánh đông quái
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
  if (own) dmg *= rageMul(game, m) * cpOut(game, m);   // Bạo Nộ (src/game/juice.js); áp chế lực chiến (cp-press.js)
  dmg = Math.max(1, Math.round(dmg * (own ? 0.9 + Math.random() * 0.2 : 1)));
  if (m.take && (dmg = m.take(dmg, opt)) <= 0) return;   // bản sao so tài: lướt né, phòng ngự, khiên, phản đòn như người chơi (game/duel-cast.js)
  if (m.remote) partyHit(game, m, dmg, opt);   // quái của đội trưởng: gửi đòn, máu thật do máy đội trưởng trừ
  m.hp -= dmg; m.flash = feel.flash; m.aggro = true; m.hurtT = game.time;   // hurtT: vừa bị đánh thì đánh trả cả trong vùng an toàn quanh NPC
  if (m.remote) m.hp = Math.max(1, m.hp);
  if (m.dummy) { m.hp = m.maxHp; dummyHit(game, m, dmg); }   // Mộc Nhân trong động phủ: không chết, đếm sát thương/giây (game/dummy.js)
  if (m.wboss) { m.hp = m.maxHp; mangHit(game, m, dmg); }   // đầu Cửu Đầu Thôn Thiên Mãng: không chết, đếm sát thương (game/thien-mang.js)
  if (own && p.st.lifesteal && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + dmg * p.st.lifesteal); // công pháp hút máu
  const ang = Math.atan2(m.y - (opt.fromY ?? p.y), m.x - (opt.fromX ?? p.x));
  const kb = m.remote ? 0 : m.def.ai === 'boss' ? feel.knockback * 0.15 : (m.def.kb ?? feel.knockback) * (opt.soft ? feel.knockback_soft ?? 0 : 1); // soft: nhịp vùng chiêu, đẩy nhẹ; kb: bản sao so tài bị đẩy như người chơi
  m.kx = Math.cos(ang) * kb; m.ky = Math.sin(ang) * kb; m.cutAng = ang;   // cutAng: hướng đòn cuối, xác bị chém đôi theo hướng này
  if (opt.slow && !m.def.noCc) m.slowT = Math.max(m.slowT, opt.slow);   // noCc: bản sao so tài không bị khống chế (nó cũng không khống chế người chơi)
  if (opt.stun && m.def.ai !== 'boss' && !m.def.noCc) m.stunT = Math.max(m.stunT, opt.stun);
  addNumber(game, m.x, m.y - m.r - 6, dmg, crit ? '#ffd84a' : own ? '#fff' : '#b8d8ff', crit);
  const ratio = own && p.dmgRef ? dmg / p.dmgRef : 0;   // đòn to gấp mấy lần đánh thường: rung màn, khựng (chủ dự án 12/11/2026 04:14)
  if (ratio >= 3 && !m.dummy) { game.screen.shake(Math.min(7, 1.5 + ratio * 0.35), 0.16); if (ratio >= 10) { game.hitstop = Math.max(game.hitstop, 0.07); game.sfx('impact', 0.7); } }
  if (!own) { if (m.hp <= 0) killMob(game, m); return; }
  game.sfx(crit ? 'crit' : 'hit');
  addFx(game, { type: 'spark', x: m.x - Math.cos(ang) * m.r, y: m.y - Math.sin(ang) * m.r, life: 0.18, color: opt.color || '#fff' });
  juiceHit(game, m.x - Math.cos(ang) * m.r * 0.6, m.y - m.r * 0.6 - Math.sin(ang) * m.r * 0.4, opt.color, crit, opt.soft);   // tia toả, vụn, Liên Kích, Nộ
  if (!opt.soft) sparks(game, m.x - Math.cos(ang) * m.r, m.y - Math.sin(ang) * m.r, crit ? 'crit' : 'hit', crit ? '#ffd84a' : opt.color, ang);   // tia li ti tóe về phía sau quái
  if (!opt.soft) {
    game.hitstop = Math.max(game.hitstop, crit ? feel.hitstop * 1.6 : feel.hitstop);
    game.screen.shake(feel.shake * (crit ? feel.crit_shake ?? 1.5 : feel.hit_shake ?? 0.6), 0.12);   // đánh thường không rung (dịu mắt), chí mạng rung nhẹ
  }
  opt.onHit?.(m, dmg, crit);   // pháp bảo (src/game/phap-bao-hit.js): hệ, hút máu, nảy, nổ con, Lôi Kích…
  if (m.hp <= 0 && !m.remote) killMob(game, m);
}

export function killMob(game, m) {
  m.dead = true;
  const K = game.data.config.feel.kill?.[m.def.ai === 'boss' ? 'boss' : m.rare ? 'rare' : ''];   // hạ trùm, quái hiếm: rung, khựng, chớp
  sparks(game, m.x, m.y - m.r * 0.5, K ? 'kill_big' : 'kill', m.def.color);
  if (K && !m.remote) { game.screen.shake(K.shake, K.t); game.hitstop = Math.max(game.hitstop, K.hitstop); if (K.flash) game.flashT = Math.max(game.flashT || 0, K.flash); if (K.sfx) game.sfx(K.sfx); }
  if (!m.remote) (game.corpses ??= []).push({ m, t0: game.time, x: m.x, y: m.y, ang: m.cutAng ?? 0, tilt: Math.random() - 0.5 });   // xác chớp trắng, đứt đôi theo đường chém rồi tan dần (render/draw-mob-sprite.js)
  partyKill(game, m);
  game.sfx('die');
  juiceKill(game, m);   // vòng sóng, vụn, đốm linh khí bay về người
  addFx(game, { type: 'puff', x: m.x, y: m.y, life: 0.45, r: m.r * 1.6, color: m.def.color });
  if (!m.noQi) game.gainQi(Math.round(mobLk(game.data.mobs, m) * game.eventMul('qi') * (game.farmTeamMul?.() || 1) * 10) / 10, m.x, m.y, false, false, true);   // tổ đội farm (src/game/farm-team.js)
  game.onKill(m);
}

export function hitPlayer(game, dmg, from) {
  const p = game.player, who = from?.def ? from : from?.src;   // quái vừa đánh trúng mình (tự hành gục thì tránh loài này)
  if ((p.invT > 0 && !who?.duel) || p.dashT > 0 || game.paused) return;   // bản sao so tài (game/duel.js): đòn nào cũng trúng, như đòn mình đánh nó
  if (who?.def) game.lastHit = who;
  dmg = Math.max(1, Math.round(Math.max(dmg * (game.data.config.player.def_min_take ?? 0), dmg - p.st.def) * (1 - (p.st.dr || 0)) * (1 - (p.pbDr || 0))));   // pbDr: đứng trong vùng Trận Kỳ (src/game/phap-bao-run.js)   // phòng ngự trừ thẳng nhưng luôn còn một phần đòn; dr: công pháp giảm sát thương %
  if (who?.def) dmg = Math.max(1, Math.round(dmg * cpIn(game, who)));   // áp chế lực chiến: quái mạnh hơn đánh đau hơn (cp-press.js)
  if (who?.dmgMul) dmg = Math.max(1, Math.round(dmg * who.dmgMul));   // so tài: đòn hai bên cùng nhẹ đi cho trận kéo dài (data/duel.json dmg)
  if (p.shield > 0) {
    const a = Math.min(p.shield, dmg); p.shield -= a; dmg -= a;
    addNumber(game, p.x, p.y - 14, a, '#7ad0ff');
  }
  if (dmg > 0) {
    p.hp -= dmg;
    game.sfx('hurt');
    if (who?.duel && who.st.lifesteal) who.hp = Math.min(who.maxHp, who.hp + dmg * who.st.lifesteal);   // bản sao hút máu như người chơi
    if (p.st.thorns && from?.def && !from.dead) hitMob(game, from, dmg * p.st.thorns, { canCrit: false, soft: true, reflect: true, color: '#f2c94c' }); // phản đòn
    addNumber(game, p.x, p.y - 14, dmg, '#ff6a6a');
    juiceHurt(game, dmg / p.maxHp);
    if (who?.def) game.pbHurt?.(who);   // Phản Chấn (pháp bảo)
    sparks(game, p.x, p.y - 8, 'hurt', '#ff6a6a', from ? Math.atan2(p.y - from.y, p.x - from.x) : null);
  }
  p.invT = game.data.config.player.invuln; p.flash = 0.12;
  if (from && !from.soft) {   // soft: phản đòn, linh thú đánh gần: không đẩy lùi (như đòn mình đánh quái)
    const ang = Math.atan2(p.y - from.y, p.x - from.x);
    p.kx = Math.cos(ang) * 70; p.ky = Math.sin(ang) * 70;
  }
  const F = game.data.config.feel, big = Math.min(2, Math.max(0, dmg) / Math.max(1, p.maxHp) * (F.hurt_big ?? 0));   // đòn càng nặng (so với máu tối đa) càng rung
  game.screen.shake(F.shake * (F.hurt_shake ?? 1) * (1 + big), 0.15 + big * 0.1);
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
        if (!(b.sk && vfxHit(game, b, m.x, m.y, b.pierce ? 0 : b.explode || 0)) && b.fx) burstFx(game, b.fx, m.x, m.y, b.explode || 10, Math.atan2(b.vy, b.vx));
        if (b.sk && !b.pierce) b.vfxDone = true;
        if (!b.pierce) { b.life = 0; burst(game, b); break; }
      }
    } else if (b.from === 'see') continue;   // đạn quái của đội trưởng, chỉ để nhìn; trúng hay không do máy đội trưởng báo
    else if (dist(b, game.player) < game.player.r + b.r) {
      hitPlayer(game, b.dmg, { x: b.x - b.vx, y: b.y - b.vy, src: b.src }); b.life = 0;
      if (b.sk) { vfxHit(game, b, b.x, b.y, b.explode || 0); b.vfxDone = true; }
    } else {
      const o = partyGhosts(game).find(g => dist(b, g) < g.r + b.r);
      if (o) { partyHurt(game, o.id, b.dmg, { x: b.x - b.vx, y: b.y - b.vy }); b.life = 0; }
    }
  }
  for (const b of game.bullets) if (b.life <= 0 && b.sk && !b.vfxDone && vfxOf(game, b.sk)) { b.vfxDone = true; vfxHit(game, b, b.x, b.y, b.explode || 0); }   // hết đường: tan, nổ nhẹ
  game.bullets = game.bullets.filter(b => b.life > 0);
}

function burst(game, b) {
  if (b.sk && vfxOf(game, b.sk) && !b.vfxDone) { b.vfxDone = true; vfxHit(game, b, b.x, b.y, b.explode || 0); }
  if (!b.explode) return;
  if (!vfxOf(game, b.sk)) {
    if (b.fx) burstFx(game, b.fx, b.x, b.y, b.explode, Math.atan2(b.vy, b.vx));
    addFx(game, { type: 'ring', x: b.x, y: b.y, r: b.explode, color: b.color, life: 0.3 });
  }
  if (b.from !== 'player') {   // chiêu nổ của bản sao so tài chạm vách: nổ trúng người chơi, không trúng quái
    if (b.src?.duel && dist(b, game.player) < b.explode + game.player.r) hitPlayer(game, b.dmg * 0.6, { x: b.x, y: b.y, src: b.src });
    return;
  }
  for (const m of game.mobs) if (!m.dead && !b.hit.has(m) && dist(b, m) < b.explode + m.r) hitMob(game, m, b.dmg * 0.6, { color: b.color, fromX: b.x, fromY: b.y });
}

export function updateFx(game, dt) {
  for (const f of game.fx) f.t += dt;
  game.fx = game.fx.filter(f => f.t < f.life);
  for (const n of game.numbers) { n.t += dt; n.y -= dt * 22; }
  game.numbers = game.numbers.filter(n => n.t < 0.75);
}

// Chiêu vùng nổ: rung theo bán kính (config.feel.aoe_shake)
export function impactShake(game, r) {
  const A = game.data.config.feel.aoe_shake || { per_r: 0.07, min: 2.5, max: 6 };
  const a = Math.max(A.min, Math.min(A.max, r * A.per_r));
  game.screen.shake(a, 0.22);
  game.sfx?.('impact', 0.5 + 0.5 * (a - A.min) / Math.max(0.01, A.max - A.min));   // tiếng nện trầm lồng dưới tiếng chiêu, to theo độ rung
}
