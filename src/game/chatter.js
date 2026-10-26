// Lời nói nhỏ (data/chatter.json): thỉnh thoảng một NPC gần người chơi nói một câu ngắn, hiện bong bóng trên đầu.
// Cho thế giới có hơi người, không cần bấm nói chuyện.
const C = game => game.data.chatter;
const pick = a => a[Math.floor(Math.random() * a.length)];

export function updateChatter(game, dt) {
  const c = C(game), p = game.player;
  for (const n of game.npcs) if (n.bubble && (n.bubble.t += dt) >= c.sec) n.bubble = null;
  if (game.dialog.open || (game.chatT = (game.chatT ?? c.every[0]) - dt) > 0) return;
  game.chatT = c.every[0] + Math.random() * (c.every[1] - c.every[0]);
  const near = game.npcs.filter(n => c.lines[n.id] && !n.bubble && n.id !== game.chatLast && Math.hypot(n.x - p.x, n.y - p.y) < c.range);
  if (!near.length) return;
  const n = pick(near);
  n.bubble = { text: pick(c.lines[n.id]), t: 0 };
  game.chatLast = n.id;
}
