// Móc cho bài thử tự động (tools/playtest.mjs, bài thử hai máy tools/hai-may.mjs). Bản đưa lên mạng được gói lại (tools/goi.mjs) nên bài
// thử không gọi được từng tệp code theo đường dẫn (import('/src/game/pilot.js')) nữa: những hàm bài thử cần được treo ở window.__thu.
// Chỉ treo khi địa chỉ có ?thu=1 (chế độ chơi thử, src/ui/login.js); không thêm quyền gì: window.__game vốn đã mở cho bài thử đọc.
// Bài thử cần thêm hàm nào thì thêm vào đây, không gọi thẳng tệp code.
import { togglePilot } from './pilot.js';
import { dropLoot, updateLoot } from './loot.js';
import { kiepWave } from './kiep-see.js';
import { phat } from './phat.js';
import { dien, cacHieuUng } from './dien.js';
import { demXem } from './others-nhan.js';
import { hoSoCuaToi, epHoSo } from './ho-so-phong.js';

export function mocThu() {
  const q = new URLSearchParams(location.search);
  if (!q.has('thu')) return;
  window.__thu = { togglePilot, dropLoot, updateLoot, phat, kiepWave, dien, cacHieuUng, demXem, hoSoCuaToi, epHoSo };
  // ?thu=1&phong=<mã>: khách này vào phòng người chơi như người đã đăng nhập, mang mã và tên thử (bài thử hai máy tools/hai-may.mjs dựng
  // phòng giả trong máy bằng đúng mã cloud/src/phong.js). Vé gửi đi là chính mã thử nên máy chủ phòng thật từ chối: không thêm quyền gì.
  const id = q.get('phong');
  if (id && /^[\w-]{1,36}$/.test(id)) { window.__thu.phong = { id, ten: 'Thử ' + id }; window.__game.thuDoc = new Set(); }   // thuDoc: others.js ghi trường hồ sơ nào được đọc tới
}

// Khách đang chạy bài thử hai máy thì trả { id, ten }; người chơi thật luôn là null
export const phongThu = () => window.__thu?.phong || null;
