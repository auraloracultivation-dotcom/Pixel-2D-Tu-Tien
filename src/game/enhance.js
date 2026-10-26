// Cường hóa trang bị và bộ đồ (data/gear.json). Cường hóa nhân chỉ số chính; bộ đồ cộng chỉ số khi mặc đủ món.
import { equipped } from './items.js';

export const plusMul = (data, it) => 1 + (it.plus || 0) * data.gear.enhance.main_per;

// Giá lần cường hóa tiếp theo của món it
export function enhanceCost(data, it) {
  const e = data.gear.enhance, n = it.plus || 0;
  if (n >= e.max) return null;
  const cost = { 'tinh-thiet': e.iron[n] };
  if (e.stones[n]) cost['tay-luyen-thach'] = e.stones[n];
  return { cost, rate: e.rate[n] };
}

// Trả về 'up' | 'fail' | 'drop' | null (không đủ nguyên liệu / đã tối đa)
export function enhance(game, uid, rnd = Math.random) {
  const { data, save } = game, it = save.bag.find(x => x.uid === uid), c = it && enhanceCost(data, it);
  if (!c || Object.entries(c.cost).some(([k, n]) => (save.mats[k] || 0) < n)) return null;
  for (const [k, n] of Object.entries(c.cost)) save.mats[k] -= n;
  const e = data.gear.enhance, n = it.plus || 0;
  let res;
  if (rnd() < c.rate) { it.plus = n + 1; res = 'up'; }
  else if (n >= e.drop_from && rnd() < e.drop_chance) { it.plus = n - 1; res = 'drop'; }
  else res = 'fail';
  game.refreshStats(); game.persist();
  return res;
}

// Đếm số món mỗi bộ đang mặc, cộng thưởng các mốc đã đạt
export function setStats(data, save) {
  const count = {}, out = {};
  for (const it of equipped(save)) { const s = data.items.bases[it.base]?.set; if (s) count[s] = (count[s] || 0) + 1; }
  for (const [id, n] of Object.entries(count)) {
    for (const [need, bonus] of Object.entries(data.gear.sets[id].bonus)) {
      if (n < Number(need)) continue;
      for (const [k, v] of Object.entries(bonus)) out[k] = (out[k] || 0) + v;
    }
  }
  return { count, stats: out };
}
