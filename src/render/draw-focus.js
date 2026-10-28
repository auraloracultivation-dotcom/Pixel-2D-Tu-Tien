// Làm rõ trọng tâm khi máy quay xa (chủ dự án xin 29/10/2026: "vừa nhìn rõ, không nhoè, không rối, nhiều chi tiết quá thì không thấy
// trọng tâm"; theo Dungeon Chibi Style Guide: nền tối và nhạt màu, độ sáng dành cho người chơi, quái, đồ rơi, hiệu ứng).
// Vẽ ngay sau đất, cây, đá, đồ trang trí, thú nhỏ (trước đồ nhiệm vụ, quái, người, đồ rơi, hiệu ứng): giảm độ đậm màu và tối đi
// chút bằng chế độ trộn, nên nền lùi lại còn thứ quan trọng giữ nguyên màu. Số ở data/config.json → focus.
// textQ: hệ số phóng chữ vẽ trong thế giới (danh hiệu, tên, lời thoại) để máy quay xa vẫn đọc được (tối thiểu text_min_px điểm màn).

export function drawFocus(ctx, game, view) {
  const F = game.data.config.focus;
  if (!F) return;
  const w = view.x1 - view.x0, h = view.y1 - view.y0;
  ctx.save();
  if (F.desat > 0) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = F.desat; ctx.fillStyle = '#808080'; ctx.fillRect(view.x0, view.y0, w, h); }
  if (F.dim) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1; ctx.fillStyle = F.dim; ctx.fillRect(view.x0, view.y0, w, h); }
  ctx.restore();
}

export const textQ = (game, px) => Math.max(1, (game.data.config.focus?.text_min_px || 9) / (px * (game.screen?.zoom || 1)));
