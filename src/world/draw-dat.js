// Mặt đất lễ hội (chủ dự án 02/11/2026: "mặt đất của Hàn Băng và Thiên Kiếm code sao cho phù hợp"). Vẽ thêm một lần vào tấm đệm nền
// (draw-ground.js → build), chỉ trên ô đất tự nhiên (cỏ, tuyết, hoa), không đụng đường lát. Kiểu và màu ở data/le-hoi.json →
// festivals.<bản đồ>.dat:
// - tuyet: gờ tuyết loang sáng tối (nhiễu thô nội suy theo khối 2×2 điểm ảnh), vệt chân người đi hội men theo mép đường, cụm tuyết đọng
//   nhỏ; mỗi khung vài hạt băng lấp lánh chớp lên (drawDatGlints).
// phu: phủ một tông lên cả ô đất (cỏ xanh gắt → xanh đêm ngả lam tím); duong: phủ đường đất cũ (tuyết nén).
// - co: bãi cỏ đêm loang hai tông, khóm hoa nhỏ ba màu, cánh đào rơi dày quanh gốc cây treo đèn, sỏi trắng rải ven đường.
const OPEN = { tuyet: 'wi', co: '.F' };

function noise(hash) {
  const n = (gx, gy) => hash(gx * 13 + 101, gy * 17 + 7);
  return (fx, fy) => {
    const gx = Math.floor(fx), gy = Math.floor(fy), u = fx - gx, v = fy - gy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return (n(gx, gy) * (1 - su) + n(gx + 1, gy) * su) * (1 - sv) + (n(gx, gy + 1) * (1 - su) + n(gx + 1, gy + 1) * su) * sv;
  };
}

export function bakeDat(c, map, hash, D) {
  if (!D) return;
  const T = map.T, open = OPEN[D.kieu] || '.', nz = noise(hash), on = (x, y) => open.includes(map.at(x, y));
  const road = (x, y) => '12,_'.includes(map.at(x, y));
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    if (D.duong && map.at(tx, ty) === ',') {   // đường đất cũ: phủ tuyết nén, vết chân hai hàng
      const X = tx * T, Y = ty * T; c.fillStyle = D.duong; c.fillRect(X, Y, T, T);
      for (let i = 0; i < 4; i++) { c.fillStyle = D.vet; c.fillRect(X + 4 + (i % 2) * 6, Y + 1 + i * 4, 2, 2); }
      continue;
    }
    if (!on(tx, ty)) continue;
    const X = tx * T, Y = ty * T, h = hash(tx * 3 + 11, ty * 5 + 3);
    if (D.phu) { c.fillStyle = D.phu; c.fillRect(X, Y, T, T); }   // phủ tông chung cho hợp màu đồ hội
    for (let by = 0; by < T; by += 2) for (let bx = 0; bx < T; bx += 2) {   // loang hai tông
      const v = nz((X + bx) / (T * 3.2), (Y + by) / (T * 3.2)) + (hash(X + bx, Y + by) - 0.5) * 0.12;
      if (v < 0.32) { c.fillStyle = D.toi; c.fillRect(X + bx, Y + by, 2, 2); }
      else if (v > 0.7) { c.fillStyle = D.sang; c.fillRect(X + bx, Y + by, 2, 2); }
    }
    const nearRoad = road(tx - 1, ty) || road(tx + 1, ty) || road(tx, ty - 1) || road(tx, ty + 1);
    if (D.kieu === 'tuyet') {
      if (h < 0.22) {   // cụm tuyết đọng: vồng sáng, bóng dưới
        const x = X + 3 + Math.floor(hash(tx, ty + 7) * 9), y = Y + 4 + Math.floor(hash(tx + 7, ty) * 8);
        c.fillStyle = D.bong; c.fillRect(x, y + 2, 5, 1); c.fillStyle = D.dong; c.fillRect(x + 1, y, 3, 2); c.fillRect(x, y + 1, 5, 1);
      }
      if (nearRoad && h > 0.35) for (let i = 0; i < 3; i++) {   // vết chân men theo đường
        const x = X + 2 + i * 5 + Math.floor(hash(tx + i, ty) * 2), y = Y + 5 + (i % 2) * 4 + Math.floor(hash(tx, ty + i) * 3);
        c.fillStyle = D.vet; c.fillRect(x, y, 2, 1); c.fillRect(x, y + 1, 1, 1);
      }
    } else {
      if (h < 0.3) for (let i = 0; i < 1 + Math.floor(h * 10) % 3; i++) {   // khóm hoa: cuống, hai cánh, nhụy
        const x = X + 2 + Math.floor(hash(tx + i * 3, ty) * 12), y = Y + 3 + Math.floor(hash(tx, ty + i * 3) * 11), col = D.hoa[Math.floor(hash(tx + i, ty + i) * D.hoa.length)];
        px(x, y + 1, D.cuong); px(x - 1, y, col); px(x + 1, y, col); px(x, y - 1, col); px(x, y, '#fff6d0');
      }
      if (nearRoad && h > 0.55) for (let i = 0; i < 4; i++) px(X + Math.floor(hash(tx + i, ty * 2) * 15), Y + Math.floor(hash(tx * 2, ty + i) * 15), i % 2 ? D.soi : D.toi);   // sỏi ven đường
    }
  }
  // cánh hoa rơi quanh gốc cây đồ hội (cây treo đèn, đào, tử đằng)
  if (D.canh) for (const it of map.hoi || []) {
    if (it.kind !== 'cay') continue;
    for (let i = 0; i < 70; i++) {
      const a = hash(i, it.x) * 6.283, r = Math.sqrt(hash(it.y, i)) * it.w * 0.55, x = Math.round(it.x + Math.cos(a) * r), y = Math.round(it.y - 4 + Math.sin(a) * r * 0.45);
      if (!on(Math.floor(x / T), Math.floor(y / T))) continue;
      px(x, y, D.canh[i % D.canh.length]); if (i % 4 === 0) px(x + 1, y, D.canh[(i + 1) % D.canh.length]);
    }
  }
}

// Hạt băng lấp lánh trên tuyết: mỗi khung chớp vài điểm trong khung nhìn (tính theo băm, không lưu)
export function drawDatGlints(ctx, game, view, t) {
  const D = game.data['le-hoi']?.festivals?.[game.map?.id]?.dat;
  if (!D?.lap) return;
  const map = game.map, T = map.T, open = OPEN[D.kieu] || '.';
  const x0 = Math.max(0, Math.floor(view.x0 / T)), x1 = Math.min(map.w - 1, Math.ceil(view.x1 / T)), y0 = Math.max(0, Math.floor(view.y0 / T)), y1 = Math.min(map.h - 1, Math.ceil(view.y1 / T));
  ctx.fillStyle = '#ffffff';
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const s = Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453, h = s - Math.floor(s);
    if (h > D.lap || !open.includes(map.at(tx, ty))) continue;
    const v = Math.sin(t * (1.4 + h * 2) + h * 40);
    if (v < 0.86) continue;
    const x = tx * T + Math.floor(h * 997) % 15, y = ty * T + Math.floor(h * 7919) % 15;
    ctx.globalAlpha = (v - 0.86) * 7; ctx.fillRect(x, y, 1, 1);
    if (v > 0.97) { ctx.fillRect(x - 1, y, 3, 0.5); ctx.fillRect(x, y - 1, 0.5, 3); }
  }
  ctx.globalAlpha = 1;
}
