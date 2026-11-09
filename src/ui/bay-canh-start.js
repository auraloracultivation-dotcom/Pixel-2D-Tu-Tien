// Bày cảnh, phần chạy cho mọi người chơi (nhẹ): sau khi vào game tải bố cục đồ các bản đồ chủ dự án đã bày (một lần, vài chục KB)
// và thay vào bản đồ. Chỉ tài khoản có quyền bày (máy chủ trả lời) mới tải thêm bảng bày cảnh (src/ui/bay-canh.js).
import { layoutsAll, canArrange } from '../net/bay-dao.js';

export function applyLayouts(game, all) {
  game.bayVer = game.bayVer || {};
  for (const [id, L] of Object.entries(all || {})) {
    const def = game.data.maps[id];
    if (!def || !Array.isArray(L.items)) continue;
    def.hoi = { ...(def.hoi || {}), do: L.items };
    game.bayVer[id] = L.ver;
    if (game.map?.id === id) game.map.setHoi(L.items);
  }
}

export function startBayCanh(game) {
  let done = false;
  const tick = async () => {
    if (done || !game.save || game.save.guest) return;
    done = true;
    try { applyLayouts(game, await layoutsAll()); } catch { /* không mạng: dùng bố cục có sẵn trong data/maps */ }
    try {
      if (await canArrange()) (await import('./bay-canh.js')).createBayCanh(game);
    } catch { /* không có quyền hoặc lỗi mạng: không hiện nút */ }
  };
  setInterval(tick, 2000);
}
