// Nút "Mua nhanh" đặt cạnh nút luyện, rèn, cường hoá, nâng cấp khi thiếu nguyên liệu (src/game/quick-buy.js).
// Trả về nút, hoặc null khi không thiếu gì hay món thiếu không mua nhanh được. done(msg): bảng tự báo chữ và vẽ lại.
import { quickPrice, quickBuy } from '../game/quick-buy.js';

export function quickBuyBtn(game, cost, done, cls = 'mini') {
  const price = quickPrice(game, cost), q = game.data.market.quick;
  if (price == null) return null;
  const b = document.createElement('button');
  b.className = cls + ' quick-buy'; b.type = 'button';
  b.textContent = q.texts.btn.replace('{n}', price.toLocaleString('vi-VN'));
  b.onclick = e => { e.stopPropagation(); done(quickBuy(game, cost)); };
  return b;
}
