// Tung đòn pháp bảo (chủ dự án 12/11/2026): 3 nút chiêu = 3 pháp bảo đang mặc (src/game/phap-bao.js), đòn dựng từ đòn gốc + chiêu khảm
// (src/game/phap-bao-build.js), trúng quái ở src/game/phap-bao-hit.js, vẽ src/render/draw-phap-bao.js. Thực thể ở game.pbx.list:
//   shot (đạn: xuyên, nảy, đuổi, bay về), wave (quạt), ring (sóng vòng quanh người), blast (nổ tức thì), zone (vùng trận),
//   seal (ấn rơi), orbit (cầu xoay), shield (khiên Hộ Thuẫn), suck (Hồ Lô hút), wait (Liên Phát chờ nhịp), zap / bolt / anim (chỉ để vẽ).
import { dist } from './combat.js';
import { pvpTryHit } from './pvp.js';
import { juiceCast } from './juice.js';
import { pbOn, pbWorn, PB } from './phap-bao.js';
import { buildCast } from './phap-bao-build.js';
import { pbHit, pbx, nearest, pbStatusTick } from './phap-bao-hit.js';

const SFX = { 'phi-kiem': 'metal_cast', 'linh-chau': 'water_cast', 'bao-phien': 'wind_cast', 'dai-an': 'earth_cast', 'ho-thuan': 'shield', 'dong-chung': 'chime', 'tran-ky': 'earth_cast', 'ho-lo': 'water_cast' };

// Tầm tự ngắm của đòn gốc
const reach = T => T.emit.range || T.emit.reach || (T.emit.r || 40) * 1.4;

// Mỗi khung (thay vòng 3 ô chiêu trong src/game/player.js khi pbOn)
export function pbInput(game, inp) {
  const p = game.player, worn = pbWorn(game);
  for (let i = 0; i < 3; i++) {
    if (!inp.consume('s' + i)) continue;
    const it = worn[i];
    if (!it || p.skillCd[i] > 0) continue;
    const cast = buildCast(game, it), T = cast.T, cost = Math.round(T.mp * cast.mpMul);
    if ((p.mp ?? 0) < cost) { if ((game.time || 0) - (p.mpWarn || -9) > 1.5) { p.mpWarn = game.time || 0; game.number?.(p.x, p.y - 22, 'Thiếu linh lực', '#7ab8ff'); } continue; }
    p.mp -= cost; p.meditating = false; p.calmT = 0; p.riding = false;
    let dir = inp.aim['s' + i];
    if (!dir) { const m = nearest(game, p.x, p.y, reach(T) + 30); if (m) { const a = Math.atan2(m.y - p.y, m.x - p.x); dir = { x: Math.cos(a), y: Math.sin(a) }; } }
    if (dir) p.face = dir;
    pbCast(game, cast, Math.atan2(p.face.y, p.face.x));
    p.skillCd[i] = T.cd * cast.cdMul * (1 - (p.st.cdr || 0));
    (p.pbCdMax ||= [])[i] = p.skillCd[i];   // vòng hồi chiêu trên nút (src/ui/phap-bao-hud.js)
  }
}

// Tung một món: đòn thủ có bước trước (khiên, hút) rồi mới phát đòn gốc
export function pbCast(game, cast, ang) {
  const p = game.player, T = cast.T;
  cast.atk = p.atk * game.data.config.combat.skill;
  cast.ang = ang;
  if (cast.procs['phan-chan']) (pbx(game).thorn ||= []).push(cast);
  game.sfx?.(SFX[cast.it.type] || 'shoot', 0.8);
  juiceCast(game, { grade: 'huyen', color: T.color, type: ['seal', 'zone'].includes(T.emit.kind) ? 'aoe' : 'projectile' });   // chỉ Đại Ấn, Trận Kỳ chớp màn + rung
  pvpTryHit(game);
  if (T.pre?.kind === 'shield') {
    const add = Math.round(p.maxHp * T.pre.pct);
    p.shield = Math.min(p.maxHp, (p.shieldT > 0 ? p.shield : 0) + add); p.shieldT = Math.max(p.shieldT || 0, T.pre.dur); p.shieldColor = T.color;
    pbx(game).list.push({ kind: 'shield', cast, t: 0, life: T.pre.dur, last: p.shield, got: 0 });
    return;
  }
  if (T.pre?.kind === 'suck') { pbx(game).list.push({ kind: 'suck', cast, t: 0, life: T.pre.dur }); return; }
  fire(game, cast, cast.root, { x: p.x, y: p.y - 4, ang, src: 'player' });
}

// Phát một nút: Liên Phát lặp lại sau gap giây
export function fire(game, cast, node, at) {
  emit(game, cast, node, at);
  for (let r = 1; r <= (node.rep || 0); r++) pbx(game).list.push({ kind: 'wait', t: 0, life: node.gap * r, then: () => emit(game, cast, node, at.src === 'player' ? { ...at, x: game.player.x, y: game.player.y - 4 } : at) });
}

// Chỗ đặt đòn vùng: quái gần nhất trong tầm (Truy Kích: luôn đặt lên quái), không có thì phía trước
function spot(game, node, at, far) {
  const m = nearest(game, at.x, at.y, (node.seek ? 200 : far));
  if (m && (node.seek || at.src === 'player')) return { x: m.x, y: m.y };
  return at.src === 'player' ? { x: at.x + Math.cos(at.ang) * far * 0.6, y: at.y + 4 + Math.sin(at.ang) * far * 0.6 } : { x: at.x, y: at.y };
}

function emit(game, cast, node, at) {
  const L = pbx(game).list, n = node.n || 1;
  if (node.orbit) { L.push({ kind: 'orbit', cast, node, x: at.x, y: at.y, follow: at.src === 'player', t: 0, life: node.orbit.dur, hitT: new Map() }); return; }
  const angs = [];
  for (let i = 0; i < n; i++) angs.push(node.spread >= 360 ? at.ang + i / n * Math.PI * 2 : at.ang + (n > 1 ? (i - (n - 1) / 2) * node.spread * Math.PI / 180 : 0));
  switch (node.kind) {
    case 'shot':
      for (const a of angs) L.push({ kind: 'shot', cast, node, x: at.x + Math.cos(a) * 6, y: at.y + Math.sin(a) * 6, ox: at.x, oy: at.y, vx: Math.cos(a) * node.speed, vy: Math.sin(a) * node.speed, t: 0, life: node.range / node.speed, pierce: node.pierce, bounce: node.bounce, hit: new Set(), kids: 0 });
      break;
    case 'wave':
      for (const a of angs) L.push({ kind: 'wave', cast, node, x: at.x, y: at.y, ang: a, t: 0, life: node.dur, hit: new Set(), kids: 0, follow: at.src === 'player' });
      break;
    case 'ring':
      angs.forEach((a, i) => L.push({ kind: 'ring', cast, node, x: at.x, y: at.y + 4, t: -i * 0.15, life: node.dur, hit: new Set(), kids: 0 }));
      break;
    case 'blast': blast(game, cast, node, at.x, at.y, {}); break;
    case 'zone': { const q = node.seek || at.src === 'player' ? spot(game, node, at, node.reach || 120) : at; L.push({ kind: 'zone', cast, node, x: q.x, y: q.y, t: 0, life: node.dur, next: 0, kids: 0 }); break; }
    case 'seal': { const q = node.seek || at.src === 'player' ? spot(game, node, at, node.reach || 140) : at; L.push({ kind: 'seal', cast, node, x: q.x, y: q.y, t: 0, life: node.delay, kids: 0 }); break; }
  }
}

// Nổ tức thì: trúng mọi quái trong r, rồi bắn mảnh (Tỏa Nhánh sau đòn vùng)
function blast(game, cast, node, x, y, opt) {
  const e = { kind: 'blast', cast, node, x, y, r: node.r, t: 0, life: 0.35, kids: 0 };
  pbx(game).list.push(e);
  for (const m of game.mobs) if (!m.dead && Math.hypot(m.x - x, m.y - y) < node.r + m.r) pbHit(game, cast, node, m, { x, y }, e, opt);
  game.screen?.shake?.(Math.min(5, 1.5 + node.r * 0.04), 0.16);
  if (node.shards) fire(game, cast, node.shards, { x, y, ang: cast.ang, src: 'point' });
}

function ended(game, e) {   // đòn vùng / đạn hết đường: nút có mảnh thì bắn mảnh ở chỗ kết thúc
  if (e.node?.shards && !e.shardDone && e.kind !== 'blast') { e.shardDone = true; fire(game, e.cast, e.node.shards, { x: e.x, y: e.y, ang: e.ang ?? Math.atan2(e.vy || 0, e.vx || 1), src: 'point' }); }
}

export function updatePhapBao(game, dt) {
  if (!game.pbx && !pbOn(game)) return;
  const S = pbx(game), p = game.player, now = game.time || 0;
  game.pbFire = (cast, node, at) => fire(game, cast, node, at);
  game.pbHurt = from => pbHurt(game, from);
  game.pbRefire = (cast, m) => fire(game, cast, cast.root, { x: p.x, y: p.y - 4, ang: Math.atan2(m.y - p.y, m.x - p.x), src: 'player' });
  p.pbDr = 0;
  pbStatusTick(game);
  for (const e of S.list) {
    e.t += dt;
    const N = e.node;
    switch (e.kind) {
      case 'wait': if (e.t >= e.life && !e.done) { e.done = true; e.then(); } break;
      case 'shot': stepShot(game, e, dt); break;
      case 'wave': {
        if (e.follow) { e.x = p.x; e.y = p.y - 4; }
        const k = Math.min(1, e.t / e.life), R = N.range * (0.35 + 0.65 * k), half = N.arc * Math.PI / 360;
        for (const m of game.mobs) {
          if (m.dead || e.hit.has(m)) continue;
          const d = Math.hypot(m.x - e.x, m.y - e.y), da = Math.abs(((Math.atan2(m.y - e.y, m.x - e.x) - e.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (d < R + m.r && da < half + 0.15) { e.hit.add(m); pbHit(game, e.cast, N, m, e, e); }
        }
        if (e.t >= e.life) ended(game, { ...e, x: e.x + Math.cos(e.ang) * N.range, y: e.y + Math.sin(e.ang) * N.range });
        break;
      }
      case 'ring': {
        if (e.t < 0) break;
        const R = N.r * Math.min(1, e.t / e.life);
        for (const m of game.mobs) if (!m.dead && !e.hit.has(m) && Math.hypot(m.x - e.x, m.y - e.y) < R + m.r) { e.hit.add(m); pbHit(game, e.cast, N, m, e, e); }
        if (e.t >= e.life) ended(game, e);
        break;
      }
      case 'zone':
        if (Math.hypot(p.x - e.x, p.y - e.y) < N.r) p.pbDr = Math.max(p.pbDr, N.dr || 0);
        if (e.t >= e.next) { e.next = e.t + (N.tick || 0.5); for (const m of game.mobs) if (!m.dead && Math.hypot(m.x - e.x, m.y - e.y) < N.r + m.r) pbHit(game, e.cast, N, m, e, e, { soft: true }); }
        if (e.t >= e.life) ended(game, e);
        break;
      case 'seal':
        if (e.t >= e.life && !e.done) {
          e.done = true;
          S.list.push({ kind: 'anim', spr: 'pbfx.dai-an', x: e.x, y: e.y, w: N.r * 2.4, t: 0, life: 0.65 });
          game.sfx?.('boom', 0.9);
          blast(game, e.cast, { ...N, shards: null }, e.x, e.y, {});
          ended(game, e);
        }
        break;
      case 'orbit': {
        if (e.follow) { e.x = p.x; e.y = p.y - 4; }
        const O = N.orbit;
        for (let i = 0; i < O.n; i++) {
          const a = e.t * 4 + i / O.n * Math.PI * 2, ox = e.x + Math.cos(a) * O.rad, oy = e.y + Math.sin(a) * O.rad * 0.6;
          for (const m of game.mobs) {
            if (m.dead || Math.hypot(m.x - ox, m.y - oy) > (N.r || 6) + m.r + 4 || (e.hitT.get(m) || 0) > e.t) continue;
            e.hitT.set(m, e.t + O.tick); pbHit(game, e.cast, N, m, { x: e.x, y: e.y }, e, { soft: true });
          }
        }
        if (e.t >= e.life) ended(game, e);
        break;
      }
      case 'shield': {
        if (p.shield < e.last) e.got += e.last - p.shield;
        e.last = p.shield;
        if ((p.shield <= 0 || e.t >= e.life) && !e.done) {
          e.done = true; e.t = e.life;
          if (e.cast.root.orbit) fire(game, e.cast, e.cast.root, { x: p.x, y: p.y - 4, ang: e.cast.ang, src: 'player' });
          else blast(game, e.cast, e.cast.root, p.x, p.y, { flat: e.got * e.cast.T.pre.absorb });
          if (e.cast.root.rep) for (let r = 1; r <= e.cast.root.rep; r++) S.list.push({ kind: 'wait', t: 0, life: e.cast.root.gap * r, then: () => blast(game, e.cast, e.cast.root, p.x, p.y, {}) });
        }
        break;
      }
      case 'suck': {
        const P = e.cast.T.pre;
        let n = 0;
        for (const m of game.mobs) {
          if (m.dead) continue;
          const d = Math.hypot(m.x - p.x, m.y - p.y);
          if (d > P.r || d < 12) continue;
          n++;
          if (m.def?.ai !== 'boss' && !m.remote) game.map.move(m, (p.x - m.x) / d * P.pull * dt, (p.y - m.y) / d * P.pull * dt);
        }
        if (n && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * P.heal * n * dt / P.dur);
        if (e.t >= e.life && !e.done) { e.done = true; game.sfx?.('wind_cast', 0.8); fire(game, e.cast, e.cast.root, { x: p.x, y: p.y - 4, ang: Math.atan2(p.face.y, p.face.x), src: 'player' }); }
        break;
      }
    }
  }
  S.list = S.list.filter(e => (e.kind === 'wait' ? !e.done : e.t < e.life));
  if (S.thorn?.length) S.thorn = S.thorn.slice(-6);
}

// Đạn: bay, đuổi quái (Truy Kích), trúng (xuyên / nảy), Phi Kiếm hết đường thì bay về tay
function stepShot(game, e, dt) {
  const N = e.node, p = game.player;
  if (N.homing && !e.back) {
    const m = nearest(game, e.x, e.y, 120, e.hit);
    if (m) { const a = Math.atan2(m.y - e.y, m.x - e.x), cur = Math.atan2(e.vy, e.vx), d = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI, na = cur + Math.max(-N.homing * dt, Math.min(N.homing * dt, d)), sp = Math.hypot(e.vx, e.vy); e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp; }
  }
  if (e.back) { const a = Math.atan2(p.y - 4 - e.y, p.x - e.x), sp = N.speed * 1.2; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; if (Math.hypot(p.x - e.x, p.y - 4 - e.y) < 10) { e.t = e.life; return; } }
  e.x += e.vx * dt; e.y += e.vy * dt;
  const T = game.map.T;
  if (!e.back && game.map.wallTile(Math.floor(e.x / T), Math.floor(e.y / T))) return finish(game, e);
  for (const m of game.mobs) {
    if (m.dead || e.hit.has(m) || dist(e, m) > m.r + N.r) continue;
    e.hit.add(m);
    pbHit(game, e.cast, N, m, { x: e.x - e.vx * 0.05, y: e.y - e.vy * 0.05 }, e, e.bounced ? { mul: Math.pow(N.bounceMul || 0.7, e.bounced) } : {});
    if (e.bounce > 0) {
      const n2 = nearest(game, e.x, e.y, N.bounceR || 80, e.hit);
      if (n2) { e.bounce--; e.bounced = (e.bounced || 0) + 1; const a = Math.atan2(n2.y - e.y, n2.x - e.x), sp = Math.hypot(e.vx, e.vy); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.t = Math.min(e.t, e.life * 0.5); return; }
    }
    if (e.pierce > 0) { e.pierce--; continue; }
    if (N.ret && !e.back) { e.back = true; e.hit.clear(); e.hit.add(m); e.life = e.t + 2; ended(game, e); return; }   // Phi Kiếm chém trúng thì quay về (đường về vẫn chém)
    if (e.back) continue;
    return finish(game, e);
  }
  if (e.t >= e.life && !e.back) { if (N.ret) { e.back = true; e.hit.clear(); e.life = e.t + 2; ended(game, e); } else finish(game, e); }
}

function finish(game, e) { ended(game, e); e.t = e.life; }

// Phản Chấn: bị đánh thì tung đòn của món có Phản Chấn về phía kẻ đánh (combat.js hitPlayer gọi game.pbHurt)
export function pbHurt(game, from) {
  const S = game.pbx, p = game.player, now = game.time || 0;
  if (!S?.thorn?.length || !from) return;
  for (const c of S.thorn) {
    const P = c.procs['phan-chan'];
    if (now < (c.phanT || 0)) continue;
    c.phanT = now + P.cd;
    fire(game, c, c.root.kind === 'blast' ? { ...c.root, r: c.root.r * 0.7 } : c.root, { x: p.x, y: p.y - 4, ang: Math.atan2(from.y - p.y, from.x - p.x), src: 'player' });
    break;
  }
}

export { PB };
