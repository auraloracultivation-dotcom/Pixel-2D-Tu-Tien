// Báo lỗi và Đề xuất (chủ dự án xin 29/10/2026). Từ 11/11/2026 23:12 nằm trong Hệ Thống, mục Góp ý (src/ui/he-thong-gop.js:
// "tích hợp nó với hệ thống"). Ở đây chỉ còn hai nút ẩn #btn-fb-loi, #btn-fb-de_xuat (cất trong #hud-menu) cho các chỗ cũ bấm hộ:
// thông báo (notice-panel.js), thư trả lời góp ý (inbox-panel.js). Bấm là mở Hệ Thống ở mục Góp ý đúng loại.
// Chữ ở data/community.json → feedback.
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createFeedback(game) {
  const F = game.data.community?.feedback;
  if (!F?.on) return;
  let after = document.getElementById('btn-zalo') || document.getElementById('btn-rec') || document.getElementById('btn-mute');
  for (const [id, K] of Object.entries(F.kinds)) {
    const btn = el('button', 'fb-btn', K.btn);
    btn.id = `btn-fb-${id}`; btn.title = K.label; btn.setAttribute('aria-label', K.label);
    after?.after(btn); after = btn;
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => { e.stopPropagation(); game.openGopY?.(id); });
  }
}
