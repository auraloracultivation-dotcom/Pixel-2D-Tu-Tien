// Ô khảm thứ 4 (chủ dự án 03/11/2026 11:09): món có phẩm Tiên hoặc Thượng Cổ (màu trung bình các dòng, src/game/tiers.js quality)
// được thêm 1 lỗ khảm so với bậc gốc. Đã mở thì giữ, tẩy thêm dòng thấp làm tụt phẩm cũng không mất lỗ.
// Máy chủ (migration 20261103030000_p2d_o_kham_4.sql) nhận lỗ thêm khi món có dòng màu Đỏ / Đen. Chỉ mở cho món máy chủ
// đã biết (lần đầu tính lại chỉ số sau khi vào game, và khi tẩy luyện), không mở ngay lúc nhặt món mới kẻo bản lưu bị coi là đồ lạ.
import { quality } from './tiers.js';
import { rarityOf } from './items.js';

const MIN = 5;   // line_tiers: 5 = Đỏ (Tiên), 6 = Đen (Thượng Cổ)

export function openSocket4(data, it) {
  const q = quality(data, it), base = rarityOf(data.items, it.rarity)?.sockets ?? 0;
  if (!q || data.items.line_tiers.list.findIndex(t => t.id === q.id) < MIN) return false;
  it.sockets ??= [];
  if (it.sockets.length >= base + 1) return false;
  while (it.sockets.length < base + 1) it.sockets.push(null);
  return true;
}

// Một lần mỗi lần vào game: mở cho mọi món đủ phẩm trong túi
export function openAllSocket4(game) {
  if (!game.save?.bag || game.sock4Done === game.save) return false;   // mỗi bản lưu (đổi tài khoản) một lần
  game.sock4Done = game.save;
  let n = 0;
  for (const it of game.save.bag) if (openSocket4(game.data, it)) n++;
  return n > 0;
}
