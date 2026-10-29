// Tab Sự kiện trong bảng Việc: sự kiện đang chạy, mốc săn yêu của tuần.
// Mỗi ô một dòng ngắn (short); chạm ô thì tấm chi tiết hiện đủ: cách chơi (how), quà, hệ số nhân, ngày còn lại, kẹo đổi quà.
// Chữ ở data/events.json → texts; số lấy thẳng từ sự kiện nên sửa số là chữ tự đổi.
import { activeEvents, weekly, festival, huntState, claimMilestone } from '../game/events.js';

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const dm = s => { const [, m, d] = s.split('-'); return `${+d}/${+m}`; };
const dayNo = d => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

function leftLine(game, T, ev) {
  const now = new Date();
  if (ev.to) {
    const [y, m, d] = ev.to.split('-').map(Number), n = dayNo(new Date(y, m - 1, d)) - dayNo(now) + 1;
    return n <= 1 ? T.last : fill(T.left, { n, end: dm(ev.to) });
  }
  if (game.data.events.weekly.includes(ev)) return fill(T.week_left, { n: ((7 - now.getDay()) % 7) + 1 });
  return null;
}

function mulLine(T, ev) {
  const parts = Object.entries(ev.mul || {}).map(([k, v]) => T['mul_' + k] && fill(T['mul_' + k], { k: String(v).replace('.', ',') })).filter(Boolean);
  return parts.length ? fill(T.mul, { list: parts.join(', ') }) : null;
}

function festLines(game, T, f, rewardText) {
  const D = game.data, s = game.save, out = [];
  if (f.gift) out.push(fill(s.fest?.[f.id] ? T.gift_got : T.gift, { r: rewardText(f.gift) }));
  const outfit = Object.values(D.fashion?.list || {}).find(o => (o.from?.fest || o.fest) === f.id);
  if (outfit) out.push(fill(T.outfit, { name: outfit.name }));
  if (f.candy && f.swap) {
    const name = D.cave.materials[f.candy]?.name || f.candy;
    out.push(fill(T.candy, { n: s.mats?.[f.candy] || 0, name }));
    out.push(fill(T.swap, { npc: D.npcs[f.npc]?.name || f.npc, map: D.maps[f.npc_map]?.name || f.npc_map }));
    for (const x of f.swap) out.push(fill(T.swap_row, { cost: x.cost, name, label: x.label, r: rewardText(x.give) }));
  }
  return out;
}

export function renderEvents(game, list, { card, mini, rewardText, say }) {
  const T = game.data.events.texts, e = weekly(game), fest = festival(game);
  document.getElementById('daily-sub').textContent = e.name;
  for (const ev of activeEvents(game)) {
    const lines = [ev.short || ev.desc || ''];
    if (ev.how?.length) lines.push(T.how, ...ev.how);
    else if (ev.short && ev.desc && ev.desc !== ev.short) lines.push(ev.desc);
    if (ev.points) lines.push(fill(T.points, ev.points), fill(T.pts_now, { n: huntState(game).pts }));
    const mul = mulLine(T, ev); if (mul) lines.push(mul);
    if (fest && ev.id === fest.id) lines.push(...festLines(game, T, ev, rewardText));
    const left = leftLine(game, T, ev); if (left) lines.push(left);
    list.append(card(ev.color || '#f2c94c', ev.name, lines.filter(Boolean)));
  }
  if (!e.milestones) return;
  const h = huntState(game);
  e.milestones.forEach((m, i) => {
    const got = h.got.includes(i), ok = h.pts >= m.pts;
    const head = got ? T.ms_got : ok ? T.ms_ok : fill(T.ms_have, { n: Math.min(h.pts, m.pts), pts: m.pts });
    list.append(card(got ? '#c8c4d0' : ok ? '#5fd07a' : e.color, fill(T.ms_title, { pts: m.pts }), [head, fill(T.ms_reward, { r: rewardText(m.give) })],
      mini(got ? 'Đã nhận' : ok ? 'Nhận thưởng' : 'Chưa đủ', () => { const g = claimMilestone(game, i); if (g) { say('Nhận: ' + g.join(', ')); game.sfx('levelup'); } }, got || !ok)));
  });
}
