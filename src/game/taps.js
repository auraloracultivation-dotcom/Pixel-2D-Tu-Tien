// Chạm lên bản đồ (game.input.taps): chạm NPC, quái, người chơi khác thì hiện tên (game.peek, vẽ ở render/draw.js);
// chạm người chơi khác (thân hoặc tên trên đầu) thì mở thẻ Trò chuyện / Xem thông tin / Kết bạn (src/ui/other-menu.js, chủ dự án 19/11/2026 10:21).
export function updateTaps(game, dt) {
  const cfg = game.data.config;
  for (const tap of game.input.taps) {
    const w = game.screen.toWorld(tap.x, tap.y);
    let best = null, bd = cfg.tap_range;
    const O = game.others.visible();
    for (const e of [...game.npcs, ...game.mobs, ...O]) {
      const d = Math.min(Math.hypot(e.x - w.x, e.y - 4 - w.y), O.includes(e) ? Math.hypot(e.x - w.x, e.y - (e.top || 24) - (e.lift || 0) - 6 - w.y) : 1e9);
      if (d < bd) { bd = d; best = e; }
    }
    if (best && O.includes(best)) game.tapOther?.(best);   // người chơi khác: tên đã hiện sẵn trên đầu, không vẽ thêm tên trắng (chủ dự án 11:06)
    else { if (best) game.peek = { e: best, t: 3 }; game.closeOtherMenu?.(); }
  }
  game.input.taps.length = 0;
  if (game.peek && (game.peek.t -= dt) <= 0) game.peek = null;
}
