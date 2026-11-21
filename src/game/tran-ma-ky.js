// Trấn Ma Kỷ: truyện của game KHÔNG nằm trong một cuốn sổ riêng. Nó là chuỗi nhiệm vụ chính 1 → N (data/story.json, src/game/story.js; thẻ nhiệm vụ
// src/ui/nv-hud.js): mỗi nhiệm vụ là một việc làm trong thế giới và chỉ mang một ý của truyện. Chủ dự án 21/11/2026 08:46–08:51: "tôi muốn sự kết hợp hài hoà,
// không phải phân theo từng chương, nhưng có thể phân theo nhiệm vụ từ 1 đến N… từ từ hoà vào game, nhẹ nhàng, truyền đạt một cách rõ ràng".
// Tệp này chỉ giữ ba thứ nhỏ đi kèm chuỗi nhiệm vụ (chữ và số ở data/tran-ma-ky.json):
//   canhGioiY  câu nghĩa của một cảnh giới, hiện ở lễ đột phá (src/game/len-tang.js)
//   khauQuyet  khẩu quyết của một loại pháp bảo, hiện thành hàng chữ lớn bên trái màn lúc thi triển (src/ui/chu-lon.js; gọi từ src/game/tu-linh.js)
//   dấu truyện việc đã làm để lại một dấu nhỏ trên bản đồ của riêng người chơi (ngọn nến trên bàn lễ…): data/story.json → dau, vẽ ở src/game/dau-truyen.js
// Tắt hai thứ đầu: data/tran-ma-ky.json → on: false (chuỗi nhiệm vụ và dấu truyện vẫn chạy).
const D = game => game.data['tran-ma-ky'];
export const tmkOn = game => !!D(game)?.on;

export const canhGioiY = (game, realm) => (tmkOn(game) && D(game).canh_gioi?.[realm]) || '';

// → { cau: ['dòng'…], lenh: 'Trảm', han: '斬', mau } hoặc null
export function khauQuyet(game, type) {
  const q = tmkOn(game) && D(game).kq?.[type];
  return q ? { cau: [].concat(q.cau), lenh: D(game).chu?.lenh_on === false ? null : q.lenh, han: q.han, mau: game.data['phap-bao'].types[type]?.color } : null;
}
