// Sông hồ và đường đất vẽ lại bằng code (chủ dự án 09/11/2026 09:26: "nền, đường, sông hồ bạn tự xoá đi code lại"; trước đó
// hồ nước là các ô vuông ghép thành hình chữ thập, đường đất mờ lẫn vào cỏ). Vẽ một lần vào tấm đệm nền của bản đồ (draw-ground.js
// build), sau lớp làm mờ nền và trước nhà cửa, cây cối. Số và màu ở data/config.json → nature.
// Cách làm: lưới chiếm chỗ theo ô (ô nước = 1) lấy mẫu dày res điểm mỗi ô, nhoè hai lượt hộp → trường mượt; điểm ảnh nào trường
// (cộng nhiễu nhỏ, cộng thiên theo ô đang đứng) vượt 0,5 là nước. Cạnh thẳng vẫn nằm đúng mép ô (va chạm theo ô không lệch),
// góc thì bo tròn, mép lượn nhẹ như bờ thật. Điểm ảnh của ô nước mà rơi ra ngoài bờ thì chép đối xứng nền từ ô đất kề bên.
// Nước: bờ tối 1 khối, dải nước nông sáng hơn sát bờ, lòng sâu, vài gợn ngang nhạt. Đường đất: cùng cách tạo hình, mép lởm chởm
// hơn, màu lấy theo nền đảo pha tông đất (chỉ sáng hơn nền một chút, không nổi), sỏi thưa; cỏ lấn mép thì để nguyên. Ngoài ra nền đất tự nhiên bớt gắt (desat) cho nhân vật nổi lên.
const hex = s => { const n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

function field(map, isIn, res, passes) {
  const W = map.w * res, H = map.h * res, a = new Float32Array(W * H), b = new Float32Array(W * H);
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) if (isIn(map.at(tx, ty))) {
    for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) a[(ty * res + y) * W + tx * res + x] = 1;
  }
  const r = Math.max(1, Math.round(res / 2));
  for (let p = 0; p < passes; p++) {   // nhoè hộp tách ngang / dọc
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { b[y * W + x] = s / (2 * r + 1); s += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; } }
  }
  return (fx, fy) => {   // lấy mẫu song tuyến tại toạ độ ô (số thực)
    const gx = Math.min(W - 1.001, Math.max(0, fx * res - 0.5)), gy = Math.min(H - 1.001, Math.max(0, fy * res - 0.5));
    const x0 = Math.floor(gx), y0 = Math.floor(gy), u = gx - x0, v = gy - y0, i = y0 * W + x0;
    return (a[i] * (1 - u) + a[i + 1] * u) * (1 - v) + (a[i + W] * (1 - u) + a[i + W + 1] * u) * v;
  };
}

// Vẽ một loại mặt (nước / đường) vào ImageData d. paint(i, depth, edge, x, y): tô điểm ảnh theo độ sâu (số khối tới bờ)
function shape(d, cw, map, hash, isIn, o, paint, isLand) {
  const T = map.T, B = o.block || 2, F = field(map, isIn, o.res || 4, o.passes || 2);
  const nb = (bx, by) => Math.floor(bx * B / T), tile = (bx, by) => map.at(nb(bx), Math.floor(by * B / T));
  const BW = Math.ceil(map.w * T / B), BH = Math.ceil(map.h * T / B), inside = new Uint8Array(BW * BH);
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    const fx = (bx + 0.5) * B / T, fy = (by + 0.5) * B / T, own = isIn(tile(bx, by));
    if (!own && F(fx, fy) < 0.2) continue;
    const v = F(fx, fy) + (own ? o.bias : -o.bias) + (hash(bx * 7 + 31, by * 11 + 5) - 0.5) * o.noise;
    if (v > 0.5) inside[by * BW + bx] = 1;
  }
  const at = (bx, by) => bx >= 0 && by >= 0 && bx < BW && by < BH && inside[by * BW + bx];
  const px = (x, y) => (y * cw + x) * 4;
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    const own = isIn(tile(bx, by));
    if (!at(bx, by)) {
      if (!own) continue;   // điểm của ô nước nằm ngoài bờ: chép nền đối xứng từ ô đất kề
      const tx = nb(bx), ty = Math.floor(by * B / T);
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isLand(map.at(tx + dx, ty + dy)));
      if (!n) continue;
      for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
        const X = bx * B + x, Y = by * B + y, ex = n[0] > 0 ? (tx + 1) * T : tx * T, ey = n[1] > 0 ? (ty + 1) * T : ty * T;
        const SX = n[0] ? 2 * ex - X - 1 : X, SY = n[1] ? 2 * ey - Y - 1 : Y, s = px(SX, SY), t = px(X, Y);
        if (SX < 0 || SY < 0 || SX >= cw || SY >= map.h * T) continue;
        d[t] = d[s]; d[t + 1] = d[s + 1]; d[t + 2] = d[s + 2];
      }
      continue;
    }
    let depth = 0;   // khoảng cách tới bờ (khối), tối đa 4
    for (let k = 1; k <= 4 && !depth; k++) if (!at(bx + k, by) || !at(bx - k, by) || !at(bx, by + k) || !at(bx, by - k)) depth = k;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) paint(px(bx * B + x, by * B + y), depth || 5, bx, by);
  }
}

const set = (d, i, c) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };

export function paintNature(c, map, hash, N, tiles) {
  if (!N?.on) return;
  const cw = c.canvas.width, ch = map.h * map.T, im = c.getImageData(0, 0, cw, ch), d = im.data;
  const solid = x => tiles.types[x]?.solid || tiles.types[x]?.void;
  // nền đất tự nhiên bớt gắt: kéo về xám cùng độ sáng một phần desat (cả lớp, trước khi vẽ nước, đường)
  if (N.desat) for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] += (l - d[i]) * N.desat; d[i + 1] += (l - d[i + 1]) * N.desat; d[i + 2] += (l - d[i + 2]) * N.desat;
  }
  const W = N.water, P = N.path;
  if (W && map.def.grid.some(r => r.includes('='))) {
    const C = Object.fromEntries(['rim', 'shallow', 'mid', 'deep', 'glint'].map(k => [k, hex(W[k])]));
    shape(d, cw, map, hash, x => x === '=', W, (i, dep, bx, by) => {
      let col = dep === 1 ? C.rim : dep === 2 ? C.shallow : dep === 3 ? C.mid : C.deep;
      if (dep >= 3 && hash(Math.floor(bx / 3) * 5 + 17, by * 3 + 1) < W.glints && hash(bx, by + 9) < 0.8) col = C.glint;   // gợn ngang ngắn
      set(d, i, col);
    }, x => x !== '=' && !tiles.types[x]?.void);
  }
  if (P && map.def.grid.some(r => r.includes(','))) {
    // màu đường lấy theo nền đất của đảo (trung bình), pha thêm tông đất tint phần mix; mép, sáng, sỏi nhân độ sáng
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const t = hex(P.tint), base = [r / n, g / n, b / n].map((v, k) => v + (t[k] - v) * P.mix), mul = f => base.map(v => Math.min(255, v * f));
    const C = { base, edge: mul(P.edge), light: mul(P.light), pebble: mul(P.pebble) };
    shape(d, cw, map, hash, x => x === ',', P, (i, dep, bx, by) => {
      const h = hash(bx * 3 + 7, by * 5 + 2);
      set(d, i, dep === 1 ? C.edge : h < P.pebbles ? C.pebble : h > 0.62 ? C.light : C.base);
    }, x => x !== ',' && !solid(x) && x !== '=');
  }
  c.putImageData(im, 0, 0);
}
