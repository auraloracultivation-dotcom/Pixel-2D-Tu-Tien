// Linh cầm trong động phủ (data/critters.json), vẽ bằng khối pixel theo kiểu (kind). Có quà chờ nhặt thì hiện đốm vàng lấp lánh.
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

const KINDS = {
  chicken(ctx, x, y, f, t, moving) {
    const b = moving ? Math.abs(Math.sin(t * 12)) : 0;
    R(ctx, '#e8a03a', x - 2, y - 1, 1, 2); R(ctx, '#e8a03a', x + 1, y - 1, 1, 2);
    R(ctx, '#f2c94c', x - 4, y - 6 - b, 7, 5); R(ctx, '#ffe08a', x - 3, y - 5 - b, 4, 2);
    R(ctx, '#f2c94c', x + 1 * f, y - 9 - b, 3 * f, 3); R(ctx, '#d83a3a', x + 2 * f, y - 10 - b, 1 * f, 1);
    R(ctx, '#e8a03a', x + 4 * f, y - 8 - b, 1 * f, 1); R(ctx, '#2a2238', x + 3 * f, y - 8 - b, 1, 1);
    R(ctx, '#c8822a', x - 4 * f, y - 7 - b, 2 * f, 2);
  },
  rabbit(ctx, x, y, f, t, moving) {
    const b = moving ? Math.abs(Math.sin(t * 9)) * 2 : 0;
    R(ctx, '#f4f2f8', x - 4, y - 5 - b, 7, 5); R(ctx, '#f4f2f8', x + 1 * f, y - 8 - b, 3 * f, 4);
    R(ctx, '#f4f2f8', x + 1 * f, y - 12 - b, 1 * f, 4); R(ctx, '#f4f2f8', x + 3 * f, y - 12 - b, 1 * f, 4);
    R(ctx, '#ffb0c8', x + 1 * f, y - 11 - b, 1 * f, 2); R(ctx, '#2a2238', x + 3 * f, y - 7 - b, 1, 1);
    R(ctx, '#ffffff', x - 5 * f, y - 4 - b, 2 * f, 2); R(ctx, '#d8d4e4', x - 3, y - 1 - b, 5, 1);
  },
  crane(ctx, x, y, f, t, moving) {
    const s = moving ? Math.sin(t * 8) : 0;
    R(ctx, '#2a2238', x - 1 + s, y - 5, 1, 5); R(ctx, '#2a2238', x + 1 - s, y - 5, 1, 5);
    R(ctx, '#f4f2f8', x - 4, y - 10, 8, 5); R(ctx, '#2a2238', x - 4 * f, y - 9, 2 * f, 3);
    R(ctx, '#f4f2f8', x + 3 * f, y - 15, 1 * f, 6); R(ctx, '#f4f2f8', x + 3 * f, y - 16, 3 * f, 2);
    R(ctx, '#d83a3a', x + 4 * f, y - 17, 1 * f, 1); R(ctx, '#e8a03a', x + 6 * f, y - 15, 2 * f, 1);
  },
};

export function drawCritters(ctx, game, t) {
  if (!game.critters) return;
  for (const k of [...game.critters].sort((a, b) => a.y - b.y)) {
    const d = game.data.critters.list[k.id], x = Math.round(k.x), y = Math.round(k.y);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    KINDS[d.kind]?.(ctx, x, y, k.face, t, !k.wait || k.wait <= 0);
    if (k.ready) { const g = 0.6 + 0.4 * Math.sin(t * 5 + x); ctx.globalAlpha = g; R(ctx, '#ffd84a', x - 1, y - 22 + Math.sin(t * 3) * 1.5, 3, 3); R(ctx, '#fff6c8', x, y - 21 + Math.sin(t * 3) * 1.5, 1, 1); ctx.globalAlpha = 1; }
  }
}
