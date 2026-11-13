// Bán nhanh, rã nhanh pháp bảo (chủ dự án 13/11/2026 10:37: "pháp bảo cũng là một loại trang bị, nút bán nhanh và rã cũng áp dụng cho
// pháp bảo"; 10:39 chọn: rã ra Đá Khai Khiếu). Chọn theo phẩm như bán nhanh trang bị (src/ui/bag-quick.js). Không đụng món đang mặc
// và món đã nâng cấp (tốn Linh Thạch). Bán: giá pbPrice. Rã: data/phap-bao.json → drop.salvage (số Đá Khai Khiếu mỗi phẩm).
// Máy chủ (p2d_kiem_phap_bao) chặn số Đá Khai Khiếu vượt mức theo tu vi và ghi nghi vấn: rã không cộng quá mức đó (stoneCap), phần dư bỏ.
import { PB, pbState, pbGrade } from './phap-bao.js';
import { pbPrice } from './phap-bao-drop.js';
import { addCoins } from './shop.js';

// Cùng công thức với máy chủ (migration 20261112050000_p2d_mua_2.sql, v_mx)
export function stoneCap(game) {
  const s = game.save, r = Math.min(8, Math.max(0, s.realm | 0)), l = Math.min(9, Math.max(1, s.layer | 0 || 1));
  return r * 9 + l + r * 3 + 12;
}

export function pbQuickList(game, grades) {
  const st = pbState(game), worn = new Set(st.wear.filter(u => u != null));
  return st.items.filter(it => grades.includes(it.grade) && !worn.has(it.uid) && !(it.lv > 0));
}

export const pbSalvageOne = (game, it) => PB(game).drop?.salvage?.[it.grade] || 0;

export function pbQuickGain(game, list) {
  const st = pbState(game), room = Math.max(0, stoneCap(game) - (st.stones || 0)), raw = list.reduce((a, it) => a + pbSalvageOne(game, it), 0);
  return { coins: list.reduce((a, it) => a + pbPrice(game, it), 0), stones: Math.min(raw, room), lost: Math.max(0, raw - room) };
}

// mode 'ban' | 'ra'; trả { n, coins, stones }
export function pbQuickDo(game, grades, mode) {
  const st = pbState(game), list = pbQuickList(game, grades), g = pbQuickGain(game, list), gone = new Set(list.map(it => it.uid));
  if (!list.length) return { n: 0, coins: 0, stones: 0 };
  st.items = st.items.filter(it => !gone.has(it.uid));
  if (mode === 'ban') addCoins(game, g.coins, 'ban-do');
  else st.stones = (st.stones || 0) + g.stones;
  game.refreshStats?.(); game.persist?.();
  return { n: list.length, coins: mode === 'ban' ? g.coins : 0, stones: mode === 'ra' ? g.stones : 0 };
}

export const gradeName = (game, id) => pbGrade(game, { grade: id }).name;
