// Phẩm cấp chiêu (chủ dự án 09/11/2026 20:20): chiêu thường Huyền phẩm, Thiểm Ảnh Liên Trảm Địa phẩm, Vô Ảnh Trảm Vực và Phá Thiên
// Tuyệt Trảm Thiên phẩm. Phẩm ghi ở data/skills.json → grade (không ghi: skill_grade.default); tên, màu ở data/config.json → skill_grade
// (cùng màu phẩm đồ: Huyền lam, Địa tím, Thiên vàng cam). Màu tô vòng ngoài nút chiêu (ui/hud.js), viền biểu tượng bảng Chiêu.
export function skillGrade(data, id) {
  const G = data.config.skill_grade, g = data.skills[id]?.grade || G.default;
  return { id: g, ...(G.list[g] || G.list[G.default]) };
}
