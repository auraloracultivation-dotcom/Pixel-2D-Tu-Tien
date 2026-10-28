// Máy quay theo người chơi. Đang mở bảng (bảng chỉ chiếm nửa dưới màn hình, chủ dự án chốt 28/10/2026) thì đẩy khung nhìn
// xuống để người chơi đứng giữa nửa trên, vẫn thấy mình sau bảng. Ngắm cảnh thì dời theo viewPan (src/game/scenic.js).
import { viewPan } from './scenic.js';

export function camFollow(game, screen, dt) {
  const ui = game.uiOpen ? screen.h / screen.zoom / 4 : 0;
  screen.follow(game.player.x, game.player.y - 4 + viewPan(game) + ui, dt, game.map);
}
