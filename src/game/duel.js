// So tài (data/duel.json): đấu trên Luận Võ Đài với bản sao dựng từ hồ sơ người chơi khác (game/profile.js). Bản sao có đúng
// chỉ số người kia (playerStats), vũ khí, 3 chiêu và chiêu pháp bảo theo cấp, linh thú và đồng hành; tự đánh (game/duel-ai.js).
// Hết giờ thì hoà, gục trên đài không chết thật. Không thưởng gì: trận đánh ở máy mình nên không lấy làm thưởng được.
// Xong trận về đúng chỗ đang đứng lúc bấm So tài. Luận Võ Đài (game/arena.js) chuyển việc sang đây khi đang so tài.
import { playerStats, weaponId, artSkill } from './stats.js';
import { skillSlots } from './skills.js';
import { petDef } from './evolve.js';
import { duelTake } from './duel-cast.js';
import { updateFoes } from './duel-ai.js';

const D = game => game.data.duel;
// Hệ số đánh thường theo số chiêu tấn công đang mang (như player.js basicMul)
const basicOf = (game, slots) => { const C = game.data.config.combat, n = slots.filter(id => id && game.data.skills[id]?.mult).length; return 1 - (1 - C.basic) * Math.min(1, n / C.basic_full); };
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

// Có so tài được lúc này không: trả về câu báo nếu không
function blocked(game) {
  const def = game.map?.def || {};
  if (!game.save || game.duel || game.traveling || game.trib?.active || game.story?.busy || game.dialog?.open) return D(game).text.busy;
  if (game.arena || game.tower || game.res || (def.rooms || []).length || def.tower || def.res || def.arena) return D(game).text.here;
  return null;
}

export async function startDuel(game, prof) {
  const why = blocked(game);
  if (why) { game.toast(why, 2); return false; }
  const save = prof?.save;
  let st;
  try { st = playerStats(save, game.data); } catch { st = null; }
  if (!st || !Number.isFinite(st.maxHp) || !Number.isFinite(st.atk)) { game.toast(D(game).text.bad, 2); return false; }
  const p = game.player;
  game.duel = { prof, save, st, wait: D(game).wait, t: D(game).time_limit, mob: null, foes: [], back: { map: game.save.map, spawn: game.save.spawn, x: p.x, y: p.y } };
  await game.travel(game.data.arena.map, 'vao', true, { text: fill(D(game).text.trip, { name: prof.ten }), kind: 'portal' });
  return true;
}

function cloneDef(game, f) {
  const cfg = game.data.config.player, s = f.save, el = s.element && game.data.elements[s.element]?.color;
  const F = game.data.fashion.list, fit = F[s.outfit] || F['dong-phuc'];
  return {
    ...game.data.mobs[D(game).base], ai: 'duel', person: true, name: f.prof.ten, radius: cfg.radius, speed: cfg.speed,
    hp: f.st.maxHp, atk: f.st.atk, kb: D(game).knockback, noCc: true, aggro: 999,
    color: fit?.robe || '#c8d0e8', hair: fit?.hair || '#3a2a1a', sash: el || '#f2c94c',
  };
}

function followers(game, s, x, y) {
  const out = [], P = game.data.pets, C = game.data.companions;
  if (s.pet) {
    const st = s.pets[s.pet];
    out.push({ kind: 'pet', id: s.pet, def: petDef(game.data, s, s.pet), mul: (1 + (st.lv - 1) * P.lv_bonus) * (1 + (st.star || 0) * P.merge.bonus),
      follow: P.follow, side: P.side || 0, lift: 0, x: x + 10, y: y + 4, cd: 1, skillCd: 3, hop: 0, face: -1 });
  }
  if (s.companion) {
    const lv = s.comps[s.companion].lv;
    out.push({ kind: 'comp', id: s.companion, def: C.list[s.companion], npc: game.data.npcs[s.companion], mul: 1 + (lv - 1) * C.lv_bonus,
      follow: C.follow, side: C.side || 0, lift: C.lift || 0, x: x - 10, y: y - 8, cd: 1, skillCd: 4, hop: 0, face: -1 });
  }
  return out;
}

// Hai bên vào trận đầy máu, chiêu đã hồi
function spawnClone(game, f) {
  const p = game.player, s = f.save, data = game.data, T = game.map.T, def = cloneDef(game, f), slots = skillSlots({ data, save: s });
  Object.assign(p, { hp: p.maxHp, shield: 0, shieldT: 0, buffT: 0, skillCd: [0, 0, 0], artCd: 0 });
  const pos = game.map.freeNear(Math.floor(p.x / T), 2, 1, 6);
  const m = f.mob = game.spawn(D(game).base, pos.x, pos.y, {
    def, hp: def.hp, maxHp: def.hp, r: def.radius, noQi: true, tower: true, aggro: true, summoned: 2, duel: true, dmgMul: D(game).dmg,
    save: s, st: f.st, atk: f.st.atk, wid: weaponId(s, data), basic: basicOf(game, slots), slots, art: artSkill(s, data),
    face: { x: 0, y: 1 }, atkCd: 0.5, skillCd: [0, 0, 0], artCd: 0, gcd: 0, shield: 0, buffT: 0, dashT: 0, swingT: 0,
  });
  m.take = (dmg, opt) => duelTake(game, m, dmg, opt);
  f.foes = followers(game, s, m.x, m.y);
  game.say(f.prof.ten, D(game).text.start, 1.6);
  game.sfx('warn');
}

async function leave(game, text) {
  const f = game.duel, b = f.back;
  game.duel = null;
  if (text) game.toast(text, 2.6);
  await game.travel(b.map, b.spawn, true, { text: D(game).text.leave, kind: 'portal' });
  if (game.map.id === b.map && !game.map.blocked(b.x, b.y, game.player.r)) {   // về đúng chỗ đang đứng lúc bấm So tài
    game.player.x = b.x; game.player.y = b.y; game.screen.snap?.(b.x, b.y);
  }
}

function finish(game, res) {
  const f = game.duel;
  if (f.done) return;
  f.done = true; f.res = res; f.endT = D(game).end_wait;
  if (f.mob) f.mob.hitQ = null;
  game.bullets = game.bullets.filter(b => b.src !== f.mob); game.zones = game.zones.filter(z => !z.foe);   // dừng tay: đòn đang bay của bản sao tan
  game.sfx(res === 'win' ? 'levelup' : res === 'draw' ? 'warn' : 'hurt');
  game.toast(f.tmText || fill(D(game).text[res], { name: f.prof.ten }), f.tmText ? 4 : 2.4);   // khiêu chiến Đại Ma Thần: kết quả máy chủ (game/thienma.js)
}

// Gọi mỗi khung từ updateArena khi đang so tài
export function updateDuel(game, dt) {
  const f = game.duel;
  if (game.traveling) return;
  if (!game.map.def.arena) { game.duel = null; return; }   // đã rời đài (bay đi chỗ khác, nạp lại bản lưu)
  if (f.done) { if ((f.endT -= dt) <= 0 && !f.left) { f.left = true; leave(game); } return; }
  if (f.wait > 0) { if ((f.wait -= dt) <= 0) spawnClone(game, f); return; }
  updateFoes(game, dt);
  if ((f.t -= dt) <= 0) finish(game, 'draw');
  else if (f.mob?.dead) finish(game, 'win');
}

// Gục trên đài: thua, không chết thật (game.js respawn → arenaFail → đây)
export function duelFail(game) {
  const f = game.duel;
  if (!f) return false;
  const lost = !f.done;   // đã thắng / hoà rồi mới gục (đòn bay dở) thì giữ kết quả
  if (lost) { f.done = true; f.res = 'lose'; }
  if (!f.left) { f.left = true; leave(game, lost && (f.tmText || fill(D(game).text.lose, { name: f.prof.ten }))); }
  return true;
}

export const duelGoal = game => fill(D(game).text.goal, { name: game.duel.prof.ten, s: Math.max(0, Math.ceil(game.duel.t)) });

// Linh thú, đồng hành của bản sao để vẽ (render/draw.js): [kiểu vẽ, đối tượng]
export const duelFoes = game => (game.duel?.mob ? game.duel.foes.map(e => [e.kind, e]) : []);
