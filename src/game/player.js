// Người chơi: đi lại, đánh thường theo cung, chiêu, đả tọa.
import { manaTick, spendMana } from './mana.js';
import { ensureWornLines } from './beast.js';
import { openAllSocket4 } from './socket4.js';
import { addFx, hitMob, dist, shoot } from './combat.js';
import { weaponSlash } from './slash-fx.js';
import { heroLook } from '../render/draw-hero.js';
import { castSkill, skillSlots, skillReady } from './skills.js';
import { pbOn } from './phap-bao.js';
import { pbInput } from './phap-bao-run.js';
import { chainStep } from './skill-chain.js';
import { domainHold } from './skill-domain.js';
import { chargeHold } from './skill-charge.js';
import { warmSkillSfx } from './skill-sfx.js';
import { playerStats, weaponId, artSkill } from './stats.js';
import { usePill } from './cave.js';
import { rideSpeed } from './pets.js';
import { dailyEvent } from './daily.js';
import { autoStep } from './auto.js';
import { pilotStep } from './pilot.js';
import { noteQi } from './eta.js';
import { pilotOpt } from './pilotopt.js';
import { meditateMul } from './evolve.js';
import { nightMul } from './daynight.js';
import { rainMul } from './weather.js';
import { songTuMul } from './affinity.js';
import { homeMul, teaMul } from './home.js';
import { bump } from './achieve.js';
import { startStrike, updateFlyWeapon, weaponPoint } from './flyweapon.js';

export function createPlayer(game, x, y) {
  const cfg = game.data.config.player;
  const st = playerStats(game.save, game.data);
  return {
    x, y, r: cfg.radius, face: { x: 0, y: 1 }, moving: false, walkT: 0,
    hp: st.maxHp, maxHp: st.maxHp, atk: st.atk, st,
    atkCd: 0, swingT: 0, skillCd: [0, 0, 0, 0],
    invT: 0, flash: 0, kx: 0, ky: 0, dashT: 0,
    shield: 0, shieldT: 0, buffT: 0, buffAmt: 0,
    meditating: false, regenT: 0,
  };
}

export function refreshStats(game) {
  ensureWornLines(game);   // dòng chỉ số thú cưỡi, thời trang (src/game/beast.js)
  if (openAllSocket4(game)) game.persist?.();   // ô khảm thứ 4 cho phẩm Tiên / Thượng Cổ (src/game/socket4.js)
  const p = game.player, st = playerStats(game.save, game.data);
  const grow = st.maxHp - p.maxHp;
  p.maxHp = st.maxHp; p.atk = st.atk; p.st = st; p.hp = Math.min(p.maxHp, p.hp + Math.max(0, grow));
}

function nearestMob(game, range) {
  let best = null, bd = range;
  for (const m of game.mobs) {
    if (m.dead) continue;
    const d = dist(game.player, m) - m.r;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// Tự ngắm: hướng về quái gần nhất trong tầm chiêu (không có thì giữ hướng đang nhìn)
export function autoAim(game, skillId) {
  const s = game.data.skills[skillId], p = game.player;
  const reach = s.range || s.dist || ((s.offset || 0) + (s.radius || 0)) || 0;
  if (!reach) return null;
  const m = nearestMob(game, reach + 30);
  if (!m) return null;
  const a = Math.atan2(m.y - p.y, m.x - p.x);
  return { x: Math.cos(a), y: Math.sin(a) };
}

// Hệ số đánh thường (config.combat): mang càng nhiều chiêu tấn công thì đánh thường càng nhẹ, chưa có chiêu thì giữ nguyên
export function basicMul(game) {
  const C = game.data.config.combat, S = game.data.skills;
  const n = skillSlots(game).filter(id => id && S[id]?.mult).length;
  return 1 - (1 - C.basic) * Math.min(1, n / C.basic_full);
}

// Đánh thường kiểu ngự kiếm (flyweapon.js): người vận lực, vũ khí sau lưng lao ra; sát thương tính lúc vũ khí tới nơi (p.hitQ)
function swing(game) {
  const p = game.player, w = game.data.weapons[weaponId(game.save, game.data)], dmg = p.atk * basicMul(game);
  p.dmgRef = dmg;   // mốc so cỡ số sát thương (src/render/draw-numbers.js)
  // Tự quay về phía quái gần nhất (dễ đánh trên điện thoại)
  const target = nearestMob(game, reachW(game, w) + 24);
  if (target) {
    const a = Math.atan2(target.y - p.y, target.x - p.x);
    p.face = { x: Math.cos(a), y: Math.sin(a) };
  }
  const ang = Math.atan2(p.face.y, p.face.x), shot = w.attack === 'shot', half = shot ? 0 : w.arc / 2 * Math.PI / 180;
  const t = startStrike(game, shot ? 'shot' : 'arc', ang, w.range, half);
  p.hitQ = { t, ang, half, w, dmg, move: p.fw.act.move };
  p.swingT = 0.18;
  if (!shot) game.sfx('swing', 0.8);   // tiếng vút lúc vũ khí lao ra
  return w.cooldown;
}

// Tầm chém thường = đúng tầm vệt chém vẽ ra (tầm vũ khí × config.slash.far; chủ dự án 09/11/2026 15:58: "mở rộng phạm vi công kích
// bằng vệt chém"); vũ khí bắn giữ tầm cũ
export const reachW = (game, w) => (w.attack === 'shot' ? w.range : w.range * (game.data.config.slash?.far || 1));

// Vũ khí lao tới nơi: bắn đạn từ chỗ vũ khí, hoặc chém trúng quái trong cung trước mặt
function strike(game, q) {
  const p = game.player, w = q.w, ca = Math.cos(q.ang), sa = Math.sin(q.ang);
  if (q.move === 'ban') {   // đàn, cung: đạn bay ra từ vũ khí trước mặt
    const o = weaponPoint(game);
    shoot(game, { from: 'player', x: o.x, y: o.y, vx: ca * w.speed, vy: sa * w.speed, r: w.radius, dmg: q.dmg, pierce: !!w.pierce, color: w.color, life: w.range / w.speed, fx: w.fx });
    game.sfx('shoot', 0.6);
    return;
  }
  const R = reachW(game, w), cx = p.x, cy = p.y - 8, tip = { x: cx + ca * R, y: cy + sa * R };
  // Vệt chém vẽ mượt, nổi trên mọi thứ (src/game/slash-fx.js, chủ dự án xin 29/10/2026); bổ và đâm thêm tia lửa ở chỗ trúng
  const hit = q.move === 'bo' ? { x: cx + ca * R * 0.8, y: cy + sa * R * 0.8 } : tip;
  if (heroLook(game).trail?.style !== 'kiem') weaponSlash(game, p, w, q.move, q.ang, hit);   // bộ có vệt kiếm khí riêng (Huyết Nguyệt, src/render/draw-huyet.js) thì bỏ vệt chém chung (chủ dự án 04/11/2026 23:42)
  if (!['quet', 'xoay', 'hat', 'moc'].includes(q.move)) addFx(game, { type: 'sprite', id: 'fx.spark', x: hit.x, y: hit.y, s: 1.3, life: 0.2 });
  for (const m of game.mobs) {
    if (m.dead) continue;
    const d = dist(p, m);
    if (d > R + m.r) continue;
    let da = Math.atan2(m.y - p.y, m.x - p.x) - q.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) <= q.half || d < m.r + p.r + 2) hitMob(game, m, q.dmg, { color: w.color });
  }
}

// Chiêu chưa dùng được (lướt Thiểm Ảnh, lĩnh vực không có mục tiêu trong tầm): không trừ linh lực, báo cách nhau 1,5 giây (tự đánh thì im)
function ready(game, id) {
  if (skillReady(game, id)) return true;
  const p = game.player;
  if (!game.auto && !game.pilot && (game.time || 0) - (p.noTgtT ?? -9) > 1.5) { p.noTgtT = game.time || 0; game.number(p.x, p.y - 22, game.data.skills[id].no_target || 'Không có mục tiêu', '#e6ebf7'); }
  return false;
}

export function updatePlayer(game, dt) {
  const p = game.player, inp = game.input, cfg = game.data.config;
  p.invT -= dt; p.flash -= dt; p.atkCd -= dt; p.swingT -= dt; p.dashT -= dt;
  p.skillCd = p.skillCd.map(c => c - dt);
  if (p.shieldT > 0 && (p.shieldT -= dt) <= 0) p.shield = 0;
  if (p.buffT > 0) p.buffT -= dt;
  if ((p.chain && chainStep(game, p, dt)) || (p.domain && domainHold(game, p)) || (p.charge && chargeHold(game, p, dt))) { updateFlyWeapon(game, dt); manaTick(game, dt); return; }   // đang lướt Thiểm Ảnh (skill-chain.js), giữ lĩnh vực (skill-domain.js), tụ lực Phá Thiên (skill-charge.js): bỏ đi lại, đánh

  // Đẩy lùi
  if (p.kx || p.ky) {
    game.map.move(p, p.kx * dt, p.ky * dt);
    p.kx *= Math.exp(-dt * 12); p.ky *= Math.exp(-dt * 12);
    if (Math.abs(p.kx) + Math.abs(p.ky) < 2) { p.kx = 0; p.ky = 0; }
  }

  const auto = game.pilot ? pilotStep(game, inp.axis(), dt) : autoStep(game, inp.axis(), dt), ax = auto.ax;
  p.moving = Math.hypot(ax.x, ax.y) > 0.1;
  // Lướt né: nút riêng, bất tử trong lúc lướt
  p.dashCd = (p.dashCd || 0) - dt;
  if (inp.consume('dash') && p.dashCd <= 0) {
    const dc = cfg.dash, d = p.moving ? Math.hypot(ax.x, ax.y) : 1, dir = p.moving ? { x: ax.x / d, y: ax.y / d } : p.face;
    p.dashCd = dc.cd; p.dashT = dc.time; p.dashV = { x: dir.x * dc.dist / dc.time, y: dir.y * dc.dist / dc.time };
    p.meditating = false; p.riding = false; p.calmT = 0; p.face = dir;
    addFx(game, { type: 'ring', x: p.x, y: p.y, r: 8, color: '#e6ebf7', life: 0.25 });
    game.sfx('dash');
  }
  if (p.dashT > 0 && p.dashV) {
    const sx = p.x, sy = p.y;
    game.map.move(p, p.dashV.x * dt, p.dashV.y * dt);
    addFx(game, { type: 'line', x: sx, y: sy, x2: p.x, y2: p.y, color: '#e6ebf7', life: 0.2 });
  } else if (p.moving) {
    p.meditating = false;
    const sp = cfg.player.speed * p.st.speedMul * rideSpeed(game) * Math.min(1, Math.hypot(ax.x, ax.y) * 1.3);
    const d = Math.hypot(ax.x, ax.y);
    game.map.move(p, ax.x / d * sp * dt, ax.y / d * sp * dt);
    p.face = { x: ax.x / d, y: ax.y / d };
    p.walkT += dt;
  }

  if ((inp.held.has('atk') || auto.atk) && p.atkCd <= 0) { p.meditating = false; p.atkCd = swing(game); }
  if (p.hitQ && (p.hitQ.t -= dt) <= 0) { const q = p.hitQ; p.hitQ = null; strike(game, q); }
  updateFlyWeapon(game, dt);

  const slots = skillSlots(game);
  warmSkillSfx(game, slots);   // dựng sẵn tiếng của chiêu đang mang (src/game/skill-sfx.js)
  if (pbOn(game)) pbInput(game, inp);   // Hệ Pháp Bảo (từ Mùa 2: mọi tài khoản): các nút chiêu là pháp bảo đang mặc (src/game/phap-bao-run.js)
  else for (let i = 0; i < 3; i++) {
    if (inp.consume('s' + i) && slots[i] && p.skillCd[i] <= 0 && ready(game, slots[i]) && spendMana(game, slots[i])) {   // chiêu tốn linh lực (src/game/mana.js)
      p.meditating = false; p.calmT = 0; p.riding = false;
      const dir = inp.aim['s' + i] || autoAim(game, slots[i]);
      if (dir) p.face = dir;
      p.castAim = inp.aim['s' + i] || null;   // hướng vuốt tay (null: chạm, tự ngắm), chiêu tụ lực dùng lúc chém (skill-charge.js)
      p.skillCd[i] = castSkill(game, slots[i]) * (1 - p.st.cdr);
    }
  }

  // Nút pháp bảo: chiêu riêng của pháp bảo đang mặc
  p.artCd = (p.artCd || 0) - dt;
  const art = pbOn(game) ? null : artSkill(game.save, game.data);   // hệ pháp bảo mới: nút này là ô pháp bảo thứ 4 (src/game/phap-bao-run.js pbInput)
  if (inp.consume('art') && art && p.artCd <= 0 && spendMana(game, art)) {
    p.meditating = false; p.calmT = 0; p.riding = false;
    const dir = autoAim(game, art);
    if (dir) p.face = dir;
    p.artCd = castSkill(game, art) * (1 - p.st.cdr);
  }

  // Nút Đan: uống đan hồi máu
  p.pillCd = (p.pillCd || 0) - dt;
  const pid = game.data.cave.pill_button, ap = game.save.autoPillPct || 0;   // góp ý #106: tự uống khi máu dưới mức % người chơi cài (Túi đồ → Đan dược), cả lúc tự tay đánh
  const low = (game.save.pills?.[pid] || 0) > 0 && (ap > 0 ? p.hp > 0 && p.hp < p.maxHp * ap : (game.pilot || game.auto) && pilotOpt(game, 'dan') && p.hp < p.maxHp * game.data.config.pilot.pill_hp);   // chưa cài: tự hành, tự đánh máu thấp thì tự uống như cũ
  if ((inp.consume('pill') || low) && p.pillCd <= 0 && !game.duel) {   // so tài: bản sao không uống đan nên mình cũng không
    const id = game.data.cave.pill_button, msg = usePill(game, id);
    if (msg) { p.pillCd = game.data.cave.pills[id].cd; game.number(p.x, p.y - 20, msg, '#9af0a8'); game.sfx('heal'); }
  }

  // Hồi Linh Đan (cave.mana_pill): tự uống khi linh lực dưới mức đã cài (Túi đồ → Đan dược), chưa cài thì tự hành, tự đánh dưới pilot.pill_mp
  p.mpPillCd = (p.mpPillCd || 0) - dt;
  const mid = game.data.cave.mana_pill, am = game.save.autoManaPct || 0;
  if (mid && p.mpPillCd <= 0 && !game.duel && (game.save.pills?.[mid] || 0) > 0 && p.mp != null && p.mpMax
    && (am > 0 ? p.mp < p.mpMax * am : (game.pilot || game.auto) && pilotOpt(game, 'dan') && p.mp < p.mpMax * game.data.config.pilot.pill_mp)) {
    const msg = usePill(game, mid);
    if (msg) { p.mpPillCd = game.data.cave.pills[mid].cd; game.number(p.x, p.y - 26, msg, '#7ab8ff'); game.sfx('heal'); }
  }

  manaTick(game, dt);   // linh lực hồi dần, đả tọa hồi nhanh
  // Hồi máu chậm khi không bị đánh
  if (p.invT < -3 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + cfg.player.regen * dt * (p.meditating ? 6 : 1));
  if (p.st.regen && p.hp < p.maxHp && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.st.regen * dt);

  if (p.meditating) {
    p.medT = (p.medT || 0) + dt;
    if (p.medT >= 0.5) { p.medT -= 0.5; const q = cfg.meditate.qi_per_sec * 0.5 * meditateMul(game) * nightMul(game) * rainMul(game) * songTuMul(game) * homeMul(game) * teaMul(game) * game.eventMul('qi'); noteQi(game, game.gainQi(q, p.x, p.y, true)); dailyEvent(game, 'meditate', null, 0.5); bump(game, 'sit', 0.5 / 60); }
  }
}
