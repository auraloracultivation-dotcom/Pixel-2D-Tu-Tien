// Độ khó bí cảnh (data/dungeon.json), luật 7 → 14 → 28: mỗi cấp quái mạnh gấp đôi, chia 10 bậc, không hiện hệ số.
// game.dunMode = chỉ số bậc L đếm từ 0 trên toàn bộ (0 = Thường bậc 1, 10 = Khó bậc 1, ...).
import { grant } from './daily.js';

const C = game => game.data.dungeon;
const today = () => new Date().toDateString();

const total = game => C(game).modes.length * C(game).steps;
export const tierOf = (game, L) => Math.floor(L / C(game).steps);
export const levelMul = (game, L) => C(game).tier_mul ** (L / C(game).steps);
export function levelName(game, L) {
  const D = C(game);
  return D.texts.level.replace('{mode}', D.modes[tierOf(game, L)].name).replace('{step}', L % D.steps + 1);
}
export const modeOf = game => C(game).modes[tierOf(game, game.dunMode || 0)];

// Số bậc đã qua của bí cảnh id (0: chưa qua lần nào). Bản lưu cũ (save.dun: số độ khó đã qua) đổi sang bậc 1 của cấp đó.
export function cleared(game, id) {
  const D = C(game), s = game.save, st = D.story_step[id], i = st ? game.data.story.steps.findIndex(x => x.id === st) : -1;
  const old = s.dun?.[id] || 0;
  return Math.min(total(game), Math.max(s.dunLv?.[id] || 0, old ? (old - 1) * D.steps + 1 : 0, i >= 0 && s.step > i ? 1 : 0));
}

// Màu gợi ý so với sức người chơi: so thời gian bạn gục trước boss với thời gian bạn hạ boss ở bậc L
export function hintOf(game, id, L) {
  const H = C(game).hint, boss = (game.data.maps[id].rooms || []).find(r => r.boss)?.mobs?.[0];
  const def = boss && game.data.mobs[boss.mob], st = game.player?.st;
  if (!def || !st) return { text: H.fair_text, color: H.fair_color };
  const mul = levelMul(game, L), pc = game.data.config.player;
  const dps = st.atk * (1 + st.crit * (st.critMult - 1)) * H.dps_per_atk;
  const hit = Math.max(def.atk * mul * (pc.def_min_take ?? 0), def.atk * mul - st.def);
  const r = (st.maxHp / Math.max(0.1, hit * H.hit_rate / (def.cd || 1))) / (def.hp * mul / Math.max(1, dps));
  return r >= H.easy ? { text: H.easy_text, color: H.easy_color } : r >= H.hard ? { text: H.fair_text, color: H.fair_color } : { text: H.hard_text, color: H.hard_color };
}

// Các bậc cho chọn: bậc cao nhất đã mở ở mỗi cấp, thêm bậc ngay dưới ở cấp cao nhất để lùi lại khi quá khó
export function levelOptions(game, id) {
  const D = C(game), top = Math.min(cleared(game, id), total(game) - 1), out = [];
  for (let t = 0; t <= tierOf(game, top); t++) {
    const L = Math.min(top, t * D.steps + D.steps - 1);
    if (t === tierOf(game, top) && L % D.steps > 0) out.push(L - 1);
    out.push(L);
  }
  return out.reverse().map(L => { const h = hintOf(game, id, L); return { id: String(L), label: levelName(game, L), desc: h.text, color: h.color }; });
}

// Ở cổng vào bí cảnh đã qua: hỏi độ khó. Trả về false nếu người chơi thôi.
export async function pickMode(game, id) {
  game.dunMode = 0;
  if (!cleared(game, id)) return true;
  const D = C(game), opts = levelOptions(game, id);
  const pick = await game.dialog.choose(D.texts.pick.replace('{map}', game.data.maps[id].name), [...opts, { id: 'out', label: D.texts.out, desc: '' }]);
  if (!pick || pick === 'out') return false;
  game.dunMode = +pick;
  return true;
}

// Quái trong bí cảnh theo bậc: máu và công nhân hệ số ẩn, linh khí chỉ nhích
export function scaleMob(game, m) {
  const L = game.dunMode || 0, D = C(game);
  if (!L) return;
  const mul = levelMul(game, L), q = D.reward_tier ** tierOf(game, L) * (1 + D.reward_step * (L % D.steps));
  m.def = { ...m.def, hp: Math.round(m.def.hp * mul), atk: Math.round(m.def.atk * mul * 10) / 10, qi: Math.round(m.def.qi * q) };
  m.hp = m.maxHp = m.def.hp;
}

// Hạ boss phòng cuối: ghi bậc đã qua, quà lần đầu qua bậc, thưởng cấp (tối đa per_day lần mỗi cấp mỗi ngày)
export function dungeonDone(game) {
  const s = game.save, id = game.map.id, D = C(game), L = game.dunMode || 0, md = modeOf(game), T = D.texts;
  const was = cleared(game, id), first = L >= was;
  (s.dunLv ??= {})[id] = Math.max(was, L + 1);
  const lines = [];
  if (first && L + 1 < total(game)) game.toast(T.unlock.replace('{level}', levelName(game, L + 1)), 2.4);
  if (first && D.first) lines.push(`${T.first.replace('{level}', levelName(game, L))}: ${grant(game, D.first).join(', ')}`);
  const runs = s.dunRuns?.day === today() ? s.dunRuns : (s.dunRuns = { day: today() });
  if (md.reward && (runs[md.id] || 0) < D.per_day) {
    runs[md.id] = (runs[md.id] || 0) + 1;
    const r = { ...md.reward, coins: Math.round((md.reward.coins || 0) * (1 + D.reward_step * (L % D.steps))) || undefined };
    lines.push(grant(game, r).join(', '));
  } else if (md.reward) game.toast(T.full.replace('{n}', D.per_day).replace('{mode}', md.name), 2.2);
  if (lines.length) setTimeout(() => game.dialog.say([['', T.done.replace('{map}', game.map.def.name).replace('{level}', levelName(game, L)).replace('{got}', lines.join('; '))]]), 400);
}
