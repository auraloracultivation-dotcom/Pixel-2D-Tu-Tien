// Bày cảnh, phần chạy cho mọi người chơi (nhẹ): sau khi vào game tải bố cục đồ các bản đồ chủ dự án đã bày (một lần, vài chục KB)
// và thay vào bản đồ. Chỉ tài khoản có quyền bày (máy chủ trả lời) mới tải thêm bảng bày cảnh (src/ui/bay-canh.js).
// Nạp src/net/bay-dao.js lúc cần (nó kéo thư viện máy chủ từ mạng): nạp thẳng lúc khởi động thì mạng chặn thư viện là game không mở được.

// Nhớ bố cục mới nhất trong máy (chủ dự án 09/11/2026 16:55: vào động phủ thấy đồ đổi chỗ giữa chừng): lần sau mở game dùng ngay
// bản nhớ, khỏi chờ mạng rồi mới thay đồ. Bố cục chủ dự án đã bày cũng được ghi vào data/maps (def.hoi.do) mỗi lần cập nhật game.
import { applySpots } from '../game/home-spot.js';

const KEY = 'p2d_bay_cache';

export function applyLayouts(game, all) {
  game.bayVer = game.bayVer || {};
  for (const [id, L] of Object.entries(all || {})) {
    const def = game.data.maps[id];
    if (!def || !Array.isArray(L.items)) continue;
    def.hoi = { ...(def.hoi || {}), do: L.items };
    game.bayVer[id] = L.ver;
    if (game.map?.id === id) { game.map.setHoi(L.items); applySpots(game); }   // Mộc Nhân dời theo bố cục (home-spot.js)
  }
}

export function startBayCanh(game) {
  try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c) applyLayouts(game, c); } catch { /* máy chặn lưu: dùng data/maps */ }
  let done = false;
  const tick = async () => {
    if (done || !game.save || game.save.guest) return;
    done = true;
    let N;
    try { N = await import('../net/bay-dao.js'); } catch { return; }
    const { layoutsAll, canArrange } = N;
    try { const all = await layoutsAll(); applyLayouts(game, all); try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* đầy bộ nhớ */ } } catch { /* không mạng: dùng bố cục có sẵn trong data/maps */ }
    try {
      const ok = await canArrange();
      if (ok === null) { done = false; return; }   // phiên đăng nhập chưa sẵn: thử lại nhịp sau
      if (ok) (await import('./bay-canh.js')).createBayCanh(game);
    } catch { /* không có quyền hoặc lỗi mạng: không hiện nút */ }
  };
  setInterval(tick, 2000);
}
