// Tháp Thử Thách (data/tower.json): mỗi tầng một đợt quái mạnh dần, tầng boss theo mốc; qua tầng mới lần đầu nhận thưởng.
import { grant, dailyEvent, ensureDaily, taskDef } from './daily.js';
import { scaleReward } from './events.js';

const C = game => game.data.tower;
const tierOf = (cfg, floor) => cfg.tiers.filter(t => floor >= t.from).pop();
const isBoss = (cfg, floor) => floor % cfg.boss_every === 0;
const towerTaskLeft = game => ensureDaily(game).tasks.some(t => { const d = taskDef(game, t.id); return d?.type === 'tower' && t.n < d.n; });

// Thưởng lần đầu qua tầng: đá tẩy luyện, linh khí; tầng boss thêm một món đồ theo mốc
export function floorReward(cfg, floor) {
  const r = { stones: Math.ceil(floor * cfg.reward.stones_per), qi: floor * cfg.reward.qi_per };
  if (isBoss(cfg, floor)) { const b = cfg.reward.boss_items; r.item = b[Math.min(floor / cfg.boss_every - 1, b.length - 1)]; }
  return r;
}

function spawnWave(game) {
  const cfg = C(game), floor = game.tower.floor, tier = tierOf(cfg, floor);
  const mul = 1 + (floor - tier.from) * cfg.grow;
  const make = (id, hpMul, x, y, r) => {
    const base = game.data.mobs[id], def = { ...base, hp: Math.round(base.hp * hpMul), atk: Math.round(base.atk * mul * 10) / 10 };
    const p = game.map.freeNear(x, y, r, 6);
    game.tower.mobs.push(game.spawn(id, p.x, p.y, { def, hp: def.hp, maxHp: def.hp, noQi: true, tower: true, aggro: true }));
  };
  game.tower.mobs = [];
  if (isBoss(cfg, floor)) { make(tier.boss, mul * cfg.boss_hp, 7, 3, 1); game.sfx('roar'); }
  else {
    const n = cfg.count[Math.min((floor - 1) % cfg.boss_every, cfg.count.length - 1)];
    for (let i = 0; i < n; i++) make(tier.pool[Math.floor(Math.random() * tier.pool.length)], mul, 7, 4, 4);
  }
  game.toast(`Tầng ${floor}${isBoss(cfg, floor) ? ': ' + game.data.mobs[tier.boss].name : ''}`, 1.6);
}

async function enter(game, floor) {
  game.tower = { floor, mobs: [], wait: 1 };
  await game.travel(C(game).map, 'vao', true, { text: `Bước vào Tháp Thử Thách, tầng ${floor}`, kind: 'portal' });
}

export async function leaveTower(game, text) {
  game.tower = null;
  if (text) game.toast(text, 2.4);
  await game.travel('thien-kiem-phong', 'tu-thap', true, { text: 'Rời Tháp Thử Thách', kind: 'portal' });
}

export async function talkTower(game, npc) {
  const s = game.save, best = s.tower?.best || 0, name = npc.def.name;
  if (game.story.busy || game.trib.active) { await game.dialog.say([[name, 'Lúc này chưa vào tháp được. Lo xong việc trước mắt đã.']]); return; }
  const next = best + 1, nr = floorReward(C(game), next);
  const opts = [{ id: next, label: `Leo tầng ${next}`, desc: `Lần đầu qua: ${nr.stones} Tẩy Luyện Thạch, ${nr.qi} linh khí${nr.item ? ', một món đồ' : ''}` }];
  if (best >= 1) opts.push({ id: 1, label: 'Leo lại từ tầng 1', desc: 'Luyện tay, không có thưởng tới khi vượt tầng cao nhất' });
  opts.push({ id: 0, label: 'Để sau', desc: '' });
  const pick = game.pilot ? 1 : await game.dialog.choose(`${name}: Tháp có vô số tầng, cứ ${C(game).boss_every} tầng có một trấn thủ. Cao nhất ngươi đã qua: tầng ${best}.`, opts);
  if (pick) await enter(game, pick);
}

// Gọi mỗi khung: sinh đợt quái, xét qua tầng, hỏi leo tiếp hay ra
export function updateTower(game, dt) {
  const t = game.tower, inTower = game.map.def.tower;
  if (!inTower) { if (t) game.tower = null; return; }
  if (!t) { if (!game.traveling) leaveTower(game); return; }  // nạp lại bản lưu đang ở trong tháp
  if (t.busy) return;
  if (t.wait > 0) { if ((t.wait -= dt) <= 0) spawnWave(game); return; }
  t.mobs = t.mobs.filter(m => !m.dead);
  if (t.mobs.length || game.mobs.some(m => !m.dead)) return;
  cleared(game);
}

async function cleared(game) {
  const t = game.tower, s = game.save, cfg = C(game);
  t.busy = true;
  s.tower ??= { best: 0 };
  let msg = `Qua tầng ${t.floor}!`;
  if (t.floor > s.tower.best) {
    s.tower.best = t.floor;
    msg += ` Thưởng: ${grant(game, scaleReward(floorReward(cfg, t.floor), game.eventMul('tower'))).join(', ')}.`;
  }
  dailyEvent(game, 'tower');
  game.sfx('levelup'); game.persist();
  const p = game.player; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
  const daily = game.pilot && towerTaskLeft(game);   // tự hành: leo tiếp cho xong việc hằng ngày rồi ra
  const go = game.pilot ? (daily ? 'up' : 'out') : await game.dialog.choose(msg, [
    { id: 'up', label: `Leo tầng ${t.floor + 1}`, desc: 'Hồi 30% máu giữa các tầng' },
    { id: 'out', label: 'Rời tháp', desc: 'Giữ tầng cao nhất, lần sau leo tiếp' },
  ]);
  if (go === 'up' && game.tower === t) { t.floor++; t.wait = 1; t.busy = false; }
  else if (game.tower === t) leaveTower(game);
}

// Gục trong tháp: ra ngoài, giữ tầng cao nhất
export function towerFail(game) {
  if (!game.tower) return false;
  if (game.pilot) game.save.towerGaveUp = new Date().toDateString();   // tự hành gục trong tháp: hôm nay thôi không leo nữa
  leaveTower(game, `Thất bại ở tầng ${game.tower.floor}. Cao nhất: tầng ${game.save.tower?.best || 0}.`);
  return true;
}
