// Ô mua nguyên liệu nâng cấp ở cuối tấm chi tiết (chủ dự án 11/11/2026 23:27: "xếp ô mua ở dưới cùng để người chơi không bị ấn nhầm,
// tất cả tài nguyên nâng cấp đều có nút mua và mua số lượng"). Mỗi thứ một hàng: tên, đang có, nút − số +, +10, nút Mua kèm giá.
// Số mặc định: phần còn thiếu cho lần nâng kế tiếp, đủ rồi thì 1. Giá: data/market.json → quick (src/game/quick-buy.js).
// Chỉ dùng nút (không ô gõ): tấm chi tiết linh thú, khôi lỗi là bản sao, bấm được chuyển về nút gốc (src/ui/grid-cards.js wire).
import { unitPrice, buyMats } from '../game/quick-buy.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const qty = new Map();   // số đang chọn, theo chỗ + mã (giữ qua các lần vẽ lại)

// need: [[mã, số cần cho lần kế]]; key: chỗ (vd 'mon:12', 'pet:hoa-lang'); redraw(): vẽ lại sau −/+; done(msg): sau khi mua
// cls: lớp thêm cho khối (vd 'skill-up' để tấm chi tiết linh thú gom vào)
export function buyBlock(game, need, key, redraw, done, cls = '') {
  const { data } = game, mats = game.save.mats || {}, T = data.market.quick.texts;
  const rows = need.filter(([k]) => unitPrice(game, k) != null);
  if (!rows.length) return null;
  const box = el('div', `bm-box ${cls}`.trim());
  box.append(el('div', 'bm-head', T.head || 'Mua nguyên liệu'));
  for (const [k, n0] of rows) {
    const have = mats[k] || 0, id = `${key}|${k}`;
    if (!qty.has(id)) qty.set(id, Math.max(1, Math.min(999, (n0 || 0) - have)));
    const n = qty.get(id), set = v => { qty.set(id, Math.max(1, Math.min(999, v))); redraw(); };
    const row = el('div', 'bm-row'), nm = el('span', 'bm-nm');
    nm.append(el('b', null, data.cave.materials[k]?.name || data.items.materials?.[k]?.name || k), el('small', null, (T.have || 'có {n}').replace('{n}', have.toLocaleString('vi-VN'))));
    const minus = el('button', 'bm-b bm-step', '−'), num = el('span', 'bm-n', `×${n}`), plus = el('button', 'bm-b bm-step', '+'), ten = el('button', 'bm-b bm-step', '+10');
    const buy = el('button', 'bm-b bm-buy', (T.buy || 'Mua · {n}').replace('{n}', unitPrice(game, k, n).toLocaleString('vi-VN')));
    for (const b of [minus, plus, ten, buy]) b.type = 'button';
    minus.disabled = n <= 1;
    minus.onclick = e => { e?.stopPropagation(); set(n - 1); };
    plus.onclick = e => { e?.stopPropagation(); set(n + 1); };
    ten.onclick = e => { e?.stopPropagation(); set(n === 1 ? 10 : n + 10); };
    buy.onclick = async e => {   // máy chủ mua (src/game/quick-buy.js): tắt nút tới khi có kết quả
      e?.stopPropagation(); if (buy.disabled) return; buy.disabled = true;
      const r = await buyMats(game, { [k]: n });
      if (r.ok) qty.delete(id);
      done(r.msg);
    };
    row.append(nm, minus, num, plus, ten, buy);
    box.append(row);
  }
  return box;
}
