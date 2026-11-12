// Luyện chế pháp bảo (chủ dự án 12/11/2026 04:07: "toàn bộ mục luyện chế gọn như các mục nâng cấp trang bị, nằm trong Trang bị → mục Pháp bảo,
// không kéo ra màn hình khác"). Bảng nổi cũ đã bỏ; mọi thứ ở src/ui/self-pb-page.js. Hàm này chỉ để chỗ khác gọi mở đúng mục:
// game.openPhapBao(uid?) → bảng Nhân vật, Trang bị → Pháp bảo (có uid thì mở thẳng tấm chi tiết món đó).
export function createPhapBaoPanel(game) {
  game.openPhapBao = uid => { game.pbPick = uid ?? null; game.openSelf?.('do', 'pb'); };
}
