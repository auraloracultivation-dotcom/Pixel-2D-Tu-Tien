// Tùy chọn tự hành (data/config.json → pilot.opts): người chơi bật tắt từng việc ở bảng Việc → tab Tự hành. Mặc định bật hết.
export const pilotOpt = (game, id) => game.save?.pilotOpt?.[id] !== false;
export function togglePilotOpt(game, id) {
  (game.save.pilotOpt ??= {})[id] = !pilotOpt(game, id);
  game.persist();
}
