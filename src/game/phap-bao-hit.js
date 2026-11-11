// Pháp bảo đánh trúng quái (src/game/phap-bao-run.js gọi): sát thương, hệ (đốt, chậm/đóng băng, trói, phá giáp, choáng + khiên đất),
// hút máu, nảy sang con kế, nổ con (Đánh Lan), Lôi Kích, Tử Bạo, Bạo Kích Liên Hoàn. Số ở data/phap-bao.json mods.
import { hitMob, dist, addFx } from './combat.js';
import { PB } from './phap-bao.js';
import { elementMul } from './phap-bao-build.js';

export const pbx = game => (game.pbx ??= { list: [], t: 0 });
export const alive = game => game.mobs.filter(m => !m.dead && !m.ghost);
export function nearest(game, x, y, r, skip) {
  let best = null, bd = r;
  for (const m of game.mobs) { if (m.dead || skip?.has(m)) continue; const d = Math.hypot(m.x - x, m.y - y) - (m.r || 0); if (d < bd) { bd = d; best = m; } }
  return best;
}

// Một đòn của nút node trúng quái m. from: chỗ phát ra (hướng đẩy lùi); e: thực thể phát ra (đếm số lần sinh con)
export function pbHit(game, cast, node, m, from, e, opt = {}) {
  if (!m || m.dead) return;
  const now = game.time || 0, M = PB(game).mods, em = elementMul(game, node.els);
  let dmg = cast.atk * node.mul * cast.dmgMul * cast.lvMul * (opt.mul || 1) + (opt.flat || 0);
  if ((m.pb?.brkT || 0) > now) dmg *= 1 + M.kim.brk * (m.pb.brkMul || 1);
  const ho = {
    color: node.els.length ? M[node.els[node.els.length - 1]].color : node.color, fromX: from.x, fromY: from.y, soft: !!opt.soft,
    stun: node.stun || 0,
    onHit: (mm, d, crit) => after(game, cast, node, mm, d, crit, e, em, from),
  };
  if (node.els.includes('thuy')) ho.slow = M.thuy.slow * em.thuy;
  if (node.els.includes('tho')) ho.stun = Math.max(ho.stun, M.tho.stun * em.tho);
  if (node.els.includes('moc')) ho.stun = Math.max(ho.stun, M.moc.root * em.moc);
  hitMob(game, m, dmg, ho);
  if (node.kb && !m.dead && m.def?.ai !== 'boss') { m.kx *= node.kb; m.ky *= node.kb; }
}

function after(game, cast, node, m, d, crit, e, em, src) {
  const p = game.player, now = game.time || 0, M = PB(game).mods, P = cast.procs, st = (m.pb ??= {});
  // hệ
  if (node.els.includes('hoa')) st.burn = { t: now + M.hoa.dur, dps: cast.atk * M.hoa.dps * em.hoa, next: now + 0.5, cast };
  if (node.els.includes('kim')) { st.brkT = now + M.kim.dur; st.brkMul = em.kim; }
  if (node.els.includes('moc')) { st.rootT = now + M.moc.root * em.moc; heal(game, d * M.moc.steal * em.moc); }
  if (node.els.includes('thuy')) {
    st.coldT = now + M.thuy.slow * em.thuy;
    st.wet = (st.wet || []).filter(x => x > now - M.thuy.win); st.wet.push(now);
    if (st.wet.length >= M.thuy.need && m.def?.ai !== 'boss' && !m.def?.noCc) { m.stunT = Math.max(m.stunT || 0, M.thuy.freeze * em.thuy); st.iceT = now + M.thuy.freeze * em.thuy; st.wet = []; }
  }
  if (node.els.includes('tho') && now > (p.pbThoT || 0)) { p.pbThoT = now + 1; p.shield = Math.min(p.maxHp, (p.shieldT > 0 ? p.shield : 0) + Math.round(p.maxHp * M.tho.shield * em.tho)); p.shieldT = Math.max(p.shieldT || 0, 3); }
  if (cast.steal) heal(game, d * cast.steal);
  // nảy (đòn vùng có chain): tia nảy sang con gần chưa trúng
  if (node.chain > 0 && !e.chained) {
    e.chained = true;
    let from = m; const seen = new Set([m]);
    for (let i = 0; i < node.chain; i++) {
      const n2 = nearest(game, from.x, from.y, node.bounceR || 80, seen);
      if (!n2) break;
      seen.add(n2); pbx(game).list.push({ kind: 'zap', x: from.x, y: from.y - 6, x2: n2.x, y2: n2.y - 6, t: 0, life: 0.22, color: node.color });
      pbHit(game, cast, { ...node, chain: 0, child: null }, n2, from, { kids: 9 }, { mul: Math.pow(node.bounceMul || 0.7, i + 1) });
      from = n2;
    }
  }
  // Lôi Kích: đếm đòn trúng của cả món
  if (P['loi-kich']) {
    cast.hits = (cast.hits || 0) + 1;
    if (cast.hits >= P['loi-kich'].every && now >= (cast.loiT || 0)) {
      cast.hits = 0; cast.loiT = now + P['loi-kich'].cd;
      pbx(game).list.push({ kind: 'bolt', x: m.x, y: m.y, t: 0, life: 0.35 });
      game.sfx?.('thunder', 0.6);
      hitMob(game, m, cast.atk * P['loi-kich'].mul * cast.lvMul, { color: '#bfe0ff', canCrit: false, soft: true });
    }
  }
  // Bạo Kích Liên Hoàn: chí mạng thì tung thêm một đòn gốc về phía con này
  if (crit && P['bao-kich'] && now >= (cast.critT || 0)) { cast.critT = now + P['bao-kich'].cd; game.pbRefire?.(cast, m); }
  // Tử Bạo: chết vì pháp bảo này thì nổ
  if (m.hp <= 0 && P['tu-bao'] && now >= (cast.tuT || 0)) {
    cast.tuT = now + P['tu-bao'].cd;
    pbx(game).list.push({ kind: 'blast', node: { look: 'no', color: '#fff2c0', r: P['tu-bao'].r, els: [] }, x: m.x, y: m.y, r: P['tu-bao'].r, t: 0, life: 0.35 });
    for (const o of game.mobs) if (!o.dead && o !== m && dist(o, m) < P['tu-bao'].r + o.r) hitMob(game, o, cast.atk * P['tu-bao'].mul * cast.lvMul, { color: '#fff2c0', soft: true, fromX: m.x, fromY: m.y });
  }
  // Đánh Lan…: nút con nổ ở chỗ trúng (mỗi thực thể tối đa 3 con để không nổ dây chuyền vô tận)
  if (node.child && (e.kids || 0) < 3) { e.kids = (e.kids || 0) + 1; game.pbFire?.(cast, node.child, { x: m.x, y: m.y, ang: Math.atan2(m.y - src.y, m.x - src.x), src: 'point' }); }
}

function heal(game, n) {
  const p = game.player;
  if (n > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + n);
}

// Mỗi khung: đốt máu, hết hạn trạng thái
export function pbStatusTick(game) {
  const now = game.time || 0;
  for (const m of game.mobs) {
    const st = m.pb;
    if (!st || m.dead) continue;
    if (st.burn) {
      if (now > st.burn.t) st.burn = null;
      else if (now >= st.burn.next) { st.burn.next = now + 0.5; hitMob(game, m, st.burn.dps * 0.5, { color: '#ff8a4a', canCrit: false, soft: true }); }
    }
  }
}

// Vòng nổ nhỏ (khi trúng đòn vùng không có hình riêng)
export const puff = (game, x, y, r, color) => addFx(game, { type: 'ring', x, y, r, color, life: 0.25 });
