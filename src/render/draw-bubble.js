// Bong bóng lời nói nhỏ trên đầu NPC và bạn đi cùng (chatter.js): khung trắng bo góc, đuôi nhọn chỉ xuống, hiện dần rồi mờ đi.
const INK = '#1b1830';

export function drawBubbles(ctx, game) {
  const sec = game.data.chatter.sec;
  ctx.font = 'bold 6px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const n of [...game.npcs, game.comp]) {
    const b = n?.bubble;
    if (!b) continue;
    const a = Math.min(1, b.t * 5, (sec - b.t) * 3), w = ctx.measureText(b.text).width + 8, h = 10;
    const x = n.x - w / 2, y = n.y - 34 - (1 - Math.min(1, b.t * 5)) * 2;
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(n.x - 2.5, y + h - 0.5); ctx.lineTo(n.x, y + h + 3.5); ctx.lineTo(n.x + 2.5, y + h - 0.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(n.x - 2.5, y + h); ctx.lineTo(n.x, y + h + 3.5); ctx.lineTo(n.x + 2.5, y + h); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(b.text, n.x, y + h / 2 + 0.5);
  }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}
