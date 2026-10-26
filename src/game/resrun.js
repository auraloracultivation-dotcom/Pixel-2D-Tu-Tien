// Bí cảnh tài nguyên hằng ngày (data/resrun.json): vào đấu trường, hạ quái tài nguyên mọc liên tục trong dur giây.
import { addCoins } from './shop.js';
import { dailyEvent } from './daily.js';
import { totalLayer } from './stats.js';

const C = game => game.data.resrun;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

function runsLeft(game, kind) {
  const s = game.save;
  if (s.resRuns?.day !== today()) s.resRuns = { day: today() };
  return C(game).runs - (s.resRuns[kind] || 0);
}

export async function talkRes(game, npc) {
  const cfg = C(game), name = npc.def.name;
  if (game.story.busy || game.trib.active) { await game.dialog.say([[name, 'Lo xong việc trước mắt đã.']]); return; }
  const opts = Object.entries(cfg.kinds).map(([id, k]) => {
    const left = runsLeft(game, id);
    return { id, label: k.name, desc: `${k.desc} Hôm nay còn ${left}/${cfg.runs} lượt.`, color: left > 0 ? '#f2c94c' : '#b8b0c8' };
  });
  opts.push({ id: 'no', label: 'Để sau', desc: '' });
  const pick = await game.dialog.choose(`${name}: Mỗi lượt ${cfg.dur} giây. Hạ được bao nhiêu, mang về bấy nhiêu.`, opts);
  if (!cfg.kinds[pick]) return;
  if (runsLeft(game, pick) <= 0) { await game.dialog.say([[name, 'Hôm nay hết lượt rồi. Mai quay lại.']]); return; }
  game.save.resRuns[pick] = (game.save.resRuns[pick] || 0) + 1;
  game.res = { kind: pick, t: cfg.dur, spawnT: 1, coins: 0, mats: {}, kills: 0 };
  dailyEvent(game, 'res');
  game.persist();
  await game.travel(cfg.map, 'vao', true, { text: `Vào ${cfg.kinds[pick].name}`, kind: 'portal' });
}

function spawnOne(game) {
  const cfg = C(game), k = cfg.kinds[game.res.kind], p = game.player, base = game.data.mobs[k.mob];
  const hp = Math.round(p.atk * cfg.hp), def = { ...base, hp, atk: Math.round(p.maxHp * cfg.atk * 10) / 10 };
  const pos = game.map.freeNear(2 + Math.floor(Math.random() * 11), 1 + Math.floor(Math.random() * 6), 1, 6);
  game.spawn(k.mob, pos.x, pos.y, { def, hp, maxHp: hp, noQi: true, tower: true, res: true, aggro: true });
}

// Hạ một con: cộng tài nguyên vào túi tạm của lượt, cuối lượt mới báo
export function resKill(game, m) {
  if (!m.res || !game.res) return;
  const r = game.res, k = C(game).kinds[r.kind];
  r.kills++;
  if (k.base) {
    const n = Math.round(k.base * (1 + totalLayer(game.save, game.data.realms) * k.per_layer));
    addCoins(game, n); r.coins += n; game.number(m.x, m.y - 20, `+${n}`, '#ffd24a');
  } else {
    const id = k.mats[Math.floor(Math.random() * k.mats.length)];
    game.save.mats[id] = (game.save.mats[id] || 0) + 1; r.mats[id] = (r.mats[id] || 0) + 1;
  }
}

async function finish(game) {
  const r = game.res, d = game.data;
  game.res = null;
  for (const m of game.mobs) m.dead = true;
  const got = r.coins ? `${r.coins} ${d.shop.name}` : Object.entries(r.mats).map(([id, n]) => `${n} ${d.cave.materials[id]?.name || d.items.materials[id]?.name}`).join(', ') || 'không có gì';
  game.persist();
  await game.dialog.say([['', `Hết giờ! Hạ ${r.kills} con, mang về: ${got}.`]]);
  await game.travel('thien-kiem-phong', 'tu-bi-canh-tn', true, { text: 'Rời bí cảnh tài nguyên', kind: 'portal' });
}

export function updateRes(game, dt) {
  const r = game.res, inRes = game.map.def.res;
  if (!inRes) { if (r) game.res = null; return; }
  if (!r) { if (!game.traveling) game.travel('thien-kiem-phong', 'tu-bi-canh-tn', false); return; }
  if (r.done) return;
  r.t -= dt;
  if (r.t <= 0) { r.done = true; finish(game); return; }
  if ((r.spawnT -= dt) <= 0) {
    r.spawnT = 0.6;
    if (game.mobs.filter(m => !m.dead).length < C(game).alive) spawnOne(game);
  }
}

export const resGoal = game => game.res && `${C(game).kinds[game.res.kind].name}: còn ${Math.ceil(game.res.t)} giây, đã hạ ${game.res.kills}`;
