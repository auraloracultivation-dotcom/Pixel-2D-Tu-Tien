// Chữ chỉ số món đồ theo luật chiến đấu đang bật (data/he-chien.json on, 16/11/2026): dòng tẩy luyện, ngọc khảm hiện đúng số tính
// trong trận (dòng theo màu, ngọc mỗi cấp +0,5%); luật cũ thì như statText. Dòng không tính vào trận (tốc chạy, linh khí) giữ chữ cũ.
import { statText, gemInfo } from '../game/items.js';
import { hcLineText, hcGemText } from '../game/he-chien.js';

const on = data => (data?.['he-chien']?.on ? data['he-chien'] : null);
export const lineText = (data, l) => (on(data) && hcLineText(on(data), l)) || statText(data, l.s, l.v);
export function gemText(data, g) {
  const H = on(data), t = H && hcGemText(H, g);
  if (t) return t;
  const gi = gemInfo(data, g);
  return statText(data, gi.stat, gi.value);
}
