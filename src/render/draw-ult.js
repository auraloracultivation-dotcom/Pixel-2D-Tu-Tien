// Chiêu lớn vẽ mượt kiểu anime (docs/02: chiêu lớn mượt, đòn nhỏ pixel). data/skills.json: ult = dragon | phoenix | spear.
// dragon: đạn kéo thân rồng uốn theo đường bay. phoenix, spear: hiệu ứng addFx type 'ult' dọc đường lướt.

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Rồng: thân là chuỗi điểm đạn đã đi qua, to dần về đầu, lõi trắng, vảy sáng nhấp nháy
export function drawDragon(ctx, b, t) {
  const path = (b.path ||= []);
  path.push({ x: b.x, y: b.y });
  if (path.length > 16) path.shift();
  if (path.length < 3) return;
  const wob = (p, i) => {   // uốn lượn ngang hướng bay
    const a = Math.atan2(b.vy, b.vx) + Math.PI / 2, w = Math.sin(t * 14 - i * 0.7) * (path.length - i) * 0.25;
    return { x: p.x + Math.cos(a) * w, y: p.y + Math.sin(a) * w };
  };
  const pts = path.map((p, i) => wob(p, path.length - 1 - i));
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, col, op] of [[b.r * 2.2, rgba(b.color, 0.25), 'lighter'], [b.r * 1.3, rgba(b.color, 0.9), 'source-over'], [b.r * 0.5, 'rgba(255,255,255,0.9)', 'source-over']]) {
    ctx.globalCompositeOperation = op;   // chỉ quầng ngoài cộng sáng, thân giữ màu chiêu
    for (let i = 1; i < pts.length; i++) {   // nét to dần về đầu
      ctx.strokeStyle = col; ctx.lineWidth = w * (0.25 + 0.75 * i / pts.length);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  }
  const h = pts[pts.length - 1], a = Math.atan2(b.vy, b.vx);
  ctx.translate(h.x, h.y); ctx.rotate(a);
  ctx.fillStyle = rgba(b.color, 0.9);
  ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.3, b.r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;   // sừng, râu
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-b.r * 0.3, s * b.r * 0.6); ctx.quadraticCurveTo(-b.r * 1.4, s * b.r * 1.6, -b.r * 2, s * b.r * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.r * 1.1, s * b.r * 0.3); ctx.quadraticCurveTo(b.r * 0.4, s * b.r * (1.6 + Math.sin(t * 9) * 0.4), -b.r * 0.8, s * b.r * 2); ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(b.r * 0.5, -b.r * 0.35, 1, 0, Math.PI * 2); ctx.arc(b.r * 0.5, b.r * 0.35, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Phượng hoàng: chim lửa ở cuối đường lướt, hai cánh vỗ một nhịp, lông vũ rơi dọc đường
function phoenix(ctx, f, k) {
  const a = Math.atan2(f.y2 - f.y, f.x2 - f.x), len = Math.hypot(f.x2 - f.x, f.y2 - f.y);
  const fade = 1 - k, flap = Math.sin(Math.min(1, k * 2.5) * Math.PI);
  ctx.translate(f.x, f.y - 6); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, len, 0);   // vệt lửa dọc đường
  g.addColorStop(0, rgba(f.color, 0)); g.addColorStop(1, rgba(f.color, 0.55 * fade));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -7, len, -3); ctx.lineTo(len, 3); ctx.quadraticCurveTo(len * 0.5, 7, 0, 0); ctx.fill();
  for (let i = 0; i < 5; i++) {   // lông vũ
    const x = len * (0.2 + i * 0.15), y = Math.sin(i * 2.3) * 5 + k * 10;
    ctx.fillStyle = rgba(i % 2 ? '#ffffff' : f.color, 0.7 * fade);
    ctx.beginPath(); ctx.ellipse(x, y, 2.5, 1, i, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(len + 10, 0);   // chim bay vượt lên trước người
  ctx.globalCompositeOperation = 'source-over';
  for (const s of [-1, 1]) {   // cánh
    const span = 30 * (0.6 + 0.4 * flap);
    const wg = ctx.createLinearGradient(0, 0, -14, s * span);   // gốc cánh đỏ cam, mút cánh màu chiêu
    wg.addColorStop(0, `rgba(230,70,20,${0.9 * fade})`); wg.addColorStop(1, rgba(f.color, 0.85 * fade));
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(2, 0);
    ctx.bezierCurveTo(6, s * span * 0.5, -6, s * span, -20, s * span);
    for (const [x, y] of [[-15, 0.78], [-25, 0.72], [-18, 0.5], [-26, 0.4], [-17, 0.24]]) ctx.lineTo(x, s * span * y);   // mút lông cánh
    ctx.quadraticCurveTo(-12, s * 4, -8, s * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * fade})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.bezierCurveTo(-4, s * span * 0.4, -9, s * span * 0.85, -16, s * span * 0.85); ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${fade})`;   // thân và đuôi
  ctx.beginPath(); ctx.ellipse(-2, 0, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(230,70,20,${0.85 * fade})`;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-18, -6, -26, -2); ctx.quadraticCurveTo(-16, 0, -26, 3); ctx.quadraticCurveTo(-18, 5, -6, 0); ctx.fill();
}

// Long thương: mũi thương sáng đâm thẳng, hai vòng sóng xung kích nở ở mũi, vệt tốc độ hai bên
function spear(ctx, f, k) {
  const a = Math.atan2(f.y2 - f.y, f.x2 - f.x), len = Math.hypot(f.x2 - f.x, f.y2 - f.y) + 14;
  const fade = 1 - k, reach = Math.min(1, k * 5);
  ctx.translate(f.x, f.y - 5); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(f.color, 0.6 * fade);
  ctx.beginPath(); ctx.moveTo(0, -3 * fade); ctx.lineTo(len * reach, 0); ctx.lineTo(0, 3 * fade); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${fade})`;
  ctx.beginPath(); ctx.moveTo(len * 0.3, -1); ctx.lineTo(len * reach + 3, 0); ctx.lineTo(len * 0.3, 1); ctx.fill();
  ctx.strokeStyle = rgba(f.color, 0.8 * fade); ctx.lineWidth = 1.5;
  for (const d of [0, 0.35]) {   // sóng xung kích
    const r = Math.max(0, k - d) * 26;
    if (r <= 0) continue;
    ctx.beginPath(); ctx.ellipse(len, 0, r * 0.35, r, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,255,255,${0.6 * fade})`; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {   // vệt tốc độ
    const y = (i % 2 ? 1 : -1) * (5 + i * 2), x0 = len * (0.1 + i * 0.12) + k * 20;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 16, y); ctx.stroke();
  }
}

export function drawUltFx(ctx, f, k) {
  ctx.save();
  if (f.kind === 'phoenix') phoenix(ctx, f, k);
  else if (f.kind === 'spear') spear(ctx, f, k);
  ctx.restore();
}
