// Đồng bộ bí cảnh tổ đội. Máy đội trưởng chạy quái thật, gửi trạng thái quái mỗi nhịp; máy thành viên vẽ quái theo đó,
// gửi vị trí và đòn đánh của mình. Đội trưởng áp đòn của thành viên, quái đánh trúng thành viên thì báo cho máy đó.
// Hạ quái, mở cửa, hạ boss: đội trưởng báo, máy nào cũng tự nhận thưởng của mình.
import { killMob, hitMob, hitPlayer, dist } from './combat.js';
import { dungeonDone } from './dun-mode.js';
import { isHost, inPartyRun, beginRun } from './party.js';

const P = game => game.data.party;
export function resetSync(game) { game.psync = { t: 0, hits: {}, shots: [] }; }
const S = game => game.psync ?? (resetSync(game), game.psync);

export const partyGuest = game => inPartyRun(game) && !isHost(game);
export const partyHostRun = game => inPartyRun(game) && isHost(game);
export const partyGhosts = game => inPartyRun(game) ? game.others.visible() : [];
export const partySize = game => game.party?.roster.length || 1;
const send = (game, body) => game.party?.net?.send(body);

// Thành viên đánh trúng quái của đội trưởng: gom lại gửi theo nhịp
export function partyHit(game, m, dmg, opt) {
  const h = (S(game).hits[m.uid] ??= { d: 0 });
  h.d += dmg; if (opt.slow) h.sl = opt.slow; if (opt.stun) h.st = opt.stun;
}
// Đội trưởng: quái chết, cửa mở, qua bí cảnh
export function partyKill(game, m) { if (partyHostRun(game) && m.uid) send(game, { t: 'kill', u: m.uid }); }
export function partyDoor(game, x) { if (partyHostRun(game)) send(game, { t: 'door', x }); }
export function partyDone(game) { if (partyHostRun(game)) send(game, { t: 'done' }); }
export function partyShot(game, b) { if (partyHostRun(game)) S(game).shots.push([Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.r, b.color, b.life]); }
// Quái của đội trưởng đánh trúng thành viên
export function partyHurt(game, id, dmg, from) { send(game, { t: 'hurt', to: id, d: Math.round(dmg), x: Math.round(from?.x || 0), y: Math.round(from?.y || 0) }); }

// Gọi mỗi khung từ game.update
export function updateParty(game, dt) {
  const p = game.party;
  if (!p) return;
  if (!inPartyRun(game)) {
    if (p.run && !game.traveling && game.map.id !== p.run.map) { if (isHost(game)) send(game, { t: 'end' }); p.run = null; }
    return;
  }
  const s = S(game);
  if ((s.rosterT = (s.rosterT || 0) - dt) <= 0) { s.rosterT = 1; game.others.presence(p.roster.filter(r => r.id !== p.me)); }   // trong bí cảnh kênh đảo tắt, bạn đồng đội lấy từ kênh đội
  if ((s.t -= dt) > 0) return;
  const pl = game.player, pos = { x: Math.round(pl.x), y: Math.round(pl.y), fx: +pl.face.x.toFixed(2), fy: +pl.face.y.toFixed(2), sw: pl.swingT > 0.15 ? 1 : 0 };
  if (isHost(game)) {
    s.t = P(game).snap;
    const m = game.mobs.filter(k => !k.dead && k.uid).map(k => [k.uid, k.id, Math.round(k.x), Math.round(k.y), Math.max(1, Math.round(k.hp)), k.maxHp,
      k.state === 'idle' ? 0 : 1, k.tele ? [k.tele.type, k.tele.r || 0, +(k.tele.a || 0).toFixed(2), k.tele.len || 0, +(k.tele.k || 0).toFixed(2)] : 0, k.rare ? 1 : 0]);
    send(game, { t: 'snap', pos, m, b: s.shots }); s.shots = [];
  } else {
    s.t = P(game).pos;
    const hits = Object.entries(s.hits).map(([u, h]) => [+u, Math.round(h.d), h.sl || 0, h.st || 0]); s.hits = {};
    send(game, { t: 'pos', pos, hits });
  }
}

function applySnap(game, msg) {
  const seen = new Set();
  for (const [u, id, x, y, hp, maxHp, busy, tele, rare] of msg.m) {
    seen.add(u);
    let m = game.mobs.find(k => k.uid === u);
    if (!m) { if (!game.data.mobs[id]) continue; m = game.spawn(id, x, y, { remote: true, uid: u, aggro: true }); m.rare = !!rare; }
    m.tx = x; m.ty = y; m.hp = hp; m.maxHp = maxHp; m.state = busy ? 'windup' : 'idle';
    m.tele = tele ? { type: tele[0], r: tele[1], a: tele[2], len: tele[3], k: tele[4] } : null;
  }
  for (const m of game.mobs) if (m.remote && !seen.has(m.uid)) m.dead = true;
  for (const [x, y, vx, vy, r, color, life] of msg.b || []) game.bullets.push({ from: 'see', x, y, vx, vy, r, color, life, hit: new Set() });
}

// Tin quyết định (trạng thái quái, hạ quái, mở cửa, qua ải, kết thúc, quái đánh trúng mình) chỉ nhận từ đội trưởng.
// Đòn trúng mình bị kẹp tối đa HURT_MAX máu tối đa và cách nhau ít nhất HURT_GAP giây, để máy khác sửa code
// cũng không một đòn giết được đồng đội.
const HURT_MAX = 0.8, HURT_GAP = 0.15;
export function onPartyMsg(game, msg) {
  const p = game.party;
  if (!p || !msg || typeof msg !== 'object') return;
  const fromHost = msg.from === p.roster[0]?.id && msg.from !== p.me;
  if (msg.t === 'start' && fromHost) { beginRun(game, { map: msg.map, mode: msg.mode, n: msg.n }); return; }
  if (!inPartyRun(game)) return;
  if (msg.pos && msg.from !== p.me) game.others.move({ ...msg.pos, id: msg.from });
  if (msg.t === 'snap' && !isHost(game) && fromHost) applySnap(game, msg);
  else if (msg.t === 'pos' && isHost(game)) {
    const o = game.others.list.get(msg.from);
    for (const [u, d, sl, st] of msg.hits || []) {
      const m = game.mobs.find(k => k.uid === u && !k.dead);
      if (m && Number.isFinite(d) && d > 0) hitMob(game, m, d, { remote: true, slow: sl, stun: st, fromX: o?.x, fromY: o?.y });
    }
  } else if (!fromHost) return;
  else if (msg.t === 'hurt' && msg.to === p.me && Number.isFinite(msg.d)) {
    const now = performance.now() / 1000, S0 = S(game);
    if (now - (S0.hurtT || 0) < HURT_GAP) return;
    S0.hurtT = now;
    hitPlayer(game, Math.min(Math.max(0, msg.d), game.player.maxHp * HURT_MAX), { x: msg.x, y: msg.y });
  }
  else if (msg.t === 'kill') { const m = game.mobs.find(k => k.uid === msg.u && !k.dead); if (m) killMob(game, m); }
  else if (msg.t === 'door') { for (const [x, y] of game.map.findTiles('D')) if (x === msg.x) game.map.locked.delete(x + ',' + y); game.toast('Cửa đã mở!'); game.sfx('door'); }
  else if (msg.t === 'done') dungeonDone(game);
  else if (msg.t === 'end') { p.run = null; game.toast(P(game).end, 2.4); game.travel(game.data.party.home, 'vao', true); }
}

// Người gần nhất trong đội (mình hoặc đồng đội) để quái của đội trưởng nhắm vào
export function nearestTarget(game, m) {
  let best = game.player, bd = dist(m, best);
  for (const o of partyGhosts(game)) { const d = dist(m, o); if (d < bd) { bd = d; best = o; } }
  return best;
}
