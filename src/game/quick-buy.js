// Mua nhanh nguyên liệu còn thiếu (chủ dự án 09/11/2026 15:10): đang luyện đan, rèn, cường hoá, nâng cấp mà thiếu nguyên liệu
// thì một nút mua ngay đúng phần thiếu, giá chợ mỗi cái (data/market.json → quick.price) × quick.mul (đắt hơn 10%), làm tròn lên.
// Món không có giá trong bảng (đồ hiếm rơi từ boss, đồ lễ hội) không mua nhanh được, phải tự kiếm. Trừ Linh Thạch như mua ở
// Vạn Bảo Lâu (src/game/shop.js), ghi Lịch sử Linh Thạch mã 'mua-nhanh'.
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
