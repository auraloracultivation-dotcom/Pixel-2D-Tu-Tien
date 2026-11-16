// Quái: lang thang, đuổi, bắn xa, và boss (chém, lao, triệu hồi, vòng đạn, gọi lửa rơi nếu có meteor).
import { inHoi } from '../world/hoi-foot.js';
import { teleStart } from './hurt-feel.js';
import { hitPlayer, shoot, dist } from './combat.js';
import { addStrike } from './strikes.js';
import { partyHostRun, nearestTarget, partyHurt, partyShot } from './party-sync.js';
import { duelThink } from './duel-ai.js';
import { tickDummy } from './dummy.js';
import { tickMang } from './thien-mang.js';
import { reachOf, aggroCheck } from './mob-power.js';
import { crowd } from './crowd.js';
import { mobHitFx, mobShotFx, noticeTick } from './mob-fx.js';

let UID = 0;   // số riêng của từng con quái, để tổ đội gọi đúng con

export function spawnMob(game, id, x, y, extra = {}) {
  const def = game.data.mobs[id];
  const m = {
    id, uid: ++UID, def, x, y, r: def.radius, hp: def.hp, maxHp: def.hp,
    hx: x, hy: y, kx: 0, ky: 0, flash: 0, slowT: 0, stunT: 0,
    state: 'idle', t: Math.random() * 2, cd: 0.6 + Math.random(), wx: x, wy: y,
    aggro: def.ai === 'chase' || def.ai === 'ranged' || def.ai === 'boss',
    hop: Math.random() * 6, dead: false, ...extra,
  };
  if (def.ai === 'boss') { m.phase = 0; m.summoned = extra.summoned ?? 0; }   // đối thủ Luận Võ Đài kiểu boss truyền summoned: 2 (không gọi đệ tử)
  game.mobs.push(m);
  return m;
}

// Quái nhiễm ma khí ở vòng ngoài tinh cầu (spawner có mul, data/planets.json): máu, công gấp mul lần, không hiện số;
// linh khí chỉ nhích dungeon.reward_tier mỗi lần gấp đôi (luật 7 → 14 → 28)
export function scaleMobBy(game, m, mul, tag) {   // tag: chữ trước tên (vùng ma khí: Tàn, Hung, Ma Thần…); mul < 1 là quái yếu đi
  const q = game.data.dungeon.reward_tier ** Math.log2(mul);
  m.def = { ...m.def, hp: Math.max(1, Math.round(m.def.hp * mul)), atk: Math.max(0.1, Math.round(m.def.atk * mul * 10) / 10), qi: Math.round((m.def.qi || 0) * q), name: tag ? `${tag} ${m.def.name}` : m.def.name };
  m.hp = m.maxHp = m.def.hp; m.elite = mul > 1 ? mul : 0;
}

function moveToward(game, m, tx, ty, speed, dt, ghost = true) {   // ghost false: bước lùi ra xa người chơi, không được xuyên vật cản (xem dưới)
  const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
  if (d < 1) return d;
  const s = speed * (m.slowT > 0 ? 0.45 : 1) * dt, mx = dx / d * Math.min(s, d), my = dy / d * Math.min(s, d);
  if (m.def.ai !== 'boss' && !inHoi(game, m) && inHoi(game, { x: m.x + mx, y: m.y + my })) { m.fx = dx / d; m.fy = dy / d; return d; }   // không bước vào phố lễ hội
  // Đề xuất #49: quái kẹt sau đá, nhà quá ghost_after giây thì đi xuyên vật cản ghost_sec giây (kẹt giữa vật thì xuyên tiếp tới chỗ trống).
  // Chỉ khi đang ĐUỔI: quái bắn xa lùi ra xa người chơi mà chạm tường thì đứng lại. 15/11/2026: Ma tiễn trong bí cảnh lùi vào tường 0,8 giây rồi xuyên ra ngoài
  // phòng, người chơi không tới được, phòng không bao giờ sạch (trước đó nó 24 máu nên thường chết trước khi kịp lùi; từ khi có sàn máu thì sống đủ lâu).
  const G = game.data.config.mob_ghost, T = game.map.T, inWall = () => game.map.solidTile(Math.floor(m.x / T), Math.floor(m.y / T));
  if (!ghost && m.ghostT > 0 && !inWall()) m.ghostT = 0;
  if (G && (m.ghostT > 0 || (m.ghostT === 0 && inWall()))) { m.x = Math.max(0, Math.min(game.map.w * T, m.x + mx)); m.y = Math.max(0, Math.min(game.map.h * T, m.y + my)); m.ghostT = Math.max(0, m.ghostT - dt); }
  else {
    const bx = m.x, by = m.y;
    game.map.move(m, mx, my);
    if (G && ghost && Math.hypot(m.x - bx, m.y - by) < Math.hypot(mx, my) * 0.3) { if ((m.blkT = (m.blkT || 0) + dt) > G.after) { m.blkT = 0; m.ghostT = G.sec; } }
    else m.blkT = 0;
  }
  m.fx = dx / d; m.fy = dy / d;
  return d;
}

// Quái đánh trúng mục tiêu: mình thì trừ máu, đồng đội thì báo qua kênh đội
function strike(game, m, dmg) {
  if (!m.tgt || m.tgt === game.player) hitPlayer(game, dmg, m);
  else partyHurt(game, m.tgt.id, dmg, m);
}
function mobShoot(game, b) { shoot(game, b); partyShot(game, b); }

export function updateMobs(game, dt) {
  const host = partyHostRun(game), S = game.data.config.npc_safe;
  for (const m of game.mobs) {
    if (m.dead) continue;
    m.flash -= dt; m.slowT -= dt; m.stunT -= dt; m.t += dt; m.cd -= dt; m.hop += dt * 6; m.ak = (m.ak || 0) + dt;   // ak: đồng hồ riêng của con quái, không quay về 0 (hình động, dấu chấm than)
    if (m.remote) {   // quái của đội trưởng: chỉ trượt tới vị trí được báo
      const dx = (m.tx ?? m.x) - m.x, dy = (m.ty ?? m.y) - m.y, k = Math.min(1, dt * 10);
      if (Math.abs(dx) + Math.abs(dy) > 0.5) { m.fx = Math.sign(dx); m.fy = Math.sign(dy); }
      m.x += dx * k; m.y += dy * k;
      continue;
    }
    if (m.dummy) { tickDummy(game, m); continue; }   // Mộc Nhân: đứng yên, không đánh (game/dummy.js)
    if (m.wboss) { tickMang(game, m); continue; }   // đầu boss thế giới: đứng yên (game/thien-mang.js)
    const p = m.tgt = host ? nearestTarget(game, m) : game.player;
    if (m.kx || m.ky) {
      game.map.move(m, m.kx * dt, m.ky * dt);
      m.kx *= Math.exp(-dt * 14); m.ky *= Math.exp(-dt * 14);
      if (Math.abs(m.kx) + Math.abs(m.ky) < 2) { m.kx = 0; m.ky = 0; }
    }
    if (m.stunT > 0 || game.paused) continue;
    if (S && m.def.ai !== 'boss' && m.def.ai !== 'duel' && !(game.time - (m.hurtT ?? -1e9) < S.grace) && (nearNpc(game, p, S.r) || inHoi(game, p))) { m.state = 'idle'; wander(game, m, dt); continue; }   // vùng an toàn quanh NPC (data/config.json npc_safe) và phố lễ hội (hoi-foot.js)
    const d = dist(m, p);
    m.aggro = !!aggroCheck(game, m, p, d);   // chỉ chủ động đánh khi vào tầm, chạy xa thì thôi đuổi (mob-power.js)
    noticeTick(game, m, p, d);   // vừa nhận ra mình: dấu chấm than (mob-fx.js)
    if (m.def.ai === 'duel') duelThink(game, m, d, dt);   // bản sao so tài (game/duel.js)
    else if (m.def.ai === 'boss') bossThink(game, m, d, dt);
    else if (m.aggro && m.def.ai === 'ranged') rangedThink(game, m, d, dt);
    else if (m.aggro) meleeThink(game, m, d, dt);
    else wander(game, m, dt);
  }
  crowd(game);   // khối cứng: quái, NPC, người chơi không đè lên nhau (crowd.js; thay spreadMobs của mob-power.js)
  game.mobs = game.mobs.filter(m => !m.dead);
}

// Luật mới: đệ tử boss gọi ra nhẹ hơn quái cùng loài (data/he-chien.json → summon_k). Pháp bảo hồi 2–5 phút (chủ dự án 16/11/2026) nên không
// còn quét đệ tử bằng chiêu liên tục; sáu đệ tử bắn xa nguyên sức đứng ngoài bắn trong lúc Tự đánh dồn boss thì gục (đo bằng Playwright).
function summonK(game, s) {
  const H = game.data['he-chien'], K = H?.on && H.summon_k;
  if (!K || !s?.def) return;
  s.def = { ...s.def, hp: Math.max(1, Math.round(s.def.hp * (K.hp ?? 1))), atk: +(s.def.atk * (K.atk ?? 1)).toFixed(2) };
  s.hp = s.maxHp = s.def.hp;
}

const nearNpc = (game, p, r) => !!p && game.npcs.some(n => Math.abs(n.x - p.x) < r && Math.abs(n.y - p.y) < r && Math.hypot(n.x - p.x, n.y - p.y) < r);

function wander(game, m, dt) {
  if (m.t > 2.5) {
    m.t = Math.random();
    const a = Math.random() * Math.PI * 2, r = Math.random() * 24;
    m.wx = m.hx + Math.cos(a) * r; m.wy = m.hy + Math.sin(a) * r;
  }
  moveToward(game, m, m.wx, m.wy, m.def.speed * 0.5, dt);
}

function meleeThink(game, m, d, dt) {
  const p = m.tgt || game.player, reach = m.r + p.r + reachOf(game, m);   // tầm vồ dài thêm, đứng cách người chơi (mob-power.js)
  if (m.state === 'windup') {
    if (m.t >= m.def.windup) {
      m.state = 'idle'; m.cd = m.def.cd;
      mobHitFx(game, m, p);   // hình đòn theo kiểu đòn của con quái (mob-fx.js; chưa khai kiểu thì vết cắn cũ)
      if (dist(m, p) < reach + 4) strike(game, m, m.def.atk);
    }
    return;
  }
  if (d < reach && m.cd <= 0) { m.state = 'windup'; m.t = 0; m.lun = 1; teleStart(game, m, p); return; }   // lun: quái đánh gần, có lùi lấy đà rồi chồm tới (src/game/hurt-feel.js)
  if (d > reach - 2) moveToward(game, m, p.x, p.y, m.def.speed, dt);
}

function rangedThink(game, m, d, dt) {
  const p = m.tgt || game.player, want = m.def.range * 0.75;
  if (m.state === 'windup') {
    if (m.t >= m.def.windup) {
      m.state = 'idle'; m.cd = m.def.cd;
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      mobShoot(game, { from: 'mob', src: m, x: m.x, y: m.y - 3, vx: Math.cos(a) * m.def.bullet, vy: Math.sin(a) * m.def.bullet, r: 3, dmg: m.def.atk, color: m.def.fx?.c || '#e070ff', mk: m.def.fx?.k, life: 2 });
      mobShotFx(game, m, a);   // loé chỗ đạn rời tay; đạn vẽ theo kiểu mk (draw-mob-fx.js)
    }
    return;
  }
  if (d < m.def.range && m.cd <= 0) { m.state = 'windup'; m.t = 0; return; }
  if (d > want + 8) moveToward(game, m, p.x, p.y, m.def.speed, dt);
  else if (d < want - 12) moveToward(game, m, m.x * 2 - p.x, m.y * 2 - p.y, m.def.speed * 0.8, dt, false);
}

// Boss: xoay vòng chém → lao → (dưới 50% máu) vòng đạn; triệu hồi ở 70% và 35% máu
function bossThink(game, m, d, dt) {
  const p = m.tgt || game.player, def = m.def;
  const hpf = m.hp / m.maxHp;
  if (m.summoned < 2 && hpf < (m.summoned === 0 ? 0.7 : 0.35) && game.data.mobs[def.summon]) {   // chưa khai đệ tử thì thôi (trước đây treo game)
    m.summoned++;
    if (def.shout) game.say(def.name, def.shout, 1.6);
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = game.spawn(def.summon, m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 30, { noQi: true });
      s.aggro = true;
      summonK(game, s);
    }
  }
  if (m.state === 'idle') {
    // Không sát dính (data/config.json mob_cp.space): đã vào tầm chém vòng thì đứng, quay mặt về người; người bị dồn vào góc mà boss
    // đứng lấn vào hình người (dưới boss_back × tầm đứng) thì boss lùi ra, không xuyên tường, mỗi lượt lùi tối đa boss_back_t giây
    // (lùi mãi không giãn ra được thì thôi, chờ người lùi; tránh boss bị dắt đi khắp nơi)
    const S = game.data.config.mob_cp?.space, stop = S?.boss_stop, at = (def.reach || 0) + m.r + (p.r || 5) + 10 - (stop || 0);
    if (stop == null || d > at) { moveToward(game, m, p.x, p.y, def.speed, dt); m.backT = 0; }
    else if (S.boss_back && d < at * S.boss_back && (m.backT || 0) < (S.boss_back_t ?? 0.6)) { m.backT = (m.backT || 0) + dt; moveToward(game, m, m.x * 2 - p.x, m.y * 2 - p.y, def.speed * 0.5, dt, false); }
    else { m.fx = (p.x - m.x) / (d || 1); m.fy = (p.y - m.y) / (d || 1); if (!S.boss_back || d >= at * S.boss_back) m.backT = 0; }
    if (m.cd <= 0) {
      const pick = m.phase++ % (hpf < 0.5 ? (def.meteor ? 4 : 3) : 2);
      m.t = 0;
      if (pick === 3) { meteor(game, m); m.cd = def.cd; }
      else if (pick === 0 && d < 60) { m.state = 'slash'; }
      else if (pick === 2) { m.state = 'nova'; }
      else { m.state = 'charge'; m.ca = Math.atan2(p.y - m.y, p.x - m.x); m.chFx = 0; game.sfx('warn'); }
    }
  } else if (m.state === 'slash') {
    m.tele = { type: 'circle', r: def.reach + m.r + 10, k: m.t / def.windup };
    if (m.t >= def.windup) {
      m.tele = null; m.state = 'idle'; m.cd = def.cd;
      mobHitFx(game, m, m, { k: 'vong', self: 1, r: def.reach + m.r + 10, s: 1.5, old: { type: 'ring', x: m.x, y: m.y, r: def.reach + m.r + 10, color: '#ff4a5a', life: 0.25, fill: true } });   // chém vòng đúng bán kính khung đỏ
      if (dist(m, p) < def.reach + m.r + 10 + p.r) strike(game, m, def.atk);
    }
  } else if (m.state === 'charge') {
    const tele = 0.75;
    if (m.t < tele) { m.tele = { type: 'line', a: m.ca, len: 130, k: m.t / tele }; return; }
    m.tele = null;
    const s = 230 * dt, bx = m.x, by = m.y;
    game.map.move(m, Math.cos(m.ca) * s, Math.sin(m.ca) * s);
    const stuck = Math.hypot(m.x - bx, m.y - by) < s * 0.5;
    if (dist(m, p) < m.r + p.r + 2) { strike(game, m, def.atk * 1.3); if (!m.chFx) { m.chFx = 1; mobHitFx(game, m, p, { k: 'dam', s: 1.8 }); } }
    if (stuck || m.t > tele + 0.55) {
      m.state = 'idle'; m.cd = def.cd * 1.2;
      if (stuck) { game.screen.shake(4, 0.2); m.stunT = 0.6; mobHitFx(game, m, { x: m.x + Math.cos(m.ca) * 9, y: m.y + Math.sin(m.ca) * 9 }, { k: 'nen', s: 1.8 }); }   // húc tường: sóng đất trước mặt
    }
  } else if (m.state === 'nova') {
    m.tele = { type: 'nova', r: m.r + 6, a: m.phase * 0.3, k: m.t / 0.6 };   // a: góc tia đầu, khung đỏ vẽ 14 tia đúng hướng đạn (draw-tele.js)
    if (m.t >= 0.6) {
      m.tele = null; m.state = 'idle'; m.cd = def.cd;
      mobHitFx(game, m, m, { k: 'no', self: 1, r: m.r + 6, s: 1.4, old: { type: 'ring', x: m.x, y: m.y, r: m.r + 8, color: '#ff4a5a', life: 0.2 } });
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2 + m.phase * 0.3;
        mobShoot(game, { from: 'mob', src: m, x: m.x, y: m.y, vx: Math.cos(a) * def.bullet, vy: Math.sin(a) * def.bullet, r: 3.5, dmg: def.atk * 0.7, color: '#ff4a5a', mk: def.fx ? 'cau' : null, life: 2.5 });
      }
    }
  }
}

// Lửa rơi: một quả vào chỗ người chơi đứng, các quả khác rải quanh
function meteor(game, m) {
  const mt = m.def.meteor, p = game.player;
  m.cast = m.ak;   // hình động: chạy trọn đòn công kích lúc gọi lửa (draw-mob-sprite.js)
  game.say(m.def.name, m.def.meteor.line || 'Thiêu rụi hết đi!', 1.2);
  for (let i = 0; i < mt.n; i++) {
    const a = Math.random() * Math.PI * 2, d = i ? 20 + Math.random() * 60 : 0;
    addStrike(game, { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: mt.r, delay: mt.delay + i * 0.12, dmg: m.def.atk * mt.dmg, kind: 'meteor', color: mt.color || '#ff7a3a', src: m });   // src: Công của boss đọ Thủ của mình (luật mới)
  }
}
