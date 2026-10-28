// Linh thú (data/pets.json): thu phục từ quái dị chủng, đi theo đánh cùng, lên cấp bằng linh khí.
// Thú cưỡi: tự lên khi đi trên đảo lúc yên, đánh nhau thì xuống.
import { hitMob, shoot, addFx, dist } from './combat.js';
import { petDef, petMax } from './evolve.js';

export function ensurePets(save) { save.pets ??= {}; save.mounts ??= {}; }

const P = game => game.data.pets;
export const petNeed = (data, lv) => Math.round(data.pets.exp_base * Math.pow(lv, data.pets.exp_pow));
export const petLevel = (game, id) => game.save.pets[id]?.lv || 0;

// Quái mọc từ bãi có thể thành dị chủng: mạnh hơn, linh khí nhiều hơn, hạ được thì thu phục
export function maybeRare(game, m) {
  const cfg = P(game);
  if (!cfg.pets[m.id] || Math.random() >= cfg.rare_chance) return;
  const r = cfg.rare, d = m.def;
  m.def = { ...d, name: r.prefix + d.name, hp: d.hp * r.hp, atk: d.atk * r.atk, qi: d.qi * r.qi };
  m.hp = m.maxHp = m.def.hp; m.rare = true;
}

export function petKill(game, m) {
  const cfg = P(game), md = cfg.mount_drops[m.id];
  if (md && Math.random() < md[1]) gainMount(game, md[0]);
  if (!m.rare) return;
  const id = m.id, def = cfg.pets[id];
  if (game.save.pets[id]) {   // đã có loài này: thêm kinh nghiệm và một bản sao để gộp
    const st = game.save.pets[id]; st.copies = (st.copies || 0) + 1;
    gainPetExp(game, petNeed(game.data, st.lv), id);
    game.toast(cfg.merge.texts.copy.replace('{name}', def.name).replace('{n}', st.copies), 2.4); game.newPets = true;
  }
  else gainPet(game, id);
  if (def.mount && Math.random() < def.mount[1]) gainMount(game, def.mount[0]);
}

export function gainPet(game, id) {
  const s = game.save;
  if (s.pets[id]) return;
  s.pets[id] = { lv: 1, exp: 0 };
  if (!s.pet) { s.pet = id; spawnPet(game); }
  game.toast(`Thu phục được linh thú ${P(game).pets[id].name}!`, 2.6);
  game.sfx('levelup'); game.newPets = true; game.persist();
}

export function gainMount(game, id) {
  const s = game.save;
  if (s.mounts[id]) return;
  s.mounts[id] = true;
  s.mount ??= id;
  game.toast(`Có thú cưỡi mới: ${P(game).mounts[id].name}!`, 2.6);
  game.sfx('levelup'); game.newPets = true; game.persist();
}

// Linh thú hưởng một nửa linh khí chủ thu được
export function gainPetExp(game, amount, only) {
  const s = game.save, id = only || s.pet, st = s.pets[id], max = petMax(game.data, s, id);
  if (!st || st.lv >= max) return;
  st.exp += only ? amount : amount * 0.5;
  while (st.lv < max && st.exp >= petNeed(game.data, st.lv)) {
    st.exp -= petNeed(game.data, st.lv); st.lv++;
    game.toast(`${petDef(game.data, s, id).name} lên cấp ${st.lv}!`, 1.6);
  }
}

export function setPet(game, id) { game.save.pet = id; spawnPet(game); game.refreshStats(); game.persist(); }   // thưởng bộ Đạo Vận tính linh thú cùng hệ
export function setMount(game, id) { game.save.mount = id; game.player.riding = false; game.persist(); }

export function spawnPet(game) {
  const id = game.save.pet, p = game.player;
  game.pet = id && p ? { id, def: petDef(game.data, game.save, id), x: p.x - 10, y: p.y + 4, cd: 1, skillCd: 3, hop: 0, target: null, face: 1 } : null;
}

function nearestMob(game, from, range) {
  let best = null, bd = range;
  for (const m of game.mobs) { if (m.dead || m.def.ai === 'passive' && !m.aggro && m.hp === m.maxHp) continue; const d = dist(m, from); if (d < bd) { bd = d; best = m; } }
  return best;
}

export function updatePet(game, dt) {
  if (game.pet) updateFollower(game, game.pet, petMul(game), P(game).follow, dt);
}

// Kẻ đi theo (linh thú, bạn đồng hành): theo sau chủ, tự đánh quái gần, có một chiêu hồi theo giây
// lift: đứng lùi lên phía sau (vẽ sau người chơi, không che hình nhân vật); linh thú 0, bạn đồng hành > 0
export function updateFollower(game, f, mul, follow, dt, lift = 0) {
  const p = game.player, def = f.def;
  f.cd -= dt; f.skillCd -= dt; f.hop += dt * 8; f.walkT = (f.walkT || 0) + dt;
  const tgt = nearestMob(game, p, def.range);
  // Đi theo chủ, hoặc lao tới quái nếu đánh gần
  let gx = p.x - (p.face.x || 0) * follow, gy = p.y - (p.face.y || 0) * follow + 2 - lift;
  f.sleep = p.meditating && !tgt;   // chủ đả tọa: cuộn tròn ngủ cạnh bồ đoàn
  if (f.sleep) { gx = p.x + (lift ? -11 : 11); gy = p.y + 3; }
  if (tgt && def.melee) { gx = tgt.x - Math.sign(tgt.x - f.x) * (tgt.r + 4); gy = tgt.y; }
  const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy);
  if (d > 160) { f.x = gx; f.y = gy; }
  else if (d > 2) { const s = Math.min(d, (60 + d * 1.5) * dt); f.x += dx / d * s; f.y += dy / d * s; if (Math.abs(dx) > 1) f.face = Math.sign(dx); }
  f.moving = d > 3;
  if (!tgt) return;
  const dmg = p.atk * def.mult * mul;
  if (f.cd <= 0) {
    if (def.melee && dist(f, tgt) < tgt.r + 10) { f.cd = def.cd; hitMob(game, tgt, dmg, { soft: true, canCrit: false, color: def.color, fromX: f.x, fromY: f.y }); }
    else if (!def.melee) { f.cd = def.cd; fire(game, f, tgt, dmg, def.color); }
  }
  if (f.skillCd <= 0) { f.skillCd = def.skill.cd; petSkill(game, f, tgt, dmg); }
}

function fire(game, pet, tgt, dmg, color, spread = 0) {
  const a = Math.atan2(tgt.y - pet.y, tgt.x - pet.x) + spread;
  shoot(game, { from: 'player', x: pet.x, y: pet.y - 4, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 2.5, dmg, color, life: 0.9 });
}

function petSkill(game, pet, tgt, dmg) {
  const s = pet.def.skill, p = game.player;
  if (s.type === 'heal') {
    if (p.hp >= p.maxHp) { pet.skillCd = 1; return; }
    const n = Math.round(p.maxHp * s.amount);
    p.hp = Math.min(p.maxHp, p.hp + n); game.number(p.x, p.y - 18, '+' + n, '#9af0a8');
    addFx(game, { type: 'ring', x: p.x, y: p.y, r: 14, color: '#9af0a8', life: 0.4 });
  } else if (s.type === 'aoe' || s.type === 'slow') {
    addFx(game, { type: 'ring', x: pet.x, y: pet.y, r: s.radius, color: pet.def.color, life: 0.35, fill: true });
    for (const m of game.mobs) if (!m.dead && dist(m, pet) < s.radius + m.r) {
      if (s.type === 'aoe') hitMob(game, m, dmg * s.dmg, { soft: true, canCrit: false, color: pet.def.color, fromX: pet.x, fromY: pet.y });
      else m.slowT = Math.max(m.slowT, s.dur);
    }
  } else if (s.type === 'buff') {
    p.buffT = s.dur; p.buffAmt = s.amount; p.buffColor = pet.def.color;
    game.number(p.x, p.y - 18, `Công +${Math.round(s.amount * 100)}%`, pet.def.color);
  } else if (s.type === 'volley') {
    for (let i = 0; i < s.n; i++) fire(game, pet, tgt, dmg * s.dmg, pet.def.color, (i - (s.n - 1) / 2) * 0.25);
  }
}

export const petMul = game => (1 + (petLevel(game, game.save.pet) - 1) * P(game).lv_bonus) * (1 + (game.save.pets[game.save.pet]?.star || 0) * P(game).merge.bonus);

// Gộp linh thú: sao n lên n + 1 tốn 2^n bản sao (hai con cùng sao thành một con sao cao hơn), không giới hạn
export const mergeCost = st => 2 ** (st?.star || 0);
export const canMerge = (game, id) => { const st = game.save.pets[id]; return !!st && (st.copies || 0) >= mergeCost(st); };
export function mergePet(game, id) {
  const st = game.save.pets[id];
  if (!canMerge(game, id)) return false;
  st.copies -= mergeCost(st); st.star = (st.star || 0) + 1;
  game.persist(); game.sfx('levelup');
  game.toast(P(game).merge.texts.done.replace('{name}', P(game).pets[id].name).replace('{star}', st.star), 2);
  return true;
}

// Thú cưỡi: lên khi đang đi, không đánh nhau một lúc, không ở bí cảnh
export function updateRide(game, dt) {
  const p = game.player, id = game.save.mount;
  p.calmT = (p.calmT || 0) + dt;
  if (p.atkCd > 0 || p.invT > 0) { p.calmT = 0; p.riding = false; }
  const ok = id && game.save.mounts[id] && !(game.map.def.rooms || []).length && !game.map.def.indoor;
  if (!ok) { p.riding = false; return; }
  if (!p.riding && p.moving && p.calmT > P(game).ride_calm) { p.riding = true; game.sfx('pickup'); }
}

export const rideSpeed = game => game.player.riding ? 1 + P(game).mounts[game.save.mount].speed : 1;

// Ngự Thú Sư: tặng linh thú và thú cưỡi đầu tiên, sau đó chỉ cách săn dị chủng
export async function talkBeast(game, npc) {
  const cfg = P(game), s = game.save, name = npc.def.name;
  if (s.flags.nguThu) { await game.dialog.say([[name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
  await game.dialog.say([
    [name, 'Ngươi là đệ tử mới? Đệ tử Kiếm tông ai cũng nên có một linh thú bầu bạn.'],
    [name, `Con ${cfg.pets[cfg.starter_pet].name} này ta nuôi từ hạt mầm, cho ngươi. Con ${cfg.mounts[cfg.starter_mount].name} cũng theo ngươi luôn: cứ đi trên đảo lúc yên ổn là nó chở.`],
    [name, 'Muốn linh thú khác thì săn quái dị chủng: con nào ánh vàng quanh người, mạnh gấp mấy lần. Hạ được là thu phục được.'],
  ]);
  s.flags.nguThu = true;
  gainPet(game, cfg.starter_pet); gainMount(game, cfg.starter_mount);
}
