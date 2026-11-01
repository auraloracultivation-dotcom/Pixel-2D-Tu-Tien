// Bí cảnh không đáy (data/dungeon.json, chủ dự án chốt 02/11/2026): mỗi bậc quái mạnh step_mul lần, cứ steps bậc là một cấp.
// game.dunMode = chỉ số bậc L đếm từ 0 (0 = Dễ bậc 1, 10 = Trung bậc 1, ...). Qua cấp cuối thì đánh số tiếp (Vô Gian 2…).
import { grant } from './daily.js';
import { runsLeft, useRun, rewardOf, finishRun, sweep } from './dun-run.js';

const C = game => game.data.dungeon;

export const tierOf = (game, L) => Math.floor(L / C(game).steps);
export const levelMul = (game, L) => C(game).step_mul ** L;
export function levelName(game, L) {
  const D = C(game), t = tierOf(game, L), last = D.modes.length - 1;
  if (t <= last) return D.texts.level.replace('{mode}', D.modes[t].name).replace('{step}', L % D.steps + 1);
  return D.texts.level_n.replace('{mode}', D.modes[last].name).replace('{n}', t - last + 1).replace('{step}', L % D.steps + 1);
}
export const modeOf = game => { const M = C(game).modes; return M[Math.min(M.length - 1, tierOf(game, game.dunMode || 0))]; };

// Số bậc đã qua của bí cảnh id (0: chưa qua lần nào). Bản lưu cũ (save.dun: số độ khó đã qua) đổi sang bậc 1 của cấp đó.
export function cleared(game, id) {
  const D = C(game), s = game.save, st = D.story_step[id], i = st ? game.data.story.steps.findIndex(x => x.id === st) : -1;
  return Math.max(s.dunLv2?.[id] || 0, i >= 0 && s.step > i ? 1 : 0);   // không đáy; thang mới đếm lại từ đầu (dunLv2), đã qua truyện thì mở bậc 2
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

// Các bậc cho chọn: bậc cao nhất đã mở và vài bậc lùi lại (−1, −2, −3, −5, −10, bậc 1) vì mỗi bậc quái ×2
export function levelOptions(game, id) {
  const top = cleared(game, id), out = [...new Set([0, 1, 2, 3, 5, 10].map(d => top - d).filter(L => L >= 0)), 0].filter((v, i, a) => a.indexOf(v) === i);
  return out.map(L => { const h = hintOf(game, id, L); return { id: String(L), label: levelName(game, L), desc: h.text, color: h.color }; });
}

// Ở cổng vào bí cảnh đã qua (chủ dự án chốt 02/11/2026 03:25): 3 lựa chọn — vượt bậc kế (bậc đã qua +1), càn quét bậc đã qua
// (nhận ngay thưởng cố định, không vào), thoát. Mỗi bí cảnh per_day lượt mỗi ngày. Trả về false nếu không vào.
export async function pickMode(game, id) {
  game.dunMode = 0;
  const top = cleared(game, id);
  if (!top) return true;   // lần đầu (truyện): vào bậc 1
  const D = C(game), T = D.texts, left = runsLeft(game, id), name = game.data.maps[id].name;
  if (!left) { game.toast(T.no_runs.replace('{n}', D.per_day).replace('{map}', name), 2.6); return false; }
  const h = hintOf(game, id, top), r = rewardOf(game, id, top - 1);
  const pick = await game.dialog.choose(T.pick.replace('{map}', name).replace('{left}', left).replace('{n}', D.per_day), [
    { id: 'go', label: T.go.replace('{level}', levelName(game, top)), desc: h.text, color: h.color },
    { id: 'sweep', label: T.sweep.replace('{level}', levelName(game, top - 1)), desc: r ? T.sweep_desc : '' },
    { id: 'out', label: T.out, desc: '' },
  ]);
  if (pick === 'sweep') {
    const loot = sweep(game, id, top - 1);
    if (loot) game.openDunResult?.({ id, L: top - 1, loot, inside: false, swept: true });
    return false;
  }
  if (pick !== 'go') return false;
  game.dunMode = top;
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

// Hạ boss phòng cuối: ghi bậc đã qua, quà lần đầu qua bậc, thưởng cấp (tối đa per_day lượt mỗi bí cảnh mỗi ngày)
export function dungeonDone(game) {
  const s = game.save, id = game.map.id, D = C(game), L = game.dunMode || 0, T = D.texts;
  const pt = game.party, guest = !!pt?.run && pt.roster[0]?.id !== pt.me;   // tổ đội: chỉ đội trưởng tăng bậc (chủ dự án chốt 30/10), thành viên vẫn nhận quà lượt ngày
  const was = cleared(game, id), first = !guest && L >= was;
  if (!guest) (s.dunLv2 ??= {})[id] = Math.max(was, L + 1);
  else game.toast(T.guest, 2.4);
  const lines = [];
  if (first) game.toast(T.unlock.replace('{level}', levelName(game, L + 1)), 2.4);
  if (first && D.first) lines.push(`${T.first.replace('{level}', levelName(game, L))}: ${grant(game, D.first).join(', ')}`);
  const r = rewardOf(game, id, L);
  if (r && runsLeft(game, id) > 0) { useRun(game, id); lines.push(grant(game, r).join(', ')); }   // lượt tính theo bí cảnh (hướng mới 02/11/2026)
  else if (r) game.toast(T.full.replace('{n}', D.per_day).replace('{map}', game.map.def.name), 2.2);
  if (game.dunRun) finishRun(game);   // bảng ô vuông mọi thứ thu được + Tiếp tục / Càn quét / Thoát
  else if (lines.length) setTimeout(() => game.dialog.say([['', T.done.replace('{map}', game.map.def.name).replace('{level}', levelName(game, L)).replace('{got}', lines.join('; '))]]), 400);
}
