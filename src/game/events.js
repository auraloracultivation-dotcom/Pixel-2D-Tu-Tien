// Sự kiện theo giờ máy (data/events.json): cuối tuần nhân linh khí, mỗi tuần một sự kiện xoay vòng, lễ Tết nhận quà.
import { grant } from './daily.js';

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
