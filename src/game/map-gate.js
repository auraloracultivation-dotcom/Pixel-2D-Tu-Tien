// Bản đồ mở theo tu vi (chủ dự án 12/11/2026 04:07; data/realms.json → map_open: tổng tầng tu cần). Trả câu báo nếu chưa đủ, null nếu vào được.
// Dùng ở tinh đồ (src/game/starmap.js whyNot) và cổng bí cảnh (src/game/interact.js updatePortals).
export function mapGate(game, id) {
  const R = game.data.realms, need = R.map_open?.[id], s = game.save;
  if (need == null || !s) return null;
  if ((s.realm || 0) * R.layers + (s.layer || 1) - 1 >= need) return null;
  return `Cần tu vi ${R.names[Math.floor(need / R.layers)]} tầng ${need % R.layers + 1} mới vào được.`;
}
