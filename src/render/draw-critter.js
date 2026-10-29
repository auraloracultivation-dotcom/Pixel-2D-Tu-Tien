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
  duck(ctx, x, y, f, t, moving) {
    const b = moving ? Math.abs(Math.sin(t * 10)) : 0;
    R(ctx, '#e8a03a', x - 2, y - 1, 2, 1); R(ctx, '#e8a03a', x + 1, y - 1, 2, 1);
    R(ctx, '#f4f2f8', x - 4, y - 5 - b, 8, 4); R(ctx, '#dcd8e8', x - 3, y - 4 - b, 4, 1);
    R(ctx, '#f4f2f8', x + 2 * f, y - 9 - b, 3 * f, 4); R(ctx, '#2a2238', x + 3 * f, y - 8 - b, 1, 1);
    R(ctx, '#f0a03a', x + 5 * f, y - 7 - b, 2 * f, 1); R(ctx, '#f4f2f8', x - 5 * f, y - 6 - b, 2 * f, 2);
  },
  cat(ctx, x, y, f, t, moving) {
    const b = moving ? Math.abs(Math.sin(t * 11)) : 0, tail = Math.sin(t * 3) > 0 ? 1 : 0;
    R(ctx, '#e8783a', x - 4, y - 5 - b, 8, 4); R(ctx, '#ffc890', x - 2, y - 2 - b, 4, 1);
    R(ctx, '#e8783a', x + 2 * f, y - 9 - b, 4 * f, 4); R(ctx, '#e8783a', x + 2 * f, y - 10 - b, 1 * f, 1); R(ctx, '#e8783a', x + 5 * f, y - 10 - b, 1 * f, 1);
    R(ctx, '#2a2238', x + 4 * f, y - 8 - b, 1, 1); R(ctx, '#ffd84a', x - 6 * f, y - 8 - tail - b, 1 * f, 4);
    R(ctx, '#c85a2a', x - 3, y - 1, 1, 1); R(ctx, '#c85a2a', x + 2, y - 1, 1, 1);
  },
  bird(ctx, x, y, f, t, moving) {
    const hop = moving ? Math.abs(Math.sin(t * 14)) * 2 : 0, wing = moving && Math.sin(t * 30) > 0 ? 1 : 0;
    R(ctx, '#2a2238', x - 1, y - 1, 1, 1); R(ctx, '#2a2238', x + 1, y - 1, 1, 1);
    R(ctx, '#f2c94c', x - 2, y - 5 - hop, 5, 4); R(ctx, '#c8962a', x - 2 * f, y - 5 - hop - wing, 3 * f, 2);
    R(ctx, '#f2c94c', x + 1 * f, y - 7 - hop, 3 * f, 3); R(ctx, '#2a2238', x + 2 * f, y - 6 - hop, 1, 1); R(ctx, '#e8783a', x + 4 * f, y - 6 - hop, 1 * f, 1);
  },
  deer(ctx, x, y, f, t, moving) {
    const s = moving ? Math.sin(t * 9) : 0;
    R(ctx, '#8a5a3a', x - 3 + s, y - 4, 1, 4); R(ctx, '#8a5a3a', x + 2 - s, y - 4, 1, 4);
    R(ctx, '#c88a5a', x - 4, y - 8, 8, 4); R(ctx, '#fff2e0', x - 2, y - 7, 1, 1); R(ctx, '#fff2e0', x + 1, y - 7, 1, 1);
    R(ctx, '#c88a5a', x + 3 * f, y - 12, 3 * f, 4); R(ctx, '#2a2238', x + 5 * f, y - 11, 1, 1);
    R(ctx, '#8ad870', x + 3 * f, y - 15, 1 * f, 3); R(ctx, '#8ad870', x + 5 * f, y - 15, 1 * f, 3); R(ctx, '#ff8a6a', x + 3 * f, y - 16, 1, 1);
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
    const nm = game.save.critters?.[k.id]?.name, p = game.player;   // tên riêng, hiện khi đứng gần
    if (nm && Math.hypot(k.x - p.x, k.y - p.y) < 40) { ctx.font = '6px "Unifont VN", system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1b1830'; ctx.fillText(nm, x, y - 19); }
    if (k.ready) { const g = 0.6 + 0.4 * Math.sin(t * 5 + x); ctx.globalAlpha = g; R(ctx, '#ffd84a', x - 1, y - 22 + Math.sin(t * 3) * 1.5, 3, 3); R(ctx, '#fff6c8', x, y - 21 + Math.sin(t * 3) * 1.5, 1, 1); ctx.globalAlpha = 1; }
  }
}

// Thú hiền trên tinh cầu (src/game/wildlife.js): bóng dưới đất, chim bay thì vẽ cao lên, dụi đầu thì hiện tim
export function drawWild(ctx, game, t) {
  if (!game.wild?.length) return;
  for (const a of game.wild) {
    const x = Math.round(a.x), y = Math.round(a.y), h = Math.round(a.h || 0);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 4 - h / 12, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    KINDS[a.kind]?.(ctx, x, y - h, a.face, t, a.moving || h > 0);
    if (a.heart > 0) { const k = a.heart, hy = y - 16 - (1.6 - k) * 8; ctx.globalAlpha = Math.min(1, k); R(ctx, '#ff6a8a', x - 2, hy, 2, 2); R(ctx, '#ff6a8a', x + 1, hy, 2, 2); R(ctx, '#ff6a8a', x - 2, hy + 1, 5, 2); R(ctx, '#ff6a8a', x - 1, hy + 3, 3, 1); R(ctx, '#ff6a8a', x, hy + 4, 1, 1); ctx.globalAlpha = 1; }
  }
}
