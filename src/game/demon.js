// Ma Vương tuần (data/demon.json): mỗi tuần một Ma Vương trấn Phương Thiên Địa. Ma Vương bạn đã hạ càng nhiều thì con sau càng mạnh
// (gấp tier_mul mỗi con, không hiện số), thưởng chỉ nhích; hạ xong thì tịnh hoá tới tuần sau. Lưu save.demon { lv, week }.
import { grant } from './daily.js';

const D = game => game.data.demon;

// Số tuần từ epoch (thứ Hai) theo lịch trên máy
export function weekNo(game, now = new Date()) {
  const [y, m, d] = D(game).epoch.split('-').map(Number);
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / (7 * 86400000));
}
export const weekBoss = game => { const b = D(game).bosses; return b[((weekNo(game) % b.length) + b.length) % b.length]; };
export const demonLv = game => game.save?.demon?.lv || 0;
export const demonOpen = game => (game.save.realm || 0) >= D(game).need_realm;
export const demonDoneWeek = game => game.save?.demon?.week === weekNo(game);
const mulOf = game => D(game).tier_mul ** demonLv(game);

// Lý do chưa vào được (null = vào được)
export function demonWhy(game) {
  const T = D(game).texts;
  if (!demonOpen(game)) return T.locked.replace('{realm}', game.data.realms.names[D(game).need_realm]);
  if (demonDoneWeek(game)) return T.done.replace('{name}', weekBoss(game).name);
  return null;
}
export const weekLine = game => D(game).texts.week.replace('{name}', weekBoss(game).name).replace('{n}', demonLv(game) + 1);

// Quái trong Phương Thiên Địa: boss thành Ma Vương của tuần (hình, đòn của boss gốc), mọi quái mạnh theo bậc
export function applyDemon(game, m) {
  const c = D(game), mul = mulOf(game);
  if (m.room?.boss && m.def.ai === 'boss') {
    const wb = weekBoss(game), base = game.data.mobs[wb.mob] || m.def;
    m.id = wb.mob;
    m.def = { ...base, name: wb.name, hp: Math.round(c.base.hp * mul), atk: Math.round(c.base.atk * mul * 10) / 10, qi: Math.round((base.qi || 0) * 3 * c.reward_tier ** demonLv(game)) };
    m.r = base.radius || m.r;
  } else m.def = { ...m.def, hp: Math.round(m.def.hp * mul), atk: Math.round(m.def.atk * mul * 10) / 10 };
  m.hp = m.maxHp = m.def.hp;
}

// Hạ Ma Vương: lên bậc, ghi tuần, phát thưởng (Linh Thạch nhích theo bậc)
export function demonDone(game) {
  const c = D(game), s = game.save, name = weekBoss(game).name, lv = demonLv(game);
  s.demon = { lv: lv + 1, week: weekNo(game) };
  const got = grant(game, { ...c.reward, coins: Math.round(c.reward.coins * c.reward_tier ** lv) });
  game.persist();
  setTimeout(() => game.dialog.say([['', c.texts.win.replace('{name}', name).replace('{got}', got.join(', '))]]), 400);
}
