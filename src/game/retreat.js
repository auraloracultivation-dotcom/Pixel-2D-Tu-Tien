// Thưởng bế quan tích luỹ (chủ dự án 02/11/2026; data/daily.json → retreat): đả tọa trong game + bế quan khi vắng mặt cộng dồn
// thành giờ, đủ mốc lớn (100, 300, 600, 1000 giờ) thì nhận quà một lần.
import { grant } from './daily.js';

const R = game => game.data.daily.retreat;
export const retreatHours = game => ((game.save.stats?.sit || 0) + (game.save.retreat?.off || 0)) / 60;

// Bế quan khi vắng mặt (offline.js gọi với số giây đã tính)
export function noteOffline(game, sec) { const r = (game.save.retreat ??= {}); r.off = (r.off || 0) + sec / 60; }

export function retreatList(game) {
  const h = retreatHours(game), got = game.save.retreat?.got || [];
  return (R(game)?.list || []).map((m, i) => ({ ...m, i, got: got.includes(m.h), ready: h >= m.h && !got.includes(m.h) }));
}
export const retreatReady = game => retreatList(game).some(m => m.ready);

// Nhận quà mốc i; trả về danh sách quà hoặc null
export function claimRetreat(game, i) {
  const m = retreatList(game)[i];
  if (!m?.ready) return null;
  (game.save.retreat ??= {}).got = [...(game.save.retreat.got || []), m.h];
  return grant(game, m.reward);
}
