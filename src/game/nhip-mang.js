// Nhịp mạng của vòng game: phần "người khác thấy mình, mình thấy người khác". LUẬT: nhịp này chạy mỗi khung kể cả khi đang mở bảng,
// đọc hội thoại, khựng hình; không đặt sau một lệnh return nào phụ thuộc giao diện (src/game/game.js gọi trước chỗ chặn).
// 20/11/2026 17:12: trước đây mở Túi đồ hay đọc thoại bắt đầu kiếp là ngừng gửi vị trí, người vừa vào tinh cầu không có toạ độ của mình
// nên không vẽ mình và bỏ hết tin kết đan / độ kiếp của mình ("quay video mà lúc người ta đột phá lại không xem được").
// Bài thử tự động tools/hai-may.mjs giữ luật này: máy A mở bảng đứng yên, máy B vào sau vẫn phải thấy A.
import { hoSoCuaToi } from './ho-so-phong.js';

export function nhipMang(game, dt) {
  hoSoCuaToi(game, game.hoSo);   // hồ sơ của mình lúc này: others.js so chữ ký để báo lại, draw-nguoi.js dùng để vẽ mình
  game.others.update(dt);
  const R = game.data.config.realtime;
  if (game.online && (R?.backend === 'cf' || R?.map_send !== false)) game.online.send(game.player, game.player.swingT > 0.15 ? { sw: 1 } : {}, game.others.sendGap(), R?.idle_ms);   // khoảng gửi theo số người cùng kênh (others.js sendGap)
}
