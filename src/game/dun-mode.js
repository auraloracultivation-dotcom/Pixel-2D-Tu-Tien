// Độ khó bí cảnh (data/dungeon.json): chọn ở cổng khi đã qua một lần, quái mạnh hơn, boss có thưởng thêm.
import { grant } from './daily.js';

const C = game => game.data.dungeon;
const today = () => new Date().toDateString();

// Bậc cao nhất đã qua của bí cảnh id (0: chưa qua, 1: qua Thường, ...)
export function cleared(game, id) {
  const st = C(game).story_step[id], i = st ? game.data.story.steps.findIndex(x => x.id === st) : -1;
  return Math.max(game.save.dun?.[id] || 0, i >= 0 && game.save.step > i ? 1 : 0);
}
export const modeOf = game => C(game).modes[game.dunMode || 0];

// Ở cổng vào bí cảnh đã qua: hỏi độ khó. Trả về false nếu người chơi thôi.
export async function pickMode(game, id) {
  game.dunMode = 0;
  const n = cleared(game, id);
  if (!n) return true;
  const opts = C(game).modes.map((m, i) => ({ id: String(i), label: m.name + (i > n ? ' (chưa mở)' : ''), desc: i > n ? `Qua ${C(game).modes[i - 1].name} để mở.` : m.desc, color: i > n ? '#b8b0c8' : m.color }));
  opts.push({ id: 'out', label: 'Thôi', desc: '' });
  for (;;) {
    const pick = await game.dialog.choose(`${game.data.maps[id].name}: chọn độ khó`, opts);
    if (!pick || pick === 'out') return false;
    if (+pick <= n) { game.dunMode = +pick; return true; }
  }
}

// Quái trong bí cảnh theo độ khó
export function scaleMob(game, m) {
  const md = modeOf(game);
  if (md.hp === 1 && md.atk === 1) return;
  m.def = { ...m.def, hp: Math.round(m.def.hp * md.hp), atk: Math.round(m.def.atk * md.atk * 10) / 10, qi: Math.round(m.def.qi * md.qi) };
  m.hp = m.maxHp = m.def.hp;
}

// Hạ boss phòng cuối: ghi bậc đã qua, phát thưởng độ khó
export function dungeonDone(game) {
  const s = game.save, id = game.map.id, i = game.dunMode || 0, md = modeOf(game);
  s.dun ??= {};
  const first = cleared(game, id) <= i && i + 1 < C(game).modes.length;
  s.dun[id] = Math.max(cleared(game, id), i + 1);
  if (first && i > 0) game.toast(`Mở độ khó ${C(game).modes[i + 1].name}!`, 2.4);
  if (!md.reward) return;
  const runs = s.dunRuns?.day === today() ? s.dunRuns : (s.dunRuns = { day: today() });
  if ((runs[md.id] || 0) >= C(game).per_day) { game.toast(`Hôm nay đã nhận đủ ${C(game).per_day} lần thưởng ${md.name}.`, 2.2); return; }
  runs[md.id] = (runs[md.id] || 0) + 1;
  const got = grant(game, md.reward);
  setTimeout(() => game.dialog.say([['', `Qua ${game.map.def.name} (${md.name})! Nhận: ${got.join(', ')}.`]]), 400);
}
