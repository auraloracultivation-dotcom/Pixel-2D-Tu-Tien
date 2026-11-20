// MỘT CỬA GỬI cho mọi thứ "vừa xảy ra" mà người cùng tinh cầu phải thấy: chiêu, đòn pháp bảo, thiên kiếp, kết đan, lên tầng, tụ linh,
// nhặt nguyên liệu bên đường. (Thứ "đang mặc gì, đang ở trạng thái gì" thì đi đường hồ sơ: ho-so-phong.js.)
// Tin đi đường tin chiêu của máy chủ phòng: { k: mã, x, y, fx, fy } (cloud/src/proto.js cleanCast: k chữ, số, gạch, tối đa 48 ký tự;
// fx, fy là hai số -1…1 làm tròn hai chữ số thập phân, mỗi nhóm tin tự quy ước nghĩa). Các nhóm tin khai ở data/dong-bo.json →
// hieu_ung; bên nhận chia tin theo bảng đó (others-nhan.js). Tệp này không nhập tệp nào khác để ai cũng gọi được mà không vòng tròn.
const kep = v => +Math.max(-1, Math.min(1, +v || 0)).toFixed(2);

// k: mã tin; a, b: hai số kèm theo (-1…1); x, y: chỗ xảy ra (mặc định chỗ mình đứng). Chưa vào phòng (chơi một mình) thì thôi.
export function phat(game, k, a = 0, b = 0, x, y) {
  const p = game.player;
  if (!p || !game.online?.cast) return false;
  game.online.cast({ k: String(k).slice(0, 48), x: Math.round(x ?? p.x), y: Math.round(y ?? p.y), fx: kep(a), fy: kep(b) });
  return true;
}
