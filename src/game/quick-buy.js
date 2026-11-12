// Mua nguyên liệu bằng Linh Thạch (chủ dự án 09/11/2026 15:10: mua nhanh phần thiếu khi luyện, rèn, cường hoá, nâng cấp; 11/11/2026 23:27:
// ô mua cuối tấm chi tiết, chọn số lượng, src/ui/buy-mats.js). Giá mỗi cái data/market.json → quick.price; Mua nhanh × quick.mul (đắt hơn
// 10%), Vạn Bảo Lâu giá gốc (data/shop.json items cùng giá), làm tròn lên. Món không có giá (đồ hiếm boss, đồ lễ hội) không mua được.
// Đã đăng nhập: máy chủ mua (migration 20261111170000_p2d_nl_mua.sql, hàm p2d_nl_mua, chủ dự án 12/11/2026 00:30–00:34: "mua thì
// tốn Linh Thạch, sao lại giới hạn người ta"): trừ Linh Thạch, cộng nguyên liệu ngay trên bản lưu máy chủ nên không bị trần nhận mỗi ngày
// cắt mất như khi cộng ở máy rồi lưu lên. Chơi thử, hoặc máy chủ chưa có hàm: tính ở máy như cũ. Ghi Lịch sử Linh Thạch 'mua-nhanh' / 'van-bao'.
import { coins, addCoins } from './shop.js';

const Q = game => game.data.market.quick;
const net = async () => (await import('../net/ky-mon.js')).kyCalls;
let noFn = false;   // máy chủ chưa có p2d_nl_mua: từ đó về sau mua ở máy

// Phần còn thiếu của cost ({ mã: số }) so với túi
export function missing(game, cost) {
  const m = {}, mats = game.save.mats || {};
  for (const [k, n] of Object.entries(cost || {})) if ((mats[k] || 0) < n) m[k] = n - (mats[k] || 0);
  return m;
}

// Giá k mua n cái; nhanh: nhân quick.mul. null khi không bán. Làm tròn số thực trước khi làm tròn lên (5 × 1.1 × 10 = 55, không 56)
export function unitPrice(game, k, n = 1, nhanh = true) {
  const q = Q(game), p = q?.price[k];
  return p ? Math.ceil(Math.round(p * (nhanh ? q.mul : 1) * n * 1e6) / 1e6) : null;
}

// Giá mua nhanh phần thiếu; null khi không thiếu gì hoặc có món không bán nhanh
export function quickPrice(game, cost) {
  const q = Q(game), miss = Object.entries(missing(game, cost));
  if (!q || !miss.length || miss.some(([k]) => !q.price[k])) return null;
  return miss.reduce((s, [k, n]) => s + unitPrice(game, k, n), 0);
}

// Mua phần thiếu; trả chữ báo
export async function quickBuy(game, cost) {
  return (await buyMats(game, missing(game, cost))).msg;
}

// Mua đúng số { mã: số } (mỗi số 1..999). nhanh: giá Mua nhanh (false: giá Vạn Bảo Lâu). Trả { ok, msg }
export async function buyMats(game, want, nhanh = true) {
  const q = Q(game), list = Object.entries(want || {}).filter(([, n]) => Number.isInteger(n) && n > 0 && n <= 999);
  if (!q || !list.length || list.some(([k]) => !q.price[k])) return { ok: false, msg: q?.texts.none };
  const price = list.reduce((s, [k, n]) => s + unitPrice(game, k, n, nhanh), 0), why = nhanh ? 'mua-nhanh' : 'van-bao';
  const poor = n => ({ ok: false, msg: q.texts.poor.replace('{n}', n.toLocaleString('vi-VN')) });
  if (coins(game.save) < price) return poor(price);
  const add = (paid, got) => {   // trừ, cộng trong máy (theo số máy chủ trả về nếu có)
    addCoins(game, -paid, why);
    game.save.mats ??= {};
    for (const [k, n] of got) game.save.mats[k] = (game.save.mats[k] || 0) + n;
    game.persist();
    game.sfx?.('pickup');
    return { ok: true, msg: (q.texts.bought || q.texts.ok).replace('{n}', paid.toLocaleString('vi-VN')) };
  };
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { ok: false, msg: '' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => (await net()).buyMats(Object.fromEntries(list), nhanh), r => { res = add(r?.tru?.coins ?? price, Object.entries(r?.them || {})); });
      return res || { ok: false, msg: q.texts.fail };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return m.includes('thieu') ? poor(price) : { ok: false, msg: m.includes('khong_ban') ? q.texts.none : q.texts.fail };
      noFn = true;   // máy chủ chưa có hàm: mua ở máy như cũ
    } finally { game.kyBusy = false; }
  }
  return add(price, list);
}
