// Làm rõ trọng tâm khi máy quay xa (chủ dự án xin 29/10/2026: "vừa nhìn rõ, không nhoè, không rối, nhiều chi tiết quá thì không thấy
// trọng tâm"; theo Dungeon Chibi Style Guide: nền tối và nhạt màu, độ sáng dành cho người chơi, quái, đồ rơi, hiệu ứng).
// Vẽ ngay sau đất, cây, đá, đồ trang trí, thú nhỏ (trước đồ nhiệm vụ, quái, người, đồ rơi, hiệu ứng): phủ một lớp màu xám tím mỏng
// (pha veil phần trăm về màu đó: vừa nhạt màu vừa tối đi chút), nên nền lùi lại còn thứ quan trọng giữ nguyên màu. Dùng phủ thường
// thay chế độ trộn saturation / multiply vì hai chế độ đó tốn thêm khoảng 20% khung hình trên máy yếu. Số ở data/config.json → focus.
// textQ: hệ số phóng chữ vẽ trong thế giới (danh hiệu, tên, lời thoại) để máy quay xa vẫn đọc được (tối thiểu text_min_px điểm màn).

export function drawFocus(ctx, game, view) {
  const F = game.data.config.focus;
  if (!F) return;
  const w = view.x1 - view.x0, h = view.y1 - view.y0;
  if (!(F.veil > 0)) return;
  ctx.save();
  ctx.globalAlpha = F.veil; ctx.fillStyle = F.color; ctx.fillRect(view.x0, view.y0, w, h);
  ctx.restore();
}

export const textQ = (game, px) => Math.max(1, (game.data.config.focus?.text_min_px || 9) / (px * (game.screen?.zoom || 1)));
