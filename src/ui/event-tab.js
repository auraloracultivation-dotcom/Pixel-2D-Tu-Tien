// Tab Sự kiện trong bảng Việc: sự kiện đang chạy, mốc săn yêu của tuần.
import { activeEvents, weekly, huntState, claimMilestone } from '../game/events.js';

export function renderEvents(game, list, { card, mini, rewardText, say }) {
  const e = weekly(game);
  document.getElementById('daily-sub').textContent = e.name;
  for (const ev of activeEvents(game)) {
    const lines = [ev.desc || ''];
    if (ev.from) lines.push(`Từ ${ev.from} tới ${ev.to}`);
    list.append(card(ev.color || '#f2c94c', ev.name, lines.filter(Boolean)));
  }
  if (!e.milestones) return;
  const h = huntState(game);
  e.milestones.forEach((m, i) => {
    const got = h.got.includes(i), ok = h.pts >= m.pts;
    list.append(card(got ? '#c8c4d0' : ok ? '#5fd07a' : e.color, `Mốc ${m.pts} điểm săn yêu (${Math.min(h.pts, m.pts)}/${m.pts})`, [`Thưởng: ${rewardText(m.give)}`],
      mini(got ? 'Đã nhận' : ok ? 'Nhận thưởng' : 'Chưa đủ', () => { const g = claimMilestone(game, i); if (g) { say('Nhận: ' + g.join(', ')); game.sfx('levelup'); } }, got || !ok)));
  });
}
