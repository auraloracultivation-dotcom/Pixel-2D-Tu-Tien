// Ma Vương tuần (data/demon.json): mỗi tuần một Ma Vương trấn Phương Thiên Địa, cấp ngẫu nhiên 1..rand_max theo số tuần (chủ dự án
// 03/11/2026: không leo dần, lâu lâu gặp con yếu, lâu lâu gặp con rất mạnh); mỗi cấp mạnh gấp tier_mul, thưởng nhích reward_tier.
// Hạ xong thì tịnh hoá tới tuần sau. Lưu save.demon { lv: số con đã hạ, week }.
import { grant } from './daily.js';

const D = game => game.data.demon;

// Số tuần từ epoch (thứ Hai) theo lịch trên máy
export function weekNo(game, now = new Date()) {
  const [y, m, d] = D(game).epoch.split('-').map(Number);
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / (7 * 86400000));
}
export const weekBoss = game => { const b = D(game).bosses; return b[((weekNo(game) % b.length) + b.length) % b.length]; };
export const demonLv = game => game.save?.demon?.lv || 0;   // số con đã hạ (thống kê)
// Cấp của tuần (0 = cấp 1): bốc theo số tuần, mọi người cùng một cấp
export function weekTier(game) {
  let h = (weekNo(game) + 1) * 2654435761 >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h = (h ^ (h >>> 13)) >>> 0;
  return h % (D(game).rand_max || 1);
}
export const demonOpen = game => (game.save.realm || 0) >= D(game).need_realm;
export const demonDoneWeek = game => game.save?.demon?.week === weekNo(game);
const mulOf = game => D(game).tier_mul ** weekTier(game);

// Lý do chưa vào được (null = vào được)
export function demonWhy(game) {
  const T = D(game).texts;
  if (!demonOpen(game)) return T.locked.replace('{realm}', game.data.realms.names[D(game).need_realm]);
  if (demonDoneWeek(game)) return T.done.replace('{name}', weekBoss(game).name);
  return null;
}
export const weekLine = game => D(game).texts.week.replace('{name}', weekBoss(game).name).replace('{n}', weekTier(game) + 1).replace('{max}', D(game).rand_max);

// Quái trong Phương Thiên Địa: boss thành Ma Vương của tuần (hình, đòn của boss gốc), mọi quái mạnh theo bậc
export function applyDemon(game, m) {
  const c = D(game), mul = mulOf(game);
  if (m.room?.boss && m.def.ai === 'boss') {
    const wb = weekBoss(game), base = game.data.mobs[wb.mob] || m.def;
    m.id = wb.mob;
    m.def = { ...base, name: wb.name, hp: Math.round(c.base.hp * mul), atk: Math.round(c.base.atk * mul * 10) / 10, qi: Math.round((base.qi || 0) * 3 * c.reward_tier ** weekTier(game)) };
    m.r = base.radius || m.r;
  } else m.def = { ...m.def, hp: Math.round(m.def.hp * mul), atk: Math.round(m.def.atk * mul * 10) / 10 };
  m.hp = m.maxHp = m.def.hp;
}

// Hạ Ma Vương: lên bậc, ghi tuần, phát thưởng (Linh Thạch nhích theo bậc)
export function demonDone(game) {
  const c = D(game), s = game.save, name = weekBoss(game).name, tier = weekTier(game);
  s.demon = { lv: demonLv(game) + 1, week: weekNo(game) };
  const got = grant(game, { ...c.reward, coins: Math.round(c.reward.coins * c.reward_tier ** tier) }, 'ma-vuong');
  game.persist();
  setTimeout(() => game.dialog.say([['', c.texts.win.replace('{name}', name).replace('{got}', got.join(', '))]]), 400);
}
