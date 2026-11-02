// Bảng tên nơi vừa tới (trải nghiệm: đặt chân lên tinh cầu mới thấy rõ mình đang ở đâu): tên lớn, dòng nhỏ là loại nơi,
// độ nguy hiểm so cảnh giới (màu xanh / vàng / đỏ như tinh đồ) và hội đèn tối nay. Vẽ ở src/render/draw-banner.js.
import { bodyOfMap, dangerOf } from './starmap.js';

export function showBanner(game) {
  const d = game.data, def = game.map?.def;
  if (!def) return;
  const b = bodyOfMap(d.starmap, game.map.id), H = d.dungeon.hint, parts = [];
  if (b) parts.push({ t: d.starmap.kinds[b.kind] || (b.parent ? d.starmap.kinds.dungeon : '') });
  const dg = b && dangerOf(b, game.save.realm || 0);
  if (dg) parts.push({ t: H[`${dg}_text`], c: H[`${dg}_color`] });
  game.banner = { name: def.name, parts: parts.filter(p => p.t), at: game.time };
}
