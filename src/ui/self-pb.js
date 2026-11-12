// Hàng pháp bảo dưới thẻ nhân vật (hệ Pháp Bảo Luyện Chế, src/game/phap-bao.js pbOn; chủ dự án 12/11/2026 03:35, 04:07):
// 4 ô là 4 pháp bảo đang mặc (hình, khung màu phẩm, cấp); ô 4 khoá tới Nguyên Anh. Chạm: Trang bị → Pháp bảo, mở đúng món đó.
import { PB, pbOn, pbWorn, pbType, pbGrade, slotOpen, wearN } from '../game/phap-bao.js';
import { pbIcon } from './phap-bao-hud.js';
import { buffCell } from './self-gear.js';
import { el } from './bag-detail.js';

// Vẽ vào row; trả false nếu chưa dùng hệ mới (thẻ vẽ hàng cũ). Hồ sơ người khác (h.cp có số) chỉ xem, không chạm mở.
export function pbRow(game, row, h = {}) {
  if (!pbOn(game) || !game.data['phap-bao']) return false;
  const worn = pbWorn(game), view = h.cp != null;   // h.cp: hồ sơ người khác (src/ui/profile-panel.js), chỉ xem
  for (let i = 0; i < wearN(game); i++) {
    if (!slotOpen(game, i)) { const b = buffCell(game, 'spare', () => {}); b.title = PB(game).ui.locked_slot.replace('{i}', i + 1).replace('{realm}', game.data.realms.names[PB(game).slot4_realm]); row.append(b); continue; }
    const it = worn[i], T = pbType(game, it), b = el('button', 'sv-slot buff');
    b.setAttribute('aria-label', T ? T.name : `Pháp bảo ${i + 1}`);
    if (T) {
      const g = pbGrade(game, it), ic = el('i', 'sv-pbi');
      b.dataset.o = 'pb'; b.style.setProperty('--q', g.color);
      ic.style.backgroundImage = pbIcon(game, T.icon, T.icon_f || 0, 48);
      b.append(el('i', 'sv-bfr'), ic);
      if (it.lv) b.append(el('b', 'sv-plus', '+' + it.lv));
      b.title = `${T.name} · ${g.name}${it.lv ? ' · cấp ' + it.lv : ''}`;
    } else { b.append(el('span', 'spb-empty', String(i + 1))); b.title = `Ô pháp bảo ${i + 1} trống`; }
    if (!view) b.onclick = () => { game.pbPick = it?.uid ?? null; game.openSelf('do', 'pb'); };
    row.append(b);
  }
  return true;
}
