// Nhiệm vụ phụ mỗi đảo (data/side.json): nhận ở NPC, hạ quái hoặc nhặt vật, quay lại lãnh thưởng một lần.
import { grant } from './daily.js';

const Q = game => game.data.side.quests;
const st = (game, id) => (game.save.side ??= {})[id];

function questOf(game, npcId) {
  return Object.entries(Q(game)).find(([id, q]) => q.npc === npcId && game.save.flags[q.need] && st(game, id)?.state !== 'done');
}

export const hasSide = (game, npcId) => !!questOf(game, npcId);

export async function talkSide(game, npc) {
  const [id, q] = questOf(game, npc.id), name = npc.def.name, s = st(game, id);
  if (s && s.n >= q.n) {
    s.state = 'done';
    const got = grant(game, q.reward);
    game.sfx('levelup');
    await game.dialog.say([...q.done.map(l => [name, l]), ['', `Xong việc phụ "${q.name}". Nhận: ${got.join(', ')}.`]]);
    return;
  }
  if (s) { await game.dialog.say([[name, q.goal.replace('{n}', s.n) + '. Xong rồi quay lại nhé.']]); return; }
  await game.dialog.say(q.offer.map(l => [name, l]));
  const ok = await game.dialog.choose(`Việc phụ: ${q.name}`, [
    { id: 'yes', label: 'Nhận việc', desc: 'Hiện ở góc phải màn hình' },
    { id: 'no', label: 'Để sau', desc: '' },
  ]);
  if (ok !== 'yes') return;
  game.save.side[id] = { state: 'on', n: 0, got: [] };
  spawnSidePickups(game); game.persist();
}

export function sideKill(game, m) {
  for (const [id, q] of Object.entries(Q(game))) {
    const s = st(game, id);
    if (s?.state !== 'on' || q.kind !== 'kill' || q.mob !== m.id || s.n >= q.n) continue;
    if (++s.n >= q.n) game.toast(`Xong việc phụ "${q.name}". Quay lại ${game.data.npcs[q.npc].name} lãnh thưởng.`, 2.2);
  }
}

// Vật nhặt của việc phụ đang làm trên bản đồ hiện tại (vật đã nhặt không hiện lại)
export function spawnSidePickups(game) {
  for (const [id, q] of Object.entries(Q(game))) {
    const s = st(game, id);
    if (s?.state !== 'on' || q.kind !== 'collect' || q.map !== game.map.id) continue;
    q.at.forEach(([x, y], i) => {
      if (s.got.includes(i) || game.pickups.some(k => k.side === id && k.idx === i)) return;
      const c = game.map.center(x, y);
      game.pickups.push({ item: q.item, x: c.x, y: c.y, side: id, idx: i });
    });
  }
}

export function sideCollect(game, k) {
  const q = Q(game)[k.side], s = st(game, k.side);
  if (!s || s.got.includes(k.idx)) return;
  s.got.push(k.idx); s.n = s.got.length;
  if (s.n >= q.n) game.toast(`Xong việc phụ "${q.name}". Quay lại ${game.data.npcs[q.npc].name} lãnh thưởng.`, 2.2);
  game.persist();
}

export const sideGoals = game => Object.entries(Q(game)).filter(([id]) => st(game, id)?.state === 'on')
  .map(([id, q]) => { const s = st(game, id); return s.n >= q.n ? `Việc phụ xong: về gặp ${game.data.npcs[q.npc].name}` : 'Việc phụ: ' + q.goal.replace('{n}', s.n); });
