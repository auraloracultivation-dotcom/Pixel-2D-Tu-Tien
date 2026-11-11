// Mua nhanh nguyên liệu còn thiếu (chủ dự án 09/11/2026 15:10): đang luyện đan, rèn, cường hoá, nâng cấp mà thiếu nguyên liệu
// thì một nút mua ngay đúng phần thiếu, giá chợ mỗi cái (data/market.json → quick.price) × quick.mul (đắt hơn 10%), làm tròn lên.
// Món không có giá trong bảng (đồ hiếm rơi từ boss, đồ lễ hội) không mua nhanh được, phải tự kiếm. Trừ Linh Thạch như mua ở
// Vạn Bảo Lâu (src/game/shop.js), ghi Lịch sử Linh Thạch mã 'mua-nhanh'.
// Từ 11/11/2026 23:27 (chủ dự án: "xếp ô mua ở dưới cùng, tất cả tài nguyên nâng cấp đều có nút mua và mua số lượng"): buyMats mua
// đúng số người chơi chọn cho từng thứ (src/ui/buy-mats.js), không chỉ phần thiếu.
import { coins, addCoins } from './shop.js';

const Q = game => game.data.market.quick;

// Phần còn thiếu của cost ({ mã: số }) so với túi
export function missing(game, cost) {
  const m = {}, mats = game.save.mats || {};
  for (const [k, n] of Object.entries(cost || {})) if ((mats[k] || 0) < n) m[k] = n - (mats[k] || 0);
  return m;
}

// Giá mua nhanh phần thiếu; null khi không thiếu gì hoặc có món không bán nhanh
export function quickPrice(game, cost) {
  const q = Q(game), miss = Object.entries(missing(game, cost));
  if (!q || !miss.length || miss.some(([k]) => !q.price[k])) return null;
  return miss.reduce((s, [k, n]) => s + Math.ceil(q.price[k] * q.mul * n), 0);
}

// Mua phần thiếu; trả về chữ báo (thiếu Linh Thạch thì báo, không mua)
export function quickBuy(game, cost) {
  const price = quickPrice(game, cost), q = Q(game);
  if (price == null) return q?.texts.none;
  if (coins(game.save) < price) return q.texts.poor.replace('{n}', price.toLocaleString('vi-VN'));
  const s = game.save, miss = missing(game, cost);
  addCoins(game, -price, 'mua-nhanh');
  s.mats ??= {};
  for (const [k, n] of Object.entries(miss)) s.mats[k] = (s.mats[k] || 0) + n;
  game.persist();
  game.sfx?.('pickup');
  return q.texts.ok.replace('{n}', price.toLocaleString('vi-VN'));
}

// Giá một thứ k mua n cái; null khi không bán nhanh
export function unitPrice(game, k, n = 1) {
  const q = Q(game), p = q?.price[k];
  return p ? Math.ceil(p * q.mul * n) : null;
}

// Mua đúng số { mã: số } (mỗi số 1..999); trả chữ báo
export function buyMats(game, want) {
  const q = Q(game), list = Object.entries(want || {}).filter(([, n]) => Number.isInteger(n) && n > 0 && n <= 999);
  if (!q || !list.length || list.some(([k]) => !q.price[k])) return q?.texts.none;
  const price = list.reduce((s, [k, n]) => s + unitPrice(game, k, n), 0);
  if (coins(game.save) < price) return q.texts.poor.replace('{n}', price.toLocaleString('vi-VN'));
  const s = game.save;
  addCoins(game, -price, 'mua-nhanh');
  s.mats ??= {};
  for (const [k, n] of list) s.mats[k] = (s.mats[k] || 0) + n;
  game.persist();
  game.sfx?.('pickup');
  return (q.texts.bought || q.texts.ok).replace('{n}', price.toLocaleString('vi-VN'));
}
