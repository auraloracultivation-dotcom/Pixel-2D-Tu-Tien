// Tự hành nhận thưởng thành tựu đã xong (không nhận món có trang bị khi túi đầy, để khỏi mất đồ)
import { claimAchv } from './achieve.js';
import { weeklyRows, claimWeekly, claimWeeklyChest } from './weekly.js';

export function autoClaim(game) {
  const d = game.data, s = game.save, full = (s.bag?.length || 0) >= d.items.bag_size;
  const w = weeklyRows(game).find(r => r.done && !r.got);   // việc tuần xong thì nhận luôn, đủ thì mở rương (rương có trang bị: chờ túi còn chỗ)
  if (w) { const g = claimWeekly(game, w.t.id); if (g) game.toast(`Xong việc tuần: ${w.t.text.replace('{n}', w.t.need.n)}. Nhận ${g.join(', ')}`, 2.6); return; }
  if (!full) { const g = claimWeeklyChest(game); if (g) { game.toast(`Mở rương tuần: ${g.join(', ')}`, 2.8); return; } }
  const a = d.status.achievements.find(x => s.achv?.[x.id] === 1 && !(x.give?.item && full));
  if (!a) return;
  const got = claimAchv(game, a.id);
  if (got) { game.persist(); game.toast(`Nhận thưởng thành tựu ${a.name}: ${got.join(', ')}`, 2.4); game.sfx('pickup'); }
}
