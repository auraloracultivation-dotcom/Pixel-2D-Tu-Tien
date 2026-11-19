// Thú cưỡi, thời trang nhiều bản (chủ dự án 19/11/2026 12:58–13:02): mỗi con / mỗi bộ là một món riêng, cùng loại được có nhiều bản,
// phẩm (màu dòng chỉ số) ngẫu nhiên Phàm → Tiên, thời trang bán theo phẩm như trang bị (thú cưỡi không bán, chỉ đổi bằng Thú Lệnh: 13:50), Ngự Thú Sư và tiệm thời trang bán lại loại đã có.
// Khoá bản: bản đầu giữ khoá cũ ("<thú>" / "<bộ>:<giới>"), bản thêm có đuôi "#xxxxxx" (máy chủ đặt cho thú đổi bằng Thú Lệnh,
// máy khách đặt khi mua thời trang; máy chủ kiểm ở p2d_thu_thoi). save.mount / save.outfit vẫn là MÃ LOẠI (vẽ hình, gửi người khác);
// save.mountKey / save.outfitKey là bản đang dùng (dòng chỉ số lấy theo bản này). Giá bán: data/pets.json → beast.sell_tier (theo màu dòng).
import { addCoins } from './shop.js';

export const baseOf = k => String(k || '').split('#')[0];
export const newKey = base => `${base}#${Math.random().toString(36).slice(2, 8)}`;
const lookOf = game => (game.data.heroes.list[game.save?.look] ? game.save.look : game.data.heroes.default);

// ---- thú cưỡi ----
// Các bản thú cưỡi đang có (khoá), bản đang chọn
export const mountKeys = save => Object.keys(save?.mounts || {}).filter(k => save.mounts[k]);
export const hasMount = (save, id) => mountKeys(save).some(k => baseOf(k) === id);
export function mountKeyOf(save) {
  const k = save?.mountKey;
  if (k && save.mounts?.[k] && baseOf(k) === save.mount) return k;
  return mountKeys(save).find(x => baseOf(x) === save?.mount) || null;
}
export function pickMount(game, key) { const s = game.save; s.mount = baseOf(key); s.mountKey = key; game.refreshStats(); game.persist(); }

// ---- thời trang ----
// Các bản của một bộ (theo giới đang dùng nếu bộ chia nam / nữ): khoá trong save.outfits
export const outfitKeys = (save, id, g) => Object.keys(save?.outfits || {}).filter(k => save.outfits[k] && k.split('#')[0] === `${id}:${g}`);
export function outfitKeyOf(game, save = game.save) {
  const look = game.data.heroes.list[save?.look] ? save.look : game.data.heroes.default, k = save?.outfitKey;
  if (k && save.outfits?.[k] && k.split(':')[0] === save.outfit) return k;
  return save?.outfit ? `${save.outfit}:${look}` : null;
}

// ---- giá bán theo phẩm ----
export function sellTier(game, line) {
  const T = game.data.pets.beast.sell_tier || [];
  const t = Number.isInteger(line?.t) ? line.t : 0;
  return T[Math.max(0, Math.min(T.length - 1, t))] || 0;
}

export function sellMountKey(game, key) {
  const s = game.save, m = game.data.pets.mounts[baseOf(key)];
  if (!game.data.pets.beast.mount_sell) return 'Thú cưỡi không bán được, chỉ đổi bằng Thú Lệnh.';   // chủ dự án 19/11/2026 13:50
  if (!m || !s.mounts?.[key]) return 'Không có thú cưỡi này.';
  if (key === mountKeyOf(s)) return 'Đang dùng con này, chọn con khác rồi mới bán.';
  const price = sellTier(game, s.mountLine?.[key]);
  delete s.mounts[key]; if (s.mountLine) delete s.mountLine[key];
  if (!hasMount(s, s.mount)) { const k = mountKeys(s)[0]; s.mount = k ? baseOf(k) : null; s.mountKey = k || null; s.ride = false; }
  addCoins(game, price, 'ban-thu');
  game.refreshStats(); game.persist(); game.sfx('pickup');
  return `Đã bán ${m.name}, nhận ${price.toLocaleString('vi-VN')} Linh Thạch.`;
}

export function sellOutfitKey(game, key) {
  const s = game.save, id = key.split(':')[0], f = game.data.fashion.list[id];
  if (!f || !s.outfits?.[key]) return 'Không có bộ này.';
  if (key === outfitKeyOf(game)) return 'Đang mặc bộ này, thay bộ khác rồi mới bán.';
  const price = sellTier(game, s.outfitLine?.[key]);
  delete s.outfits[key]; if (s.outfitLine) delete s.outfitLine[key];
  addCoins(game, price, 'ban-do');
  game.refreshStats(); game.persist(); game.sfx('pickup');
  return `Đã bán ${f.name}, nhận ${price.toLocaleString('vi-VN')} Linh Thạch.`;
}
export { lookOf };
