// Sự sống quanh cảnh, vẽ bằng code (chủ dự án 09/11/2026 12:29: "thêm sự sống cho người chơi thích đi khắp đảo; không phải càng
// nhiều càng tốt mà phải thú vị"). Chỉ quanh đồ trong khung nhìn, vị trí tính từ thời gian (không lưu trạng thái), máy yếu thì bớt:
// - Cây hoa, cây lá đỏ vàng: cánh hoa, lá rơi chao nghiêng rồi tan dưới gốc (màu theo cây).
// - Bụi, hoa: bướm đêm lượn quanh, cánh đập.
// - Mặt nước (ô nước trong khung nhìn): thỉnh thoảng cá quẫy, vòng gợn loang ra.
// - Lửa (vạc, lửa trại, lò): tàn lửa bay thêm xa.
// Số ở data/weather.json → ambient.
const leafOf = id => /anh-dao|dao-|mai/.test(id) ? ['#ffc6dc', '#f59ac0'] : /phong|ngan-hanh/.test(id) ? (id.includes('ngan') ? ['#ffd760', '#e8a83a'] : ['#ff8a5a', '#d8503a']) : /tuyet|tung|bang|lieu/.test(id) ? ['#ffffff', '#d8ecff'] : null;
const h1 = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

export function drawAmbient(ctx, game, view, t) {
  const A = game.data.weather?.ambient;
  if (!A || game.map?.def.indoor) return;
  const low = +(document.body.dataset.perf || 0) >= 2, items = game.map.hoi || [];
  ctx.save();
  for (const it of items) {
    if (it.x < view.x0 - 40 || it.x > view.x1 + 40 || it.y < view.y0 - 10 || it.y - it.h > view.y1 + 10) continue;
    const seed = it.x * 0.37 + it.y * 0.11;
    if (it.kind === 'cay') {
      const col = leafOf(it.id);
      if (!col) continue;
      const n = low ? 1 : A.leaves;
      for (let i = 0; i < n; i++) {   // lá rơi từ tán xuống gốc, chao qua lại
        const u = (t * A.leaf_speed / it.h + h1(seed + i) ) % 1, top = it.y - it.h * 0.75, x0 = it.x + (h1(seed + i * 3) - 0.5) * it.w * 0.8;
        const y = top + u * (it.h * 0.75 + 4), x = x0 + Math.sin(t * 2.2 + i * 2 + seed) * 3 + u * 4;
        ctx.globalAlpha = Math.min(1, (1 - u) * 3) * 0.9; ctx.fillStyle = col[i % 2];
        ctx.fillRect(x, y, Math.sin(t * 5 + i) > 0 ? 1.5 : 1, 1);
      }
    } else if (/bui|hoa|sen|co-/.test(it.id) && !low && h1(seed) < A.moth_p) {   // bướm đêm quanh bụi hoa
      const a = t * 0.9 + seed, x = it.x + Math.sin(a) * 9 + Math.sin(a * 2.3) * 3, y = it.y - it.h * 0.6 + Math.cos(a * 1.3) * 5;
      const flap = Math.abs(Math.sin(t * 14 + seed)) * 1.6 + 0.4;
      ctx.globalAlpha = 0.9; ctx.fillStyle = A.moth[Math.floor(h1(seed * 3) * A.moth.length)];
      ctx.fillRect(x - flap, y - 0.5, flap, 1.2); ctx.fillRect(x + 0.5, y - 0.5, flap, 1.2);
      ctx.fillStyle = '#2a2236'; ctx.fillRect(x, y - 0.5, 0.6, 1.4);
    } else if (it.spr.flame && !low) {   // tàn lửa bay cao, trôi theo gió
      const k = it.k, fx = it.x - it.spr.anchor[0] * k + it.spr.flame[0] * k, fy = it.y - it.spr.anchor[1] * k + it.spr.flame[1] * k;
      for (let i = 0; i < A.embers; i++) {
        const u = (t * 0.35 + h1(seed + i * 7)) % 1;
        ctx.globalAlpha = (1 - u) * 0.85; ctx.fillStyle = u < 0.4 ? '#ffd27a' : '#ff8a4a';
        ctx.fillRect(fx + Math.sin(u * 7 + i) * 4 + u * 10, fy - 6 - u * 34, 0.8, 0.8);
      }
    }
  }
  const map = game.map, T = map.T, W = game.data.tiles.types;
  const x0 = Math.max(0, Math.floor(view.x0 / T)), x1 = Math.min(map.w - 1, Math.floor(view.x1 / T));
  const y0 = Math.max(0, Math.floor(view.y0 / T)), y1 = Math.min(map.h - 1, Math.floor(view.y1 / T));
  // nhúm cỏ: lâu lâu một nhúm trên ô cỏ / tuyết trống (chủ dự án 09/11/2026 13:15), 3-5 lá lắc nhẹ theo gió, màu theo nền đảo
  const G = A.grass, gc = G && (G.colors[map.id] || G.colors._);
  if (gc) for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!G.on.includes(map.at(tx, ty)) || h1(tx * 73.1 + ty * 19.7) > G.p) continue;
    const bx = (tx + 0.2 + h1(tx + ty * 3.3) * 0.6) * T, by = (ty + 0.5 + h1(tx * 2.1 + ty) * 0.4) * T, n = 3 + Math.floor(h1(tx * 5 + ty) * 3);
    for (let i = 0; i < n; i++) {
      const lx = bx + (i - n / 2) * 1.3, hh = 3 + h1(tx + i * 7 + ty) * 3, sw = Math.sin(t * 1.4 + tx * 0.7 + ty * 0.3) * 0.9 * (hh / 5);
      ctx.globalAlpha = 1; ctx.fillStyle = gc[i % 2];
      ctx.fillRect(lx, by - hh * 0.5, 1, hh * 0.5); ctx.fillRect(lx + sw, by - hh, 1, hh * 0.5);
    }
  }
  // cá quẫy: mỗi nhịp chọn vài ô nước trong khung, vòng gợn loang ra
  const span = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (span > 0 && !low) for (let k = 0; k < A.fish; k++) {
    const slot = Math.floor(t / A.fish_every + k * 0.37), u = (t / A.fish_every + k * 0.37) % 1, r = Math.floor(h1(slot * 13 + k) * span);
    const tx = x0 + r % (x1 - x0 + 1), ty = y0 + Math.floor(r / (x1 - x0 + 1));
    const ch = map.at(tx, ty);
    if (!W[ch]?.water && ch !== '=' && ch !== 'O') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => map.at(tx + a, ty + b) !== ch)) continue;   // giữa hồ, không sát bờ
    const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
    ctx.globalAlpha = (1 - u) * 0.7; ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(cx, cy, 1 + u * 7, 0.5 + u * 3, 0, 0, Math.PI * 2); ctx.stroke();
    if (u < 0.25) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#c8e4f4'; ctx.fillRect(cx - 1, cy - 2 - Math.sin(u / 0.25 * Math.PI) * 4, 2, 1); }   // cá nhảy lên
  }
  ctx.restore();
}
