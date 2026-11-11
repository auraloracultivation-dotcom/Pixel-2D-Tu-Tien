// Hàng pháp bảo dưới thẻ nhân vật cho tài khoản đã sang hệ Pháp Bảo Luyện Chế (src/game/phap-bao.js pbOn; chủ dự án 12/11/2026 03:35:
// ẩn pháp bảo cũ, dùng bộ mới): 3 ô là 3 pháp bảo đang mặc (hình, khung màu phẩm, cấp), ô thứ 4 khoá. Chạm: bảng Luyện chế.
import { pbOn, pbWorn, pbType, pbGrade } from '../game/phap-bao.js';
import { pbIcon } from './phap-bao-hud.js';
import { buffCell } from './self-gear.js';
import { el } from './bag-detail.js';

// Vẽ vào row; trả false nếu tài khoản chưa dùng hệ mới (thẻ vẽ hàng cũ)
export function pbRow(game, row) {
  if (!pbOn(game)) return false;
  for (const it of pbWorn(game)) {
    const T = pbType(game, it), b = el('button', 'sv-slot buff');
    b.setAttribute('aria-label', T ? T.name : 'Pháp bảo');
    if (T) {
      const g = pbGrade(game, it), ic = el('i', 'sv-pbi');
      b.dataset.o = 'pb'; b.style.setProperty('--q', g.color);
      ic.style.backgroundImage = pbIcon(game, T.icon, T.icon_f || 0, 48);
      b.append(el('i', 'sv-bfr'), ic);
      if (it.lv) b.append(el('b', 'sv-plus', '+' + it.lv));
      b.title = `${T.name} · ${g.name}${it.lv ? ' · cấp ' + it.lv : ''}`;
    } else b.title = 'Pháp bảo';
    b.onclick = () => game.openPhapBao?.();
    row.append(b);
  }
  row.append(buffCell(game, 'spare', () => {}));
  return true;
}
