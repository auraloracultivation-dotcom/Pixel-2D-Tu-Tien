// Vũ khí cầm tay theo hình (weapons.*.look): gậy, kiếm, thương, liềm, quạt, đàn, cung.
const INK = '#1b1830';

export function drawWeapon(ctx, p, w) {
  const a = Math.atan2(p.face.y, p.face.x), cx = p.x, cy = p.y - 5;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.strokeStyle = w.color; ctx.fillStyle = w.color; ctx.lineWidth = 1.6;
  switch (w.look) {
    case 'spear':
      ctx.strokeStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.fillStyle = w.color; ctx.beginPath(); ctx.moveTo(13, -2); ctx.lineTo(18, 0); ctx.lineTo(13, 2); ctx.fill();
      ctx.fillStyle = '#c0283a'; ctx.fillRect(11, -1.5, 1.5, 3);
      break;
    case 'scythe':
      ctx.strokeStyle = '#4a3060'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(14, 0); ctx.stroke();
      ctx.fillStyle = w.color; ctx.beginPath(); ctx.arc(10, 6, 7, -1.75, -0.35); ctx.arc(11, 7.5, 5.5, -0.4, -1.7, true); ctx.fill();
      ctx.fillStyle = '#f2c94c'; ctx.fillRect(12.5, -1, 2, 2);
      break;
    case 'fan':
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(3, 0); ctx.arc(3, 0, 8.5, -0.8, 0.8); ctx.fill();
      ctx.fillStyle = w.color; ctx.beginPath(); ctx.moveTo(3, 0); ctx.arc(3, 0, 7.5, -0.7, 0.7); ctx.fill();
      break;
    case 'zither':
      ctx.fillStyle = INK; ctx.fillRect(3, -3.5, 11, 7);
      ctx.fillStyle = '#a0603a'; ctx.fillRect(3.5, -3, 10, 6);
      ctx.strokeStyle = w.color; ctx.lineWidth = 0.5;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(4, i); ctx.lineTo(13, i); ctx.stroke(); }
      break;
    case 'bow':
      ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(2, 0, 8, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(2 + Math.cos(-1.2) * 8, Math.sin(-1.2) * 8); ctx.lineTo(2 + Math.cos(1.2) * 8, Math.sin(1.2) * 8); ctx.stroke();
      break;
    default:   // kiếm, gậy
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(11, 0); ctx.stroke();
      if (w.look === 'sword') { ctx.fillStyle = '#f2c94c'; ctx.fillRect(3.5, -1.5, 1.2, 3); }
  }
  ctx.restore();
}
