// Đợt đổi mới 16/11/2026 (chủ dự án 21:57): Ngọc bội thành Pháp tượng, 4 thú cưỡi cũ bỏ thay 16 thú mới (đổi bằng Thú Lệnh), thời trang và
// nhân vật cũ bỏ thay 16 trang phục mới. Bản lưu trên máy chủ do migration 20261116230000_p2d_doi_moi_trang_bi.sql đổi (ký lại món, đền bù
// 4 thú mới ngẫu nhiên cho ai từng có thú cưỡi hoặc thời trang cũ, ghi danh sách vào denBu16). Ở đây đổi bản lưu trong máy (chơi thử, chưa
// lưu máy chủ) cho khỏi lỗi, và báo một lần các thú đền bù.
export function doiMoi(game) {
  const s = game.save, D = game.data, map = D.items.doi_ten || {};
  for (const it of s.bag || []) if (it && map[it.base] && typeof map[it.base] === 'string') it.base = map[it.base];
  for (const k of Object.keys(s.mounts || {})) if (!D.pets.mounts[k]) delete s.mounts[k];
  for (const k of Object.keys(s.mountLine || {})) if (!D.pets.mounts[k]) delete s.mountLine[k];
  if (s.mount && !D.pets.mounts[s.mount]) { s.mount = Object.keys(s.mounts || {})[0] || null; s.ride = false; }
  if (Array.isArray(s.denBu16) && s.denBu16.length) {
    const names = s.denBu16.map(id => D.pets.mounts[id]?.name).filter(Boolean).join(', ');
    setTimeout(() => game.toast(`Đền bù đồ cũ: nhận ${s.denBu16.length} thú cưỡi mới (${names}). Bấm nút Cưỡi để lên thú.`, 6), 2500);
    delete s.denBu16; game.persist?.();
  }
}
