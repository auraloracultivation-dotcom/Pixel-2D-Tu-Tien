// Chỗ Mộc Nhân, bể cá trong động phủ (chủ dự án 12/11/2026 02:23: bày cảnh dời được cả Mộc Nhân và chậu cá). Bố cục bày cảnh
// (def.hoi.do, src/ui/bay-canh.js) có món đánh dấu ['@dummy', x, y] / ['@be_ca', x, y] thì dùng chỗ đó (ô như data/home.json → at,
// tâm ô = map.center), không có thì về at gốc. Món '@…' không có hình nên lớp vẽ đồ bỏ qua (máy cũ cũng không vỡ).
export const SPOTS = { dummy: { w: 18, h: 30 }, be_ca: null };

export function homeSpot(game, key) {
  const e = (game.map?.def.hoi?.do || []).find(x => x[0] === '@' + key);
  return e ? [e[1], e[2]] : game.data.home[key]?.at;
}

// Khung chọn trong bày cảnh (điểm bản đồ): x, y = tâm ô; khung từ y - h + 8 tới y + 8 (chân hình đứng ở tâm ô)
export function spotBox(game, key) {
  const at = homeSpot(game, key);
  if (!at) return null;
  const c = game.map.center(at[0], at[1]);
  if (key === 'be_ca') { const H = game.data.home.be_ca, b = game.data.art.sprites['ui.vk-be-ca']; return { key, x: c.x, y: c.y, w: H.w, h: b ? H.w * b.h / b.w : H.w }; }
  return { key, x: c.x, y: c.y, ...SPOTS[key] };
}

// Dời Mộc Nhân đang đứng theo bố cục mới (bố cục máy chủ tải về sau khi dựng bản đồ, hoặc vừa kéo trong bày cảnh)
export function applySpots(game) {
  if (game.map?.id !== game.data.home?.map) return;
  const m = game.mobs?.find(x => x.dummy), at = homeSpot(game, 'dummy');
  if (!m || !at) return;
  const c = game.map.center(at[0], at[1]);
  m.hx = m.x = c.x; m.hy = m.y = c.y;
}
