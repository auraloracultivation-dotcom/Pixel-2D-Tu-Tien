// Bảng xếp hạng 3 tab (data/social.json rank): tải từ máy chủ, nhớ tạm 30 giây mỗi tab.
// Top 10 tuần trước được danh hiệu tuần (data/status.json titles có weekly), chỉ để trưng.
const cache = {};

export async function loadRank(game, kind, force) {
  const c = cache[kind];
  if (!force && c && Date.now() - c.at < 30000) return c.data;
  const { fetchRank } = await import('../net/rank.js');
  const data = await fetchRank(kind);
  cache[kind] = { at: Date.now(), data };
  noteTitles(game, data?.danh_hieu || []);
  return data;
}

function noteTitles(game, list) {
  const ids = game.data.social.rank.titles;
  game.rankTitles = list.map(t => ids[t.loai]).filter(Boolean);
}

// Lúc vào game: hỏi một lần để biết tuần này mình có danh hiệu xếp hạng nào
export function initRank(game) {
  game.rankTitles = [];
  if (!game.online) return;
  loadRank(game, game.data.social.rank.tabs[0].id).catch(() => {});
}
