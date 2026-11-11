// Tùy chọn tự hành (data/config.json → pilot.opts): người chơi bật tắt từng việc ở Menu → Tự động. Mặc định bật, trừ việc khai "def": false.
export const pilotOpt = (game, id) => {   // chưa chọn thì theo mặc định: bật, trừ việc khai "def": false (vd tự hồi sinh tại chỗ)
  const v = game.save?.pilotOpt?.[id];
  return v === undefined ? game.data?.config?.pilot?.opts?.find(o => o.id === id)?.def !== false : v !== false;
};
// Loài quái tự hành đang tạm tránh (vừa hạ mình, pilot.js → pilotDied)
export const avoided = (game, id) => (game.pilot?.avoid?.[id] || 0) > Date.now();
export function togglePilotOpt(game, id) {
  (game.save.pilotOpt ??= {})[id] = !pilotOpt(game, id);
  game.persist();
}
