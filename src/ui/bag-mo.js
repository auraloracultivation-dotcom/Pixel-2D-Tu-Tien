// Ô khoá cuối lưới túi đồ: chạm để mở thêm 1 ô bằng Linh Thạch (chủ dự án 20/11/2026 00:43: ô 41 giá 10 000, mỗi ô sau × 2, tối đa 80).
// Chữ, giá ở data/items.json → bag_extra; máy chủ p2d_mo_tui kiểm và trừ (src/net/tui.js), máy này chép lại tuiMo và Linh Thạch.
import { bagNextPrice } from '../game/items.js';
import { coins, addCoins } from '../game/shop.js';

const vn = n => Math.round(n).toLocaleString('vi-VN');
const fill = (s, o) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

export function moTile(game, refresh) {
  const { data, save } = game, E = data.items.bag_extra;
  if (!E || (save.tuiMo || 0) >= E.max || !game.cloud) return null;
  const gia = bagNextPrice(data, save), b = document.createElement('button');
  b.type = 'button'; b.className = 'sv-empty sv-mo'; b.title = fill(E.ask, { n: data.items.bag_size + (save.tuiMo || 0) + 1, max: data.items.bag_size + E.max, gia: vn(gia) });
  const plus = document.createElement('b'); plus.textContent = '+';
  const cost = document.createElement('small'); cost.textContent = vn(gia);
  b.append(plus, cost);
  // chạm lần đầu: hỏi (đổi chữ thành "Mở?"), chạm lại trong 4 giây mới mở; bảng hỏi riêng có thể nằm dưới bảng Nhân vật nên hỏi ngay trên ô
  let armed = 0;
  b.onclick = async ev => {
    ev.stopPropagation();
    if (performance.now() - armed > 4000) {
      if (coins(save) < gia) { game.toast(fill(E.poor, { gia: vn(gia) }), 2.2); return; }
      armed = performance.now(); plus.textContent = E.ok + '?'; b.classList.add('on'); game.toast(b.title, 3.5); return;
    }
    armed = 0;
    if (await moTui(game)) refresh(); else { plus.textContent = '+'; b.classList.remove('on'); }
  };
  return b;
}

async function moTui(game) {
  const { data, save } = game, E = data.items.bag_extra, gia = bagNextPrice(data, save);
  if (coins(save) < gia) { game.toast(fill(E.poor, { gia: vn(gia) }), 2.2); return false; }
  try {
    const { moTui: call } = await import('../net/tui.js');
    await game.cloud.run(() => call(), r => { addCoins(game, -r.gia, 'mo-tui'); save.tuiMo = r.tui_mo; game.persist(); });
    game.sfx?.('pickup'); game.toast(fill(E.done, { n: data.items.bag_size + (save.tuiMo || 0) }), 2.2);
    return true;
  } catch (e) {
    const m = String(e?.message || '');
    game.toast(m.includes('thieu_lt') ? fill(E.poor, { gia: vn(gia) }) : m.includes('tui_toi_da') ? fill(E.full, { n: data.items.bag_size + E.max }) : 'Chưa mở được ô, thử lại sau.', 2.4);
    return false;
  }
}
