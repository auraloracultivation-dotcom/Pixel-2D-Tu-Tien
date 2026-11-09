// Máy quay theo người chơi. Đang mở bảng (bảng chỉ chiếm nửa dưới màn hình, chủ dự án chốt 28/10/2026) thì đẩy khung nhìn
// xuống để người chơi đứng giữa nửa trên, vẫn thấy mình sau bảng. Ngắm cảnh thì dời theo viewPan (src/game/scenic.js).

export function camFollow(game, screen, dt) {
  if (game.bay?.on && game.bay.cam) { screen.follow(game.bay.cam.x, game.bay.cam.y, dt * 4, game.map); return; }   // bày cảnh: máy quay trôi theo tay kéo, người chơi đứng yên (src/ui/bay-canh.js)
  const ui = game.uiOpen ? screen.h / screen.zoom / 4 : 0;
  screen.follow(game.player.x, game.player.y - 4 + ui, dt, game.map);
}
