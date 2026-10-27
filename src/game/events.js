// Sự kiện theo giờ máy (data/events.json): cuối tuần nhân linh khí, mỗi tuần một sự kiện xoay vòng, lễ Tết nhận quà.
import { grant } from './daily.js';
import { addMat } from './cave.js';

const C = game => game.data.events;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Số tuần tính từ thứ 2 theo giờ máy (1970-01-05 là thứ 2)
const weekNo = d => Math.floor((Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000) - 4) / 7);
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;

export const weekly = (game, d = new Date()) => { const w = C(game).weekly; return w[((weekNo(d) % w.length) + w.length) % w.length]; };
export const festival = (game, d = new Date()) => { const t = ymd(d); return C(game).festivals.find(f => t >= f.from && t <= f.to) || null; };

// Các sự kiện đang chạy, để hiện và để nhân
export function activeEvents(game, d = new Date()) {
  const cfg = C(game), list = [weekly(game, d)];
  if (isWeekend(d)) list.push({ id: 'cuoi-tuan', ...cfg.weekend, color: '#bff4ff', desc: `Linh khí từ đánh quái và đả tọa x${cfg.weekend.mul.qi}.` });
  const f = festival(game, d); if (f) list.push(f);
  return list;
}

// Hệ số nhân: qi, coin, tower, brew
export function eventMul(game, kind) {
  let k = 1;
  for (const e of activeEvents(game)) k *= e.mul?.[kind] || 1;
  return k;
}

// Điểm săn yêu của tuần này (đổi tuần thì làm lại)
export function huntState(game) {
  const s = game.save, w = weekNo(new Date());
  if (s.hunt?.week !== w) s.hunt = { week: w, pts: 0, got: [] };
  return s.hunt;
}

export function eventKill(game, m) {
  festKill(game, m);
  const e = weekly(game);
  if (!e.points || m.noQi) return;
  const h = huntState(game), p = e.points;
  const n = m.def.ai === 'boss' ? p.boss : m.rare ? p.rare : p.mob;
  const before = h.pts; h.pts += n;
  if (e.milestones.some(x => before < x.pts && h.pts >= x.pts)) { game.toast(`${e.name}: đủ mốc ${h.pts} điểm! Mở bảng Việc để nhận.`, 2.4); game.newDaily = true; }
}

export function claimMilestone(game, i) {
  const e = weekly(game), x = e.milestones?.[i], h = huntState(game);
  if (!x || h.pts < x.pts || h.got.includes(i)) return null;
  h.got.push(i);
  return grant(game, x.give);
}

// Vào game trong dịp lễ: quà một lần mỗi dịp
export function checkFestival(game) {
  const f = festival(game), s = game.save;
  s.fest ??= {};
  if (!f || s.fest[f.id]) return;
  s.fest[f.id] = true;
  const got = grant(game, f.gift);
  setTimeout(() => game.dialog.say([['', `${f.name}! ${f.greet}`], ['', `Nhận: ${got.join(', ')}.`]]), 600);
}

// Lễ có quái riêng (bí ngô yêu...): mọc thêm ở đảo ngoài trời, rơi kẹo; NPC lễ đứng ở một đảo để đổi kẹo lấy quà
export function festSpawn(game, def) {
  const f = festival(game);
  if (!f?.mob) return;
  const base = (def.rooms || []).length ? null : def.spawners.find(s => !s.need);
  if (base) game.spawners.push({ mob: f.mob, at: base.at, n: f.mob_n, spread: 5, respawn: 8, alive: [], timer: 0 });
  if (f.npc && def.id === f.npc_map) game.addNpc(f.npc, f.npc_at);
}

function festKill(game, m) {
  const f = festival(game);
  if (!f?.candy || (f.mob ? m.id !== f.mob : m.noQi || Math.random() >= f.drop_p)) return;   // quái lễ, hoặc mọi quái theo tỉ lệ
  const [lo, hi] = f.drop, n = lo + Math.floor(Math.random() * (hi - lo + 1));
  addMat(game.save, f.candy, n);
  game.number(m.x, m.y - 24, `+${n} ${game.data.cave.materials[f.candy].name}`, f.color);
}

export const festNpc = (game, id) => festival(game)?.npc === id;

export async function talkFest(game, npc) {
  const f = festival(game), s = game.save, M = game.data.cave.materials[f.candy], have = s.mats[f.candy] || 0;
  const ch = await game.dialog.choose(`${npc.def.name}: Con có ${have} ${M.name}. Đổi gì nào?`, [
    ...f.swap.map((x, i) => ({ id: `s${i}`, label: x.label, desc: `${x.cost} ${M.name}`, color: have >= x.cost ? f.color : '#8a8a8a' })),
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ]);
  if (ch === 'talk') { await game.dialog.say([[npc.def.name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
  const x = f.swap[+String(ch).slice(1)];
  if (!String(ch).startsWith('s') || !x) return;
  if (have < x.cost) { await game.dialog.say([[npc.def.name, `Chưa đủ kẹo đâu con. Cần ${x.cost} ${M.name}.`]]); return; }
  s.mats[f.candy] -= x.cost;
  const got = grant(game, x.give);
  game.sfx('levelup');
  await game.dialog.say([[npc.def.name, `Của con đây: ${got.join(', ')}.`]]);
}

// Lời chào khi vào game: sự kiện tuần và cuối tuần
export function eventToast(game) {
  game.toast(activeEvents(game).map(e => e.name).join(' · '), 3);
}

// Nhân thưởng số (đá, linh khí, Linh Thạch); món đồ giữ nguyên
export function scaleReward(r, k) {
  if (k === 1) return r;
  const o = { ...r };
  for (const key of ['stones', 'qi', 'coins', 'contrib']) if (o[key]) o[key] = Math.round(o[key] * k);
  return o;
}
