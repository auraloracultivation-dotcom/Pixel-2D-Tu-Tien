// Móc cho bài thử tự động (tools/playtest.mjs, bài thử hai máy tools/hai-may.mjs). Bản đưa lên mạng được gói lại (tools/goi.mjs) nên bài
// thử không gọi được từng tệp code theo đường dẫn (import('/src/game/pilot.js')) nữa: những hàm bài thử cần được treo ở window.__thu.
// Chỉ treo khi địa chỉ có ?thu=1 (chế độ chơi thử, src/ui/login.js); không thêm quyền gì: window.__game vốn đã mở cho bài thử đọc.
// Bài thử cần thêm hàm nào thì thêm vào đây, không gọi thẳng tệp code.
import { togglePilot } from './pilot.js';
import { dropLoot, updateLoot } from './loot.js';
import { kiepSend, kiepWave } from './kiep-see.js';

export function mocThu() {
  if (!new URLSearchParams(location.search).has('thu')) return;
  window.__thu = { togglePilot, dropLoot, updateLoot, kiepSend, kiepWave };
}
