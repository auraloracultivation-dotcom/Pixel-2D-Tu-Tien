// Tự hành nhận thưởng thành tựu đã xong (không nhận món có trang bị khi túi đầy, để khỏi mất đồ)
import { claimAchv } from './achieve.js';
import { bagCap } from './items.js';

export function autoClaim(game) {
  const d = game.data, s = game.save, full = (s.bag?.length || 0) >= bagCap(d, s);
  const a = d.status.achievements.find(x => s.achv?.[x.id] === 1 && !(x.give?.item && full));
  if (!a) return;
  const got = claimAchv(game, a.id);
  if (got) { game.persist(); game.autoNote(`Nhận thưởng thành tựu ${a.name}: ${got.join(', ')}`, 2.4); game.sfx('pickup'); }
}
