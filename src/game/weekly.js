// Việc tuần (data/daily.json → weekly, chủ dự án ghi: 1 chính tuyến, 1 việc ngày, 1 việc tuần, 1 sự kiện): mỗi tuần (từ thứ Hai, giờ máy)
// vài việc lớn tính từ đầu tuần (hạ quái, hạ boss, đả tọa, câu cá), xong từng việc nhận thưởng, đủ hết mở rương tuần.
import { progress } from './achieve.js';
import { grant } from './daily.js';

const W = game => game.data.daily.weekly;
// Số tuần tính từ thứ Hai theo giờ máy (1970-01-05 là thứ Hai)
const weekNo = (d = new Date()) => Math.floor((Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000) - 4) / 7);

export function ensureWeekly(game) {
  const s = game.save, w = weekNo();
  if (s.weekly?.week === w) return s.weekly;
  const base = {};
  for (const t of W(game).tasks) base[t.id] = progress(game, t.need);
  s.weekly = { week: w, base, got: [], chest: false };
  return s.weekly;
}

export function weeklyRows(game) {
  const wk = ensureWeekly(game);
  return W(game).tasks.map(t => {
    const have = Math.max(0, Math.floor(progress(game, t.need) - (wk.base[t.id] ?? 0)));
    return { t, have: Math.min(have, t.need.n), done: have >= t.need.n, got: wk.got.includes(t.id) };
  });
}

export function claimWeekly(game, id) {
  const r = weeklyRows(game).find(x => x.t.id === id);
  if (!r || !r.done || r.got) return null;
  ensureWeekly(game).got.push(id);
  return grant(game, r.t.reward);
}

export function claimWeeklyChest(game) {
  const wk = ensureWeekly(game);
  if (wk.chest || wk.got.length < W(game).tasks.length) return null;
  wk.chest = true;
  return grant(game, W(game).chest);
}
