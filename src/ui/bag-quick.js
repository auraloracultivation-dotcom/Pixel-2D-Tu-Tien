// Bán nhanh trong Túi đồ (tab Trang bị): bấm "Bán nhanh" mở hàng chọn phẩm chất, thấy trước số món và Linh Thạch nhận, bấm bán là xong.
// Luật chọn món ở src/game/shop.js quickList (không bán đồ đang mặc, Đạo Vận, đồ đã cường hoá).
import { quickList, quickSell, sellPrice } from '../game/shop.js';
import { rarityOf } from '../game/items.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// st: trạng thái túi (st.quick = { open, pick: [phẩm chất] }); changed: lưu và vẽ lại túi
export function renderQuick(game, box, st, changed) {
  const { data } = game, q = (st.quick ??= { open: false, pick: [...data.shop.quick.pick] });
  const wrap = el('div', 'quick-sell');
  const toggle = el('button', 'mini' + (q.open ? ' on' : ''), q.open ? 'Đóng bán nhanh' : 'Bán nhanh');
  toggle.onclick = () => { q.open = !q.open; changed(false); };
  wrap.append(toggle);
  if (!q.open) { box.append(wrap); return; }
  const chips = el('div', 'quick-chips');
  for (const r of data.items.rarities) {
    const on = q.pick.includes(r.id), c = el('button', 'mini quick-chip' + (on ? ' on' : ''), r.name);
    c.style.borderColor = r.color;
    c.onclick = () => { q.pick = on ? q.pick.filter(x => x !== r.id) : [...q.pick, r.id]; changed(false); };
    chips.append(c);
  }
  const list = quickList(game, q.pick), coins = list.reduce((a, it) => a + sellPrice(game, it), 0);
  const go = el('button', 'act-btn', list.length ? `Bán ${list.length} món (+${coins.toLocaleString('vi-VN')} ${data.shop.name})` : 'Không có món nào để bán');
  go.disabled = !list.length;
  go.onclick = () => {
    const r = quickSell(game, q.pick);
    if (r.n) { game.sfx('pickup'); game.toast?.(`Đã bán ${r.n} món, nhận ${r.coins.toLocaleString('vi-VN')} ${data.shop.name}`); }
    st.sel = null; changed(true);
  };
  const names = q.pick.map(id => rarityOf(data.items, id)?.name).filter(Boolean).join(', ');
  wrap.append(chips, el('div', 'muted tiny', `Bán hết đồ ${names || '(chưa chọn phẩm chất)'} trong túi. Không bán đồ đang mặc, đồ Đạo Vận, đồ đã cường hoá.`), go);
  box.append(wrap);
}
